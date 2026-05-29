import { rateLimit } from "express-rate-limit";
import type { Connection } from "mongoose";
import { RateLimiterMongo } from "rate-limiter-flexible";
import config from "./config";
import logger from "./logger";

// Rate-Limiter-Flexible
let rateLimiterMongo: null | RateLimiterMongo = null;
const POINTS: number = 10; // no. of requests allowed
const DURATION: number = 60; // duration in seconds

const initRateLimiter = (mongooseConnection: Connection) => {
  rateLimiterMongo = new RateLimiterMongo({
    storeClient: mongooseConnection,
    points: POINTS,
    duration: DURATION,
  });
};

// Disable rate limiting in test environment
const isTestEnvironment = config.NODE_ENV === "test";

// Stricter rate limiter for authentication endpoints
// 5 requests per 15 minutes to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Limit each IP to 5 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message:
    "Too many authentication attempts, please try again after 15 minutes",
  skip: () => isTestEnvironment, // Skip rate limiting in test environment
  handler: (req, res) => {
    // Log rate limit violations for security monitoring
    logger.warn("Authentication rate limit exceeded", {
      meta: {
        ip: req.ip ?? req.socket?.remoteAddress ?? "unknown",
        userAgent: req.headers["user-agent"] ?? "unknown",
        path: req.path,
        method: req.method,
        security: true,
      },
    });

    res.status(429).json({
      success: false,
      statusCode: 429,
      message:
        "Too many authentication attempts, please try again after 15 minutes",
      data: null,
    });
  },
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: "draft-8" as const, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests, please try again later",
  skip: () => isTestEnvironment, // Skip rate limiting in test environment
});

export { authLimiter, globalLimiter, initRateLimiter, rateLimiterMongo };
