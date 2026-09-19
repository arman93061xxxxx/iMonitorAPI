import http from 'http';
import prisma from '../src/config/database';
import { config } from '../src/config';
import { performCheck } from '../src/modules/monitoring/monitoring.service';
import { processCheckResult } from '../src/modules/incidents';
import { analyzeIncident, ANALYSIS_HISTORY_LIMIT, getAnalysisContext } from '../src/modules/ai';

const createMockServer = (): Promise<{ server: http.Server; url: string }> =>
  new Promise(resolve => {
    const server = http.createServer((_request, response) => {
      response.writeHead(500);
      response.end('Mock failure');
    });
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({ server, url: `http://user:password@localhost:${port}/health?apiKey=secret` });
    });
  });

const getUserId = async (): Promise<string> => {
  const user = await prisma.user.findFirst();
  if (user) return user.id;
  return (await prisma.user.create({
    data: {
      name: 'M7 Test User',
      email: `m7-${Date.now()}@monitoriq.local`,
      passwordHash: 'test-hash',
    },
  })).id;
};

const runCheck = async (api: { id: string }): Promise<void> => {
  const currentApi = await prisma.api.findUniqueOrThrow({ where: { id: api.id } });
  const result = await performCheck(currentApi);
  if (!result.logId) throw new Error('MonitoringLog was not persisted');
  await processCheckResult(currentApi.id, result, result.logId);
};

const run = async (): Promise<void> => {
  const { server, url } = await createMockServer();
  const api = await prisma.api.create({
    data: {
      name: 'M7 Analysis Test API',
      url,
      method: 'GET',
      expectedStatusCode: 200,
      monitoringInterval: 10,
      timeout: 5000,
      userId: await getUserId(),
    },
  });

  try {
    for (let attempt = 0; attempt < 3; attempt++) await runCheck(api);

    const incident = await prisma.incident.findFirstOrThrow({ where: { apiId: api.id } });
    const failedAnalysis = await prisma.aIAnalysis.findUniqueOrThrow({ where: { incidentId: incident.id } });
    const failedContext = await getAnalysisContext(incident);

    if (failedContext.monitoringHistory.length !== 3) throw new Error('Expected three bounded history records');
    if (failedAnalysis.severity !== 'HIGH' || !failedAnalysis.summary.includes('repeated')) {
      throw new Error('Repeated failure analysis was not generated');
    }
    if (failedContext.apiUrl.includes('password') || failedContext.apiUrl.includes('apiKey')) {
      throw new Error('Sensitive URL data was not sanitized');
    }

    await analyzeIncident(incident.id);
    const analysesAfterRepeat = await prisma.aIAnalysis.count({ where: { incidentId: incident.id } });
    if (analysesAfterRepeat !== 1) throw new Error('Analysis was duplicated');

    await prisma.monitoringLog.createMany({
      data: Array.from({ length: ANALYSIS_HISTORY_LIMIT + 2 }, (_, index) => ({
        apiId: api.id,
        statusCode: index === 0 ? 200 : 500,
        responseTime: 20 + index,
        isAvailable: index === 0,
        errorMessage: index === 0 ? null : 'Mock failure',
      })),
    });
    const boundedContext = await getAnalysisContext(incident);
    if (boundedContext.monitoringHistory.length !== ANALYSIS_HISTORY_LIMIT) {
      throw new Error('Analysis history exceeded its limit');
    }

    await prisma.incident.update({
      where: { id: incident.id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
    await analyzeIncident(incident.id);
    const recoveryAnalysis = await prisma.aIAnalysis.findUniqueOrThrow({ where: { incidentId: incident.id } });
    if (!recoveryAnalysis.impact.includes('recovered')) throw new Error('Recovery context was not reflected');

    const originalProvider = config.ai.provider;
    config.ai.provider = 'unavailable-provider';
    await analyzeIncident(incident.id);
    config.ai.provider = originalProvider;
    const fallbackAnalysis = await prisma.aIAnalysis.findUniqueOrThrow({ where: { incidentId: incident.id } });
    if (fallbackAnalysis.model !== 'mock-v1') throw new Error('Mock fallback was not used');

    const monitoringLogCount = await prisma.monitoringLog.count({ where: { apiId: api.id } });
    console.log('M7 evidence:', JSON.stringify({
      incidentId: incident.id,
      monitoringLogCount,
      boundedHistory: boundedContext.monitoringHistory.length,
      analysisCount: analysesAfterRepeat,
      summary: failedAnalysis.summary,
      possibleCause: failedAnalysis.possibleCause,
      severity: failedAnalysis.severity,
      impact: recoveryAnalysis.impact,
      recommendations: recoveryAnalysis.recommendations,
      model: fallbackAnalysis.model,
      sanitizedUrl: failedContext.apiUrl,
    }));
    console.log('M7 integration tests passed');
  } finally {
    await prisma.aIAnalysis.deleteMany({ where: { incident: { apiId: api.id } } });
    await prisma.incidentLog.deleteMany({ where: { incident: { apiId: api.id } } });
    await prisma.incident.deleteMany({ where: { apiId: api.id } });
    await prisma.monitoringLog.deleteMany({ where: { apiId: api.id } });
    await prisma.api.delete({ where: { id: api.id } });
    server.close();
    await prisma.$disconnect();
  }
};

void run().catch(error => {
  console.error('M7 integration tests failed:', error);
  process.exitCode = 1;
});
