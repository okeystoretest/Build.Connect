/**
 * dashboard-ti.js — Painel de Requisições TI.
 * S-006/S-010: Convertido para ES Module ("use strict" implícito).
 *   - Sem poluição de escopo global (type="module" isola automaticamente).
 *   - Sem inline event handlers (onchange="..." → addEventListener).
 *   - API_KEY removida; autenticação via X-Session-Token na sessão do usuário.
 *   - S-003: endpoint dashboard-ti-data agora requer sessão autenticada.
 */

'use strict';

// ── Configuração ────────────────────────────────────────────────────────────

const API_URL    = 'https://mrdrfcclfbncwqyehknx.supabase.co/functions/v1/bc-api';
const REFRESH_MS = 5 * 60 * 1000;
const SESSION_KEY = 'bc-dashboard.session-token';

// Chave publicável — projetada para uso client-side (não é secret).
// O Supabase gateway exige este header para rotear requests para a edge function.
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_qOJLHHri-wmnwqku9EpQlg_31Aq_PI5';

const COLORS_CAT  = ['3B82F6','8B5CF6','10B981','F59E0B','EF4444','6366F1','14B8A6'];
const COLORS_UNIT = ['D4A257','10B981','3B82F6','8B5CF6','F59E0B','EF4444','6366F1'];

let refreshTimer = null;
let barTimer     = null;
let _selectedMonth = buildCurrentMonthKey();
let _allTickets    = [];

// ── Sessão ──────────────────────────────────────────────────────────────────

function getSessionToken() {
  try { return sessionStorage.getItem(SESSION_KEY) || ''; } catch { return ''; }
}

function saveSessionToken(token) {
  try { sessionStorage.setItem(SESSION_KEY, token); } catch {}
}

function clearSessionToken() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

async function requestApi(action, fields = {}) {
  const token = getSessionToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  };
  if (token) headers['X-Session-Token'] = token;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...fields }),
  });

  if (res.status === 401) {
    clearSessionToken();
    showLoginOverlay();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
  return res.json();
}

// ── Login overlay ───────────────────────────────────────────────────────────

function showLoginOverlay() {
  const existing = document.getElementById('dash-login-overlay');
  if (existing) { existing.hidden = false; return; }

  const overlay = document.createElement('div');
  overlay.id = 'dash-login-overlay';
  overlay.innerHTML = `
    <div class="dash-login-card">
      <div class="dash-login-brand">BUILD<span>.CONNECT</span> · REQUISIÇÕES</div>
      <p class="dash-login-sub">Acesso restrito. Faça login com suas credenciais.</p>
      <input id="dash-login-id"   class="dash-login-input" type="text"     placeholder="ID do usuário" autocomplete="username" />
      <div class="dash-login-pass-wrap">
        <input id="dash-login-pw" class="dash-login-input" type="password" placeholder="Senha"         autocomplete="current-password" />
      </div>
      <button id="dash-login-btn" class="dash-login-btn">Entrar</button>
      <p id="dash-login-err" class="dash-login-err" hidden></p>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('dash-login-btn').addEventListener('click', handleLogin);
  document.getElementById('dash-login-pw').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
}

function hideLoginOverlay() {
  const overlay = document.getElementById('dash-login-overlay');
  // remove() instead of hidden=true: the overlay's CSS `display:flex` has higher
  // specificity than the UA-stylesheet `[hidden]{display:none}`, so only DOM
  // removal guarantees the modal disappears regardless of the CSS cascade.
  if (overlay) overlay.remove();
}

async function handleLogin() {
  const idEl  = document.getElementById('dash-login-id');
  const pwEl  = document.getElementById('dash-login-pw');
  const btn   = document.getElementById('dash-login-btn');
  const errEl = document.getElementById('dash-login-err');

  const id = (idEl?.value || '').trim();
  const pw = pwEl?.value || '';
  if (!id || !pw) { showLoginError('Informe o ID e a senha.'); return; }

  btn.disabled    = true;
  btn.textContent = 'Aguarde…';
  errEl.hidden    = true;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ action: 'login', id, password: pw }),
    });
    const data = await res.json();

    if (data.success && data.sessionToken) {
      saveSessionToken(data.sessionToken);
      hideLoginOverlay();
      fetchData();
    } else {
      showLoginError(data.message || 'Credenciais inválidas.');
    }
  } catch {
    showLoginError('Falha de conexão. Tente novamente.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Entrar';
  }
}

function showLoginError(msg) {
  const el = document.getElementById('dash-login-err');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}

// ── Filtros de mês ──────────────────────────────────────────────────────────

function buildCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function buildMonthOptions(tickets) {
  const months = new Map();
  const now = new Date();
  const currentKey = buildCurrentMonthKey();
  months.set(currentKey, formatMonthLabel(now.getFullYear(), now.getMonth()));

  for (const t of tickets) {
    if (!t.timestamp) continue;
    const d = new Date(t.timestamp);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!months.has(key)) months.set(key, formatMonthLabel(d.getFullYear(), d.getMonth()));
  }

  return [...months.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, label]) => ({ key, label }));
}

function formatMonthLabel(year, monthIndex) {
  const names = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${names[monthIndex]} ${year}`;
}

