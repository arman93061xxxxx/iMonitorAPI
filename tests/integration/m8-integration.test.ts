import http from 'http';
import prisma from '../src/config/database';
import { config } from '../src/config';
import { performCheck } from '../src/modules/monitoring/monitoring.service';
import { processCheckResult } from '../src/modules/incidents';
import { clearLastMockEmail, getLastMockEmail } from '../src/modules/alerts';

const createServer = (statusCode: number): Promise<{ server: http.Server; url: string }> =>
  new Promise(resolve => {
    const server = http.createServer((_request, response) => {
      response.writeHead(statusCode);
      response.end(statusCode === 200 ? 'OK' : 'Failure');
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
    data: { name: 'M8 Test User', email: `m8-${Date.now()}@monitoriq.local`, passwordHash: 'test-hash' },
  })).id;
};

const check = async (apiId: string): Promise<void> => {
  const api = await prisma.api.findUniqueOrThrow({ where: { id: apiId } });
  const result = await performCheck(api);
  if (!result.logId) throw new Error('MonitoringLog was not persisted');
  await processCheckResult(api.id, result, result.logId);
};

const run = async (): Promise<void> => {
  const originalProvider = config.email.provider;
  const originalRecipient = config.email.to;
  config.email.provider = 'mock';
  config.email.to = 'm8-alerts@example.invalid';
  clearLastMockEmail();

  const failing = await createServer(500);
  const healthy = await createServer(200);
  const api = await prisma.api.create({
    data: {
      name: 'M8 Sensitive Test API',
      url: failing.url,
      method: 'GET',
      expectedStatusCode: 200,
      monitoringInterval: 10,
      timeout: 5000,
      userId: await getUserId(),
    },
  });

  try {
    await check(api.id);
    const incident = await prisma.incident.findFirstOrThrow({ where: { apiId: api.id } });
    const openedAlerts = await prisma.alert.findMany({ where: { incidentId: incident.id } });
    const openedEmail = getLastMockEmail();
    if (openedAlerts.length !== 1 || openedAlerts[0].event !== 'INCIDENT_OPENED' || openedAlerts[0].status !== 'SENT') {
      throw new Error('Opened alert was not persisted as SENT');
    }
    if (!openedEmail || openedEmail.to !== config.email.to || !openedEmail.subject.includes('Incident opened')) {
      throw new Error('Mock opened email recipient or subject is incorrect');
    }
    const sensitiveValues = ['password', 'apiKey', 'secret', 'Bearer', 'eyJ', 'DATABASE_URL', 'redis://', 'localhost:9092'];
    if (sensitiveValues.some(value => openedEmail?.text.includes(value))) {
      throw new Error('Sensitive value found in email body');
    }

    await check(api.id);
    const alertsAfterRepeat = await prisma.alert.count({ where: { incidentId: incident.id, event: 'INCIDENT_OPENED' } });
    if (alertsAfterRepeat !== 1) throw new Error('Repeated failure created a duplicate opening alert');

    await prisma.api.update({ where: { id: api.id }, data: { url: healthy.url } });
    await check(api.id);
    const resolved = await prisma.incident.findUniqueOrThrow({ where: { id: incident.id } });
    const alertsAfterRecovery = await prisma.alert.findMany({ where: { incidentId: incident.id }, orderBy: { event: 'asc' } });
    const resolutionEmail = getLastMockEmail();
    if (resolved.status !== 'RESOLVED' || alertsAfterRecovery.length !== 2) throw new Error('Recovery alert flow failed');
    if (!resolutionEmail || !resolutionEmail.subject.includes('Incident resolved') || !resolutionEmail.text.includes('RESOLVED')) {
      throw new Error('Resolution mock email was not generated');
    }

    await check(api.id);
    const alertsAfterDuplicateResolution = await prisma.alert.count({ where: { incidentId: incident.id } });
    if (alertsAfterDuplicateResolution !== 2) throw new Error('Duplicate resolution alert was created');

    await prisma.api.update({ where: { id: api.id }, data: { url: failing.url } });
    config.email.provider = 'unavailable-provider';
    await check(api.id);
    const secondIncident = await prisma.incident.findFirstOrThrow({ where: { apiId: api.id, status: 'OPEN' } });
    const failedAlert = await prisma.alert.findFirstOrThrow({ where: { incidentId: secondIncident.id, event: 'INCIDENT_OPENED' } });
    const secondIncidentLogs = await prisma.incidentLog.count({ where: { incidentId: secondIncident.id } });
    if (failedAlert.status !== 'FAILED' || !failedAlert.error || secondIncidentLogs < 1) throw new Error('Provider failure was not recorded safely');
    const totalLogs = await prisma.monitoringLog.count({ where: { apiId: api.id } });
    console.log('M8 evidence:', JSON.stringify({
      incidentId: incident.id,
      openedAlert: openedAlerts[0].status,
      openedRecipient: openedEmail?.to,
      openedSubject: openedEmail?.subject,
      openedBody: openedEmail?.text,
      alertsAfterRepeat,
      resolvedStatus: resolved.status,
      resolutionSubject: resolutionEmail?.subject,
      totalAlertsAfterDuplicateResolution: alertsAfterDuplicateResolution,
      failedAlertStatus: failedAlert.status,
      failedAlertError: failedAlert.error,
      incidentLogsAfterProviderFailure: secondIncidentLogs,
      monitoringLogs: totalLogs,
    }));
    console.log('M8 integration tests passed');
  } finally {
    config.email.provider = originalProvider;
    config.email.to = originalRecipient;
    await prisma.alert.deleteMany({ where: { incident: { apiId: api.id } } });
    await prisma.aIAnalysis.deleteMany({ where: { incident: { apiId: api.id } } });
    await prisma.incidentLog.deleteMany({ where: { incident: { apiId: api.id } } });
    await prisma.incident.deleteMany({ where: { apiId: api.id } });
    await prisma.monitoringLog.deleteMany({ where: { apiId: api.id } });
    await prisma.api.delete({ where: { id: api.id } });
    failing.server.close();
    healthy.server.close();
    await prisma.$disconnect();
  }
};

void run().catch(error => {
  console.error('M8 integration tests failed:', error);
  process.exitCode = 1;
});
