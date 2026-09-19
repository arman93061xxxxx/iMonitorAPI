import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    version: string;
  };
}

export class ResponseHandler {
  static success<T>(res: Response, data: T, statusCode: number = StatusCodes.OK): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    };

    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T): Response {
    return this.success(res, data, StatusCodes.CREATED);
  }

  static noContent(res: Response): Response {
    return res.status(StatusCodes.NO_CONTENT).send();
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    code?: string,
    details?: any
  ): Response {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    };

    return res.status(statusCode).json(response);
  }
}

export default ResponseHandler;
