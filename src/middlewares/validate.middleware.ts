import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import type { ErrorDetail } from "../utils/ApiError";
import { ApiError } from "../utils/ApiError";

export const validate =
  (schema: z.ZodSchema) =>
    async (req: Request, _res: Response, next: NextFunction) => {
      const validationResult = await schema.safeParseAsync(req.body);

      if (validationResult.success) {
        req.body = validationResult.data;
        return next();
      }

      const extractedErrors: ErrorDetail[] = validationResult.error.issues.map(
        (issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }),
      );

      throw new ApiError({
        statusCode: 422,
        message: "Validation Error",
        errors: extractedErrors,
      });
    };

export const validateQuery = (schema: z.ZodSchema) => async (req: Request, _res: Response, next: NextFunction) => {
  const validationResult = await schema.safeParseAsync(req.query);
  if (!validationResult.success) {
    const extractedErrors: ErrorDetail[] = validationResult.error.issues.map(
      (issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }),
    );
    throw new ApiError({
      statusCode: 422,
      message: "Validation Error",
      errors: extractedErrors,
    });
  }
  req.query = validationResult.data as typeof req.query;
  next();
};

export const validateParams = (schema: z.ZodSchema) => async (req: Request, _res: Response, next: NextFunction) => {
  const validationResult = await schema.safeParseAsync(req.params);
  if (!validationResult.success) {
    const extractedErrors: ErrorDetail[] = validationResult.error.issues.map(
      (issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }),
    );
    throw new ApiError({
      statusCode: 422,
      message: "Validation Error",
      errors: extractedErrors,
    });
  }
  req.params = validationResult.data as typeof req.params;
  next();
};
