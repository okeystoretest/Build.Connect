import { MODULE_IDS } from '../../../constants/module.constants.js';
import { SECTOR_IDS } from '../../../constants/sector.constants.js';
import { listarChamadosTI, listarChamadosMotorista, atualizarStatusChamadoTI } from '../../../services/ti-requests.service.js';
import { TI_REQUESTS_UI_DEFAULTS } from './ti-requests.constants.js';
import { buildKanbanCardDetailHTML } from './ti-requests.view.js';
import { refreshLucideIcons } from '../../../services/icons.service.js';

// Conjunto de IDs de módulo que usam os handlers de TI
const TI_MODULE_IDS = new Set([MODULE_IDS.tiRequest, MODULE_IDS.motorRequests]);

let moduleContext = null;

export function createTiRequestsModuleHandlers(context) {
  moduleContext = context;
  return {
    loadTickets:            loadTiTickets,
    reloadTickets:          reloadTiTickets,
    expandTicket:           expandTiTicket,
    expandCompleted:        expandCompletedTicket,
    updateStatus:           updateTiTicketStatus,
    startConclusion:        startConclusion,
    cancelConclusion:       cancelConclusion,
    confirmConclusion:      confirmConclusion,
    changePeriod:           changeDashboardPeriod,
    openFullDashboard:      openFullDashboard,
    closeFullDashboard:     closeFullDashboard,
    setFullDashboardFilter: setFullDashboardFilter,
    setFullDashboardPeriod: setFullDashboardPeriod,
    toggleDoneExpanded:     toggleDoneExpanded,
    toggleColExpanded:      toggleColExpanded,
  };
}

function getState(id)       { return moduleContext.getModuleState(id); }
function setState(id, s)    { return moduleContext.setModuleState(id, s); }
function render(el, sector) { return moduleContext.renderModuleStage(el, sector); }
function ui(state)          { return { ...TI_REQUESTS_UI_DEFAULTS, ...(state.ui || {}) }; }

function _isTiModule(state) { return TI_MODULE_IDS.has(state.selectedModuleId); }

function _getDestino(sector) {
  return sector?.id === SECTOR_IDS.motorista ? 'motorista' : 'retaguarda';
}

// ── Load ──────────────────────────────────────────────────────────────────

async function loadTiTickets(rootElement, sector) {
  const state = getState(sector.id);
  if (!_isTiModule(state)) return;

  const currentUi = ui(state);
  setState(sector.id, { ...state, ui: { ...currentUi, loadStatus: 'loading', errorMessage: '' } });
  render(rootElement, sector);

  try {
    const destino  = _getDestino(sector);
    const period   = currentUi.dashboardPeriod || 'mes';
    const response = destino === 'motorista'
      ? await listarChamadosMotorista(period)
      : await listarChamadosTI(period, 'retaguarda');

    const next = getState(sector.id);
    if (!_isTiModule(next)) return;

    const nextUi = ui(next);
    if (response?.success) {
      setState(sector.id, {
        ...next,
        ui: {
          ...nextUi,
          loadStatus:             'success',
          tickets:                Array.isArray(response.tickets)          ? response.tickets          : [],
          completedTickets:       Array.isArray(response.completedTickets) ? response.completedTickets : [],
          dashboard:              response.dashboard || null,
          expandedTicketId:       null,
          expandedCompletedId:    null,
          confirmingConclusionId: null,
          errorMessage:           '',
        },
      });
    } else {
      setState(sector.id, { ...next, ui: { ...nextUi, loadStatus: 'error', errorMessage: response?.message || 'Não foi possível carregar as requisições.' } });
    }
  } catch (err) {
    const next = getState(sector.id);
    setState(sector.id, { ...next, ui: { ...ui(next), loadStatus: 'error', errorMessage: err?.message || 'Erro ao carregar requisições.' } });
  }

  render(rootElement, sector);
}

async function reloadTiTickets(rootElement, sector) { return loadTiTickets(rootElement, sector); }

