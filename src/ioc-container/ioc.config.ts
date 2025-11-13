import { Container } from "inversify";
import { TYPES } from "./types";
import { UserOp } from "../database/mongo/UserOp";
import { ApiKeyOp } from "../database/mongo/ApiKeyOp";
import RedisService from "../utils/redis/RedisService";
import { TYPE } from "inversify-express-utils";
import { AuthController } from "../controller/AuthController";
import { AuthService } from "../services/AuthService";
import AuthMiddleware from "../middleware/AuthMiddleware";
import ApiKeyMiddleware from "../middleware/ApiKeyMiddleware";
import { LlmController } from "../controller/LlmController";
import { LlmService } from "../services/LlmService";
import { ILlmService } from "../services/interfaces/ILlmService";
import { MCPService } from "../services/MCPService";
import { UserService } from "../services/UserService";
import { TransactionService } from "../services/TransactionService";
import ApiKeyController from "../controller/ApiKeyController";
import ApiKeyService from "../services/ApiKeyService";

const container = new Container()

container.bind<AuthController>(TYPES.AuthController).to(AuthController)
container.bind<LlmController>(TYPES.LlmController).to(LlmController)
container.bind<ApiKeyController>(TYPES.ApiKeyController).to(ApiKeyController)

container.bind<AuthService>(TYPES.AuthService).to(AuthService)
container.bind<ILlmService>(TYPES.LlmService).to(LlmService).inSingletonScope()
container.bind<RedisService>(TYPES.RedisService).to(RedisService)
container.bind<MCPService>(TYPES.MCPService).to(MCPService).inSingletonScope()
container.bind<UserService>(TYPES.UserService).to(UserService);
container.bind<TransactionService>(TYPES.TransactionService).to(TransactionService);
container.bind<ApiKeyService>(TYPES.ApiKeyService).to(ApiKeyService)

container.bind<UserOp>(TYPES.UserOp).to(UserOp)
container.bind<ApiKeyOp>(TYPES.ApiKeyOp).to(ApiKeyOp)

container.bind<AuthMiddleware>(TYPES.AuthMiddleware).to(AuthMiddleware)
container.bind<ApiKeyMiddleware>(TYPES.ApiKeyMiddleware).to(ApiKeyMiddleware)

export default container