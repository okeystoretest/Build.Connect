/**
 * ti-requests.handlers.admin.js
 * Handlers gerenciais do Kanban de Motoristas (Gestor/Admin):
 *   • Filtro por motorista
 *   • Atribuição direta na coluna Pendente
 *   • Desatribuição de atividades
 *
 * Recebe o contexto compartilhado de ti-requests.handlers.js via
 * createAdminHandlers(), no mesmo padrão de createMotoristaHandlers().
 */

import {
  listarMotoristas,
  atribuirChamadoMotorista,
  desatribuirChamadoMotorista,
} from '../../../services/ti-requests.service.js';
import { showToast } from '../../../utils/toast.js';

export function createAdminHandlers({ getState, setState, render, ui, isTiModule, loadTiTickets }) {

  // ── Lista de motoristas elegíveis ────────────────────────────────────────

  /**
   * Carrega a lista de motoristas (setor exclusivo) e a persiste no estado do
   * módulo. Chamado após o load dos chamados; falha silenciosa mantém o Kanban
   * operante — apenas os controles de atribuição ficam sem opções.
   */
  async function loadMotoristasDisponiveis(rootElement, sector) {
    const state = getState(sector.id);
    if (!isTiModule(state)) return;

    try {
      const response = await listarMotoristas();
      const next = getState(sector.id);
      if (!isTiModule(next)) return;
      if (!response?.success) return;

      const users = Array.isArray(response.users) ? response.users : [];
      setState(sector.id, {
        ...next,
        ui: { ...ui(next), motoristasDisponiveis: users },
      });
      render(rootElement, sector);
    } catch { /* silencioso — não bloqueia o Kanban */ }
  }

  // ── Filtro por motorista ─────────────────────────────────────────────────

  function changeKanbanMotoristaFilter(rootElement, sector, motoristaId) {
    const state = getState(sector.id);
    if (!isTiModule(state)) return;
    setState(sector.id, {
      ...state,
      ui: { ...ui(state), kanbanMotorista: motoristaId || '', assigningTicketId: null },
    });
    render(rootElement, sector);
  }

  function clearKanbanMotoristaFilter(rootElement, sector) {
    return changeKanbanMotoristaFilter(rootElement, sector, '');
  }

  // ── Atribuição direta ────────────────────────────────────────────────────

  function openAssignPanel(rootElement, sector, ticketId) {
    const state = getState(sector.id);
    if (!isTiModule(state)) return;
    setState(sector.id, {
      ...state,
      ui: { ...ui(state), assigningTicketId: ticketId, expandedTicketId: ticketId },
    });
    render(rootElement, sector);
  }

  function cancelAssignPanel(rootElement, sector) {
    const state = getState(sector.id);
    if (!isTiModule(state)) return;
    setState(sector.id, { ...state, ui: { ...ui(state), assigningTicketId: null } });
    render(rootElement, sector);
  }

  async function confirmAssign(rootElement, sector, ticketId) {
    const select      = rootElement.querySelector(`[data-ti-assign-select="${CSS.escape(ticketId)}"]`);
    const motoristaId = String(select?.value || '').trim();

    if (!motoristaId) {
      const err = rootElement.querySelector('[data-ti-assign-error]');
      if (err) err.style.display = '';
      return;
    }

    const state = getState(sector.id);
    if (!isTiModule(state)) return;

    setState(sector.id, {
      ...state,
      ui: { ...ui(state), assigningTicketId: null, isUpdating: true, updatingTicketId: ticketId },
    });
    render(rootElement, sector);

    try {
      const response = await atribuirChamadoMotorista(ticketId, motoristaId);
      const next = getState(sector.id);
      if (!isTiModule(next)) return;

      setState(sector.id, {
        ...next,
        ui: { ...ui(next), isUpdating: false, updatingTicketId: null, expandedTicketId: null },
      });
      render(rootElement, sector);

      if (response?.success) {
        showToast(response.message || 'Atividade atribuída.', { type: 'success', duration: 4000 });
        await loadTiTickets(rootElement, sector);
      } else {
        showToast(response?.message || 'Não foi possível atribuir a atividade.', { type: 'error', duration: 5000 });
      }
    } catch (err) {
      const next = getState(sector.id);
      setState(sector.id, {
        ...next,
        ui: { ...ui(next), isUpdating: false, updatingTicketId: null },
      });
      render(rootElement, sector);
      showToast(err?.message || 'Erro ao atribuir. Tente novamente.', { type: 'error', duration: 5000 });
    }
  }

  // ── Desatribuição ────────────────────────────────────────────────────────

  async function unassignTicket(rootElement, sector, ticketId) {
    const state = getState(sector.id);
    if (!isTiModule(state)) return;

    setState(sector.id, {
      ...state,
      ui: { ...ui(state), isUpdating: true, updatingTicketId: ticketId },
    });
    render(rootElement, sector);

    try {
      const response = await desatribuirChamadoMotorista(ticketId);
      const next = getState(sector.id);
      if (!isTiModule(next)) return;

      setState(sector.id, {
        ...next,
        ui: { ...ui(next), isUpdating: false, updatingTicketId: null, expandedTicketId: null },
      });
      render(rootElement, sector);

      if (response?.success) {
        showToast(response.message || 'Atividade retornada para Pendente.', { type: 'success', duration: 4000 });
        await loadTiTickets(rootElement, sector);
      } else {
        showToast(response?.message || 'Não foi possível desatribuir a atividade.', { type: 'error', duration: 5000 });
      }
    } catch (err) {
      const next = getState(sector.id);
      setState(sector.id, {
        ...next,
        ui: { ...ui(next), isUpdating: false, updatingTicketId: null },
      });
      render(rootElement, sector);
      showToast(err?.message || 'Erro ao desatribuir. Tente novamente.', { type: 'error', duration: 5000 });
    }
  }

  return {
    loadMotoristasDisponiveis,
    changeKanbanMotoristaFilter,
    clearKanbanMotoristaFilter,
    openAssignPanel,
    cancelAssignPanel,
    confirmAssign,
    unassignTicket,
  };
}
