import { ethers, Signature } from "ethers";
import { inject, injectable } from "inversify";
import { httpGet } from "inversify-express-utils";
import { TYPES } from "../ioc-container/types";
import { UserOp } from "../database/mongo/UserOp";
import env from "../envConfig";
import jwt from 'jsonwebtoken'
import RedisService from "../utils/redis/RedisService";
import { createHash } from "crypto";

@injectable()
export class AuthService {
    constructor(
        @inject(TYPES.UserOp) private userOp:UserOp,
        @inject(TYPES.RedisService) private redisService:RedisService
    ){}

    async login(
        signedMessage: Signature,
        address:string,
        message: string,
    ): Promise<string> {
        let userData = await this.userOp.getUserById(address);
        const timestamp = Number(message.split(": ")[1]);
        const isValid = timestamp + env.AUTH_MESSAGE_TIMEOUT 
        if(!userData || !userData?._id){
            await this.userOp.updateUserData(address,{address:address})
            userData = await this.userOp.getUserById(address);
        }

        if(!isValid) throw new Error('Message expired');

        const recoveredAddress = ethers.verifyMessage(message, signedMessage)

        if(recoveredAddress !== address)
            throw new Error('Signature verification failed');

        const token = jwt.sign({address}, env.SECRET_KEY, {
            expiresIn: 7 * 24 * 60 * 60
        })

        await this.redisService.setValue(
            createHash('sha256').update(token).digest('hex'),
            `${address} ${userData._id}`,
            7 * 24 * 60 * 60
        )
        
        return token
    }

    async verifyUserSession(authHeader?:string): Promise<{address:string, userId:string}> {
        const {address, userId} = await this.verifyAuthToken(authHeader);
        return {address, userId};
    }

    private async verifyAuthToken(
        authHeader?:string
    ): Promise<{address: string; hashedToken: string, userId:string}> {

        if(!authHeader?.startsWith('Bearer ')){
            throw new Error('Invalid Authorization Header')
        }

        const token = authHeader.split(' ')[1];
        const hashedToken = createHash('sha256').update(token).digest('hex')
        const combinedData = await this.redisService.getValue(hashedToken);
        const [address, userId] = combinedData.split(' ')

        if(!address){
            throw new Error('Invalid JWT Token')
        }
        let decoded: {address: string};
        try{
            decoded = jwt.verify(token, env.SECRET_KEY) as {
                address: string
            }
        } catch(e){
            if (e instanceof jwt.TokenExpiredError) {
                throw new Error('JWT Token Expired')
            }
            throw new Error(
                "Couldn't verify JWT Token"
            )
        }

        if(decoded.address !== address){
            throw new Error('Invalid JWT Token')
        }

        return {address: address.trim(), hashedToken, userId}
    }


}