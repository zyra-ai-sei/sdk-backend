
export const TYPES = {
    // controllers
    AuthController: Symbol.for('AuthController'),
    LlmController: Symbol.for('LlmController'),
    UserController: Symbol.for('UserController'),
    TransactionController: Symbol.for('TransactionController'),
    ApiKeyController: Symbol.for('ApiKeyController'),
    Hello: Symbol.for('Hello'),

    // services
    AuthService: Symbol.for('AuthService'),
    LlmService: Symbol.for('LlmService'),
    RedisService: Symbol.for('RedisService'),
    MCPService: Symbol.for('MCPService'),
    UserService: Symbol.for('UserService'),
    TransactionService: Symbol.for('TransactionService'),
    ApiKeyService: Symbol.for('ApiKeyService'),

    // database
    UserOp: Symbol.for('UserOp'),
    ApiKeyOp: Symbol.for('ApiKeyOp'),

    // middleware
    AuthMiddleware: Symbol.for('AuthMiddleware')
    ,ApiKeyMiddleware: Symbol.for('ApiKeyMiddleware')
};
