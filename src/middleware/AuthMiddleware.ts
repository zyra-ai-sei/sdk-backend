import { inject, injectable } from "inversify";
import { BaseMiddleware } from "inversify-express-utils";
import { TYPES } from "../ioc-container/types";
import { AuthService } from "../services/AuthService";
import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../types/requestTypes";



@injectable()
export default class AuthMiddleware extends BaseMiddleware {

    constructor(
        @inject(TYPES.AuthService) private authService: AuthService
    ){
        super()
    }

    public async handler(
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) {
        try{
            const {address, userId} = await this.authService.verifyUserSession(req.headers.authorization);
            req.userAddress = address;
            req.userId = userId
            next()
        } catch(err){
            next(err)
        }
    }


}