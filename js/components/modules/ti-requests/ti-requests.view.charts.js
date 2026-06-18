/**
 * ti-requests.view.charts.js
 * Dashboard, charts, and full-dashboard view rendering for TI Requests.
 * Split from ti-requests.view.js to stay within the 500-line module limit.
 */

import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';
import { TI_DASHBOARD_PERIODS } from './ti-requests.constants.js';
import { fmtDate, fmtDateTime, fmtDuration, setorLabel } from './ti-requests.view.kanban.js';

// ── Standard dashboard section ────────────────────────────────────────────

export function renderDashboard(dashboard, period) {
  const periodOpts = TI_DASHBOARD_PERIODS.map((p) =>
    `<option value="${sanitizeAttribute(p.id)}" ${p.id === period ? 'selected' : ''}>${sanitizeText(p.label)}</option>`
  ).join('');

  if (!dashboard) {
    return `
      <section class="ti-requests-section ti-dashboard-section">
        <div class="ti-section-head">
          <h3 class="ti-section-title"><i data-lucide="bar-chart-2"></i>Dashboard</h3>
        </div>
        <div class="ti-empty-state"><i data-lucide="loader-circle"></i><span>Carregando indicadores…</span></div>
      </section>`;
  }

  return `
    <section class="ti-requests-section ti-dashboard-section" aria-label="Dashboard">
      <div class="ti-section-head">
        <h3 class="ti-section-title"><i data-lucide="bar-chart-2"></i>Dashboard</h3>
        <label class="ti-period-label">
          <i data-lucide="calendar-range"></i>
          <select class="ti-period-select" data-ti-period>
            ${periodOpts}
          </select>
        </label>
      </div>
      <div class="ti-stat-row">
        <div class="ti-stat-block"><span class="ti-stat-value">${dashboard.totalAtivos}</span><span class="ti-stat-label">Ativos</span></div>
        <div class="ti-stat-block is-success"><span class="ti-stat-value">${dashboard.totalConcluidos}</span><span class="ti-stat-label">Concluídos</span></div>
      </div>
      <div class="ti-charts-grid">
        ${renderBarChart('Concluídos por usuário',    dashboard.concluidosPorUsuario,    'user')}
        ${renderBarChart('Solicitações por unidade',  dashboard.solicitacoesPorUnidade,  'building-2')}
        ${renderBarChart('Solicitações por categoria',dashboard.solicitacoesPorCategoria,'tag')}
      </div>
    </section>`;
}

function renderBarChart(title, data, icon) {
  const items = Array.isArray(data) ? data : [];
  const max = items.reduce((m, i) => Math.max(m, i.count), 0) || 1;
  return `
    <div class="ti-chart-card">
      <div class="ti-chart-head"><i data-lucide="${sanitizeAttribute(icon)}"></i><span>${sanitizeText(title)}</span></div>
      ${items.length === 0
        ? `<p class="ti-chart-empty">Sem dados para o período</p>`
        : `<div class="ti-chart-bars">
            ${items.map((item) => `
              <div class="ti-bar-row">
                <span class="ti-bar-label" title="${sanitizeAttribute(item.label)}">${sanitizeText(item.label)}</span>
                <div class="ti-bar-track"><div class="ti-bar-fill" style="width:${Math.round((item.count / max) * 100)}%"></div></div>
                <span class="ti-bar-count">${item.count}</span>
              </div>`).join('')}
          </div>`
      }
    </div>`;
}

// ── Full Dashboard ────────────────────────────────────────────────────────

