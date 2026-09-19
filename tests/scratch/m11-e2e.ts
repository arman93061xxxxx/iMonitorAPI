import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api/v1';

async function runTests() {
  console.log('Starting M11 E2E Verification...');

  // Phase 4: Authentication
  const userA = { name: 'User A', email: `usera-${Date.now()}@example.com`, password: 'Password1!' };
  const userB = { name: 'User B', email: `userb-${Date.now()}@example.com`, password: 'Password1!' };
  
  let tokenA = '';
  let tokenB = '';

  try {
    const regA = await axios.post(`${API_URL}/auth/register`, userA);
    tokenA = regA.data.data.token;
    console.log('[AUTH] User A registered. Status: ' + regA.status);

    const regB = await axios.post(`${API_URL}/auth/register`, userB);
    tokenB = regB.data.data.token;
    console.log('[AUTH] User B registered. Status: ' + regB.status);

    const loginA = await axios.post(`${API_URL}/auth/login`, { email: userA.email, password: userA.password });
    if (!loginA.data.data.token) throw new Error('Login failed for User A');
    console.log('[AUTH] User A logged in. Status: ' + loginA.status);

    const meA = await axios.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${tokenA}` } });
    if (meA.data.data.user.email !== userA.email) throw new Error('/me failed');
    console.log('[AUTH] /me works with valid JWT. Status: ' + meA.status);

    try {
      await axios.get(`${API_URL}/auth/me`);
      throw new Error('/me did not reject missing JWT');
    } catch (e: any) {
      if (e.response?.status === 401) console.log('[AUTH] /me rejects missing JWT. Status: 401');
      else throw e;
    }

    try {
      await axios.post(`${API_URL}/auth/login`, { email: userA.email, password: 'WrongPassword' });
      throw new Error('Login did not reject bad password');
    } catch (e: any) {
      if (e.response?.status === 401) console.log('[AUTH] Login rejects invalid credentials safely. Status: 401');
      else throw e;
    }

  } catch (e: any) {
    console.error('Auth test failed:', e.response?.data || e.message);
  }

  // Phase 6 & Phase 5: API Management and Ownership
  let apiId = '';
  let failApiId = '';
  try {
    const apiRes = await axios.post(`${API_URL}/apis`, {
      name: 'Test API A',
      url: 'http://localhost:3000/health',
      method: 'GET',
      monitoringInterval: 10,
      timeout: 5000
    }, { headers: { Authorization: `Bearer ${tokenA}` } });
    
    apiId = apiRes.data.data.api.id;
    console.log(`[API] Created API: ${apiId}. Status: ${apiRes.status}`);

    try {
      await axios.get(`${API_URL}/apis/${apiId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
      throw new Error('User B accessed User A API');
    } catch (e: any) {
      if (e.response?.status === 404) console.log('[AUTHZ] User B cannot access User A API. Status: 404');
      else throw e;
    }

    // Invalid timeout validation
    try {
      await axios.post(`${API_URL}/apis`, {
        name: 'Test API Inv',
        url: 'http://localhost:3000/health',
        method: 'GET',
        monitoringInterval: 10,
        timeout: 15000
      }, { headers: { Authorization: `Bearer ${tokenA}` } });
      throw new Error('Timeout validation failed');
    } catch (e: any) {
      if (e.response?.status === 400) console.log('[API] Timeout validation enforced. Status: 400');
      else throw e;
    }
  } catch (e: any) {
    console.error('API/AuthZ test failed:', e.response?.data || e.message);
  }

  // Phase 7-10: Monitoring, Incidents, AI, Alerting
  console.log('Waiting for monitoring engine to trigger checks (12s)...');
  await new Promise(resolve => setTimeout(resolve, 12000));

  try {
    const logsRes = await axios.get(`${API_URL}/apis/${apiId}/monitoring-logs`, { headers: { Authorization: `Bearer ${tokenA}` } });
    const logs = logsRes.data.data.logs;
    console.log(`[MONITORING] Found ${logs.length} logs for healthy API. Status: ${logs[0]?.isAvailable ? 'UP' : 'DOWN'}, Code: ${logs[0]?.statusCode}, Time: ${logs[0]?.responseTime}ms`);

    // Create a failing API
    const failApiRes = await axios.post(`${API_URL}/apis`, {
      name: 'Fail API',
      url: 'http://localhost:9999/does-not-exist',
      method: 'GET',
      monitoringInterval: 10,
      timeout: 2000
    }, { headers: { Authorization: `Bearer ${tokenA}` } });
    failApiId = failApiRes.data.data.api.id;

    console.log('Waiting for failure detection and repeated failure (22s)...');
    await new Promise(resolve => setTimeout(resolve, 22000));

    const incRes = await axios.get(`${API_URL}/incidents`, { headers: { Authorization: `Bearer ${tokenA}` } });
    const incidents = incRes.data.data.incidents;
    const myInc = incidents.find((i: any) => i.apiId === failApiId);
    
    if (myInc) {
      console.log(`[INCIDENT] Found incident: ${myInc.id} with status ${myInc.status}, failures: ${myInc.failureCount}`);
      
      const analysisRes = await axios.get(`${API_URL}/incidents/${myInc.id}/analysis`, { headers: { Authorization: `Bearer ${tokenA}` } });
      console.log(`[AI] Found analysis. Severity: ${analysisRes.data.data.analysis?.severity}, Impact: ${analysisRes.data.data.analysis?.impact}`);
      
      const alertsRes = await axios.get(`${API_URL}/incidents/${myInc.id}/alerts`, { headers: { Authorization: `Bearer ${tokenA}` } });
      console.log(`[ALERT] Found ${alertsRes.data.data.alerts?.length} alerts. Status: ${alertsRes.data.data.alerts?.[0]?.status}`);
    } else {
      console.log('[INCIDENT] No incident found for failing API.');
    }

    // Now resolve the incident by changing the URL to a healthy one
    console.log('Resolving incident by changing to a healthy URL...');
    await axios.patch(`${API_URL}/apis/${failApiId}`, {
        url: 'http://localhost:3000/health'
    }, { headers: { Authorization: `Bearer ${tokenA}` } });

    console.log('Waiting for recovery detection (12s)...');
    await new Promise(resolve => setTimeout(resolve, 12000));

    const incResAfter = await axios.get(`${API_URL}/incidents`, { headers: { Authorization: `Bearer ${tokenA}` } });
    const myIncAfter = incResAfter.data.data.incidents.find((i: any) => i.apiId === failApiId);
    if (myIncAfter && myIncAfter.status === 'RESOLVED') {
        console.log(`[INCIDENT] Incident resolved successfully! Status: ${myIncAfter.status}`);
    } else {
        console.log(`[INCIDENT] Incident not resolved. Status: ${myIncAfter?.status}`);
    }

    // Fail it again
    console.log('Failing again to check new incident creation...');
    await axios.patch(`${API_URL}/apis/${failApiId}`, {
        url: 'http://localhost:9999/does-not-exist'
    }, { headers: { Authorization: `Bearer ${tokenA}` } });

    console.log('Waiting for second failure detection (12s)...');
    await new Promise(resolve => setTimeout(resolve, 12000));
    
    const incResFinal = await axios.get(`${API_URL}/incidents`, { headers: { Authorization: `Bearer ${tokenA}` } });
    const newInc = incResFinal.data.data.incidents.find((i: any) => i.apiId === failApiId && i.status === 'OPEN');
    if (newInc) {
        console.log(`[INCIDENT] New OPEN incident created after resolution. ID: ${newInc.id}`);
    } else {
        console.log(`[INCIDENT] New incident not created.`);
    }

  } catch (e: any) {
    console.error('Monitoring test failed:', e.response?.data || e.message);
  }
  
  // Clean up prisma
  await prisma.$disconnect();
  console.log('M11 Tests Complete.');
}

runTests().catch(console.error);
