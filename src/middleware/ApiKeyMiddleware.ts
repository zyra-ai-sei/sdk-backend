import { BaseMiddleware } from "inversify-express-utils";
import { Request, Response, NextFunction } from "express";
import { inject } from "inversify";
import { TYPES } from "../ioc-container/types";
import ApiKeyService from "../services/ApiKeyService";

export default class ApiKeyMiddleware extends BaseMiddleware {
  constructor(
    @inject(TYPES.ApiKeyService) private apiKeyService: ApiKeyService
  ) {
    super();
  }

  public async handler(req: Request, res: Response, next: NextFunction) {
    try {
      const apiKey =
        (req.headers["x-api-key"] as string) || (req.query.apiKey as string);

      if (!apiKey) {
        throw new Error("API key missing");
      }
      await this.apiKeyService.validateAndConsume(apiKey);
      next();
    } catch (err) {
      next(err);
    }
  }
}