function filterByMonth(tickets, monthKey) {
  if (!monthKey || monthKey === 'tudo') return tickets;
  const [y, m] = monthKey.split('-').map(Number);
  return tickets.filter(t => {
    if (!t.timestamp) return false;
    const d = new Date(t.timestamp);
    return d.getFullYear() === y && d.getMonth() + 1 === m;
  });
}

// ── Relógio e barra de refresh ──────────────────────────────────────────────

function updateClock() {
  const el = document.getElementById('clock-value');
  if (el) el.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function startRefreshBar() {
  const bar = document.getElementById('refresh-bar');
  if (!bar) return;
  clearInterval(barTimer);
  const start = Date.now();
  bar.style.transition = 'none';
  bar.style.width = '100%';
  barTimer = setInterval(() => {
    const pct = Math.max(0, 100 - ((Date.now() - start) / REFRESH_MS) * 100);
    bar.style.transition = 'width 1s linear';
    bar.style.width = pct + '%';
    if (pct <= 0) clearInterval(barTimer);
  }, 1000);
}

// ── Normalização de dados ───────────────────────────────────────────────────

function normalizeTicket(t) {
  if (!t) return t;
  return {
    id:                t.id,
    status:            t.status,
    timestamp:         t.timestamp,
    solicitanteNome:   t.solicitante_nome  ?? t.solicitanteNome  ?? '—',
    solicitanteSetor:  t.solicitante_setor ?? t.solicitanteSetor ?? '—',
    solicitanteId:     t.solicitante_id    ?? t.solicitanteId    ?? '',
    unidade:           t.unidade           ?? '—',
    categoria:         t.categoria         ?? '—',
    descricao:         t.descricao         ?? '',
    atribuidoParaNome: t.atribuido_para_nome ?? t.atribuidoParaNome ?? '',
    atribuidoParaId:   t.atribuido_para_id  ?? t.atribuidoParaId  ?? '',
    dataAtribuicao:    t.data_atribuicao    ?? t.dataAtribuicao   ?? null,
    dataInicio:        t.data_inicio        ?? t.dataInicio       ?? null,
    dataConclusao:     t.data_conclusao     ?? t.dataConclusao    ?? null,
    duracaoMinutos:    t.duracao_minutos    ?? t.duracaoMinutos   ?? null,
    observacao:        t.observacao         ?? '',
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }); }
  catch { return '—'; }
}

function fmtDuration(mins) {
  if (!mins || isNaN(mins)) return null;
  const m = parseInt(mins);
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), r = m % 60;
  return r > 0 ? `${h}h ${r}min` : `${h}h`;
}

function countBy(arr, key) {
  const map = {};
  (arr || []).forEach(t => {
    const k = (typeof key === 'function' ? key(t) : t[key]) || 'Não informado';
    map[k] = (map[k] || 0) + 1;
  });
  return Object.entries(map).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function getTopAssignee(done) {
  const map = {};
  (done || []).forEach(t => { if (t.atribuidoParaNome) map[t.atribuidoParaNome] = (map[t.atribuidoParaNome] || 0) + 1; });
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0].split(' ')[0] : '—';
}

