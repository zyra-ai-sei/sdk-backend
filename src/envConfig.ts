import dotenv from 'dotenv'
import {cleanEnv, num, str} from 'envalid'

dotenv.config()

const env = cleanEnv(process.env, {
    PORT: num(),
    REDIS_PORT: num(),
    REDIS_HOST: str(),
    AUTH_MESSAGE_TIMEOUT: num({ default: 60 * 1000 }),
    SECRET_KEY: str({default:'IAMSHREYANSH'}),
    GEMINI_API_KEY: str(),
    LLAMA_API_KEY: str(),
    MONGO_URI: str(),
    RPC_URL:str(),
    TEST_PRIVATE_KEY: str()
})



export default env;