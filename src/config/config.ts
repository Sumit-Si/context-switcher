import { WHITELIST_ORIGINS } from "../constants";


const config = {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    WHITELIST_ORIGINS,
    MONGO_URI: process.env.MONGO_URI as string,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET as string,
    ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY as string,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET as string,
    REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY as string
}

export default config;