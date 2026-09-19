import { StatusCodes } from 'http-status-codes';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', code?: string) {
    super(message, StatusCodes.BAD_REQUEST, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code?: string) {
    super(message, StatusCodes.UNAUTHORIZED, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code?: string) {
    super(message, StatusCodes.FORBIDDEN, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code?: string) {
    super(message, StatusCodes.NOT_FOUND, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists', code?: string) {
    super(message, StatusCodes.CONFLICT, code);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', code?: string) {
    super(message, StatusCodes.UNPROCESSABLE_ENTITY, code);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', code?: string) {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR, code);
  }
}
