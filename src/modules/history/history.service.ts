import prisma from '../../config/database';
import { NotFoundError } from '../../utils/errors';

const sanitizeUrl = (rawUrl: string): string => {
  try {
    const url = new URL(rawUrl);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return '[invalid URL redacted]';
  }
};

const sanitizeErrorMessage = (value: string | null): string | null => {
  if (!value) return value;
  return value
    .replace(/(https?:\/\/)[^/\s@]+@/gi, '$1')
    .replace(/([?&](?:api[_-]?key|token|secret|password|authorization)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[jwt redacted]');
};

const resourceNotFound = (): NotFoundError =>
  new NotFoundError('The requested resource does not exist.', 'RESOURCE_NOT_FOUND');

const pagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});

export const listMonitoringLogs = async (userId: string, apiId: string, page: number, limit: number) => {
  const where = { apiId, api: { userId } };
  const [total, logs] = await prisma.$transaction([
    prisma.monitoringLog.count({ where }),
    prisma.monitoringLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        timestamp: true,
        statusCode: true,
        responseTime: true,
        isAvailable: true,
        isTimeout: true,
        errorMessage: true,
      },
    }),
  ]);

  if (total === 0) {
    const api = await prisma.api.findFirst({ where: { id: apiId, userId }, select: { id: true } });
    if (!api) throw resourceNotFound();
  }

  return {
    logs: logs.map(log => ({ ...log, errorMessage: sanitizeErrorMessage(log.errorMessage) })),
    pagination: pagination(page, limit, total),
  };
};

const ownedIncidentWhere = (userId: string, incidentId?: string) => ({
  ...(incidentId ? { id: incidentId } : {}),
  api: { userId },
});

export const listIncidents = async (
  userId: string,
  page: number,
  limit: number,
  status?: 'OPEN' | 'INVESTIGATING' | 'RESOLVED',
  apiId?: string
) => {
  const where = {
    api: { userId, ...(apiId ? { id: apiId } : {}) },
    ...(status ? { status } : {}),
  };
  const [total, incidents] = await prisma.$transaction([
    prisma.incident.count({ where }),
    prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        apiId: true,
        status: true,
        startedAt: true,
        resolvedAt: true,
        createdAt: true,
        severity: true,
        failureCount: true,
        api: { select: { name: true } },
        aiAnalyses: { select: { severity: true }, take: 1 },
      },
    }),
  ]);

  return {
    incidents: incidents.map(({ aiAnalyses, ...incident }) => ({
      ...incident,
      analysisSeverity: aiAnalyses[0]?.severity ?? null,
    })),
    pagination: pagination(page, limit, total),
  };
};

const getOwnedIncident = async (userId: string, incidentId: string) => {
  const incident = await prisma.incident.findFirst({
    where: ownedIncidentWhere(userId, incidentId),
    select: {
      id: true,
      incidentNumber: true,
      apiId: true,
      status: true,
      severity: true,
      startedAt: true,
      detectedAt: true,
      resolvedAt: true,
      failureCount: true,
      summary: true,
      possibleCause: true,
      recommendation: true,
      createdAt: true,
      updatedAt: true,
      api: { select: { id: true, name: true, url: true, method: true, expectedStatusCode: true } },
      incidentLogs: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, event: true, createdAt: true, monitoringLogId: true },
      },
      aiAnalyses: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { id: true, summary: true, possibleCause: true, impact: true, confidence: true, severity: true, recommendations: true, model: true, createdAt: true },
      },
      alerts: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, event: true, type: true, recipient: true, status: true, sentAt: true, error: true, createdAt: true },
      },
    },
  });
  if (!incident) throw resourceNotFound();
  return {
    ...incident,
    api: { ...incident.api, url: sanitizeUrl(incident.api.url) },
  };
};

export const getIncidentDetail = getOwnedIncident;

export const getIncidentAnalysis = async (userId: string, incidentId: string) => {
  await getOwnedIncident(userId, incidentId);
  const analysis = await prisma.aIAnalysis.findUnique({
    where: { incidentId },
    select: { id: true, incidentId: true, summary: true, possibleCause: true, impact: true, confidence: true, severity: true, recommendations: true, model: true, createdAt: true, updatedAt: true },
  });
  if (!analysis) throw new NotFoundError('No analysis exists for the requested incident.', 'ANALYSIS_NOT_FOUND');
  return analysis;
};

export const getIncidentAlerts = async (userId: string, incidentId: string) => {
  await getOwnedIncident(userId, incidentId);
  return prisma.alert.findMany({
    where: { incidentId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, event: true, type: true, recipient: true, status: true, sentAt: true, error: true, retryCount: true, createdAt: true },
  });
};

export const getAnalyticsSummary = async (userId: string) => {
  const apiWhere = { userId };
  const incidentWhere = { api: { userId } };
  const [totalApis, activeApis, totalChecks, successfulChecks, failedChecks, openIncidents, resolvedIncidents, totalIncidents, responseTime] = await Promise.all([
    prisma.api.count({ where: apiWhere }),
    prisma.api.count({ where: { ...apiWhere, isActive: true } }),
    prisma.monitoringLog.count({ where: { api: apiWhere } }),
    prisma.monitoringLog.count({ where: { api: apiWhere, isAvailable: true } }),
    prisma.monitoringLog.count({ where: { api: apiWhere, isAvailable: false } }),
    prisma.incident.count({ where: { ...incidentWhere, status: 'OPEN' } }),
    prisma.incident.count({ where: { ...incidentWhere, status: 'RESOLVED' } }),
    prisma.incident.count({ where: incidentWhere }),
    prisma.monitoringLog.aggregate({ where: { api: apiWhere }, _avg: { responseTime: true } }),
  ]);
  const availabilityPercentage = totalChecks === 0 ? 0 : Number(((successfulChecks / totalChecks) * 100).toFixed(2));
  return {
    apis: { total: totalApis, active: activeApis, inactive: totalApis - activeApis },
    monitoring: { totalChecks, successfulChecks, failedChecks, averageResponseTime: responseTime._avg.responseTime ?? 0, availabilityPercentage, failurePercentage: totalChecks === 0 ? 0 : Number(((failedChecks / totalChecks) * 100).toFixed(2)) },
    incidents: { total: totalIncidents, open: openIncidents, resolved: resolvedIncidents },
  };
};
