import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function run() {
  const user = { name: 'M9 User', email: `m9-${Date.now()}@example.com`, password: 'Password1!' };
  const user2 = { name: 'M9 User2', email: `m92-${Date.now()}@example.com`, password: 'Password1!' };
  
  const reg1 = await axios.post(`${API_URL}/auth/register`, user);
  const t1 = reg1.data.data.token;
  
  const reg2 = await axios.post(`${API_URL}/auth/register`, user2);
  const t2 = reg2.data.data.token;

  const apiRes = await axios.post(`${API_URL}/apis`, {
    name: 'M9 API', url: 'http://localhost:3000/health', method: 'GET', monitoringInterval: 10, timeout: 3000
  }, { headers: { Authorization: `Bearer ${t1}` } });
  const apiId = apiRes.data.data.api.id;

  const mLogRes = await axios.get(`${API_URL}/apis/${apiId}/monitoring-logs?limit=5`, { headers: { Authorization: `Bearer ${t1}` } });
  console.log('[M9] GET /apis/:id/monitoring-logs: Status ' + mLogRes.status);
  
  const mIncRes = await axios.get(`${API_URL}/incidents?limit=5`, { headers: { Authorization: `Bearer ${t1}` } });
  console.log('[M9] GET /incidents: Status ' + mIncRes.status + ' | Empty/Populated? ' + (mIncRes.data.data.incidents.length >= 0));
  
  // Try accessing another user's API logs
  try {
    await axios.get(`${API_URL}/apis/${apiId}/monitoring-logs`, { headers: { Authorization: `Bearer ${t2}` } });
  } catch (e: any) {
    console.log('[M9] Cross-user access blocked: ' + e.response?.status);
  }

  // Unauthenticated
  try {
    await axios.get(`${API_URL}/incidents`);
  } catch (e: any) {
    console.log('[M9] Unauthenticated access blocked: ' + e.response?.status);
  }

  // Invalid Pagination
  try {
    await axios.get(`${API_URL}/incidents?limit=-5&page=invalid`, { headers: { Authorization: `Bearer ${t1}` } });
  } catch (e: any) {
    console.log('[M9] Invalid pagination blocked: ' + e.response?.status);
  }

  // To check incidents/:id we need an actual incident. We can just hit it and get 404 or an incident.
  try {
    await axios.get(`${API_URL}/incidents/invalid-uuid`, { headers: { Authorization: `Bearer ${t1}` } });
  } catch (e: any) {
    console.log('[M9] GET /incidents/:id (invalid ID): ' + e.response?.status);
  }
}
run();
