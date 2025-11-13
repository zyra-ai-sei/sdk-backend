import { injectable, inject } from "inversify";
import { TYPES } from "../../ioc-container/types";
import { ApiKeyData } from "./models/ApiKey";
import { UserData } from "./models/User";
import RedisService from "../../utils/redis/RedisService";
import crypto from "crypto";

@injectable()
export class ApiKeyOp {
  constructor(@inject(TYPES.RedisService) private redis: RedisService) {}

  private generateKey(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  async createApiKey(userAddress: string, appName: string, allowedOrigins: string[] = []) {
    // ensure user exists
    const user = await UserData.findOne({ address: userAddress });
    if (!user) throw new Error("User not found");

    const key = this.generateKey();
    const doc = await ApiKeyData.create({
      apiKey: key,
      appName,
      allowedOrigins,
      user: user._id,
    });

    // push to user's apiKeys array
    await UserData.updateOne({ _id: user._id }, { $push: { apiKeys: doc._id } });

    return { apiKey: key, id: doc._id };
  }

  async listApiKeys(userAddress: string) {
    const user = await UserData.findOne({ address: userAddress });
    if (!user) throw new Error("User not found");
    const keys = await ApiKeyData.find({ user: user._id }).lean();
    return keys;
  }

  async revokeApiKey(userAddress: string, apiKeyId: string) {
    const user = await UserData.findOne({ address: userAddress });
    if (!user) throw new Error("User not found");

    const keyDoc = await ApiKeyData.findOne({ _id: apiKeyId, user: user._id });
    if (!keyDoc) throw new Error("API Key not found");

    keyDoc.isActive = false;
    await keyDoc.save();
    return true;
  }

  // validate presented apiKey string and consume one quota; throws on failure or over-limit
  async validateAndConsume(apiKeyString: string) {
    const keyDoc: any = await ApiKeyData.findOne({ apiKey: apiKeyString }).exec();
    if (!keyDoc) throw new Error("Invalid API Key");
    if (!keyDoc.isActive) throw new Error("API Key is not active");

    // use Redis counter: key => rate:<apiKeyString>:YYYY-MM-DD
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const redisKey = `rate:${keyDoc._id}:${today}`;

    // seconds until end of day
    const now = new Date();
    const end = new Date(now);
    end.setUTCHours(23, 59, 59, 999);
    const seconds = Math.ceil((end.getTime() - now.getTime()) / 1000);

    const current = await this.redis.incrKey(redisKey, seconds);
    if (current > (keyDoc.rateLimitPerDay || 5000)) {
      throw new Error("API rate limit exceeded");
    }

    return keyDoc;
  }
}