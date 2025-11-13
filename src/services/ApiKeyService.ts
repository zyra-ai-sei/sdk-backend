import { inject, injectable } from "inversify";
import { TYPES } from "../ioc-container/types";
import { ApiKeyOp } from "../database/mongo/ApiKeyOp";

@injectable()
export class ApiKeyService {
  constructor(@inject(TYPES.ApiKeyOp) private apiKeyOp: ApiKeyOp) {}

  async createApiKey(userAddress: string, appName: string, allowedOrigins: string[] = []) {
    return this.apiKeyOp.createApiKey(userAddress, appName, allowedOrigins);
  }

  async listApiKeys(userAddress: string) {
    return this.apiKeyOp.listApiKeys(userAddress);
  }

  async revokeApiKey(userAddress: string, apiKeyId: string) {
    return this.apiKeyOp.revokeApiKey(userAddress, apiKeyId);
  }

  // validate presented apiKey string and consume one quota; throws on failure or over-limit
  async validateAndConsume(apiKeyString: string) {
    return this.apiKeyOp.validateAndConsume(apiKeyString);
  }
}

export default ApiKeyService;
