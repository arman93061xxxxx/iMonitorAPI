import prisma from '../../config/database';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import type { Api, Incident, MonitoringLog, Severity } from '@prisma/client';

const HISTORY_LIMIT = 20;

export interface AnalysisContext {
  apiName: string;
  apiUrl: string;
  method: string;
  expectedStatusCode: number | null;
  incidentStatus: string;
  incidentOpenedAt: string;
  failureCount: number;
  monitoringHistory: Array<{
    timestamp: string;
    statusCode: number | null;
    responseTime: number | null;
    isAvailable: boolean;
    isTimeout: boolean;
    errorMessage: string | null;
  }>;
}

export interface AnalysisResult {
  summary: string;
  possibleCause: string;
  impact: string;
  confidence: number;
  severity: Severity;
  recommendations: string[];
  model: string;
}

interface AIProvider {
  analyze(context: AnalysisContext): Promise<AnalysisResult>;
}

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

const sanitizeText = (text: string | null): string | null => {
  if (!text) return text;
  return text
    .replace(/(https?:\/\/)[^/\s@]+@/gi, '$1')
    .replace(/([?&](?:api[_-]?key|token|secret|password|authorization)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[jwt redacted]');
};

const buildContext = async (incident: Incident): Promise<AnalysisContext> => {
  const api = await prisma.api.findUniqueOrThrow({ where: { id: incident.apiId } });
  const logs = await prisma.monitoringLog.findMany({
    where: { apiId: incident.apiId },
    orderBy: { timestamp: 'desc' },
    take: HISTORY_LIMIT,
    select: {
      timestamp: true,
      statusCode: true,
      responseTime: true,
      isAvailable: true,
      isTimeout: true,
      errorMessage: true,
    },
  });

  return {
    apiName: api.name,
    apiUrl: sanitizeUrl(api.url),
    method: api.method,
    expectedStatusCode: api.expectedStatusCode,
    incidentStatus: incident.status,
    incidentOpenedAt: incident.startedAt.toISOString(),
    failureCount: incident.failureCount,
    monitoringHistory: logs.reverse().map(log => ({
      timestamp: log.timestamp.toISOString(),
      statusCode: log.statusCode,
      responseTime: log.responseTime,
      isAvailable: log.isAvailable,
      isTimeout: log.isTimeout,
      errorMessage: sanitizeText(log.errorMessage),
    })),
  };
};

const mockProvider: AIProvider = {
  async analyze(context): Promise<AnalysisResult> {
    const failures = context.monitoringHistory.filter(log => !log.isAvailable);
    const timeouts = failures.filter(log => log.isTimeout).length;
    const serverErrors = failures.filter(log => (log.statusCode ?? 0) >= 500).length;
    const recovered = context.monitoringHistory.some(log => log.isAvailable);
    const repeatedFailure = failures.length >= 2;

    let possibleCause = 'Intermittent API availability failure.';
    if (timeouts > 0) {
      possibleCause = 'The API or its upstream dependency exceeded the configured timeout.';
    } else if (serverErrors > 0) {
      possibleCause = 'The API returned server-side errors, indicating an application or dependency failure.';
    } else if (failures.some(log => log.statusCode === null)) {
      possibleCause = 'The API could not be reached or did not return a response.';
    }

    const severity: Severity = failures.length >= 5 || timeouts >= 3
      ? 'CRITICAL'
      : repeatedFailure || serverErrors > 0 || timeouts > 0
        ? 'HIGH'
        : 'MEDIUM';

    const summary = repeatedFailure
      ? `${context.apiName} has repeated monitoring failures (${failures.length} of ${context.monitoringHistory.length} recent checks).`
      : `${context.apiName} failed a monitoring check.`;
    const impact = recovered
      ? 'The API experienced failures in the recent window but has since recovered.'
      : 'Requests to the API may currently be failing.';

    return {
      summary,
      possibleCause,
      impact,
      confidence: repeatedFailure ? 0.9 : 0.75,
      severity,
      recommendations: [
        serverErrors > 0 ? 'Inspect application logs and recent deployments for server-side errors.' : 'Inspect upstream dependencies and network connectivity.',
        timeouts > 0 ? 'Review endpoint latency and timeout configuration.' : 'Continue monitoring the endpoint for recovery.',
      ],
      model: 'mock-v1',
    };
  },
};

const getProvider = (): AIProvider => {
  if (config.ai.provider !== 'mock') {
    logger.warn('Unsupported AI provider configured; using deterministic mock provider', {
      provider: config.ai.provider,
    });
  }
  return mockProvider;
};

export const analyzeIncident = async (incidentId: string): Promise<void> => {
  try {
    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) {
      logger.warn('Cannot analyze missing incident', { incidentId });
      return;
    }

    const context = await buildContext(incident);
    const result = await getProvider().analyze(context);

    await prisma.aIAnalysis.upsert({
      where: { incidentId },
      create: { incidentId, ...result },
      update: result,
    });

    logger.info('Incident analysis persisted', {
      incidentId,
      model: result.model,
      severity: result.severity,
      historyCount: context.monitoringHistory.length,
    });
  } catch (error) {
    logger.error('Incident analysis failed; incident remains persisted', { incidentId, error });
  }
};

export const getAnalysisContext = buildContext;
export const sanitizeAnalysisUrl = sanitizeUrl;
export const ANALYSIS_HISTORY_LIMIT = HISTORY_LIMIT;