export function renderFullDashboard(ui, isMotorista = false) {
  const all    = [...(ui.tickets || []), ...(ui.completedTickets || [])];
  const filter = ui.fullDashboardFilter || 'Pendente';
  const period = ui.fullDashboardPeriod || 'mes';

  const pending    = all.filter(t => t.status === 'Pendente');
  const assigned   = all.filter(t => t.status === 'Atribuído');
  const inProgress = all.filter(t => t.status === 'Em andamento');
  const done       = all.filter(t => t.status === 'Concluído');

  const now           = new Date();
  const startOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTickets  = all.filter(t => t.timestamp && new Date(t.timestamp) >= startOfMonth);
  const doneWithTime  = done.filter(t => t.duracaoMinutos > 0);
  const avgMinutes    = doneWithTime.length
    ? Math.round(doneWithTime.reduce((s, t) => s + t.duracaoMinutos, 0) / doneWithTime.length)
    : null;
  const avgLabel      = avgMinutes !== null ? fmtDuration(avgMinutes) : '—';
  const conclusionRate = all.length > 0 ? Math.round((done.length / all.length) * 100) : 0;
  const catByUnit     = countBy(all, t => `${t.unidade || 'N/I'} · ${(t.tipoServico || t.categoria) || 'N/I'}`);

  const periodStart = {
    semana: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
    mes:    startOfMonth,
    tudo:   null,
  }[period] ?? null;

  const periodFiltered = periodStart ? all.filter(t => t.timestamp && new Date(t.timestamp) >= periodStart) : all;
  const filtered = filter === 'all'    ? periodFiltered
    : filter === 'active' ? periodFiltered.filter(t => t.status !== 'Concluído')
    : filter === 'done'   ? periodFiltered.filter(t => t.status === 'Concluído')
    : periodFiltered.filter(t => t.status === filter);

  const periodOpts = [
    { id: 'semana', label: 'Última semana' },
    { id: 'mes',    label: 'Este mês' },
    { id: 'tudo',   label: 'Todos os períodos' },
  ];
  const filterOpts = [
    { id: 'Pendente',     label: `Pendentes (${pending.length})` },
    { id: 'Atribuído',    label: `Atribuídos (${assigned.length})` },
    { id: 'Em andamento', label: `Em andamento (${inProgress.length})` },
    { id: 'done',         label: `Concluídos (${done.length})` },
    { id: 'all',          label: `Todos (${all.length})` },
  ];

  const categoryLabel = isMotorista ? 'Por Tipo de Serviço' : 'Por Categoria';

  return `
    <div class="module-shell ti-full-dashboard" data-module-shell>
      <div class="ti-full-header">
        <button type="button" class="module-link-button is-secondary ti-back-btn" data-ti-close-full-dashboard>
          <i data-lucide="arrow-left"></i><span>Voltar</span>
        </button>
        <div>
          <p class="module-eyebrow">${isMotorista ? 'Motorista · Requisições' : 'Retaguarda · TI'}</p>
          <h2 class="module-title">Dashboard Completo</h2>
        </div>
      </div>

      <div class="ti-kpi-grid">
        ${renderKpi('Total', all.length, 'inbox', 'kpi-total', null)}
        ${renderKpi('Pendentes', pending.length, 'clock', 'kpi-pending', all.length)}
        ${renderKpi('Atribuídos', assigned.length, 'user-check', 'kpi-assigned', all.length)}
        ${renderKpi('Em Andamento', inProgress.length, 'loader-circle', 'kpi-progress', all.length)}
        ${renderKpi('Concluídos', done.length, 'circle-check', 'kpi-done', all.length)}
      </div>

      <div class="ti-metrics-row">
        <div class="ti-metric-card"><i data-lucide="timer"></i><div>
          <span class="ti-metric-value">${avgLabel}</span>
          <span class="ti-metric-label">Tempo médio de resolução</span>
        </div></div>
        <div class="ti-metric-card"><i data-lucide="percent"></i><div>
          <span class="ti-metric-value">${conclusionRate}%</span>
          <span class="ti-metric-label">Taxa de conclusão</span>
        </div></div>
        <div class="ti-metric-card"><i data-lucide="calendar"></i><div>
          <span class="ti-metric-value">${monthTickets.length}</span>
          <span class="ti-metric-label">Total do mês</span>
        </div></div>
        <div class="ti-metric-card"><i data-lucide="users"></i><div>
          <span class="ti-metric-value">${getTopAssignee(done)}</span>
          <span class="ti-metric-label">Maior resolvedor</span>
        </div></div>
      </div>

      <div class="ti-full-charts">
        ${renderColorChart(categoryLabel, countBy(all, t => t.tipoServico || t.categoria), 'tag',        ['3B82F6','8B5CF6','10B981','F59E0B','EF4444','6366F1','14B8A6'])}
        ${renderColorChart('Por Unidade',  countBy(all, 'unidade'),                          'building-2', ['D4A257','10B981','3B82F6','8B5CF6','F59E0B','EF4444','6366F1'])}
        ${renderColorChart('Por Unidade × Tipo', catByUnit,                                 'layout-grid',['3B82F6','D4A257','10B981','8B5CF6','F59E0B','EF4444','6366F1'])}
      </div>

      ${renderStatusDistribution(pending.length, assigned.length, inProgress.length, done.length, all.length)}

      <div class="ti-full-table-section">
        <div class="ti-full-table-head">
          <h3 class="ti-section-title"><i data-lucide="table-2"></i>Todos os Chamados</h3>
          <div class="ti-full-table-controls">
            <div class="ti-filter-group">
              <span class="ti-filter-label">Período:</span>
              <div class="ti-filter-tabs">
                ${periodOpts.map(p => `
                  <button type="button"
                    class="ti-filter-tab ${p.id === period ? 'is-active' : ''}"
                    data-ti-full-period="${sanitizeAttribute(p.id)}">
                    ${sanitizeText(p.label)}
                  </button>`).join('')}
              </div>
            </div>
            <div class="ti-filter-group">
              <span class="ti-filter-label">Status:</span>
              <div class="ti-filter-tabs">
                ${filterOpts.map(f => `
                  <button type="button"
                    class="ti-filter-tab ${f.id === filter ? 'is-active' : ''}"
                    data-ti-full-filter="${sanitizeAttribute(f.id)}">
                    ${sanitizeText(f.label)}
                  </button>`).join('')}
              </div>
            </div>
          </div>
        </div>
        ${renderFullTable(filtered, isMotorista)}
      </div>
    </div>
  `;
}

