interface ErrorDetail {
  field?: string;
  message: string;
}

export type ApiErrorCode =
  | "TOKEN_EXPIRED"
  | "INVALID_CREDENTIALS"
  | "UNAUTHORIZED"
  | "FORBIDDEN";

interface ApiErrorProps {
  statusCode: number;
  message: string;
  code?: ApiErrorCode;
  errors?: ErrorDetail[];
  stack?: string;
}

class ApiError extends Error {
  public readonly statusCode: number;
  public readonly message: string;
  public readonly errors: ErrorDetail[];
  public readonly data: null = null;
  public readonly code?: string;
  public readonly success = false as const;

  constructor({
    statusCode,
    message = "Something went wrong",
    errors = [],
    code = undefined,
    stack = "",
  }: ApiErrorProps) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.data = null;
    this.code = code;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError, ApiErrorProps, ErrorDetail };
