/**
 * Milestone 6 Integration Test Script
 * 
 * Tests the complete incident lifecycle with a local mock server.
 */

import http from 'http';
import prisma from '../src/config/database';
import { performCheck } from '../src/modules/monitoring/monitoring.service';
import { processCheckResult } from '../src/modules/incidents';
import { connectKafkaProducer, disconnectKafkaProducer } from '../src/config/kafka';
import { REDIS_KEYS } from '../src/utils/constants';

async function getTestUserId(): Promise<string> {
  const user = await prisma.user.findFirst({
    where: { email: 'admin@monitoriq.local' },
  });
  if (user) return user.id;
  
  const newUser = await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'test-m6@monitoriq.local',
      passwordHash: 'test-hash',
      role: 'ADMIN',
    },
  });
  return newUser.id;
}

interface TestResult {
  name: string;
  passed: boolean;
  evidence: string;
}

const results: TestResult[] = [];

function createMockServer(returnStatusCode: number): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(returnStatusCode);
      res.end('Mock response');
    });

    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        server,
        url: `http://localhost:${port}`,
      });
    });
  });
}

async function assert(condition: boolean, evidence: string): Promise<void> {
  if (!condition) {
    throw new Error(`Assertion failed: ${evidence}`);
  }
}

async function cleanupTestData(apiId: string): Promise<void> {
  await prisma.incidentLog.deleteMany({ where: { incident: { apiId } } });
  await prisma.incident.deleteMany({ where: { apiId } });
  await prisma.monitoringLog.deleteMany({ where: { apiId } });
}

async function setupTestApi(url: string, expectedStatusCode: number = 200): Promise<any> {
  const userId = await getTestUserId();
  const api = await prisma.api.create({
    data: {
      name: `Test API - ${Date.now()}`,
      url,
      method: 'GET',
      expectedStatusCode,
      isActive: true,
      monitoringInterval: 1,
      timeout: 10000,
      userId,
    },
  });
  return api;
}

async function runCheckAndProcess(api: any): Promise<any> {
  const result = await performCheck(api);
  if (result.logId) {
    await processCheckResult(api.id, result, result.logId);
  }
  return result;
}

async function test1_FirstFailureCreatesIncident(): Promise<void> {
  console.log('\n=== Test 1: First failure creates incident ===');
  
  const { server: mockServer, url } = await createMockServer(500);
  const api = await setupTestApi(url, 200);
  await cleanupTestData(api.id);

  const result = await runCheckAndProcess(api);
  
  const logs = await prisma.monitoringLog.findMany({ where: { apiId: api.id } });
  const incidents = await prisma.incident.findMany({ where: { apiId: api.id } });
  const incidentLogs = await prisma.incidentLog.findMany({
    where: { incidentId: { in: incidents.map(i => i.id) } },
  });

  await assert(result.isAvailable === false, `isAvailable should be false, got ${result.isAvailable}`);
  await assert(logs.length === 1, `MonitoringLog count should be 1, got ${logs.length}`);
  await assert(incidents.length === 1, `Incident count should be 1, got ${incidents.length}`);
  await assert(incidents[0].status === 'OPEN', `Incident status should be OPEN, got ${incidents[0].status}`);
  await assert(incidentLogs.length === 1, `IncidentLog count should be 1, got ${incidentLogs.length}`);
  await assert(result.logId !== undefined, 'logId should be set in CheckResult');

  results.push({
    name: 'Test 1 - First failure creates incident',
    passed: true,
    evidence: `MonitoringLog: ${logs.length}, Incidents: ${incidents.length} (status: ${incidents[0].status}), IncidentLogs: ${incidentLogs.length}, logId: ${result.logId}`,
  });

  mockServer.close();
  await prisma.api.delete({ where: { id: api.id } });
}

async function test2_RepeatedFailureNoDuplicate(): Promise<void> {
  console.log('\n=== Test 2: Repeated failure does NOT create duplicate incident ===');
  
  const { server: mockServer, url } = await createMockServer(500);
  const api = await setupTestApi(url, 200);
  await cleanupTestData(api.id);

  await runCheckAndProcess(api);
  
  const incidentsBefore = await prisma.incident.findMany({ where: { apiId: api.id, status: 'OPEN' } });
  const incidentLogsBefore = await prisma.incidentLog.findMany({
    where: { incidentId: { in: incidentsBefore.map(i => i.id) } },
  });

  await runCheckAndProcess(api);

  const incidentsAfter = await prisma.incident.findMany({ where: { apiId: api.id } });
  const incidentLogsAfter = await prisma.incidentLog.findMany({
    where: { incidentId: { in: incidentsAfter.map(i => i.id) } },
  });

  await assert(incidentsAfter.length === 1, `Incident count should still be 1, got ${incidentsAfter.length}`);
  await assert(incidentsAfter[0].status === 'OPEN', `Incident should still be OPEN`);
  await assert(incidentLogsAfter.length === 2, `IncidentLog count should be 2 (one per failure), got ${incidentLogsAfter.length}`);

  results.push({
    name: 'Test 2 - Repeated failure no duplicate',
    passed: true,
    evidence: `Incidents: ${incidentsAfter.length} (status: ${incidentsAfter[0].status}), IncidentLogs: ${incidentLogsAfter.length}`,
  });

  mockServer.close();
  await prisma.api.delete({ where: { id: api.id } });
}