function renderKpi(label, value, icon, cls, total) {
  const pct = total ? Math.round((value / total) * 100) : null;
  return `
    <div class="ti-kpi-card ${sanitizeAttribute(cls)}">
      <div class="ti-kpi-icon"><i data-lucide="${sanitizeAttribute(icon)}"></i></div>
      <div class="ti-kpi-body">
        <span class="ti-kpi-value">${value}</span>
        <span class="ti-kpi-label">${sanitizeText(label)}</span>
        ${pct !== null ? `<span class="ti-kpi-pct">${pct}% do total</span>` : ''}
      </div>
    </div>`;
}

function renderColorChart(title, data, icon, colors) {
  const items = Array.isArray(data) ? data.slice(0, 7) : [];
  const max   = items.reduce((m, i) => Math.max(m, i.count), 0) || 1;
  const total = items.reduce((s, i) => s + i.count, 0) || 1;
  return `
    <div class="ti-color-chart">
      <div class="ti-chart-head"><i data-lucide="${sanitizeAttribute(icon)}"></i><span>${sanitizeText(title)}</span></div>
      ${items.length === 0
        ? `<p class="ti-chart-empty">Sem dados disponíveis</p>`
        : `<div class="ti-color-bars">
            ${items.map((item, i) => {
              const color = colors[i % colors.length];
              const pct   = Math.round((item.count / total) * 100);
              const barW  = Math.round((item.count / max) * 100);
              return `
                <div class="ti-color-bar-row">
                  <span class="ti-color-dot" style="background:#${sanitizeAttribute(color)}"></span>
                  <span class="ti-color-bar-label" title="${sanitizeAttribute(item.label)}">${sanitizeText(item.label)}</span>
                  <div class="ti-color-bar-track">
                    <div class="ti-color-bar-fill" style="width:${barW}%;background:#${sanitizeAttribute(color)}"></div>
                  </div>
                  <span class="ti-color-bar-meta">${item.count} <small>(${pct}%)</small></span>
                </div>`;
            }).join('')}
          </div>`
      }
    </div>`;
}

