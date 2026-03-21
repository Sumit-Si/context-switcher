import config from "../config/config";
import { rateLimiterMongo } from "../config/rateLimiter";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/AsyncHandler";

const rateLimit = asyncHandler(async (req, res, next) => {
    if (config.NODE_ENV === "development") {
        return next();
    }

    if (rateLimiterMongo) {
        try {
            await rateLimiterMongo.consume(req.ip as string, 1);
            next();
        } catch (error) {
            // rate-limiter-flexible rejects the promise when the limit is exceeded
            // It throws a RateLimiterRes object (not an Error instance)
            if (error instanceof Error) {
                // This is a real database/connection error
                return next(error);
            }
            // Otherwise, it's a rate limit exception
            throw new ApiError({ statusCode: 429, message: "Too many requests" });
        }
    } else {
        // Fallback if rateLimiterMongo is not initialized yet
        next();
    }
});


export {
    rateLimit,
}