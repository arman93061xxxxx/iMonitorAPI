import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ResponseHandler } from '../../utils/response';
import * as authService from './auth.service';

export const register = async (req: Request, res: Response): Promise<void> => {
  const result = await authService.register(req.body);
  ResponseHandler.success(res, result, StatusCodes.CREATED);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const result = await authService.login(req.body);
  ResponseHandler.success(res, result);
};

export const me = async (req: Request, res: Response): Promise<void> => {
  const user = await authService.getMe(req.user!.id);
  ResponseHandler.success(res, { user });
};
