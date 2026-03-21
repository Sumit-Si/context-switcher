import { rateLimit } from "express-rate-limit";
import { Connection } from "mongoose";
import { RateLimiterMongo } from "rate-limiter-flexible";


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

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "Too many attempts, try again later",
});

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
    standardHeaders: "draft-8" as const, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "Too many attempts, try again later",
})


export {
    authLimiter,
    globalLimiter,
    initRateLimiter,
    rateLimiterMongo,
}