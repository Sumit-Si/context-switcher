import { WHITELIST_ORIGINS } from "../constants";


const config = {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    WHITELIST_ORIGINS,
}

export default config;