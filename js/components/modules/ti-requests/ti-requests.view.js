import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';
import { TI_DASHBOARD_PERIODS, TI_REQUEST_STATUS, TI_REQUESTS_UI_DEFAULTS } from './ti-requests.constants.js';

const STATUS_CFG = {
  [TI_REQUEST_STATUS.pending]:    { label: 'Pendente',     icon: 'clock',         cls: 'is-pending'  },
  [TI_REQUEST_STATUS.assigned]:   { label: 'Atribuído',    icon: 'user-check',    cls: 'is-assigned' },
  [TI_REQUEST_STATUS.inProgress]: { label: 'Em andamento', icon: 'loader-circle', cls: 'is-progress' },
  [TI_REQUEST_STATUS.done]:       { label: 'Concluído',    icon: 'circle-check',  cls: 'is-done'     },
};

const SETOR_LABELS = {
  gestao:'Gestão',vendas:'Vendas',producao:'Produção',criacao:'Criação',
  pcp:'PCP',almoxarifado:'Almoxarifado',corte:'Corte',acabamento:'Acabamento',
  revisao:'Revisão',externo:'Externo',marketing:'Marketing',compras:'Compras',
  logistica:'Logística',financeiro:'Financeiro',retaguarda:'Retaguarda',dho:'DHO',comercial:'Comercial',
};

function setorLabel(id) { return SETOR_LABELS[id] || id || 'Setor'; }

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }); }
  catch { return '—'; }
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return '—'; }
}

