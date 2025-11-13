import { Document, model, Schema, SchemaTimestampsConfig } from "mongoose";

export interface IApiKey extends Document, SchemaTimestampsConfig {
  apiKey: string;
  appName: string;
  allowedOrigins: string[];
  isActive: boolean;
  requestCount: number;
  lastUsedAt?: Date;
}


const apiKeySchema = new Schema(
  {
    apiKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    appName: {
      type: String,
      required: true,
    },
    allowedOrigins: {
      type: [String],
      required: true,
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    requestCount: {
      type: Number,
      default: 0,
    },
    // per-key configurable daily limit (default: 5000 requests/day)
    rateLimitPerDay: {
      type: Number,
      default: 5000,
    },
    lastUsedAt: {
      type: Date,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref:'User',
        required:true,
    },
  },
  {
    timestamps: true,
  }
);

export const ApiKeyData = model<any>("ApiKey", apiKeySchema);