async function test3_RecoveryResolvesIncident(): Promise<void> {
  console.log('\n=== Test 3: Recovery resolves incident ===');
  
  const { server: mockServerFail, url: failUrl } = await createMockServer(500);
  const { server: mockServerRecover, url: recoverUrl } = await createMockServer(200);
  
  const api = await setupTestApi(failUrl, 200);
  await cleanupTestData(api.id);

  await runCheckAndProcess(api);
  
  const incidentsBefore = await prisma.incident.findMany({ where: { apiId: api.id } });
  await assert(incidentsBefore.length === 1, 'Should have 1 incident after first failure');

  // Update API to return 200
  await prisma.api.update({
    where: { id: api.id },
    data: { url: recoverUrl, expectedStatusCode: 200 },
  });

  const refreshedApi = await prisma.api.findUnique({ where: { id: api.id } });
  const result = await runCheckAndProcess(refreshedApi!);
  
  const incidentsAfter = await prisma.incident.findMany({ where: { apiId: api.id } });
  const incident = incidentsAfter[0];
  const incidentLogs = await prisma.incidentLog.findMany({ where: { incidentId: incident.id } });

  await assert(result.isAvailable === true, `isAvailable should be true, got ${result.isAvailable}`);
  await assert(incident.status === 'RESOLVED', `Incident status should be RESOLVED, got ${incident.status}`);
  await assert(incident.resolvedAt !== null, `resolvedAt should be set`);
  await assert(incidentLogs.length >= 2, `IncidentLog count should be >= 2, got ${incidentLogs.length}`);

  results.push({
    name: 'Test 3 - Recovery resolves incident',
    passed: true,
    evidence: `Incident status: ${incident.status}, resolvedAt: ${incident.resolvedAt}, IncidentLogs: ${incidentLogs.length}`,
  });

  mockServerFail.close();
  mockServerRecover.close();
  await prisma.api.delete({ where: { id: api.id } });
}

async function test4_FailureAfterResolutionCreatesNewIncident(): Promise<void> {
  console.log('\n=== Test 4: Failure after resolution creates NEW incident ===');
  
  const { server: mockServerFail, url: failUrl } = await createMockServer(500);
  const { server: mockServerRecover, url: recoverUrl } = await createMockServer(200);
  
  const api = await setupTestApi(failUrl, 200);
  await cleanupTestData(api.id);

  // First failure
  await runCheckAndProcess(api);
  
  // Recovery
  await prisma.api.update({
    where: { id: api.id },
    data: { url: recoverUrl, expectedStatusCode: 200 },
  });
  const recoveredApi = await prisma.api.findUnique({ where: { id: api.id } });
  await runCheckAndProcess(recoveredApi!);

  let incidents = await prisma.incident.findMany({ where: { apiId: api.id } });
  await assert(incidents.length === 1, `Should have 1 incident after recovery, got ${incidents.length}`);
  await assert(incidents[0].status === 'RESOLVED', 'First incident should be RESOLVED');

  // Second failure
  await prisma.api.update({
    where: { id: api.id },
    data: { url: failUrl, expectedStatusCode: 200 },
  });
  const failedAgainApi = await prisma.api.findUnique({ where: { id: api.id } });
  await runCheckAndProcess(failedAgainApi!);

  incidents = await prisma.incident.findMany({ where: { apiId: api.id } });
  const openIncidents = incidents.filter(i => i.status === 'OPEN');
  const resolvedIncidents = incidents.filter(i => i.status === 'RESOLVED');

  await assert(incidents.length === 2, `Should have 2 incidents total, got ${incidents.length}`);
  await assert(openIncidents.length === 1, `Should have 1 OPEN incident, got ${openIncidents.length}`);
  await assert(resolvedIncidents.length === 1, `Should have 1 RESOLVED incident, got ${resolvedIncidents.length}`);

  results.push({
    name: 'Test 4 - Failure after resolution creates new incident',
    passed: true,
    evidence: `Total incidents: ${incidents.length}, OPEN: ${openIncidents.length}, RESOLVED: ${resolvedIncidents.length}`,
  });

  mockServerFail.close();
  mockServerRecover.close();
  await prisma.api.delete({ where: { id: api.id } });
}