// ── Expand ────────────────────────────────────────────────────────────────

const KANBAN_COL_ICONS = {
  'Pendente':     'clock',
  'Atribuído':    'user-check',
  'Em andamento': 'loader-circle',
  'Concluído':    'circle-check',
};

function _collapseKanbanCardDOM(rootElement, ticketId) {
  const card = rootElement.querySelector(`[data-ti-expand="${CSS.escape(ticketId)}"]`);
  if (!card) return;
  card.classList.remove('is-expanded');
  card.querySelector('.ti-kc-detail')?.remove();
  const chevron = card.querySelector('.ti-kc-chevron');
  if (chevron) {
    chevron.setAttribute('data-lucide', 'chevron-down');
    refreshLucideIcons(card.querySelector('.ti-kc-right') || card);
  }
}

function expandTiTicket(rootElement, sector, ticketId) {
  const state = getState(sector.id);
  if (!_isTiModule(state)) return;

  const currentUi   = ui(state);
  const wasExpanded  = currentUi.expandedTicketId === ticketId;
  const newExpandedId = wasExpanded ? null : ticketId;

  setState(sector.id, {
    ...state,
    ui: { ...currentUi, expandedTicketId: newExpandedId, confirmingConclusionId: null },
  });

  if (currentUi.expandedTicketId && currentUi.expandedTicketId !== ticketId) {
    _collapseKanbanCardDOM(rootElement, currentUi.expandedTicketId);
  }

  const card = rootElement.querySelector(`[data-ti-expand="${CSS.escape(ticketId)}"]`);
  if (!card) { render(rootElement, sector); return; }

  if (wasExpanded) {
    _collapseKanbanCardDOM(rootElement, ticketId);
  } else {
    card.classList.add('is-expanded');
    const chevron = card.querySelector('.ti-kc-chevron');
    if (chevron) chevron.setAttribute('data-lucide', 'chevron-up');

    const newUi = ui(getState(sector.id));
    const allTickets = [...(newUi.tickets || []), ...(newUi.completedTickets || [])];
    const ticket = allTickets.find(t => t.id === ticketId);

    if (ticket) {
      const col  = { status: ticket.status, icon: KANBAN_COL_ICONS[ticket.status] || 'clock' };
      const temp = document.createElement('div');
      temp.innerHTML = buildKanbanCardDetailHTML(ticket, col, newUi);
      const detailEl = temp.firstElementChild;
      if (detailEl) card.appendChild(detailEl);
    }
    refreshLucideIcons(card);
  }
}

function expandCompletedTicket(rootElement, sector, ticketId) {
  const state = getState(sector.id);
  if (!_isTiModule(state)) return;
  const currentUi = ui(state);
  setState(sector.id, {
    ...state,
    ui: { ...currentUi, expandedCompletedId: currentUi.expandedCompletedId === ticketId ? null : ticketId },
  });
  render(rootElement, sector);
}

// ── Conclusion flow ───────────────────────────────────────────────────────

function startConclusion(rootElement, sector, ticketId) {
  const state = getState(sector.id);
  if (!_isTiModule(state)) return;
  setState(sector.id, { ...state, ui: { ...ui(state), confirmingConclusionId: ticketId, expandedTicketId: ticketId } });
  render(rootElement, sector);
}

function cancelConclusion(rootElement, sector) {
  const state = getState(sector.id);
  if (!_isTiModule(state)) return;
  setState(sector.id, { ...state, ui: { ...ui(state), confirmingConclusionId: null } });
  render(rootElement, sector);
}

