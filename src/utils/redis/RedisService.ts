import { injectable } from "inversify";
import Redis from "ioredis";
import env from "../../envConfig";


@injectable()
export default class RedisService {
    private redisClient: Redis

    constructor() {
        this.redisClient = new Redis(env.REDIS_PORT,env.REDIS_HOST);
    }

    public async setValue(
        key: string,
        value: string,
        expireSeconds?:number,
    ):Promise<void>{
        try{
            if(expireSeconds){
                await this.redisClient.set(key,value,'EX',expireSeconds);
                return
            }
            await this.redisClient.set(key,value);
        }catch(err){
            throw new Error('Error while setting value in redis');
        }
    }

    public async getValue(
        key:string
    ):Promise<string | null>{
       return this.redisClient.get(key);
    }

    public async deleteValue(key:string):Promise<void> {
        try{
            await this.redisClient.del(key);
        }catch(err){
            throw new Error('Error in deleting value from redis');
        }
    }

    public async incrKey(key: string, expireSeconds?: number): Promise<number> {
        try{
            const value = await this.redisClient.incr(key);
            if (expireSeconds && value === 1) {
                // if first set, set expiry
                await this.redisClient.expire(key, expireSeconds);
            }
            return value;
        } catch(err){
            throw new Error('Error while incrementing redis key');
        }
    }

    public async getObj<T>(key: string): Promise<T|null> {
        try{
            const data = await this.redisClient.get(key);
            if(data == null) return null;
            return JSON.parse(data) as unknown as T
        } catch(err){
            throw new Error('Error in getting object from redis')
        }
    }

    public async cacheData<T,R>(
        key: string,
        callbackInput:R,
        callback: (input:R) => Promise<T>,
        expiryTime?:number,
        postCacheHook?: ()=> Promise<void>,
    ): Promise<T> {
        const cacheData:T = await this.getObj(key)
        const fuckSake = await this.getObj(key);
        if(!cacheData){
            const data = await callback(callbackInput)
            await this.setValue(key, JSON.stringify(data), 10000000)
            if(postCacheHook){
                await postCacheHook()
            }
            return data 
        }
        return cacheData;
    }


}