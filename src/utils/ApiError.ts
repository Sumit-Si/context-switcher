type ErrorDetail = {
  field?: string;
  message: string;
};

type ApiErrorProps = {
  statusCode: number;
  message: string;
  errors?: ErrorDetail[];
  stack?: string;
};

class ApiError extends Error {
  public readonly statusCode: number;
  public readonly message: string;
  public readonly errors: ErrorDetail[];
  public readonly data: null = null;
  public readonly success: false = false;

  constructor({
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = "",
  }: ApiErrorProps) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.data = null;
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