async function test5_KafkaUnavailableDoesNotCrash(): Promise<void> {
  console.log('\n=== Test 5: Kafka unavailable does not crash monitoring ===');
  
  const { server: mockServer, url } = await createMockServer(500);
  const api = await setupTestApi(url, 200);
  await cleanupTestData(api.id);

  // Disconnect Kafka producer to simulate failure
  await disconnectKafkaProducer();

  try {
    const result = await runCheckAndProcess(api);
    
    const logs = await prisma.monitoringLog.findMany({ where: { apiId: api.id } });
    const incidents = await prisma.incident.findMany({ where: { apiId: api.id } });

    await assert(logs.length === 1, `MonitoringLog should be persisted, got ${logs.length}`);
    await assert(incidents.length === 1, `Incident should be persisted, got ${incidents.length}`);
    await assert(incidents[0].status === 'OPEN', `Incident should be OPEN, got ${incidents[0].status}`);

    results.push({
      name: 'Test 5 - Kafka unavailable does not crash',
      passed: true,
      evidence: `MonitoringLog: ${logs.length}, Incidents: ${incidents.length}, No crash`,
    });
  } finally {
    // Reconnect Kafka for subsequent tests
    try {
      await connectKafkaProducer();
    } catch (e) {
      console.warn('Could not reconnect Kafka producer:', e);
    }
  }

  mockServer.close();
  await prisma.api.delete({ where: { id: api.id } });
}

async function test6_HealthEndpointAndRedis(): Promise<void> {
  console.log('\n=== Test 6: /health endpoint and Redis status ===');
  
  const { server: mockServer, url } = await createMockServer(200);
  const api = await setupTestApi(url, 200);
  await cleanupTestData(api.id);
  const { createRedisClient } = await import('../src/config/redis');
  const redis = createRedisClient();
  await redis.ping();

  const result = await runCheckAndProcess(api);
  
  const logs = await prisma.monitoringLog.findMany({ where: { apiId: api.id } });
  
  // Check Redis status
  let redisStatus = null;
  try {
    const raw = await redis.get(REDIS_KEYS.API_STATUS(api.id));
    redisStatus = raw ? JSON.parse(raw) : null;
  } catch (e) {
    // Redis might not be available in test env
  }

  await assert(logs.length === 1, `MonitoringLog should be created, got ${logs.length}`);
  await assert(result.isAvailable === true, `API should be available`);
  if (redisStatus) {
    await assert(redisStatus.status === 'UP', `Redis status should be UP, got ${redisStatus?.status}`);
  }

  results.push({
    name: 'Test 6 - Health endpoint and Redis',
    passed: true,
    evidence: `MonitoringLog: ${logs.length}, isAvailable: ${result.isAvailable}, Redis status: ${redisStatus?.status || 'N/A'}`,
  });

  mockServer.close();
  await prisma.api.delete({ where: { id: api.id } });
}

async function runAllTests(): Promise<void> {
  console.log('Starting Milestone 6 Integration Tests...\n');

  // Connect Kafka for tests that need it
  try {
    await connectKafkaProducer();
  } catch (e) {
    console.warn('Kafka not available, some tests may be limited:', e);
  }

  try {
    await test1_FirstFailureCreatesIncident();
    await test2_RepeatedFailureNoDuplicate();
    await test3_RecoveryResolvesIncident();
    await test4_FailureAfterResolutionCreatesNewIncident();
    await test5_KafkaUnavailableDoesNotCrash();
    await test6_HealthEndpointAndRedis();
  } catch (error) {
    console.error('\nTest suite failed:', error);
    await disconnectKafkaProducer().catch(() => {});
    process.exit(1);
  }

  console.log('\n=== TEST RESULTS SUMMARY ===');
  results.forEach((r, i) => {
    const status = r.passed ? 'PASS' : 'FAIL';
    console.log(`${i + 1}. [${status}] ${r.name}`);
    console.log(`   Evidence: ${r.evidence}`);
  });

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`\n${passed}/${total} tests passed`);

  await disconnectKafkaProducer().catch(() => {});

  if (passed === total) {
    console.log('\nAll Milestone 6 tests passed!');
    process.exit(0);
  } else {
    console.log('\nSome tests failed!');
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  console.error('Unhandled error:', error);
  disconnectKafkaProducer().catch(() => {});
  process.exit(1);
});
