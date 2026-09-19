import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api/v1';
const DASHBOARD_URL = 'http://localhost:3000/dashboard';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForIncidentStatus(apiId: string, status: string, token: string, maxAttempts = 6): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const incRes = await axios.get(`${API_URL}/incidents`, { headers: { Authorization: `Bearer ${token}` } });
    const inc = incRes.data.data.incidents.find((inc: any) => inc.apiId === apiId && inc.status === status);
    if (inc) return inc;
    await sleep(10000); // 10s intervals
  }
  return null;
}

async function runTests() {
  console.log('--- STARTING M11 EVIDENCE PASS ---');

  const user = { name: 'Evid User', email: `evid-${Date.now()}@example.com`, password: 'Password1!' };
  
  const regRes = await axios.post(`${API_URL}/auth/register`, user);
  const token = regRes.data.data.token;
  
  console.log('\n--- 1. INCIDENT FAILURE -> RECOVERY -> NEW FAILURE ---');
  let targetUrl = 'http://localhost:3000/health'; // A. Healthy
  const apiRes = await axios.post(`${API_URL}/apis`, {
    name: 'Lifecycle API',
    url: targetUrl,
    method: 'GET',
    monitoringInterval: 10,
    timeout: 3000
  }, { headers: { Authorization: `Bearer ${token}` } });
  const apiId = apiRes.data.data.api.id;
  console.log(`[API] Created API: ${apiId}`);

  console.log('Waiting 15s for healthy check...');
  await sleep(15000);
  
  // B. Failure occurs
  console.log('Switching to failing URL...');
  await axios.patch(`${API_URL}/apis/${apiId}`, { url: 'http://localhost:9999/fail' }, { headers: { Authorization: `Bearer ${token}` } });
  
  console.log('Waiting for first failure...');
  const inc1 = await waitForIncidentStatus(apiId, 'OPEN', token);
  console.log(`[INCIDENT #1] ID: ${inc1?.id}, Status: ${inc1?.status}, FailureCount: ${inc1?.failureCount}`);

  // C. Repeated failure
  console.log('Waiting 20s for repeated failure...');
  await sleep(20000);
  
  let incRes = await axios.get(`${API_URL}/incidents`, { headers: { Authorization: `Bearer ${token}` } });
  let inc1_repeated = incRes.data.data.incidents.find((i: any) => i.id === inc1.id);
  console.log(`[INCIDENT #1] ID: ${inc1_repeated?.id}, Status: ${inc1_repeated?.status}, FailureCount: ${inc1_repeated?.failureCount}`);
  
  const logsCount = await prisma.incidentLog.count({ where: { incidentId: inc1_repeated.id } });
  console.log(`[INCIDENT #1] IncidentLog count: ${logsCount}`);

  // F. Recovery occurs
  console.log('Switching to healthy URL (Recovery)...');
  await axios.patch(`${API_URL}/apis/${apiId}`, { url: 'http://localhost:3000/health' }, { headers: { Authorization: `Bearer ${token}` } });
  console.log('Waiting for recovery...');
  const inc1_resolved = await waitForIncidentStatus(apiId, 'RESOLVED', token);
  console.log(`[INCIDENT #1] ID: ${inc1_resolved?.id}, Status: ${inc1_resolved?.status}`);

  // H. NEW failure occurs
  console.log('Switching to failing URL again...');
  await axios.patch(`${API_URL}/apis/${apiId}`, { url: 'http://localhost:9999/fail-again' }, { headers: { Authorization: `Bearer ${token}` } });
  console.log('Waiting for new failure...');
  const inc2 = await waitForIncidentStatus(apiId, 'OPEN', token);
  console.log(`[INCIDENT #2] ID: ${inc2?.id}, Status: ${inc2?.status}, FailureCount: ${inc2?.failureCount}`);
  if (inc1.id !== inc2?.id) console.log('EVIDENCE: Incident #2 is different from Incident #1');


  console.log('\n--- 2. MONITORING FAILURE MODES ---');
  // We'll create APIs and let the scheduler run them, then check the DB.
  const testApis = [
    { name: 'Success', url: 'http://localhost:3000/health', method: 'GET', timeout: 5000, expectedStatusCode: 200, type: 'SUCCESS' },
    { name: 'HTTP Failure', url: 'http://localhost:3000/api/v1/not-found', method: 'GET', timeout: 5000, expectedStatusCode: 200, type: 'HTTP_FAIL' },
    { name: 'Timeout', url: 'http://localhost:3000/health', method: 'GET', timeout: 1, expectedStatusCode: 200, type: 'TIMEOUT' },
    { name: 'DNS Failure', url: 'http://nxdomain.example.invalid', method: 'GET', timeout: 5000, expectedStatusCode: 200, type: 'NETWORK_FAIL' }
  ];

  for (const t of testApis) {
    const a = await prisma.api.create({ data: { name: t.name, url: t.url, method: t.method, timeout: t.timeout, expectedStatusCode: t.expectedStatusCode, monitoringInterval: 10, userId: (await prisma.user.findFirst())!.id } });
    console.log(`Waiting for ${t.type} check...`);
    await sleep(15000);
    const mLog = await prisma.monitoringLog.findFirst({ where: { apiId: a.id }, orderBy: { createdAt: 'desc' } });
    console.log(`[MODE: ${t.type}] API: ${a.id} | isAvailable: ${mLog?.isAvailable} | isTimeout: ${mLog?.isTimeout} | error: ${mLog?.errorMessage}`);
    
    // Check redis via docker exec
    try {
      const rStatus = execSync(`docker exec monitoriq-redis redis-cli GET api:${a.id}:status`).toString().trim();
      console.log(`[MODE: ${t.type}] Redis status: ${rStatus}`);
    } catch(e) {
      console.log(`[MODE: ${t.type}] Redis status: Error executing redis-cli`);
    }
  }


  console.log('\n--- 5. AI SANITIZATION RUNTIME TEST ---');
  const secretApiRes = await axios.post(`${API_URL}/apis`, {
    name: 'Secret API',
    url: 'https://user:fakepassword@example.invalid/path?apiKey=FAKE_SECRET',
    method: 'GET',
    monitoringInterval: 10,
    timeout: 3000
  }, { headers: { Authorization: `Bearer ${token}` } });
  const secretApiId = secretApiRes.data.data.api.id;
  
  // Wait for it to fail and analyze
  const secInc = await waitForIncidentStatus(secretApiId, 'OPEN', token, 4);
  console.log(`[AI SANITIZE] Incident ID: ${secInc?.id}`);
  
  if (secInc) {
    const aiRes = await axios.get(`${API_URL}/incidents/${secInc.id}/analysis`, { headers: { Authorization: `Bearer ${token}` } });
    console.log(`[AI SANITIZE] Summary (does it contain secrets?): ${aiRes.data.data.analysis.summary}`);
    console.log(`[AI SANITIZE] History Count: ${aiRes.data.data.analysis.historyCount || 'N/A'}`);
  }


  console.log('\n--- 6. ALERT RUNTIME EVIDENCE ---');
  const alertsForInc1 = await prisma.alert.findMany({ where: { incidentId: inc1.id } });
  for (const al of alertsForInc1) {
    console.log(`[ALERT] ID: ${al.id} | Event: ${al.event} | Status: ${al.status}`);
  }

  console.log('\n--- 8. DASHBOARD RUNTIME VERIFICATION (STATIC HTTP) ---');
  try {
    const dashRes = await axios.get(DASHBOARD_URL);
    console.log(`[DASHBOARD] HTTP GET /dashboard Status: ${dashRes.status}`);
    console.log(`[DASHBOARD] Contains "MonitorIQ Dashboard": ${dashRes.data.includes('MonitorIQ Dashboard')}`);
  } catch (e: any) {
    console.log(`[DASHBOARD] Error: ${e.message}`);
  }

  await prisma.$disconnect();
  console.log('\n--- EVIDENCE SCRIPT COMPLETE ---');
}

runTests().catch(console.error);
