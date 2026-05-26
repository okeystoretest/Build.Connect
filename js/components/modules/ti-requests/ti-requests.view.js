import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';
import { TI_DASHBOARD_PERIODS, TI_REQUEST_STATUS, TI_REQUESTS_UI_DEFAULTS } from './ti-requests.constants.js';
import { USER_LEVELS, SETOR_LABELS } from '../../../constants/sector.constants.js';

const DONE_PAGE_SIZE = 5;

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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

  if (ui.dashboardFullOpen && ui.loadStatus === 'success') {
    return renderFullDashboard(ui);
  }

  return `
    <div class="module-shell ti-requests-shell" data-module-shell>
      <div class="module-shell-header ti-requests-hero">
        <div>
          <p class="module-eyebrow">Retaguarda · TI</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Gerencie chamados técnicos, acompanhe atribuições e visualize indicadores de desempenho do suporte.</p>
        </div>
        <div class="ti-header-actions">
          <a href="./dashboard-ti.html" target="_blank" rel="noopener noreferrer" class="module-action-button ti-full-dashboard-btn">
            <i data-lucide="maximize-2"></i>
            <span>Tela cheia</span>
          </a>
          <div class="module-source-pill" aria-label="Sincronizado com a planilha">
            <i data-lucide="shield-check"></i>
            <span>Banco de dados sincronizado</span>
          </div>
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
  const nivel            = respondent?.nivel || '';
  const isPrivileged     = nivel === USER_LEVELS.admin || nivel === USER_LEVELS.gestor;

  return `
    ${renderKanban(tickets, completedTickets, ui, respondent)}
    ${isPrivileged ? renderDashboard(ui.dashboard, ui.dashboardPeriod || 'mes') : ''}
  `;
}

// ── Kanban ────────────────────────────────────────────────────────────────

const KANBAN_COLS = [
  { status: 'Pendente',     label: 'Pendente',     icon: 'clock',         color: '#F59E0B', cls: 'is-pending'  },
  { status: 'Atribuído',    label: 'Atribuído',    icon: 'user-check',    color: '#8B5CF6', cls: 'is-assigned' },
  { status: 'Em andamento', label: 'Em andamento', icon: 'loader-circle', color: '#3B82F6', cls: 'is-progress' },
  { status: 'Concluído',    label: 'Concluído',    icon: 'circle-check',  color: '#10B981', cls: 'is-done'     },
];

function renderKanban(tickets, completedTickets, ui, respondent) {
  const allActive    = tickets;
  const userId       = respondent?.id || '';
  const nivel        = respondent?.nivel || '';
  const isPrivileged = nivel === USER_LEVELS.admin || nivel === USER_LEVELS.gestor;
  const PAGE_SIZE    = DONE_PAGE_SIZE; // 5 itens por coluna
  const colsExpanded = ui.colsExpanded || {};

  // Lista completa por status (antes de paginar)
  const allByStatus = {
    'Pendente':     allActive.filter(t => t.status === 'Pendente'),
    'Atribuído':    isPrivileged
      ? allActive.filter(t => t.status === 'Atribuído')
      : allActive.filter(t => t.status === 'Atribuído' && t.atribuidoParaId === userId),
    'Em andamento': isPrivileged
      ? allActive.filter(t => t.status === 'Em andamento')
      : allActive.filter(t => t.status === 'Em andamento' && t.atribuidoParaId === userId),
    'Concluído':    completedTickets,
  };

  // Lista paginada por status
  const byStatus = Object.fromEntries(
    Object.entries(allByStatus).map(([status, items]) => [
      status,
      colsExpanded[status] ? items : items.slice(0, PAGE_SIZE),
    ])
  );

  return `
    <div class="ti-kanban">
      ${KANBAN_COLS.map(col => {
        const all      = allByStatus[col.status];
        const paged    = byStatus[col.status];
        const hasMore  = all.length > PAGE_SIZE;
        const expanded = !!colsExpanded[col.status];
        const hidden   = all.length - PAGE_SIZE;

        return `
        <div class="ti-kanban-col" data-status="${sanitizeAttribute(col.status)}">
          <div class="ti-kanban-col-head">
            <div class="ti-kanban-col-title">
              <i data-lucide="${sanitizeAttribute(col.icon)}"></i>
              <span>${sanitizeText(col.label)}</span>
            </div>
            <div class="ti-kanban-col-counts">
              <span class="ti-kanban-badge">
                ${paged.length}${hasMore ? `<span style="opacity:.6">/${all.length}</span>` : ''}
              </span>
            </div>
          </div>
          <div class="ti-kanban-cards">
            ${paged.length
              ? paged.map(t => renderKanbanCard(t, col, ui, respondent)).join('')
              : `<div class="ti-kanban-empty">
                  <i data-lucide="inbox"></i>
                  <span>${
                    !isPrivileged && (col.status === 'Atribuído' || col.status === 'Em andamento')
                      ? 'Nenhum chamado seu aqui'
                      : 'Nenhum chamado'
                  }</span>
                </div>`
            }
            ${hasMore ? `
              <button type="button" class="ti-kanban-load-more" data-ti-toggle-col="${sanitizeAttribute(col.status)}">
                <i data-lucide="${expanded ? 'chevron-up' : 'chevron-down'}"></i>
                <span>${expanded ? 'Ver menos' : `Ver mais ${hidden}`}</span>
              </button>
            ` : ''}
          </div>
        </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderKanbanCard(ticket, col, ui, respondent) {
  const isUpdating = ui.isUpdating && ui.updatingTicketId === ticket.id;

  const nextActions = {
    'Pendente':     { label: 'Atribuir para mim', next: 'Atribuído',    icon: 'user-plus' },
    'Atribuído':    { label: 'Iniciar',            next: 'Em andamento', icon: 'play' },
    'Em andamento': { label: 'Concluir',           next: 'Concluído',    icon: 'check-circle' },
    'Concluído':    null,
  };

  const action = nextActions[ticket.status];
  const descPreview = ticket.descricao
    ? (ticket.descricao.length > 80 ? ticket.descricao.slice(0, 80) + '…' : ticket.descricao)
    : null;

  const isExpanded = ui.expandedTicketId === ticket.id;

  return `
    <div class="ti-kc-row ${isExpanded ? 'is-expanded' : ''}"
      data-ti-expand="${sanitizeAttribute(ticket.id)}">

      <!-- Linha principal -->
      <div class="ti-kc-row-main">

        <!-- Status badge -->
        <div class="ti-kc-status-badge">
          <i data-lucide="${sanitizeAttribute(col.icon)}"></i>
        </div>

        <!-- Info central -->
        <div class="ti-kc-info">
          <span class="ti-kc-name">${sanitizeText(ticket.solicitanteNome || '—')}</span>
          <span class="ti-kc-meta">
            ${sanitizeText(setorLabel(ticket.solicitanteSetor) || '—')}
            ${ticket.unidade ? ` <span class="ti-kc-sep">|</span> ${sanitizeText(ticket.unidade)}` : ''}
          </span>
          <span class="ti-kc-cat-badge">${sanitizeText(ticket.categoria || '—')}</span>
        </div>

        <!-- Chevron -->
        <div class="ti-kc-right">
          <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" class="ti-kc-chevron"></i>
        </div>
      </div>

      <!-- Detalhe expansível -->
      ${isExpanded ? `
        <div class="ti-kc-detail" data-ti-no-view>
          ${ticket.descricao ? `<p class="ti-kc-detail-desc">${sanitizeText(ticket.descricao)}</p>` : ''}
          <div class="ti-kc-detail-grid">
            ${ticket.atribuidoParaNome ? `
              <div class="ti-kc-detail-field">
                <span>Responsável: <strong>${sanitizeText(ticket.atribuidoParaNome)}</strong></span>
              </div>` : ''}
            <div class="ti-kc-detail-field">
              <span>${fmtDate(ticket.timestamp)}</span>
            </div>
            ${ticket.duracaoMinutos ? `
              <div class="ti-kc-detail-field">
                <span>${fmtDuration(ticket.duracaoMinutos)}</span>
              </div>` : ''}
          </div>

          ${action ? `
            <div class="ti-kc-detail-action">
              ${isUpdating
                ? `<span class="ti-updating"><i data-lucide="loader-circle"></i> Atualizando…</span>`
                : ui.confirmingConclusionId === ticket.id
                  ? renderInlineConclusionPanel(ticket.id)
                  : ticket.status === 'Em andamento'
                    ? `<button type="button" class="ti-kc-btn is-conclude"
                        data-ti-start-conclusion="${sanitizeAttribute(ticket.id)}">
                        <i data-lucide="check-circle"></i>${action.label}
                      </button>`
                    : `<button type="button" class="ti-kc-btn"
                        data-ti-status="${sanitizeAttribute(ticket.id)}"
                        data-ti-next-status="${sanitizeAttribute(action.next)}">
                        <i data-lucide="${sanitizeAttribute(action.icon)}"></i>${action.label}
                      </button>`
              }
            </div>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

function renderInlineConclusionPanel(ticketId) {
  return `
    <div class="ti-inline-conclusion" data-ti-no-view>
      <p class="ti-inline-conclusion-label">
        <i data-lucide="check-circle"></i>
        Descreva o que foi feito:
      </p>
      <textarea
        class="ti-conclusion-textarea"
        placeholder="O que foi feito para resolver este chamado…"
        data-ti-obs-input="${sanitizeAttribute(ticketId)}"
        rows="3"
      ></textarea>
      <p class="ti-obs-error" data-ti-obs-error style="display:none">Descreva a resolução antes de confirmar.</p>
      <div class="ti-inline-conclusion-btns">
        <button type="button" class="ti-kc-btn is-conclude"
          data-ti-confirm-conclusion="${sanitizeAttribute(ticketId)}">
          <i data-lucide="check"></i>Confirmar
        </button>
        <button type="button" class="ti-kc-btn is-cancel" data-ti-cancel-conclusion>
          <i data-lucide="x"></i>Cancelar
        </button>
      </div>
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
          maxlength="2000"
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

// ── Full Dashboard View ───────────────────────────────────────────────────

function renderFullDashboard(ui) {
  const all = [...(ui.tickets || []), ...(ui.completedTickets || [])];
  const filter = ui.fullDashboardFilter || 'Pendente';
  const period = ui.fullDashboardPeriod || 'mes';

  const pending    = all.filter(t => t.status === 'Pendente');
  const assigned   = all.filter(t => t.status === 'Atribuído');
  const inProgress = all.filter(t => t.status === 'Em andamento');
  const done       = all.filter(t => t.status === 'Concluído');
  const active     = all.filter(t => t.status !== 'Concluído');

  // Total de chamados do mês atual
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTickets = all.filter(t => t.timestamp && new Date(t.timestamp) >= startOfMonth);

  // Tempo médio de conclusão
  const doneWithTime = done.filter(t => t.duracaoMinutos > 0);
  const avgMinutes = doneWithTime.length
    ? Math.round(doneWithTime.reduce((s, t) => s + t.duracaoMinutos, 0) / doneWithTime.length)
    : null;
  const avgLabel = avgMinutes !== null ? fmtDuration(avgMinutes) : '—';

  // Taxa de conclusão
  const conclusionRate = all.length > 0 ? Math.round((done.length / all.length) * 100) : 0;

  // Categoria por unidade — top 7 combinações
  const catByUnit = countBy(all, t => `${t.unidade || 'N/I'} · ${t.categoria || 'N/I'}`);

  // Filtro por período
  const periodStart = {
    semana: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
    mes:    startOfMonth,
    tudo:   null,
  }[period] ?? null;

  const periodFiltered = periodStart ? all.filter(t => t.timestamp && new Date(t.timestamp) >= periodStart) : all;

  // Filtro por status sobre o período
  const filtered = filter === 'all' ? periodFiltered
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

  return `
    <div class="module-shell ti-full-dashboard" data-module-shell>
      <div class="ti-full-header">
        <button type="button" class="module-link-button is-secondary ti-back-btn" data-ti-close-full-dashboard>
          <i data-lucide="arrow-left"></i>
          <span>Voltar</span>
        </button>
        <div>
          <p class="module-eyebrow">Retaguarda · TI</p>
          <h2 class="module-title">Dashboard Completo</h2>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="ti-kpi-grid">
        ${renderKpi('Total de Chamados', all.length, 'inbox', 'kpi-total', null)}
        ${renderKpi('Pendentes', pending.length, 'clock', 'kpi-pending', all.length)}
        ${renderKpi('Atribuídos', assigned.length, 'user-check', 'kpi-assigned', all.length)}
        ${renderKpi('Em Andamento', inProgress.length, 'loader-circle', 'kpi-progress', all.length)}
        ${renderKpi('Concluídos', done.length, 'circle-check', 'kpi-done', all.length)}
      </div>

      <!-- Metrics row -->
      <div class="ti-metrics-row">
        <div class="ti-metric-card">
          <i data-lucide="timer"></i>
          <div>
            <span class="ti-metric-value">${avgLabel}</span>
            <span class="ti-metric-label">Tempo médio de resolução</span>
          </div>
        </div>
        <div class="ti-metric-card">
          <i data-lucide="percent"></i>
          <div>
            <span class="ti-metric-value">${conclusionRate}%</span>
            <span class="ti-metric-label">Taxa de conclusão</span>
          </div>
        </div>
        <div class="ti-metric-card">
          <i data-lucide="calendar"></i>
          <div>
            <span class="ti-metric-value">${monthTickets.length}</span>
            <span class="ti-metric-label">Total de chamados do mês</span>
          </div>
        </div>
        <div class="ti-metric-card">
          <i data-lucide="users"></i>
          <div>
            <span class="ti-metric-value">${getTopAssignee(done)}</span>
            <span class="ti-metric-label">Maior resolvedor</span>
          </div>
        </div>
      </div>

      <!-- Charts row -->
      <div class="ti-full-charts">
        ${renderColorChart('Por Categoria', countBy(all, 'categoria'), 'tag', ['3B82F6','8B5CF6','10B981','F59E0B','EF4444','6366F1','14B8A6'])}
        ${renderColorChart('Por Unidade', countBy(all, 'unidade'), 'building-2', ['D4A257','10B981','3B82F6','8B5CF6','F59E0B','EF4444','6366F1'])}
        ${renderColorChart('Categoria por Unidade', catByUnit, 'layout-grid', ['3B82F6','D4A257','10B981','8B5CF6','F59E0B','EF4444','6366F1'])}
      </div>

      <!-- Status distribution -->
      ${renderStatusDistribution(pending.length, assigned.length, inProgress.length, done.length, all.length)}

      <!-- Full table -->
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
                  </button>
                `).join('')}
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
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
        ${renderFullTable(filtered)}
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
    </div>
  `;
}

function renderColorChart(title, data, icon, colors) {
  const items = Array.isArray(data) ? data.slice(0, 7) : [];
  const max = items.reduce((m, i) => Math.max(m, i.count), 0) || 1;
  const total = items.reduce((s, i) => s + i.count, 0) || 1;

  return `
    <div class="ti-color-chart">
      <div class="ti-chart-head"><i data-lucide="${sanitizeAttribute(icon)}"></i><span>${sanitizeText(title)}</span></div>
      ${items.length === 0
        ? `<p class="ti-chart-empty">Sem dados disponíveis</p>`
        : `<div class="ti-color-bars">
            ${items.map((item, i) => {
              const color = colors[i % colors.length];
              const pct = Math.round((item.count / total) * 100);
              const barW = Math.round((item.count / max) * 100);
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
    </div>
  `;
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
    </div>
  `;
}

function renderFullTable(tickets) {
  if (!tickets.length) {
    return `<div class="ti-empty-state"><i data-lucide="inbox"></i><span>Nenhum chamado para o filtro selecionado.</span></div>`;
  }

  return `
    <div class="ti-full-table-wrap">
      <table class="ti-full-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Solicitante</th>
            <th>Setor</th>
            <th>Unidade</th>
            <th>Categoria</th>
            <th>Responsável</th>
            <th>Aberto em</th>
            <th>Duração</th>
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

            return `
              <tr class="ti-table-row">
                <td class="ti-table-id">${sanitizeText(t.id || '—')}</td>
                <td>
                  <span class="ti-table-status ${sanitizeAttribute(cfg.cls)}">
                    <span class="ti-color-dot" style="background:#${sanitizeAttribute(cfg.dot)}"></span>
                    ${sanitizeText(t.status || '—')}
                  </span>
                </td>
                <td>${sanitizeText(t.solicitanteNome || '—')}</td>
                <td>${sanitizeText(t.solicitanteSetor || '—')}</td>
                <td>${sanitizeText(t.unidade || '—')}</td>
                <td>${sanitizeText(t.categoria || '—')}</td>
                <td>${sanitizeText(t.atribuidoParaNome || '—')}</td>
                <td>${fmtDate(t.timestamp)}</td>
                <td>${fmtDuration(t.duracaoMinutos) || '—'}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function countBy(arr, key) {
  const map = {};
  (arr || []).forEach(t => {
    const k = t[key] || 'Não informado';
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