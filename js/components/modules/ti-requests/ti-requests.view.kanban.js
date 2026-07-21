/**
 * ti-requests.view.kanban.js
 * Kanban board, card detail, conclusion panel, and ticket list rendering.
 * Split from ti-requests.view.js to stay within the 500-line module limit.
 */

import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';
import { USER_LEVELS, SETOR_LABELS } from '../../../constants/sector.constants.js';
import { normalizeUserLevel } from '../../../services/access.service.js';
import {
  buildMotoristaFilterOptions,
  filterKanbanByMotorista,
  renderKanbanFilterBar,
  renderUnassignButton,
  renderAssignPanel,
} from './ti-requests.view.kanban.admin.js';
import {
  renderInlineKmStartPanel,
  renderInlineConclusionPanel,
} from './ti-requests.view.kanban.panels.js';

export function setorLabel(id) { return SETOR_LABELS[id] || id || 'Setor'; }

export function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }); }
  catch { return '—'; }
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return '—'; }
}

export function fmtDuration(mins) {
  if (!mins || isNaN(mins)) return null;
  const m = parseInt(mins, 10);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h}h ${r}min` : `${h}h`;
}

// ── Month filter helpers (coluna Concluído) ────────────────────────────────

const MONTH_NAMES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function _buildCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function _formatMonthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES_PT[m - 1]} ${y}`;
}