function fmtDuration(mins) {
  if (!mins || isNaN(mins)) return null;
  const m = parseInt(mins, 10);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h}h ${r}min` : `${h}h`;
}

// ── Module entry ─────────────────────────────────────────────────────────

export function getTiRequestsModuleMarkup(card, moduleData, moduleUi) {
  const ui = { ...TI_REQUESTS_UI_DEFAULTS, ...(moduleUi || {}) };
  const respondent = moduleData?.respondent || null;

  return `
    <div class="module-shell ti-requests-shell" data-module-shell>
      <div class="module-shell-header ti-requests-hero">
        <div>
          <p class="module-eyebrow">Retaguarda · TI</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Gerencie chamados técnicos, acompanhe atribuições e visualize indicadores de desempenho do suporte.</p>
        </div>
        <div class="module-source-pill" aria-label="Sincronizado com a planilha">
          <i data-lucide="shield-check"></i>
          <span>Banco de dados sincronizado</span>
        </div>
      </div>
      ${renderBody(ui, respondent)}
    </div>
  `;
}

function renderBody(ui, respondent) {
  if (ui.loadStatus === 'idle' || ui.loadStatus === 'loading') {
    return `<div class="ti-requests-loading"><div class="ti-loading-spinner"><i data-lucide="loader-circle"></i></div><p>Carregando chamados…</p></div>`;
  }

  if (ui.loadStatus === 'error') {
    return `
      <div class="ti-requests-error">
        <i data-lucide="circle-alert"></i>
        <div><h3>Erro ao carregar chamados</h3><p>${sanitizeText(ui.errorMessage || 'Tente novamente.')}</p></div>
        <button type="button" class="module-link-button is-secondary" data-ti-reload>
          <i data-lucide="refresh-cw"></i><span>Tentar novamente</span>
        </button>
      </div>`;
  }

  const tickets          = Array.isArray(ui.tickets)          ? ui.tickets          : [];
  const completedTickets = Array.isArray(ui.completedTickets) ? ui.completedTickets : [];

  return `
    <div class="ti-requests-layout">
      ${renderActiveSection(tickets, ui, respondent)}
      ${renderDashboard(ui.dashboard, ui.dashboardPeriod)}
      ${renderCompletedSection(completedTickets, ui)}
    </div>
  `;
}

// ── Active tickets ────────────────────────────────────────────────────────

function renderActiveSection(tickets, ui, respondent) {
  const count = tickets.length;
  return `
    <section class="ti-requests-section" aria-label="Chamados ativos">
      <div class="ti-section-head">
        <h3 class="ti-section-title"><i data-lucide="inbox"></i>Chamados Ativos</h3>
        <span class="ti-badge ${count === 0 ? 'is-empty' : ''}">${count} ${count === 1 ? 'chamado' : 'chamados'}</span>
      </div>
      <div class="ti-ticket-list" aria-live="polite">
        ${count === 0
          ? `<div class="ti-empty-state"><i data-lucide="check-circle-2"></i><span>Nenhum chamado pendente. Tudo em dia!</span></div>`
          : tickets.map((t) => renderActiveCard(t, ui, respondent)).join('')
        }
      </div>
    </section>`;
}

function renderActiveCard(ticket, ui, respondent) {
  const isExpanded  = ui.expandedTicketId       === ticket.id;
  const isUpdating  = ui.isUpdating             && ui.updatingTicketId === ticket.id;
  const isConfirm   = ui.confirmingConclusionId === ticket.id;
  const cfg         = STATUS_CFG[ticket.status] || STATUS_CFG[TI_REQUEST_STATUS.pending];
  const date        = fmtDate(ticket.timestamp);
  const startStr    = ticket.dataInicio ? fmtDateTime(ticket.dataInicio) : null;

  return `
    <article class="ti-requests-ticket ${isExpanded ? 'is-expanded' : ''}" data-ticket-id="${sanitizeAttribute(ticket.id)}">
      <button type="button" class="ti-ticket-compact"
        data-ti-expand="${sanitizeAttribute(ticket.id)}"
        aria-expanded="${isExpanded}"
        aria-label="Ver detalhes do chamado de ${sanitizeText(ticket.solicitanteNome)}">
        <span class="ti-ticket-status ${sanitizeAttribute(cfg.cls)}">
          <i data-lucide="${sanitizeAttribute(cfg.icon)}"></i>
          <span>${sanitizeText(cfg.label)}</span>
        </span>
        <div class="ti-ticket-meta">
          <strong class="ti-ticket-name">${sanitizeText(ticket.solicitanteNome || 'Solicitante')}</strong>
          <span class="ti-ticket-chips">
            <span class="ti-chip">${sanitizeText(setorLabel(ticket.solicitanteSetor))}</span>
            <span class="ti-chip">Unidade ${sanitizeText(ticket.unidade)}</span>
            <span class="ti-chip ti-chip--category">${sanitizeText(ticket.categoria)}</span>
          </span>
        </div>
        <span class="ti-ticket-date">${date}</span>
        <span class="ti-ticket-chevron" aria-hidden="true"><i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}"></i></span>
      </button>

      <div class="ti-ticket-detail" aria-hidden="${!isExpanded}">
        <div class="ti-ticket-detail-inner">
          <div class="ti-detail-desc">
            <span class="ti-detail-label">Descrição</span>
            <p class="ti-detail-text">${sanitizeText(ticket.descricao)}</p>
          </div>

          ${ticket.atribuidoParaNome ? `
            <div class="ti-detail-assignment">
              <i data-lucide="user-check"></i>
              <span>Atribuído para <strong>${sanitizeText(ticket.atribuidoParaNome)}</strong>${ticket.dataAtribuicao ? ` em ${fmtDate(ticket.dataAtribuicao)}` : ''}</span>
            </div>` : ''}

          ${startStr ? `
            <div class="ti-detail-timer">
              <i data-lucide="timer"></i>
              <span>Iniciado em <strong>${startStr}</strong></span>
            </div>` : ''}

          <div class="ti-ticket-actions" data-ticket-actions="${sanitizeAttribute(ticket.id)}">
            ${isUpdating
              ? `<span class="ti-updating"><i data-lucide="loader-circle"></i> Atualizando…</span>`
              : isConfirm
                ? renderConclusionForm(ticket.id)
                : renderStatusButtons(ticket)
            }
          </div>
        </div>
      </div>
    </article>`;
}

function renderConclusionForm(ticketId) {
  return `
    <div class="ti-conclusion-form">
      <label class="form-field">
        <span class="form-label ti-conclusion-label">
          <i data-lucide="file-pen-line"></i>
          Observação da conclusão <span class="ti-required">*</span>
        </span>
        <textarea
          class="ti-conclusion-textarea"
          data-ti-obs-input="${sanitizeAttribute(ticketId)}"
          placeholder="Descreva o que foi feito, como foi resolvido, materiais utilizados…"
          rows="3"
          maxlength="500"
        ></textarea>
        <span class="ti-obs-error" data-ti-obs-error style="display:none">A observação é obrigatória para concluir.</span>
      </label>
      <div class="ti-conclusion-actions">
        <button type="button" class="module-action-button ti-status-btn is-success"
          data-ti-confirm-conclusion="${sanitizeAttribute(ticketId)}">
          <i data-lucide="circle-check"></i><span>Confirmar conclusão</span>
        </button>
        <button type="button" class="module-link-button is-secondary" data-ti-cancel-conclusion>
          <i data-lucide="x"></i><span>Cancelar</span>
        </button>
      </div>
    </div>`;
}

function renderStatusButtons(ticket) {
  const btns = [];

  if (ticket.status === TI_REQUEST_STATUS.pending) {
    btns.push(`
      <button type="button" class="module-action-button ti-status-btn"
        data-ti-status="${sanitizeAttribute(ticket.id)}"
        data-ti-next-status="${TI_REQUEST_STATUS.assigned}">
        <i data-lucide="user-plus"></i><span>Atribuir para mim</span>
      </button>`);
  }

  if (ticket.status === TI_REQUEST_STATUS.assigned) {
    btns.push(`
      <button type="button" class="module-action-button ti-status-btn is-secondary"
        data-ti-status="${sanitizeAttribute(ticket.id)}"
        data-ti-next-status="${TI_REQUEST_STATUS.inProgress}">
        <i data-lucide="play-circle"></i><span>Iniciar</span>
      </button>`);
  }

  if (ticket.status === TI_REQUEST_STATUS.inProgress) {
    btns.push(`
      <button type="button" class="module-action-button ti-status-btn is-success"
        data-ti-start-conclusion="${sanitizeAttribute(ticket.id)}">
        <i data-lucide="circle-check"></i><span>Concluir</span>
      </button>`);
  }

  return btns.join('');
}

// ── Dashboard ─────────────────────────────────────────────────────────────

function renderDashboard(dashboard, period) {
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
        ${renderBarChart('Concluídos por usuário',   dashboard.concluidosPorUsuario,    'user')}
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

// ── Completed tickets ─────────────────────────────────────────────────────

function renderCompletedSection(completedTickets, ui) {
  const count = completedTickets.length;

  return `
    <section class="ti-requests-section ti-completed-section" aria-label="Chamados concluídos">
      <div class="ti-section-head">
        <h3 class="ti-section-title"><i data-lucide="check-circle-2"></i>Concluídos</h3>
        <span class="ti-badge is-done-badge">${count}</span>
      </div>

      ${count === 0
        ? `<div class="ti-empty-state"><i data-lucide="inbox"></i><span>Nenhum chamado concluído ainda.</span></div>`
        : `<div class="ti-completed-list">
            ${completedTickets.map((t) => renderCompletedCard(t, ui)).join('')}
          </div>`
      }
    </section>`;
}

function renderCompletedCard(ticket, ui) {
  const isExpanded = ui.expandedCompletedId === ticket.id;
  const duration   = fmtDuration(ticket.duracaoMinutos);
  const concluded  = fmtDateTime(ticket.dataConclusao || ticket.dataFim);

  return `
    <article class="ti-completed-ticket ${isExpanded ? 'is-expanded' : ''}">
      <button type="button" class="ti-completed-compact"
        data-ti-expand-completed="${sanitizeAttribute(ticket.id)}"
        aria-expanded="${isExpanded}">
        <span class="ti-ticket-status is-done">
          <i data-lucide="circle-check"></i><span>Concluído</span>
        </span>
        <div class="ti-ticket-meta">
          <strong class="ti-ticket-name">${sanitizeText(ticket.solicitanteNome || 'Solicitante')}</strong>
          <span class="ti-ticket-chips">
            <span class="ti-chip">${sanitizeText(setorLabel(ticket.solicitanteSetor))}</span>
            <span class="ti-chip">Unidade ${sanitizeText(ticket.unidade)}</span>
            ${duration ? `<span class="ti-chip ti-chip--timer"><i data-lucide="timer"></i> ${sanitizeText(duration)}</span>` : ''}
          </span>
        </div>
        <span class="ti-ticket-date">${fmtDate(ticket.dataConclusao)}</span>
        <span class="ti-ticket-chevron" aria-hidden="true"><i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}"></i></span>
      </button>

      <div class="ti-ticket-detail" aria-hidden="${!isExpanded}">
        <div class="ti-ticket-detail-inner ti-completed-detail">
          <div class="ti-completed-meta-grid">
            ${renderDetailRow('Solicitante', ticket.solicitanteNome, 'user')}
            ${renderDetailRow('Setor', setorLabel(ticket.solicitanteSetor), 'layers')}
            ${renderDetailRow('Unidade', ticket.unidade, 'building-2')}
            ${renderDetailRow('Categoria', ticket.categoria, 'tag')}
            ${renderDetailRow('Realizado por', ticket.atribuidoParaNome || '—', 'user-check')}
            ${renderDetailRow('Concluído em', concluded, 'calendar-check')}
            ${duration ? renderDetailRow('Duração', duration, 'timer') : ''}
          </div>

          <div class="ti-detail-desc">
            <span class="ti-detail-label">Descrição da solicitação</span>
            <p class="ti-detail-text">${sanitizeText(ticket.descricao)}</p>
          </div>

          ${ticket.observacao ? `
            <div class="ti-detail-obs">
              <span class="ti-detail-label">Observações do responsável</span>
              <p class="ti-detail-text ti-obs-text">${sanitizeText(ticket.observacao)}</p>
            </div>` : ''}
        </div>
      </div>
    </article>`;
}

function renderDetailRow(label, value, icon) {
  return `
    <div class="ti-completed-row">
      <span class="ti-completed-row-label"><i data-lucide="${sanitizeAttribute(icon)}"></i>${sanitizeText(label)}</span>
      <span class="ti-completed-row-value">${sanitizeText(String(value || '—'))}</span>
    </div>`;
}
