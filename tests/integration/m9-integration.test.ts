import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';

interface AuthResult {
  token: string;
  userId: string;
}

const register = async (label: string): Promise<AuthResult> => {
  const response = await request(app).post('/api/v1/auth/register').send({
    name: `M9 ${label}`,
    email: `m9-${label}-${Date.now()}@monitoriq.local`,
    password: 'M9-ValidPassword1!',
  });
  if (response.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(response.body)}`);
  return { token: response.body.data.token, userId: response.body.data.user.id };
};

const run = async (): Promise<void> => {
  const owner = await register('owner');
  const other = await register('other');
  const api = await prisma.api.create({
    data: {
      name: 'M9 History API',
      url: 'https://user:password@example.com/health?apiKey=secret',
      method: 'GET',
      expectedStatusCode: 200,
      monitoringInterval: 10,
      timeout: 5000,
      userId: owner.userId,
    },
  });
  const inactiveApi = await prisma.api.create({
    data: { name: 'M9 Inactive API', url: 'https://example.com/inactive', isActive: false, userId: owner.userId },
  });
  const otherApi = await prisma.api.create({
    data: { name: 'M9 Other API', url: 'https://example.com/other', userId: other.userId },
  });

  try {
    const logs = await prisma.monitoringLog.createManyAndReturn({
      data: [
        { apiId: api.id, statusCode: 500, responseTime: 100, isAvailable: false, errorMessage: 'failure' },
        { apiId: api.id, statusCode: 500, responseTime: 120, isAvailable: false, errorMessage: 'failure' },
        { apiId: api.id, statusCode: 200, responseTime: 80, isAvailable: true },
      ],
    });
    const incident = await prisma.incident.create({
      data: {
        apiId: api.id,
        incidentNumber: `M9-${Date.now()}`,
        status: 'RESOLVED',
        severity: 'HIGH',
        startedAt: new Date(Date.now() - 60000),
        resolvedAt: new Date(),
        failureCount: 2,
        summary: 'Repeated HTTP 500 responses',
        possibleCause: 'Server-side failure',
      },
    });
    await prisma.incidentLog.create({ data: { incidentId: incident.id, monitoringLogId: logs[0].id, event: 'INCIDENT_OPENED' } });
    await prisma.aIAnalysis.create({
      data: {
        incidentId: incident.id,
        summary: 'Repeated server failures',
        possibleCause: 'Application error',
        impact: 'Requests failed temporarily',
        confidence: 0.9,
        severity: 'HIGH',
        recommendations: ['Inspect logs'],
        model: 'mock-v1',
      },
    });
    await prisma.alert.create({ data: { incidentId: incident.id, event: 'INCIDENT_OPENED', recipient: 'm9@example.invalid', status: 'SENT', sentAt: new Date() } });

    const logsResponse = await request(app)
      .get(`/api/v1/apis/${api.id}/monitoring-logs?page=1&limit=2`)
      .set('Authorization', `Bearer ${owner.token}`);
    const otherLogsResponse = await request(app)
      .get(`/api/v1/apis/${api.id}/monitoring-logs`)
      .set('Authorization', `Bearer ${other.token}`);
    if (logsResponse.status !== 200 || logsResponse.body.data.logs.length !== 2 || logsResponse.body.data.pagination.total !== 3) throw new Error('Owner monitoring pagination failed');
    if (otherLogsResponse.status !== 404) throw new Error('Cross-user monitoring access was not denied');

    const incidentResponse = await request(app).get(`/api/v1/incidents/${incident.id}`).set('Authorization', `Bearer ${owner.token}`);
    const otherIncidentResponse = await request(app).get(`/api/v1/incidents/${incident.id}`).set('Authorization', `Bearer ${other.token}`);
    const analysisResponse = await request(app).get(`/api/v1/incidents/${incident.id}/analysis`).set('Authorization', `Bearer ${owner.token}`);
    const alertsResponse = await request(app).get(`/api/v1/incidents/${incident.id}/alerts`).set('Authorization', `Bearer ${owner.token}`);
    if (incidentResponse.status !== 200 || incidentResponse.body.data.incident.aiAnalyses.length !== 1 || incidentResponse.body.data.incident.alerts.length !== 1) throw new Error('Incident detail did not include bounded related data');
    if (otherIncidentResponse.status !== 404 || analysisResponse.status !== 200 || alertsResponse.status !== 200) throw new Error('Incident subresource ownership/read failed');

    const invalidPage = await request(app).get(`/api/v1/apis/${api.id}/monitoring-logs?page=0&limit=101`).set('Authorization', `Bearer ${owner.token}`);
    const ownerSummary = await request(app).get('/api/v1/analytics/summary').set('Authorization', `Bearer ${owner.token}`);
    const otherSummary = await request(app).get('/api/v1/analytics/summary').set('Authorization', `Bearer ${other.token}`);
    if (invalidPage.status !== 400) throw new Error('Invalid pagination was accepted');
    if (ownerSummary.status !== 200 || ownerSummary.body.data.summary.apis.total !== 2 || ownerSummary.body.data.summary.monitoring.totalChecks !== 3 || ownerSummary.body.data.summary.incidents.total !== 1) throw new Error('Owner analytics scope failed');
    if (otherSummary.status !== 200 || otherSummary.body.data.summary.apis.total !== 1 || otherSummary.body.data.summary.monitoring.totalChecks !== 0 || otherSummary.body.data.summary.incidents.total !== 0) throw new Error('Other-user analytics scope failed');

    const unauthenticated = await request(app).get('/api/v1/incidents');
    if (unauthenticated.status !== 401) throw new Error('Unauthenticated request was accepted');
    const responseText = JSON.stringify({ detail: incidentResponse.body, analysis: analysisResponse.body, alerts: alertsResponse.body });
    for (const secret of ['password', 'apiKey', 'secret', 'DATABASE_URL', 'redis://', '9092', 'Bearer']) {
      if (responseText.includes(secret)) throw new Error(`Sensitive value exposed: ${secret}`);
    }

    console.log('M9 evidence:', JSON.stringify({
      ownerMonitoring: { status: logsResponse.status, count: logsResponse.body.data.logs.length, pagination: logsResponse.body.data.pagination },
      crossUserMonitoring: { status: otherLogsResponse.status },
      ownerIncident: { status: incidentResponse.status, logs: incidentResponse.body.data.incident.incidentLogs.length, analyses: incidentResponse.body.data.incident.aiAnalyses.length, alerts: incidentResponse.body.data.incident.alerts.length },
      crossUserIncident: { status: otherIncidentResponse.status },
      analysis: { status: analysisResponse.status, model: analysisResponse.body.data.analysis.model },
      alerts: { status: alertsResponse.status, count: alertsResponse.body.data.alerts.length },
      invalidPagination: invalidPage.status,
      ownerSummary: ownerSummary.body.data.summary,
      otherSummary: otherSummary.body.data.summary,
      unauthenticated: unauthenticated.status,
      sensitiveData: 'not present',
    }));
    console.log('M9 integration tests passed');
  } finally {
    await prisma.alert.deleteMany({ where: { incident: { apiId: api.id } } });
    await prisma.aIAnalysis.deleteMany({ where: { incident: { apiId: api.id } } });
    await prisma.incidentLog.deleteMany({ where: { incident: { apiId: api.id } } });
    await prisma.incident.deleteMany({ where: { apiId: api.id } });
    await prisma.monitoringLog.deleteMany({ where: { apiId: api.id } });
    await prisma.api.deleteMany({ where: { id: { in: [api.id, inactiveApi.id, otherApi.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [owner.userId, other.userId] } } });
    await prisma.$disconnect();
  }
};

void run().catch(error => {
  console.error('M9 integration tests failed:', error);
  process.exitCode = 1;
});
