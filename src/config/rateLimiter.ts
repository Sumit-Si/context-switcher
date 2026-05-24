import { rateLimit } from "express-rate-limit";
import { Connection } from "mongoose";
import { RateLimiterMongo } from "rate-limiter-flexible";
import config from "./config";


// Rate-Limiter-Flexible
let rateLimiterMongo: null | RateLimiterMongo = null;
const POINTS: number = 10;  // no. of requests allowed
const DURATION: number = 60; // duration in seconds

const initRateLimiter = (mongooseConnection: Connection) => {
    rateLimiterMongo = new RateLimiterMongo({
        storeClient: mongooseConnection,
        points: POINTS,
        duration: DURATION,
    })
}

// Disable rate limiting in test environment
const isTestEnvironment = config.NODE_ENV === 'test';

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "Too many attempts, try again later",
    skip: () => isTestEnvironment, // Skip rate limiting in test environment
});

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: "draft-8" as const, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "Too many attempts, try again later",
    skip: () => isTestEnvironment, // Skip rate limiting in test environment
});


export {
    authLimiter,
    globalLimiter,
    initRateLimiter,
    rateLimiterMongo,
}