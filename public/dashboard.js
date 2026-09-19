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
      $('apiTableBody').innerHTML = '<tr><td colspan="4" class="detail-empty">No APIs registered. Add one via the API.</td></tr>'; 
      return; 
    } 
    
    $('apiTableBody').innerHTML = state.apis.map(api => { 
      const status = !api.isActive ? 'INACTIVE' : !api.latest ? 'UNKNOWN' : api.latest.isAvailable ? 'UP' : 'DOWN'; 
      const statusClass = status === 'UNKNOWN' || status === 'INACTIVE' ? 'neutral' : status.toLowerCase(); 
      return `
        <tr data-api-id="${escapeHtml(api.id)}">
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
        </tr>`; 
    }).join(''); 
    
    document.querySelectorAll('[data-api-id]').forEach(row => row.addEventListener('click', () => loadApiHistory(row.dataset.apiId))); 
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
      $('detailStatus').innerHTML = '<span class="pulse-dot"></span> Loading...';
      const data = await apiFetch(`/apis/${apiId}/monitoring-logs?page=1&limit=20`); 
      const api = state.apis.find(a => a.id === apiId);
      
      $('detailTitle').textContent = `${api?.name || 'API'} History`; 
      $('detailStatus').innerHTML = `<span class="pulse-dot"></span> ${data.logs.length} checks`; 
      $('detailStatus').className = 'status-pill neutral'; 
      
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
        </div>` : '<p class="detail-empty">No monitoring history available.</p>'; 
    } catch (error) { 
      setError(error.message); 
    } 
  };

  const loadIncident = async incidentId => { 
    try { 
      $('detailStatus').innerHTML = '<span class="pulse-dot"></span> Loading...';
      const data = await apiFetch(`/incidents/${incidentId}`); 
      const incident = data.incident; 
      const analysis = incident.aiAnalyses[0]; 
      
      $('detailTitle').textContent = `${incident.api.name} / Incident`; 
      $('detailStatus').innerHTML = `<span class="pulse-dot"></span> ${incident.status}`; 
      $('detailStatus').className = `status-pill ${incident.status.toLowerCase()}`; 
      
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
            <h3>AI analysis</h3>
            ${analysis ? `
              <p><b>Summary:</b> ${escapeHtml(analysis.summary)}</p>
              <p><b>Cause:</b> ${escapeHtml(analysis.possibleCause)}</p>
              <p><b>Impact:</b> ${escapeHtml(analysis.impact)}</p>
              <p><b>Severity:</b> ${escapeHtml(analysis.severity)}</p>
              <ul>${(analysis.recommendations || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
            ` : '<p>No AI analysis available.</p>'}
          </div>
          <div class="detail-block">
            <h3>Alerts</h3>
            ${incident.alerts.length ? incident.alerts.map(alert => `
              <p><b>${escapeHtml(alert.event)}</b><br><span class="status-pill success">${escapeHtml(alert.status)}</span> <span class="muted">${escapeHtml(formatDate(alert.createdAt))}</span></p>
            `).join('') : '<p>No alerts triggered.</p>'}
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
  
  if (localStorage.getItem(tokenKey)) {
    loadDashboard(); 
  } else {
    showAuth();
  }
})();