async function confirmConclusion(rootElement, sector, ticketId, observacao, user) {
  const obs = String(observacao || '').trim();
  if (!obs) return;

  const state = getState(sector.id);
  if (!_isTiModule(state)) return;

  setState(sector.id, { ...state, ui: { ...ui(state), isUpdating: true, updatingTicketId: ticketId } });
  render(rootElement, sector);

  try {
    const response = await atualizarStatusChamadoTI(
      ticketId, 'Concluído',
      String(user?.id || ''), String(user?.nome || ''), obs,
    );
    const next = getState(sector.id);
    if (!_isTiModule(next)) return;

    if (response?.success) {
      setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null, confirmingConclusionId: null } });
      render(rootElement, sector);
      await loadTiTickets(rootElement, sector);
    } else {
      setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null, errorMessage: response?.message || 'Erro ao concluir.' } });
      render(rootElement, sector);
    }
  } catch (err) {
    const next = getState(sector.id);
    setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null, errorMessage: err?.message || 'Erro ao concluir.' } });
    render(rootElement, sector);
  }
}

// ── Update status ─────────────────────────────────────────────────────────

async function updateTiTicketStatus(rootElement, sector, ticketId, novoStatus, user) {
  const state = getState(sector.id);
  if (!_isTiModule(state)) return;

  setState(sector.id, { ...state, ui: { ...ui(state), isUpdating: true, updatingTicketId: ticketId } });
  render(rootElement, sector);

  try {
    const response = await atualizarStatusChamadoTI(
      ticketId, novoStatus,
      String(user?.id || ''), String(user?.nome || ''), '',
    );
    const next = getState(sector.id);
    if (!_isTiModule(next)) return;

    if (response?.success) {
      setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null, expandedTicketId: null } });
      render(rootElement, sector);
      await loadTiTickets(rootElement, sector);
    } else {
      setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null, errorMessage: response?.message || 'Erro ao atualizar.' } });
      render(rootElement, sector);
    }
  } catch (err) {
    const next = getState(sector.id);
    setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null, errorMessage: err?.message || 'Erro ao atualizar.' } });
    render(rootElement, sector);
  }
}

// ── Dashboard period ──────────────────────────────────────────────────────

async function changeDashboardPeriod(rootElement, sector, period) {
  const state = getState(sector.id);
  if (!_isTiModule(state)) return;
  setState(sector.id, { ...state, ui: { ...ui(state), dashboardPeriod: period } });
  await loadTiTickets(rootElement, sector);
}

// ── Full Dashboard ────────────────────────────────────────────────────────

function openFullDashboard(rootElement, sector) {
  const state = getState(sector.id);
  if (!_isTiModule(state)) return;
  setState(sector.id, { ...state, ui: { ...ui(state), dashboardFullOpen: true, fullDashboardFilter: 'all' } });
  render(rootElement, sector);
}

function closeFullDashboard(rootElement, sector) {
  const state = getState(sector.id);
  if (!_isTiModule(state)) return;
  setState(sector.id, { ...state, ui: { ...ui(state), dashboardFullOpen: false } });
  render(rootElement, sector);
}

function setFullDashboardFilter(rootElement, sector, filter) {
  const state = getState(sector.id);
  if (!_isTiModule(state)) return;
  setState(sector.id, { ...state, ui: { ...ui(state), fullDashboardFilter: filter } });
  render(rootElement, sector);
}

function setFullDashboardPeriod(rootElement, sector, period) {
  const state = getState(sector.id);
  if (!_isTiModule(state)) return;
  setState(sector.id, { ...state, ui: { ...ui(state), fullDashboardPeriod: period } });
  render(rootElement, sector);
}

function toggleDoneExpanded(rootElement, sector) {
  const state = getState(sector.id);
  if (!_isTiModule(state)) return;
  const current = ui(state);
  setState(sector.id, { ...state, ui: { ...current, doneExpanded: !current.doneExpanded } });
  render(rootElement, sector);
}

function toggleColExpanded(rootElement, sector, status) {
  if (!status) return;
  const state = getState(sector.id);
  if (!_isTiModule(state)) return;
  const current     = ui(state);
  const colsExpanded = { ...(current.colsExpanded || {}), [status]: !current.colsExpanded?.[status] };
  setState(sector.id, { ...state, ui: { ...current, colsExpanded } });
  render(rootElement, sector);
}
