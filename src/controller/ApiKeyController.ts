import { controller, httpGet, httpPost, request, interfaces } from "inversify-express-utils";
import { Request } from "express";
import { inject } from "inversify";
import { TYPES } from "../ioc-container/types";
import ApiKeyService from "../services/ApiKeyService";
import AuthMiddleware from "../middleware/AuthMiddleware";

@controller('/apikeys', TYPES.AuthMiddleware)
export class ApiKeyController implements interfaces.Controller {
  constructor(@inject(TYPES.ApiKeyService) private apiKeyService:ApiKeyService ) {}

  @httpPost('/')
  private async create(@request() req: Request & { userAddress?: string }) {
    const { appName, allowedOrigins } = req.body as any;
    const address = req.userAddress as string;
    if (!address) throw new Error('Unauthorized');
    // create using service class
    const created = await this.apiKeyService.createApiKey(address, appName, allowedOrigins || []);
    return created;
  }

  @httpGet('/')
  private async list(@request() req: Request & { userAddress?: string }) {
    const address = req.userAddress as string;
    if (!address) throw new Error('Unauthorized');
    return this.apiKeyService.listApiKeys(address);
  }

  @httpPost('/revoke')
  private async revoke(@request() req: Request & { userAddress?: string }) {
    const { apiKeyId } = req.body as any;
    const address = req.userAddress as string;
    if (!address) throw new Error('Unauthorized');
    await this.apiKeyService.revokeApiKey(address, apiKeyId);
    return { success: true };
  }
}

export default ApiKeyController;
