import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ResponseHandler } from '../utils/response';
import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

const isPrismaKnownError = (err: unknown): err is Prisma.PrismaClientKnownRequestError => {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
  );
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Handle known AppError
  if (err instanceof AppError) {
    ResponseHandler.error(res, err.message, err.statusCode, err.code);
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    ResponseHandler.error(
      res,
      'Validation failed',
      StatusCodes.BAD_REQUEST,
      'VALIDATION_ERROR',
      errors
    );
    return;
  }

  // Handle Prisma errors
  if (isPrismaKnownError(err)) {
    if (err.code === 'P2002') {
      // Unique constraint violation
      ResponseHandler.error(
        res,
        'Resource already exists',
        StatusCodes.CONFLICT,
        'DUPLICATE_ENTRY'
      );
      return;
    }

    if (err.code === 'P2025') {
      // Record not found
      ResponseHandler.error(res, 'Resource not found', StatusCodes.NOT_FOUND, 'NOT_FOUND');
      return;
    }

    ResponseHandler.error(
      res,
      'Database error occurred',
      StatusCodes.INTERNAL_SERVER_ERROR,
      'DATABASE_ERROR'
    );
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    ResponseHandler.error(res, 'Invalid token', StatusCodes.UNAUTHORIZED, 'INVALID_TOKEN');
    return;
  }

  if (err.name === 'TokenExpiredError') {
    ResponseHandler.error(res, 'Token expired', StatusCodes.UNAUTHORIZED, 'TOKEN_EXPIRED');
    return;
  }

  // Default to 500 server error
  ResponseHandler.error(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    StatusCodes.INTERNAL_SERVER_ERROR,
    'INTERNAL_ERROR'
  );
};

export default errorHandler;
