import { WHITELIST_ORIGINS } from "../constants";

const config = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  WHITELIST_ORIGINS,
  MONGO_URI: process.env.MONGO_URI as string,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET as string,
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY as string,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET as string,
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY as string,
  EMAIL_HOST: process.env.EMAIL_HOST as string,
  EMAIL_PORT: process.env.EMAIL_PORT as string,
  EMAIL_USER: process.env.EMAIL_USER as string,
  EMAIL_PASS: process.env.EMAIL_PASS as string,
  CLIENT_URL: process.env.CLIENT_URL as string,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID as string,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET as string,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL as string,
};

export default config;