function colorBars(data, colors) {
  if (!data.length) return '<p class="chart-empty">Sem dados disponíveis</p>';
  const max   = Math.max(...data.map(d => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  return '<div class="color-bars">' + data.slice(0, 7).map((item, i) => {
    const c   = colors[i % colors.length];
    const pct = Math.round((item.count / total) * 100);
    const bw  = Math.round((item.count / max) * 100);
    return `<div class="color-bar-row">
      <span class="dot" style="background:#${c}"></span>
      <span class="bar-label" title="${esc(item.label)}">${esc(item.label)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${bw}%;background:#${c}"></div></div>
      <span class="bar-meta">${item.count} <small>(${pct}%)</small></span>
    </div>`;
  }).join('') + '</div>';
}

function statusBadge(status) {
  const map = {
    'Pendente':     ['s-pending',  'F59E0B'],
    'Atribuído':    ['s-assigned', '8B5CF6'],
    'Em andamento': ['s-progress', '3B82F6'],
    'Concluído':    ['s-done',     '10B981'],
  };
  const [cls, color] = map[status] || ['', '8E9AAF'];
  return `<span class="status-badge ${cls}"><span class="dot" style="background:#${color}"></span>${esc(status)}</span>`;
}

function renderTable(rows) {
  if (!rows.length) return '<p style="padding:24px;text-align:center;color:var(--muted)">Nenhum chamado para o filtro selecionado.</p>';
  return `<table>
    <thead><tr>
      <th>ID</th><th>Status</th><th>Solicitante</th><th>Setor</th>
      <th>Unidade</th><th>Categoria</th><th>Responsável</th><th>Aberto em</th><th>Duração</th>
    </tr></thead>
    <tbody>
      ${rows.map(t => `<tr>
        <td class="td-id" data-label="ID">${esc(t.id||'—')}</td>
        <td data-label="Status">${statusBadge(t.status||'—')}</td>
        <td data-label="Solicitante">${esc(t.solicitanteNome||'—')}</td>
        <td data-label="Setor">${esc(t.solicitanteSetor||'—')}</td>
        <td data-label="Unidade">${esc(t.unidade||'—')}</td>
        <td data-label="Categoria">${esc(t.categoria||'—')}</td>
        <td data-label="Responsável">${esc(t.atribuidoParaNome||'—')}</td>
        <td data-label="Aberto em">${fmtDate(t.timestamp)}</td>
        <td data-label="Duração">${fmtDuration(t.duracaoMinutos)||'—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

// ── Filtros (chamados por addEventListener — S-006) ─────────────────────────

function applyFilters() {
  const statusFilter  = document.getElementById('status-select')?.value || 'Pendente';
  const monthFiltered = filterByMonth(_allTickets, _selectedMonth);
  const filtered =
    statusFilter === 'all'    ? monthFiltered :
    statusFilter === 'active' ? monthFiltered.filter(t => t.status !== 'Concluído') :
    statusFilter === 'done'   ? monthFiltered.filter(t => t.status === 'Concluído') :
    monthFiltered.filter(t => t.status === statusFilter);

  const wrap  = document.getElementById('table-wrap');
  const count = document.getElementById('table-count');
  if (wrap)  wrap.innerHTML = renderTable(filtered);
  if (count) count.textContent = `${filtered.length} registros`;
}

function onMonthChange(value) {
  _selectedMonth = value;
  renderDashboard({ _useCache: true });
}

/** Vincula os event listeners dos controles após renderDashboard() escrever o DOM. */
function attachDashboardListeners() {
  document.getElementById('month-select')
    ?.addEventListener('change', e => onMonthChange(e.target.value));
  document.getElementById('status-select')
    ?.addEventListener('change', () => applyFilters());
}

// ── Fetch ───────────────────────────────────────────────────────────────────

async function fetchData() {
  setRefreshing(true);
  try {
    const data = await requestApi('dashboard-ti-data', { period: 'tudo' });
    if (data.success) {
      data.tickets          = (data.tickets          || []).map(normalizeTicket);
      data.completedTickets = (data.completedTickets || []).map(normalizeTicket);
      _allTickets = [...data.tickets, ...data.completedTickets];
      renderDashboard(data);
    } else {
      renderError(data.message || 'Erro ao carregar dados.');
    }
  } catch (e) {
    if (!e.message?.includes('Sessão')) {
      renderError('Falha de conexão. Tentando novamente em 5 minutos.');
    }
  }
  setRefreshing(false);
  startRefreshBar();
  scheduleNext();
}

function scheduleNext() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(fetchData, REFRESH_MS);
}

function setRefreshing(on) {
  const el = document.getElementById('refresh-status');
  if (!el) return;
  el.className = 'dash-refresh-info' + (on ? ' is-refreshing' : '');
  el.innerHTML = on
    ? '<i data-lucide="refresh-cw"></i><span>Atualizando…</span>'
    : '<i data-lucide="clock-4"></i><span>Atualiza a cada 5 min</span>';
  if (window.lucide) lucide.createIcons();
}

// ── Render ──────────────────────────────────────────────────────────────────

function renderDashboard(data = {}) {
  const all        = filterByMonth(_allTickets, _selectedMonth);
  const pending    = all.filter(t => t.status === 'Pendente');
  const assigned   = all.filter(t => t.status === 'Atribuído');
  const inProgress = all.filter(t => t.status === 'Em andamento');
  const done       = all.filter(t => t.status === 'Concluído');
  const total      = all.length || 1;

  const doneWithTime = done.filter(t => t.duracaoMinutos > 0);
  const avgMins = doneWithTime.length
    ? Math.round(doneWithTime.reduce((s, t) => s + t.duracaoMinutos, 0) / doneWithTime.length)
    : null;
  const avgLabel        = avgMins !== null ? fmtDuration(avgMins) : '—';
  const conclusionRate  = all.length > 0 ? Math.round((done.length / all.length) * 100) : 0;
  const catByUnit       = countBy(all, t => `${t.unidade||'N/I'} · ${t.categoria||'N/I'}`);
  const monthOptions    = buildMonthOptions(_allTickets);
  const monthSelectHtml = monthOptions.map(opt =>
    `<option value="${esc(opt.key)}" ${opt.key === _selectedMonth ? 'selected' : ''}>${esc(opt.label)}</option>`
  ).join('') + `<option value="tudo"${_selectedMonth === 'tudo' ? ' selected' : ''}>Todos os meses</option>`;

  const statusFilter   = document.getElementById('status-select')?.value || 'Pendente';
  const tableFiltered  =
    statusFilter === 'all'    ? all :
    statusFilter === 'active' ? all.filter(t => t.status !== 'Concluído') :
    statusFilter === 'done'   ? all.filter(t => t.status === 'Concluído') :
    all.filter(t => t.status === statusFilter);

  const segments = [
    { label:'Pendente',     count:pending.length,    color:'F59E0B' },
    { label:'Atribuído',    count:assigned.length,   color:'8B5CF6' },
    { label:'Em andamento', count:inProgress.length, color:'3B82F6' },
    { label:'Concluído',    count:done.length,       color:'10B981' },
  ].filter(s => s.count > 0);

  const now = new Date().toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });

  // S-006: sem onchange= inline — listeners adicionados via attachDashboardListeners()
  document.getElementById('root').innerHTML = `
    <div class="dash-header">
      <div class="dash-brand">
        <div>
          <div class="dash-brand-name">BUILD<span>.CONNECT</span> · REQUISIÇÕES</div>
          <div class="dash-subtitle">Última atualização: ${now}</div>
        </div>
      </div>
      <div class="dash-status">
        <div class="dash-month-filter">
          <label class="filter-label" for="month-select"><i data-lucide="calendar-range"></i> Mês:</label>
          <select id="month-select" class="filter-select">
            ${monthSelectHtml}
          </select>
        </div>
        <div class="dash-clock">
          <strong id="clock-value">--:--:--</strong>
          <span>Horário atual</span>
        </div>
        <div class="dash-refresh-info" id="refresh-status">
          <i data-lucide="clock-4"></i>
          <span>Atualiza a cada 5 min</span>
        </div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card kpi-total">
        <div class="kpi-icon"><i data-lucide="inbox"></i></div>
        <div class="kpi-body">
          <span class="kpi-value">${all.length}</span>
          <span class="kpi-label">Total no período</span>
        </div>
      </div>
      <div class="kpi-card kpi-pending">
        <div class="kpi-icon"><i data-lucide="clock"></i></div>
        <div class="kpi-body">
          <span class="kpi-value">${pending.length}</span>
          <span class="kpi-label">Pendentes</span>
          <span class="kpi-pct">${Math.round(pending.length/total*100)}% do total</span>
        </div>
      </div>
      <div class="kpi-card kpi-assigned">
        <div class="kpi-icon"><i data-lucide="user-check"></i></div>
        <div class="kpi-body">
          <span class="kpi-value">${assigned.length}</span>
          <span class="kpi-label">Atribuídos</span>
          <span class="kpi-pct">${Math.round(assigned.length/total*100)}% do total</span>
        </div>
      </div>
      <div class="kpi-card kpi-progress">
        <div class="kpi-icon"><i data-lucide="loader-circle"></i></div>
        <div class="kpi-body">
          <span class="kpi-value">${inProgress.length}</span>
          <span class="kpi-label">Em andamento</span>
          <span class="kpi-pct">${Math.round(inProgress.length/total*100)}% do total</span>
        </div>
      </div>
      <div class="kpi-card kpi-done">
        <div class="kpi-icon"><i data-lucide="circle-check"></i></div>
        <div class="kpi-body">
          <span class="kpi-value">${done.length}</span>
          <span class="kpi-label">Concluídos</span>
          <span class="kpi-pct">${Math.round(done.length/total*100)}% do total</span>
        </div>
      </div>
    </div>

    <div class="metrics-row">
      <div class="metric-card"><i data-lucide="timer"></i>
        <div><span class="metric-value">${avgLabel}</span><span class="metric-label">Tempo médio de resolução</span></div>
      </div>
      <div class="metric-card"><i data-lucide="percent"></i>
        <div><span class="metric-value">${conclusionRate}%</span><span class="metric-label">Taxa de conclusão</span></div>
      </div>
      <div class="metric-card"><i data-lucide="calendar"></i>
        <div><span class="metric-value">${all.length}</span><span class="metric-label">Chamados no período</span></div>
      </div>
      <div class="metric-card"><i data-lucide="users"></i>
        <div><span class="metric-value">${getTopAssignee(done)}</span><span class="metric-label">Maior resolvedor</span></div>
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-head"><i data-lucide="tag"></i><span>Por Categoria</span></div>
        ${colorBars(countBy(all, 'categoria'), COLORS_CAT)}
      </div>
      <div class="chart-card">
        <div class="chart-head"><i data-lucide="building-2"></i><span>Por Unidade</span></div>
        ${colorBars(countBy(all, 'unidade'), COLORS_UNIT)}
      </div>
      <div class="chart-card">
        <div class="chart-head"><i data-lucide="layout-grid"></i><span>Categoria por Unidade</span></div>
        ${colorBars(catByUnit, COLORS_CAT)}
      </div>
      <div class="dist-card">
        <div class="chart-head"><i data-lucide="pie-chart"></i><span>Distribuição</span></div>
        <div class="dist-bar">
          ${segments.map(s => `<div class="dist-seg" style="width:${Math.round(s.count/total*100)}%;background:#${s.color}" title="${esc(s.label)}: ${s.count}"></div>`).join('')}
        </div>
        <div class="dist-legend">
          ${segments.map(s => `<div class="dist-legend-item"><span class="dot" style="background:#${s.color}"></span><span>${esc(s.label)}</span><strong>${s.count}</strong></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="table-section">
      <div class="table-head">
        <div class="table-title"><i data-lucide="table-2"></i><span>Chamados do Período</span></div>
        <div class="table-filters">
          <div class="filter-group">
            <label class="filter-label">Status:</label>
            <select id="status-select" class="filter-select">
              <option value="Pendente" selected>Pendentes</option>
              <option value="Atribuído">Atribuídos</option>
              <option value="Em andamento">Em andamento</option>
              <option value="done">Concluídos</option>
              <option value="active">Todos os ativos</option>
              <option value="all">Todos</option>
            </select>
          </div>
          <span class="table-count" id="table-count">${tableFiltered.length} registros</span>
        </div>
      </div>
      <div class="table-wrap" id="table-wrap">
        ${renderTable(tableFiltered)}
      </div>
    </div>
  `;

  updateClock();
  if (window.lucide) lucide.createIcons();

  // S-006: vincula listeners APÓS o DOM ser escrito
  attachDashboardListeners();
}

function renderError(msg) {
  document.getElementById('root').innerHTML = `
    <div class="dash-error">
      <i data-lucide="circle-alert"></i>
      <span>${esc(msg)}</span>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

// ── Init ────────────────────────────────────────────────────────────────────

setInterval(updateClock, 1000);

if (getSessionToken()) {
  fetchData();
} else {
  showLoginOverlay();
}
