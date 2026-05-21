import { MODULE_IDS } from '../../../constants/module.constants.js';
import { listarChamadosTI, atualizarStatusChamadoTI } from '../../../services/ti-requests.service.js';
import { TI_REQUESTS_UI_DEFAULTS } from './ti-requests.constants.js';

let moduleContext = null;

export function createTiRequestsModuleHandlers(context) {
  moduleContext = context;
  return {
    loadTickets:           loadTiTickets,
    reloadTickets:         reloadTiTickets,
    expandTicket:          expandTiTicket,
    expandCompleted:       expandCompletedTicket,
    updateStatus:          updateTiTicketStatus,
    startConclusion:       startConclusion,
    cancelConclusion:      cancelConclusion,
    confirmConclusion:     confirmConclusion,
    changePeriod:          changeDashboardPeriod,
    openFullDashboard:     openFullDashboard,
    closeFullDashboard:    closeFullDashboard,
    setFullDashboardFilter: setFullDashboardFilter,
    setFullDashboardPeriod: setFullDashboardPeriod,
  };
}

function getState(id)       { return moduleContext.getModuleState(id); }
function setState(id, s)    { return moduleContext.setModuleState(id, s); }
function render(el, sector) { return moduleContext.renderModuleStage(el, sector); }

function ui(state) { return { ...TI_REQUESTS_UI_DEFAULTS, ...(state.ui || {}) }; }

// ── Load ──────────────────────────────────────────────────────────────────

async function loadTiTickets(rootElement, sector) {
  const state = getState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.tiRequest) return;

  const currentUi = ui(state);
  setState(sector.id, { ...state, ui: { ...currentUi, loadStatus: 'loading', errorMessage: '' } });
  render(rootElement, sector);

  try {
    const response = await listarChamadosTI(currentUi.dashboardPeriod || 'mes');
    const next = getState(sector.id);
    if (next.selectedModuleId !== MODULE_IDS.tiRequest) return;

    const nextUi = ui(next);
    if (response?.success) {
      setState(sector.id, {
        ...next,
        ui: {
          ...nextUi,
          loadStatus:          'success',
          tickets:             Array.isArray(response.tickets)          ? response.tickets          : [],
          completedTickets:    Array.isArray(response.completedTickets) ? response.completedTickets : [],
          dashboard:           response.dashboard || null,
          expandedTicketId:    null,
          expandedCompletedId: null,
          confirmingConclusionId: null,
          errorMessage:        '',
        },
      });
    } else {
      setState(sector.id, { ...next, ui: { ...nextUi, loadStatus: 'error', errorMessage: response?.message || 'Não foi possível carregar os chamados.' } });
    }
  } catch (err) {
    const next = getState(sector.id);
    setState(sector.id, { ...next, ui: { ...ui(next), loadStatus: 'error', errorMessage: err?.message || 'Erro ao carregar chamados.' } });
  }

  render(rootElement, sector);
}

async function reloadTiTickets(rootElement, sector) { return loadTiTickets(rootElement, sector); }

// ── Expand ────────────────────────────────────────────────────────────────

function expandTiTicket(rootElement, sector, ticketId) {
  const state = getState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.tiRequest) return;
  const currentUi = ui(state);
  setState(sector.id, {
    ...state,
    ui: { ...currentUi, expandedTicketId: currentUi.expandedTicketId === ticketId ? null : ticketId, confirmingConclusionId: null },
  });
  render(rootElement, sector);
}

function expandCompletedTicket(rootElement, sector, ticketId) {
  const state = getState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.tiRequest) return;
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
  if (state.selectedModuleId !== MODULE_IDS.tiRequest) return;
  setState(sector.id, { ...state, ui: { ...ui(state), confirmingConclusionId: ticketId, expandedTicketId: ticketId } });
  render(rootElement, sector);
}

function cancelConclusion(rootElement, sector) {
  const state = getState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.tiRequest) return;
  setState(sector.id, { ...state, ui: { ...ui(state), confirmingConclusionId: null } });
  render(rootElement, sector);
}

async function confirmConclusion(rootElement, sector, ticketId, observacao, user) {
  const obs = String(observacao || '').trim();
  if (!obs) return; // handled by view validation

  const state = getState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.tiRequest) return;

  setState(sector.id, { ...state, ui: { ...ui(state), isUpdating: true, updatingTicketId: ticketId } });
  render(rootElement, sector);

  try {
    const response = await atualizarStatusChamadoTI(
      ticketId, 'Concluído',
      String(user?.id || ''), String(user?.nome || ''), obs,
    );
    const next = getState(sector.id);
    if (next.selectedModuleId !== MODULE_IDS.tiRequest) return;

    if (response?.success) {
      setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null, confirmingConclusionId: null } });
      render(rootElement, sector);
      await loadTiTickets(rootElement, sector);
    } else {
      setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null, errorMessage: response?.message || 'Erro ao concluir chamado.' } });
      render(rootElement, sector);
    }
  } catch (err) {
    const next = getState(sector.id);
    setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null, errorMessage: err?.message || 'Erro ao concluir chamado.' } });
    render(rootElement, sector);
  }
}

// ── Update status (Atribuído, Em andamento) ───────────────────────────────

async function updateTiTicketStatus(rootElement, sector, ticketId, novoStatus, user) {
  const state = getState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.tiRequest) return;

  setState(sector.id, { ...state, ui: { ...ui(state), isUpdating: true, updatingTicketId: ticketId } });
  render(rootElement, sector);

  try {
    const response = await atualizarStatusChamadoTI(
      ticketId, novoStatus,
      String(user?.id || ''), String(user?.nome || ''), '',
    );
    const next = getState(sector.id);
    if (next.selectedModuleId !== MODULE_IDS.tiRequest) return;

    if (response?.success) {
      setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null, expandedTicketId: null } });
      render(rootElement, sector);
      await loadTiTickets(rootElement, sector);
    } else {
      setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null, errorMessage: response?.message || 'Erro ao atualizar status.' } });
      render(rootElement, sector);
    }
  } catch (err) {
    const next = getState(sector.id);
    setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null, errorMessage: err?.message || 'Erro ao atualizar chamado.' } });
    render(rootElement, sector);
  }
}

// ── Dashboard period ──────────────────────────────────────────────────────

async function changeDashboardPeriod(rootElement, sector, period) {
  const state = getState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.tiRequest) return;
  setState(sector.id, { ...state, ui: { ...ui(state), dashboardPeriod: period } });
  await loadTiTickets(rootElement, sector);
}

// ── Full Dashboard ─────────────────────────────────────────────────────────

function openFullDashboard(rootElement, sector) {
  const state = getState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.tiRequest) return;
  setState(sector.id, { ...state, ui: { ...ui(state), dashboardFullOpen: true, fullDashboardFilter: 'all' } });
  render(rootElement, sector);
}

function closeFullDashboard(rootElement, sector) {
  const state = getState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.tiRequest) return;
  setState(sector.id, { ...state, ui: { ...ui(state), dashboardFullOpen: false } });
  render(rootElement, sector);
}

function setFullDashboardFilter(rootElement, sector, filter) {
  const state = getState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.tiRequest) return;
  setState(sector.id, { ...state, ui: { ...ui(state), fullDashboardFilter: filter } });
  render(rootElement, sector);
}

function setFullDashboardPeriod(rootElement, sector, period) {
  const state = getState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.tiRequest) return;
  setState(sector.id, { ...state, ui: { ...ui(state), fullDashboardPeriod: period } });
  render(rootElement, sector);
}