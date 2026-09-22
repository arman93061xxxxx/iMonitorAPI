import { Request, Response } from 'express';
import { ResponseHandler } from '../../utils/response';
import * as apiService from './api.service';

export const create = async (req: Request, res: Response): Promise<void> => {
  const api = await apiService.createApi(req.user!.id, req.body);
  ResponseHandler.created(res, { api });
};

export const list = async (req: Request, res: Response): Promise<void> => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const offset = req.query.offset ? Number(req.query.offset) : undefined;
  const apis = await apiService.listApis(req.user!.id, limit, offset);
  ResponseHandler.success(res, { apis });
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const api = await apiService.getApiById(req.user!.id, req.params.id);
  ResponseHandler.success(res, { api });
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const api = await apiService.updateApi(req.user!.id, req.params.id, req.body);
  ResponseHandler.success(res, { api });
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  await apiService.deleteApi(req.user!.id, req.params.id);
  ResponseHandler.noContent(res);
};

export const enable = async (req: Request, res: Response): Promise<void> => {
  const api = await apiService.setApiActive(req.user!.id, req.params.id, true);
  ResponseHandler.success(res, { api });
};

export const disable = async (req: Request, res: Response): Promise<void> => {
  const api = await apiService.setApiActive(req.user!.id, req.params.id, false);
  ResponseHandler.success(res, { api });
};

export const testConnection = async (req: Request, res: Response): Promise<void> => {
  const result = await apiService.testConnection(req.body);
  ResponseHandler.success(res, { result });
};

export const checkNow = async (req: Request, res: Response): Promise<void> => {
  const result = await apiService.triggerCheck(req.user!.id, req.params.id);
  ResponseHandler.success(res, { result });
};