function renderStatusDistribution(pending, assigned, inProgress, done, total) {
  if (!total) return '';
  const segments = [
    { label: 'Pendente',     count: pending,    color: 'F59E0B' },
    { label: 'Atribuído',    count: assigned,   color: '8B5CF6' },
    { label: 'Em andamento', count: inProgress, color: '3B82F6' },
    { label: 'Concluído',    count: done,       color: '10B981' },
  ].filter(s => s.count > 0);

  return `
    <div class="ti-status-dist">
      <div class="ti-chart-head"><i data-lucide="pie-chart"></i><span>Distribuição por Status</span></div>
      <div class="ti-dist-bar">
        ${segments.map(s => `
          <div class="ti-dist-segment"
            style="width:${Math.round((s.count / total) * 100)}%;background:#${sanitizeAttribute(s.color)}"
            title="${sanitizeText(s.label)}: ${s.count}">
          </div>`).join('')}
      </div>
      <div class="ti-dist-legend">
        ${segments.map(s => `
          <div class="ti-dist-legend-item">
            <span class="ti-color-dot" style="background:#${sanitizeAttribute(s.color)}"></span>
            <span>${sanitizeText(s.label)}</span>
            <strong>${s.count}</strong>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderFullTable(tickets, isMotorista = false) {
  if (!tickets.length) {
    return `<div class="ti-empty-state"><i data-lucide="inbox"></i><span>Nenhum chamado para o filtro selecionado.</span></div>`;
  }
  const colHeader = isMotorista ? 'Tipo de Serviço' : 'Categoria';
  return `
    <div class="ti-full-table-wrap">
      <table class="ti-full-table">
        <thead>
          <tr>
            <th>ID</th><th>Status</th><th>Solicitante</th>
            <th>Setor</th><th>Unidade</th><th>${colHeader}</th>
            <th>Responsável</th><th>Aberto em</th><th>Duração</th>
          </tr>
        </thead>
        <tbody>
          ${tickets.map(t => {
            const cfg = {
              'Pendente':     { cls: 'is-pending',  dot: 'F59E0B' },
              'Atribuído':    { cls: 'is-assigned',  dot: '8B5CF6' },
              'Em andamento': { cls: 'is-progress',  dot: '3B82F6' },
              'Concluído':    { cls: 'is-done',      dot: '10B981' },
            }[t.status] || { cls: '', dot: '8E9AAF' };
            const catVal = isMotorista ? (t.tipoServico || t.categoria || '—') : (t.categoria || '—');
            return `
              <tr class="ti-table-row">
                <td class="ti-table-id">${sanitizeText(t.id || '—')}</td>
                <td><span class="ti-table-status ${sanitizeAttribute(cfg.cls)}">
                  <span class="ti-color-dot" style="background:#${sanitizeAttribute(cfg.dot)}"></span>
                  ${sanitizeText(t.status || '—')}
                </span></td>
                <td>${sanitizeText(t.solicitanteNome || '—')}</td>
                <td>${sanitizeText(t.solicitanteSetor || '—')}</td>
                <td>${sanitizeText(t.unidade || '—')}</td>
                <td>${sanitizeText(catVal)}</td>
                <td>${sanitizeText(t.atribuidoParaNome || '—')}</td>
                <td>${fmtDate(t.timestamp)}</td>
                <td>${fmtDuration(t.duracaoMinutos) || '—'}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function countBy(arr, keyOrFn) {
  const map = {};
  (arr || []).forEach(t => {
    const k = typeof keyOrFn === 'function' ? keyOrFn(t) : (t[keyOrFn] || 'Não informado');
    map[k] = (map[k] || 0) + 1;
  });
  return Object.entries(map)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function getTopAssignee(done) {
  const map = {};
  (done || []).forEach(t => {
    if (t.atribuidoParaNome) map[t.atribuidoParaNome] = (map[t.atribuidoParaNome] || 0) + 1;
  });
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0].split(' ')[0] : '—';
}
