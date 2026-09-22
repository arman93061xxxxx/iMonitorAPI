(() => {
  const tokenKey = 'monitoriq_token';
  const state = { apis: [], incidents: [] };
  const $ = id => document.getElementById(id);
  
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const safeUrl = value => { try { const url = new URL(value); url.username = ''; url.password = ''; url.search = ''; url.hash = ''; return url.toString(); } catch { return '[redacted URL]'; } };
  const formatDate = value => value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : 'Not available';
  
  const setError = message => { 
    $('pageError').textContent = message || ''; 
    $('pageError').classList.toggle('hidden', !message); 
  };

  const apiFetch = async (path, options = {}) => {
    const response = await fetch(`/api/v1${path}`, { 
      ...options, 
      headers: { ...(options.headers || {}), Authorization: `Bearer ${localStorage.getItem(tokenKey) || ''}` } 
    });
    if (response.status === 401) { 
      localStorage.removeItem(tokenKey); 
      showAuth(); 
      throw new Error('Your session expired. Please sign in again.'); 
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error?.message || 'The service could not complete that request.');
    return body.data;
  };

  const showAuth = () => { 
    $('authView').classList.remove('hidden'); 
    $('dashboardView').classList.add('hidden'); 
  };
  const showDashboard = () => { 
    $('authView').classList.add('hidden'); 
    $('dashboardView').classList.remove('hidden'); 
  };

  const metric = (label, value) => `
    <article class="metric slide-up">
      <span class="metric-label">${label}</span>
      <strong class="metric-value">${escapeHtml(value)}</strong>
    </article>`;

  const renderMetrics = summary => { 
    const { apis, monitoring, incidents } = summary; 
    $('metricGrid').innerHTML = [
      metric('Total APIs', apis.total), 
      metric('Active APIs', apis.active), 
      metric('Total Checks', monitoring.totalChecks), 
      metric('Failed Checks', monitoring.failedChecks), 
      metric('Avg Response', `${Math.round(monitoring.averageResponseTime || 0)} ms`), 
      metric('Availability', `${monitoring.availabilityPercentage || 100}%`), 
      metric('Open Incidents', incidents.open)
    ].join(''); 
  };

  const renderApis = () => { 
    $('apiCount').textContent = `${state.apis.length} APIs`; 
    if (!state.apis.length) { 
      $('apiTableBody').innerHTML = '<tr><td colspan="5" class="detail-empty">No APIs registered. Click "+ Add API" above to begin monitoring.</td></tr>'; 
      return; 
    } 
    
    $('apiTableBody').innerHTML = state.apis.map(api => { 
      const status = !api.isActive ? 'INACTIVE' : !api.latest ? 'UNKNOWN' : api.latest.isAvailable ? 'UP' : 'DOWN'; 
      const statusClass = status === 'UNKNOWN' || status === 'INACTIVE' ? 'neutral' : status.toLowerCase(); 
      return `
        <tr data-api-id="${escapeHtml(api.id)}" style="cursor: pointer;">
          <td>
            <span class="api-name">${escapeHtml(api.name)}</span>
            <span class="api-url">${escapeHtml(safeUrl(api.url))}</span>
          </td>
          <td>
            <span class="status-pill ${statusClass}">
              <span class="pulse-dot"></span>
              ${status}
            </span>
          </td>
          <td class="muted">${escapeHtml(api.latest ? formatDate(api.latest.timestamp) : 'No history')}</td>
          <td>${escapeHtml(api.latest?.responseTime != null ? `${api.latest.responseTime} ms` : '—')}</td>
          <td class="table-actions">
            <button class="btn-secondary btn-xs check-api-btn" data-api-id="${escapeHtml(api.id)}" title="Run instant health probe">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Check
            </button>
            <button class="btn-danger btn-xs delete-api-btn" data-api-id="${escapeHtml(api.id)}" title="Delete API">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        </tr>`; 
    }).join(''); 
    
    document.querySelectorAll('[data-api-id]').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        loadApiHistory(row.dataset.apiId);
      });
    });

    document.querySelectorAll('.check-api-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const apiId = btn.dataset.apiId;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<span class="pulse-dot"></span>';
        btn.disabled = true;
        try {
          await apiFetch(`/apis/${apiId}/check`, { method: 'POST' });
          await loadDashboard();
          loadApiHistory(apiId);
        } catch (err) {
          setError(err.message);
        } finally {
          btn.innerHTML = originalHtml;
          btn.disabled = false;
        }
      });
    });

    document.querySelectorAll('.delete-api-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const apiId = btn.dataset.apiId;
        if (!confirm('Are you sure you want to stop monitoring and delete this API?')) return;
        try {
          await apiFetch(`/apis/${apiId}`, { method: 'DELETE' });
          await loadDashboard();
          $('detailTitle').textContent = 'Select an incident or API';
          $('detailHeaderActions').innerHTML = '<span id="detailStatus" class="status-pill neutral"><span class="pulse-dot"></span> Waiting</span>';
          $('detailContent').innerHTML = '<div class="detail-empty">API deleted successfully. Choose an item above to inspect.</div>';
        } catch (err) {
          setError(err.message);
        }
      });
    });
  };

  const renderIncidents = () => { 
    $('incidentCount').textContent = `${state.incidents.length} recent`; 
    if (!state.incidents.length) { 
      $('incidentList').innerHTML = '<p class="detail-empty">No incidents recorded. All good!</p>'; 
      return; 
    } 
    $('incidentList').innerHTML = state.incidents.map(incident => `
      <button class="incident-item" data-incident-id="${escapeHtml(incident.id)}">
        <strong>${escapeHtml(incident.api.name)}</strong>
        <span class="incident-meta">
          <span class="status-pill ${incident.status.toLowerCase()}"><span class="pulse-dot"></span> ${escapeHtml(incident.status)}</span>
          <span>${escapeHtml(incident.analysisSeverity || incident.severity)}</span>
        </span>
        <span class="incident-meta">
          <span>Opened ${escapeHtml(formatDate(incident.startedAt))}</span>
        </span>
      </button>`).join(''); 
    document.querySelectorAll('[data-incident-id]').forEach(item => item.addEventListener('click', () => loadIncident(item.dataset.incidentId))); 
  };

  const loadApiHistory = async apiId => { 
    try { 
      $('detailHeaderActions').innerHTML = '<span id="detailStatus" class="status-pill neutral"><span class="pulse-dot"></span> Loading...</span>';
      const data = await apiFetch(`/apis/${apiId}/monitoring-logs?page=1&limit=20`); 
      const api = state.apis.find(a => a.id === apiId);
      
      $('detailTitle').textContent = `${api?.name || 'API'} History`; 
      $('detailHeaderActions').innerHTML = `
        <span id="detailStatus" class="status-pill neutral"><span class="pulse-dot"></span> ${data.logs.length} checks</span>
        <button class="btn-secondary btn-xs" id="investigationCheckBtn" title="Probe now">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Check Now
        </button>
        <button class="btn-ghost btn-xs" id="investigationToggleBtn">
          ${api?.isActive ? 'Pause' : 'Resume'}
        </button>
        <button class="btn-danger btn-xs" id="investigationDeleteBtn">Delete</button>
      `; 

      $('investigationCheckBtn').addEventListener('click', async () => {
        try {
          $('investigationCheckBtn').innerHTML = '<span class="pulse-dot"></span> Checking...';
          $('investigationCheckBtn').disabled = true;
          await apiFetch(`/apis/${apiId}/check`, { method: 'POST' });
          await loadDashboard();
          loadApiHistory(apiId);
        } catch (err) {
          setError(err.message);
        }
      });

      $('investigationToggleBtn').addEventListener('click', async () => {
        try {
          const action = api?.isActive ? 'disable' : 'enable';
          await apiFetch(`/apis/${apiId}/${action}`, { method: 'POST' });
          await loadDashboard();
          loadApiHistory(apiId);
        } catch (err) {
          setError(err.message);
        }
      });

      $('investigationDeleteBtn').addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this API?')) return;
        try {
          await apiFetch(`/apis/${apiId}`, { method: 'DELETE' });
          await loadDashboard();
          $('detailTitle').textContent = 'Select an incident or API';
          $('detailHeaderActions').innerHTML = '<span id="detailStatus" class="status-pill neutral"><span class="pulse-dot"></span> Waiting</span>';
          $('detailContent').innerHTML = '<div class="detail-empty">API deleted. Choose an item above to inspect.</div>';
        } catch (err) {
          setError(err.message);
        }
      });
      
      $('detailContent').innerHTML = data.logs.length ? `
        <div class="table-wrap custom-scroll">
          <table class="modern-table">
            <thead>
              <tr><th>Time</th><th>Status</th><th>Response</th><th>Available</th></tr>
            </thead>
            <tbody>
              ${data.logs.map(log => `
                <tr>
                  <td class="muted">${escapeHtml(formatDate(log.timestamp))}</td>
                  <td>${escapeHtml(log.statusCode ?? 'ERR')}</td>
                  <td>${escapeHtml(log.responseTime != null ? `${log.responseTime} ms` : '—')}</td>
                  <td>
                    <span class="status-pill ${log.isAvailable ? 'up' : 'down'}">
                      <span class="pulse-dot"></span>
                      ${log.isAvailable ? 'YES' : 'NO'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : '<p class="detail-empty">No monitoring history recorded yet. Click "Check Now" above to run an instant check!</p>'; 
    } catch (error) { 
      setError(error.message); 
    } 
  };

  const loadIncident = async incidentId => { 
    try { 
      $('detailHeaderActions').innerHTML = '<span id="detailStatus" class="status-pill neutral"><span class="pulse-dot"></span> Loading...</span>';
      const data = await apiFetch(`/incidents/${incidentId}`); 
      const incident = data.incident; 
      const analysis = incident.aiAnalyses[0]; 
      
      $('detailTitle').textContent = `${incident.api.name} / Incident`; 
      $('detailHeaderActions').innerHTML = `
        <span class="status-pill ${incident.status.toLowerCase()}"><span class="pulse-dot"></span> ${escapeHtml(incident.status)}</span>
      `; 
      
      $('detailContent').innerHTML = `
        <div class="detail-grid">
          <div class="detail-block">
            <h3>Lifecycle</h3>
            <p><b>Opened:</b> ${escapeHtml(formatDate(incident.startedAt))}</p>
            <p><b>Resolved:</b> ${escapeHtml(formatDate(incident.resolvedAt))}</p>
            <p><b>Failures:</b> ${escapeHtml(incident.failureCount)}</p>
            <p><b>URL:</b> ${escapeHtml(safeUrl(incident.api.url))}</p>
          </div>
          <div class="detail-block">
            <h3>AI Root Cause Analysis</h3>
            ${analysis ? `
              <p><b>Summary:</b> ${escapeHtml(analysis.summary)}</p>
              <p><b>Probable Cause:</b> ${escapeHtml(analysis.possibleCause)}</p>
              <p><b>Impact:</b> ${escapeHtml(analysis.impact)}</p>
              <p><b>Severity:</b> <span class="status-pill down">${escapeHtml(analysis.severity)}</span></p>
              <p><b>Remediation Actions:</b></p>
              <ul>${(analysis.recommendations || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
            ` : '<p class="muted">AI analysis is being generated...</p>'}
          </div>
          <div class="detail-block">
            <h3>Alert Notifications</h3>
            ${incident.alerts.length ? incident.alerts.map(alert => `
              <p><b>${escapeHtml(alert.event)}</b><br><span class="status-pill success">${escapeHtml(alert.status)}</span> <span class="muted">${escapeHtml(formatDate(alert.createdAt))}</span></p>
            `).join('') : '<p class="muted">No alerts triggered for this incident.</p>'}
          </div>
        </div>`; 
    } catch (error) { 
      setError(error.message); 
    } 
  };

  const loadDashboard = async () => { 
    setError(''); 
    showDashboard(); 
    try { 
      const [summary, apisData, incidentsData] = await Promise.all([
        apiFetch('/analytics/summary'), 
        apiFetch('/apis?limit=100'), 
        apiFetch('/incidents?page=1&limit=20')
      ]); 
      
      state.apis = await Promise.all((apisData.apis || []).map(async api => { 
        try { 
          const logs = await apiFetch(`/apis/${api.id}/monitoring-logs?page=1&limit=1`); 
          return { ...api, latest: logs.logs[0] }; 
        } catch { 
          return { ...api, latest: null }; 
        } 
      })); 
      
      state.incidents = incidentsData.incidents || []; 
      
      renderMetrics(summary.summary); 
      renderApis(); 
      renderIncidents(); 
      $('lastUpdated').textContent = `Updated ${new Date().toLocaleTimeString()}`; 
    } catch (error) { 
      setError(error.message); 
    } 
  };

  // Auth form
  $('loginForm').addEventListener('submit', async event => { 
    event.preventDefault(); 
    $('loginError').textContent = ''; 
    const btn = event.target.querySelector('button');
    const ogHtml = btn.innerHTML;
    btn.innerHTML = '<span class="pulse-dot"></span> Authenticating...';
    btn.disabled = true; 
    
    try { 
      const response = await fetch('/api/v1/auth/login', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ email: $('email').value, password: $('password').value }) 
      }); 
      const body = await response.json(); 
      if (!response.ok) throw new Error(body.error?.message || 'Sign in failed.'); 
      
      localStorage.setItem(tokenKey, body.data.token); 
      await loadDashboard(); 
    } catch (error) { 
      $('loginError').textContent = error.message; 
    } finally {
      btn.innerHTML = ogHtml;
      btn.disabled = false; 
    }
  });
  
  $('refreshButton').addEventListener('click', loadDashboard); 
  $('logoutButton').addEventListener('click', () => { 
    localStorage.removeItem(tokenKey); 
    showAuth(); 
  });

  // Modal handlers
  const openModal = () => {
    $('addApiModal').classList.remove('hidden');
    $('addApiError').textContent = '';
    $('testConnectionResult').className = 'test-result-content muted';
    $('testConnectionResult').innerHTML = 'Click <b>Test Connection</b> to send a real-time probe and check reachability before saving.';
  };

  const closeModal = () => {
    $('addApiModal').classList.add('hidden');
    $('addApiForm').reset();
    $('newApiExpectedStatus').value = '200';
    $('newApiInterval').value = '60';
    $('newApiTimeout').value = '5000';
    $('newApiMethod').value = 'GET';
  };

  $('openAddApiBtnTop').addEventListener('click', openModal);
  $('openAddApiBtn').addEventListener('click', openModal);
  $('closeAddApiModal').addEventListener('click', closeModal);
  $('cancelAddApiBtn').addEventListener('click', closeModal);

  // Close modal on click outside dialog
  $('addApiModal').addEventListener('click', e => {
    if (e.target === $('addApiModal')) closeModal();
  });

  // Test Connection live probe
  $('testConnectionBtn').addEventListener('click', async () => {
    const url = $('newApiUrl').value.trim();
    if (!url) {
      $('testConnectionResult').className = 'test-result-content failure';
      $('testConnectionResult').innerHTML = 'Please enter an Endpoint URL first.';
      return;
    }

    const method = $('newApiMethod').value;
    const expectedStatusCode = parseInt($('newApiExpectedStatus').value, 10) || 200;
    const timeout = parseInt($('newApiTimeout').value, 10) || 5000;

    const btn = $('testConnectionBtn');
    const ogBtnHtml = btn.innerHTML;
    btn.innerHTML = '<span class="pulse-dot"></span> Testing...';
    btn.disabled = true;

    $('testConnectionResult').className = 'test-result-content muted';
    $('testConnectionResult').innerHTML = '<span class="pulse-dot"></span> Pinging target endpoint...';

    try {
      const data = await apiFetch('/apis/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, method, expectedStatusCode, timeout })
      });

      const res = data.result;
      if (res.isAvailable) {
        $('testConnectionResult').className = 'test-result-content success';
        $('testConnectionResult').innerHTML = `<b>Reachable!</b> Received HTTP <b>${res.statusCode}</b> in <b>${res.responseTime} ms</b>. Status matches expected (${res.expectedStatusCode}).`;
      } else {
        $('testConnectionResult').className = 'test-result-content failure';
        const msg = res.statusCode ? `Returned HTTP ${res.statusCode} (expected ${res.expectedStatusCode})` : (res.errorMessage || 'Connection failed');
        $('testConnectionResult').innerHTML = `<b>Target responded with error:</b> ${escapeHtml(msg)} in <b>${res.responseTime} ms</b>.`;
      }
    } catch (err) {
      $('testConnectionResult').className = 'test-result-content failure';
      $('testConnectionResult').innerHTML = `<b>Probe failed:</b> ${escapeHtml(err.message)}`;
    } finally {
      btn.innerHTML = ogBtnHtml;
      btn.disabled = false;
    }
  });

  // Add API Form Submit
  $('addApiForm').addEventListener('submit', async e => {
    e.preventDefault();
    $('addApiError').textContent = '';

    const name = $('newApiName').value.trim();
    const url = $('newApiUrl').value.trim();
    const method = $('newApiMethod').value;
    const expectedStatusCode = parseInt($('newApiExpectedStatus').value, 10) || 200;
    const monitoringInterval = parseInt($('newApiInterval').value, 10) || 60;
    const timeout = parseInt($('newApiTimeout').value, 10) || 5000;
    const description = $('newApiDescription').value.trim() || undefined;

    const submitBtn = $('saveAddApiBtn');
    const ogBtnHtml = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="pulse-dot"></span> Saving...';
    submitBtn.disabled = true;

    try {
      const data = await apiFetch('/apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          url,
          method,
          expectedStatusCode,
          monitoringInterval,
          timeout,
          description
        })
      });

      const newApi = data.api;

      // Trigger instant check right away
      await apiFetch(`/apis/${newApi.id}/check`, { method: 'POST' }).catch(() => {});

      closeModal();
      await loadDashboard();
      loadApiHistory(newApi.id);
    } catch (err) {
      $('addApiError').textContent = err.message;
    } finally {
      submitBtn.innerHTML = ogBtnHtml;
      submitBtn.disabled = false;
    }
  });
  
  if (localStorage.getItem(tokenKey)) {
    loadDashboard(); 
  } else {
    showAuth(); 
  }
})();
