import { NextFunction, Request, Response } from "express";
import config from "../config/config";
import { ApiError } from "./ApiError";

const globalErrorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const isProd = config.NODE_ENV === "production";

  if (error instanceof ApiError) {
    const errors =
      error.errors && error.errors.length > 0
        ? error.errors.map((err) => {
            const errorObj: { field?: string; message: string } = {
              message:
                isProd && error.statusCode >= 500
                  ? "Something went wrong"
                  : err.message,
            };
            if (err.field) {
              errorObj.field = err.field;
            }
            return errorObj;
          })
        : [
            {
              name: error.name,
              message:
                isProd && error.statusCode >= 500
                  ? "Something went wrong"
                  : error.message,
            },
          ];

    res.status(error.statusCode).json({
      success: error.success,
      statusCode: error.statusCode,
      message:
        isProd && error.statusCode >= 500
          ? "Something went wrong"
          : error.message,
      data: error.data,
      errors: errors,
      stack: isProd ? undefined : error.stack,
    });
    return;
  }

  res.status(500).json({
    success: false,
    statusCode: 500,
    message: isProd ? "Something went wrong" : "Internal Server Error",
    data: null,
    errors:
      error instanceof Error
        ? [
            {
              name: error.name,
              message: isProd ? "Something went wrong" : error.message,
            },
          ]
        : [],
    stack: isProd
      ? undefined
      : error instanceof Error
        ? error.stack
        : undefined,
  });
};

export default globalErrorHandler;
