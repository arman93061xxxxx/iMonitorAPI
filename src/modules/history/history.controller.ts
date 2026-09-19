import { Request, Response } from 'express';
import { ResponseHandler } from '../../utils/response';
import * as historyService from './history.service';

export const monitoringLogs = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await historyService.listMonitoringLogs(req.user!.id, req.params.id, page, limit);
  ResponseHandler.success(res, result);
};

export const incidents = async (req: Request, res: Response): Promise<void> => {
  const { page, limit, status, apiId } = req.query as unknown as {
    page: number;
    limit: number;
    status?: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
    apiId?: string;
  };
  const result = await historyService.listIncidents(req.user!.id, page, limit, status, apiId);
  ResponseHandler.success(res, result);
};

export const incidentDetail = async (req: Request, res: Response): Promise<void> => {
  const incident = await historyService.getIncidentDetail(req.user!.id, req.params.id);
  ResponseHandler.success(res, { incident });
};

export const analysis = async (req: Request, res: Response): Promise<void> => {
  const analysisResult = await historyService.getIncidentAnalysis(req.user!.id, req.params.id);
  ResponseHandler.success(res, { analysis: analysisResult });
};

export const alerts = async (req: Request, res: Response): Promise<void> => {
  const alertsResult = await historyService.getIncidentAlerts(req.user!.id, req.params.id);
  ResponseHandler.success(res, { alerts: alertsResult });
};

export const analyticsSummary = async (req: Request, res: Response): Promise<void> => {
  const summary = await historyService.getAnalyticsSummary(req.user!.id);
  ResponseHandler.success(res, { summary });
};