function _buildCompletedMonthOptions(completedTickets) {
  const months = new Set([_buildCurrentMonthKey()]);
  for (const t of completedTickets) {
    const date = t.dataConclusao || t.timestamp;
    if (!date) continue;
    const d = new Date(date);
    if (isNaN(d.getTime())) continue;
    months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return [...months]
    .sort((a, b) => b.localeCompare(a))
    .map(key => ({ key, label: _formatMonthLabel(key) }));
}

function _filterCompletedByMonth(tickets, monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return tickets.filter(t => {
    const date = t.dataConclusao || t.timestamp;
    if (!date) return false;
    const d = new Date(date);
    return d.getFullYear() === y && d.getMonth() + 1 === m;
  });
}

// ── Kanban ─────────────────────────────────────────────────────────────────

const DONE_PAGE_SIZE = 5;

const KANBAN_COLS = [
  { status: 'Pendente',     label: 'Pendente',     icon: 'clock',         color: '#F59E0B', cls: 'is-pending'  },
  { status: 'Atribuído',    label: 'Atribuído',    icon: 'user-check',    color: '#8B5CF6', cls: 'is-assigned' },
  { status: 'Em andamento', label: 'Em andamento', icon: 'loader-circle', color: '#3B82F6', cls: 'is-progress' },
  { status: 'Concluído',    label: 'Concluído',    icon: 'circle-check',  color: '#10B981', cls: 'is-done'     },
];

export function renderKanban(tickets, completedTickets, ui, respondent, isMotorista = false) {
  const allActive    = tickets;
  const userId       = respondent?.id || '';
  // O backend devolve o nível capitalizado ('Admin'/'Gestor'), enquanto
  // USER_LEVELS usa minúsculas. normalizeUserLevel reconcilia os dois formatos.
  const nivel        = normalizeUserLevel(respondent?.nivel);
  const isPrivileged = nivel === USER_LEVELS.admin || nivel === USER_LEVELS.gestor;
  const PAGE_SIZE    = DONE_PAGE_SIZE;
  const colsExpanded = ui.colsExpanded || {};

  // ── Filtro de mês para a coluna Concluído (padrão = mês vigente) ────────
  const activeMonthKey     = ui.completedFilterMonth || _buildCurrentMonthKey();
  const filteredCompleted  = _filterCompletedByMonth(completedTickets, activeMonthKey);
  const completedMonthOpts = _buildCompletedMonthOptions(completedTickets);

  // ── Filtro por motorista (Gestor/Admin) ─────────────────────────────────
  // Aplica-se apenas ao módulo Motorista e a usuários privilegiados; o
  // colaborador continua restrito aos próprios chamados pelas regras abaixo.
  const canFilter    = isMotorista && isPrivileged;
  const motoristaFil = canFilter ? String(ui.kanbanMotorista || '') : '';

  // Pendentes não têm responsável: preservados mesmo sob filtro, pois são o
  // insumo da atribuição direta.
  const pendentes = filterKanbanByMotorista(
    allActive.filter(t => t.status === 'Pendente'),
    motoristaFil,
    { keepUnassigned: true },
  );

  const allByStatus = {
    'Pendente':     pendentes,
    'Atribuído':    isPrivileged
      ? filterKanbanByMotorista(allActive.filter(t => t.status === 'Atribuído'), motoristaFil)
      : allActive.filter(t => t.status === 'Atribuído' && t.atribuidoParaId === userId),
    'Em andamento': isPrivileged
      ? filterKanbanByMotorista(allActive.filter(t => t.status === 'Em andamento'), motoristaFil)
      : allActive.filter(t => t.status === 'Em andamento' && t.atribuidoParaId === userId),
    'Concluído':    filterKanbanByMotorista(filteredCompleted, motoristaFil),
  };

  const byStatus = Object.fromEntries(
    Object.entries(allByStatus).map(([status, items]) => [
      status,
      colsExpanded[status] ? items : items.slice(0, PAGE_SIZE),
    ])
  );

  const filterBar = canFilter
    ? renderKanbanFilterBar(
        buildMotoristaFilterOptions(tickets, completedTickets, ui.motoristasDisponiveis),
        motoristaFil,
        Object.values(allByStatus).reduce((sum, items) => sum + items.length, 0),
      )
    : '';

  return `
    ${filterBar}
    <div class="ti-kanban">
      ${KANBAN_COLS.map(col => {
        const all      = allByStatus[col.status];
        const paged    = byStatus[col.status];
        const hasMore  = all.length > PAGE_SIZE;
        const expanded = !!colsExpanded[col.status];
        const hidden   = all.length - PAGE_SIZE;
        const isDone   = col.status === 'Concluído';

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
          ${isDone ? `
            <div class="ti-kanban-done-filter">
              <i data-lucide="calendar"></i>
              <select class="ti-kanban-done-filter-select" data-ti-done-month aria-label="Filtrar concluídos por mês">
                ${completedMonthOpts.map(({ key, label }) =>
                  `<option value="${sanitizeAttribute(key)}"${key === activeMonthKey ? ' selected' : ''}>${sanitizeText(label)}</option>`
                ).join('')}
              </select>
            </div>
          ` : ''}
          <div class="ti-kanban-cards">
            ${paged.length
              ? paged.map(t => renderKanbanCard(t, col, ui, respondent, isMotorista, isPrivileged)).join('')
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

export function buildKanbanCardDetailHTML(ticket, col, ui, isMotorista = false, isPrivileged = false) {
  const isMot      = isMotorista || ticket.id?.startsWith('MOT-');
  const isUpdating = ui.isUpdating && ui.updatingTicketId === ticket.id;

  // ── Ações gerenciais (Gestor/Admin, somente chamados MOT-) ──────────────
  // Desatribuir: disponível em cards com responsável e ainda não concluídos.
  // Atribuir: disponível na coluna Pendente.
  const canManage      = isPrivileged && isMot;
  const hasAssignee    = !!String(ticket.atribuidoParaId || '').trim();
  const showUnassign   = canManage && hasAssignee && ticket.status !== 'Concluído';
  const showAssign     = canManage && ticket.status === 'Pendente';
  const isAssignOpen   = ui.assigningTicketId === ticket.id;
  const motoristasList = Array.isArray(ui.motoristasDisponiveis) ? ui.motoristasDisponiveis : [];
  const nextActions = {
    'Pendente':     { label: 'Atribuir para mim', next: 'Atribuído',    icon: 'user-plus'   },
    'Atribuído':    { label: 'Iniciar',            next: 'Em andamento', icon: 'play'         },
    'Em andamento': { label: 'Concluir',           next: 'Concluído',    icon: 'check-circle' },
    'Concluído':    null,
  };
  const action = nextActions[ticket.status];

  // F2: "Iniciar" abre painel de KM inicial em vez de atualizar status diretamente
  const isStartingKm      = isMot && ui.startingKmTicketId === ticket.id;
  const isConfirming      = ui.confirmingConclusionId === ticket.id;

  return `
    <div class="ti-kc-detail" data-ti-no-view>
      ${ticket.descricao ? `<p class="ti-kc-detail-desc">${sanitizeText(ticket.descricao)}</p>` : ''}
      <div class="ti-kc-detail-grid">
        ${ticket.atribuidoParaNome ? `
          <div class="ti-kc-detail-field">
            <span>Responsável: <strong>${sanitizeText(ticket.atribuidoParaNome)}</strong></span>
          </div>` : ''}
        <div class="ti-kc-detail-field">
          <i data-lucide="clock-4"></i>
          <span>${fmtDateTime(ticket.timestamp)}</span>
        </div>
        ${ticket.cidade   ? `<div class="ti-kc-detail-field"><i data-lucide="map-pin"></i><span>${sanitizeText(ticket.cidade)}</span></div>` : ''}
        ${ticket.bairro   ? `<div class="ti-kc-detail-field"><i data-lucide="map"></i><span>${sanitizeText(ticket.bairro)}</span></div>` : ''}
        ${ticket.endereco ? `<div class="ti-kc-detail-field"><i data-lucide="navigation"></i><span>${sanitizeText(ticket.endereco)}</span></div>` : ''}
        ${ticket.duracaoMinutos ? `
          <div class="ti-kc-detail-field">
            <span>${fmtDuration(ticket.duracaoMinutos)}</span>
          </div>` : ''}
        ${isMot && ticket.kmInicial !== null && ticket.kmInicial !== undefined ? `
          <div class="ti-kc-detail-field">
            <i data-lucide="gauge"></i>
            <span>KM Inicial: <strong>${sanitizeText(String(ticket.kmInicial))}</strong></span>
          </div>` : ''}
        ${isMot && ticket.kmFinal !== null && ticket.kmFinal !== undefined ? `
          <div class="ti-kc-detail-field">
            <i data-lucide="gauge"></i>
            <span>KM Final: <strong>${sanitizeText(String(ticket.kmFinal))}</strong></span>
          </div>` : ''}
        ${isMot && ticket.kmInicial !== null && ticket.kmInicial !== undefined
              && ticket.kmFinal !== null && ticket.kmFinal !== undefined ? `
          <div class="ti-kc-detail-field">
            <i data-lucide="map"></i>
            <span>KM Percorrido: <strong>${sanitizeText(String(ticket.kmFinal - ticket.kmInicial))} km</strong></span>
          </div>` : ''}
      </div>
      ${(showAssign || showUnassign) ? `
        <div class="ti-kc-detail-admin">
          ${showAssign   ? renderAssignPanel(ticket.id, motoristasList, isAssignOpen, isUpdating, ui.currentUser) : ''}
          ${showUnassign ? renderUnassignButton(ticket.id, isUpdating) : ''}
        </div>
      ` : ''}
      ${action ? `
        <div class="ti-kc-detail-action">
          ${isUpdating
            ? `<span class="ti-updating"><i data-lucide="loader-circle"></i> Atualizando…</span>`
            : isStartingKm
              ? renderInlineKmStartPanel(ticket.id)
              : isConfirming
                ? renderInlineConclusionPanel(ticket.id, isMot, ticket.kmInicial)
                : ticket.status === 'Em andamento'
                  ? `<button type="button" class="ti-kc-btn is-conclude"
                      data-ti-start-conclusion="${sanitizeAttribute(ticket.id)}">
                      <i data-lucide="check-circle"></i>${action.label}
                    </button>`
                  : isMot && ticket.status === 'Atribuído'
                    ? `<button type="button" class="ti-kc-btn"
                        data-ti-start-km="${sanitizeAttribute(ticket.id)}">
                        <i data-lucide="play"></i>${action.label}
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
  `;
}

function renderKanbanCard(ticket, col, ui, respondent, isMotorista = false, isPrivileged = false) {
  const isExpanded = ui.expandedTicketId === ticket.id;
  const badgeLabel = isMotorista
    ? (ticket.tipoServico || ticket.categoria || '—')
    : (ticket.categoria || '—');

  // Data + hora de criação — padrão unificado Retaguarda e Motorista
  const datetimeLabel = fmtDateTime(ticket.timestamp);

  // Campos exclusivos Motorista: localização compacta + endereço
  const hasLocation = isMotorista && (ticket.cidade || ticket.bairro);
  const locationText = hasLocation
    ? [ticket.cidade, ticket.bairro].filter(Boolean).join(' · ')
    : '';

  // Animação de entrada para chamados novos detectados pelo polling em tempo real
  const isNewTicket = isMotorista
    && Array.isArray(ui.newTicketIds)
    && ui.newTicketIds.includes(ticket.id);

  return `
    <div class="ti-kc-row ${isExpanded ? 'is-expanded' : ''} ${isNewTicket ? 'is-new-ticket' : ''}"
      data-ti-expand="${sanitizeAttribute(ticket.id)}">

      <div class="ti-kc-row-main">
        <div class="ti-kc-status-badge">
          <i data-lucide="${sanitizeAttribute(col.icon)}"></i>
        </div>

        <div class="ti-kc-info">
          <span class="ti-kc-name">${sanitizeText(ticket.solicitanteNome || '—')}</span>

          <span class="ti-kc-meta">
            ${sanitizeText(setorLabel(ticket.solicitanteSetor) || '—')}
            ${ticket.unidade ? `<span class="ti-kc-sep">|</span> ${sanitizeText(ticket.unidade)}` : ''}
          </span>

          <span class="ti-kc-cat-badge">${sanitizeText(badgeLabel)}</span>

          ${hasLocation ? `
            <span class="ti-kc-location">
              <i data-lucide="map-pin"></i>
              ${sanitizeText(locationText)}
            </span>` : ''}

          ${isMotorista && ticket.endereco ? `
            <span class="ti-kc-address-line">
              <i data-lucide="navigation"></i>
              ${sanitizeText(ticket.endereco)}
            </span>` : ''}

          ${datetimeLabel ? `
            <span class="ti-kc-timestamp">
              <i data-lucide="clock-4"></i>
              ${sanitizeText(datetimeLabel)}
            </span>` : ''}

          ${isMotorista && ticket.status === 'Concluído'
            && ticket.kmInicial !== null && ticket.kmInicial !== undefined
            && ticket.kmFinal   !== null && ticket.kmFinal   !== undefined ? `
            <span class="ti-kc-timestamp">
              <i data-lucide="gauge"></i>
              ${sanitizeText(String(ticket.kmFinal - ticket.kmInicial))} km percorridos
            </span>` : ''}
        </div>

        <div class="ti-kc-right">
          <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" class="ti-kc-chevron"></i>
        </div>
      </div>

      ${isExpanded ? buildKanbanCardDetailHTML(ticket, col, ui, isMotorista, isPrivileged) : ''}
    </div>
  `;
}
// ── Completed tickets ──────────────────────────────────────────────────────

export function renderCompletedCard(ticket, ui) {
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
            ${ticket.tipoServico
              ? renderDetailRow('Tipo de Serviço', ticket.tipoServico, 'tag')
              : renderDetailRow('Categoria', ticket.categoria, 'tag')}
            ${ticket.cidade   ? renderDetailRow('Cidade',  ticket.cidade,  'map-pin') : ''}
            ${ticket.bairro   ? renderDetailRow('Bairro',  ticket.bairro,  'map')     : ''}
            ${ticket.endereco ? renderDetailRow('Endereço', ticket.endereco, 'navigation') : ''}
            ${renderDetailRow('Realizado por', ticket.atribuidoParaNome || '—', 'user-check')}
            ${renderDetailRow('Concluído em', concluded, 'calendar-check')}
            ${duration ? renderDetailRow('Duração', duration, 'timer') : ''}
            ${ticket.kmInicial !== null && ticket.kmInicial !== undefined
              ? renderDetailRow('KM Inicial', ticket.kmInicial, 'gauge') : ''}
            ${ticket.kmFinal !== null && ticket.kmFinal !== undefined
              ? renderDetailRow('KM Final', ticket.kmFinal, 'gauge') : ''}
            ${(ticket.kmInicial !== null && ticket.kmFinal !== null &&
               ticket.kmInicial !== undefined && ticket.kmFinal !== undefined)
              ? renderDetailRow('KM Percorrido', ticket.kmFinal - ticket.kmInicial, 'map') : ''}
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
          ${Array.isArray(ticket.fotoUrls) && ticket.fotoUrls.length > 0 ? `
            <div class="ti-detail-fotos">
              <span class="ti-detail-label"><i data-lucide="camera"></i> Fotos da ocorrência</span>
              <div class="ti-fotos-grid">
                ${ticket.fotoUrls.map((url, i) => `
                  <button type="button" class="ti-foto-thumb"
                    data-ti-view-fotos="${sanitizeAttribute(ticket.id)}"
                    data-ti-foto-idx="${i}"
                    title="Ampliar foto ${i + 1}">
                    <img src="${sanitizeAttribute(url)}" alt="Foto ${i + 1} da ocorrência" loading="lazy" />
                    <span class="ti-foto-thumb-zoom"><i data-lucide="zoom-in"></i></span>
                  </button>`).join('')}
              </div>
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
