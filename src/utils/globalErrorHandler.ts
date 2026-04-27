import { NextFunction, Request, Response } from "express";
import config from "../config/config";
import { ApiError } from "./ApiError";
import logger from "../config/logger";
import { UserDocument } from "../types/common.types";

const globalErrorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const isProd = config.NODE_ENV === "production";
  const user = req.user as UserDocument | undefined;


  // Logger (Production)
  const logContext = {
    // Request info
    method: req.method,
    requestId: req.headers["x-request-id"] ?? "no-request-id",
    url: req.originalUrl,
    ip: req.ip ?? req.socket?.remoteAddress ?? "unknown",
    userAgent: req.headers["user-agent"] ?? "unknown",

    // Auth context (never log full user object — only ID)
    userId: user?._id?.toString() ?? "unauthenticated",

    // Error info
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message : String(error),
    statusCode: error instanceof ApiError ? error.statusCode : 500,

    // Stack trace: only in dev. In prod, stacks reveal file paths and logic.
    stack: !isProd && error instanceof Error ? error.stack : undefined,

    // Validation errors: safe to log even in prod (no sensitive data)
    validationErrors: error instanceof ApiError && error.errors?.length > 0
      ? error.errors
      : undefined,
  };

  // ─── Log level based on status code ───────────────────────────────────────
  // 4xx = warn  (client's fault — not your bug, but worth tracking)
  // 5xx = error (your fault — needs immediate attention)
  // Special: 401/403 = warn with security tag

  if (error instanceof ApiError) {
    if (error.statusCode >= 500) {
      logger.error("Internal server error", logContext);
    } else if (error.statusCode === 401 || error.statusCode === 403) {
      logger.warn("Auth failure", { ...logContext, security: true });
    } else if (error.statusCode >= 400) {
      // 400, 404, 422, 429, etc.
      logger.warn("Client error", logContext);
      // Client errors aren't your bug — don't page anyone, just track them
    }
  } else {
    // Not an ApiError = completely unexpected. Unhandled promise rejection,
    // null reference, third-party library crash, etc.
    logger.error("Unhandled exception", logContext);
    // This is the scariest log — it means you didn't anticipate this error path
  }

  if (error instanceof ApiError) {
    const errors =
      error.errors?.length > 0
        ? error.errors.map((err) => ({
          ...(err.field ? { field: err.field } : {}),
          message:
            isProd && error.statusCode >= 500
              ? "Something went wrong"
              : err.message,
        }))
        : [{
          message:
            isProd && error.statusCode >= 500
              ? "Something went wrong"
              : error.message,
        }];

    res.status(error.statusCode).json({
      success: false,
      statusCode: error.statusCode,
      message: isProd && error.statusCode >= 500
        ? "Something went wrong"
        : error.message,
      data: null,
      errors,
      // FIX #6: Send requestId back to frontend
      // When user reports a bug, they give you the requestId,
      // and you search your logs for it. Like a ticket number.
      requestId: req.headers["x-request-id"] ?? undefined,
      stack: isProd ? undefined : error.stack,
    });
    return;
  }

  // Completely unexpected error (not ApiError)
  res.status(500).json({
    success: false,
    statusCode: 500,
    message: isProd ? "Something went wrong" : "Internal Server Error",
    data: null,
    errors: error instanceof Error
      ? [{ message: isProd ? "Something went wrong" : error.message }]
      : [],
    requestId: req.headers["x-request-id"] ?? undefined,
    stack: isProd
      ? undefined
      : error instanceof Error ? error.stack : undefined,
  });
};

export default globalErrorHandler;
