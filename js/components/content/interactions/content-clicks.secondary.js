/**
 * content-clicks.secondary.js
 * Handles click events for: TI Requests, Histórico, Questionários e Vitrine.
 * Called from content-clicks.js via handleSecondaryClicks().
 */

import { openTicketDetailModal } from '../../shared/ticket-detail-modal.js';

/**
 * @param {Event} event
 * @param {Element} rootElement
 * @param {object} sector
 * @param {object} viewState
 * @param {object} deps
 * @returns {boolean} true se o evento foi tratado
 */
export function handleSecondaryClicks(event, rootElement, sector, viewState, deps) {
  const {
    tiRequestsModuleHandlers,
    historicoModuleHandlers,
    questionariosModuleHandlers,
    vitrineModuleHandlers,
    evaluationModuleHandlers,
    feedbackModuleHandlers,
    qualityModuleHandlers,
    getModuleState,
  } = deps;

  // ── TI Requests ────────────────────────────────────────────────────

  const tiReloadBtn = event.target.closest('[data-ti-reload]');
  if (tiReloadBtn) {
    event.preventDefault();
    tiRequestsModuleHandlers?.reloadTickets(rootElement, sector);
    return true;
  }

  const tiExpandBtn = event.target.closest('[data-ti-expand]');

  const tiStatusBtn = event.target.closest('[data-ti-status]');
  if (tiStatusBtn) {
    event.preventDefault();
    tiRequestsModuleHandlers?.updateStatus(
      rootElement, sector,
      tiStatusBtn.dataset.tiStatus     || '',
      tiStatusBtn.dataset.tiNextStatus || '',
      viewState.authenticatedUser,
    );
    return true;
  }

  const tiStartConclusion = event.target.closest('[data-ti-start-conclusion]');
  if (tiStartConclusion) {
    event.preventDefault();
    tiRequestsModuleHandlers?.startConclusion(rootElement, sector, tiStartConclusion.dataset.tiStartConclusion || '');
    return true;
  }

  const tiCancelConclusion = event.target.closest('[data-ti-cancel-conclusion]');
  if (tiCancelConclusion) {
    event.preventDefault();
    tiRequestsModuleHandlers?.cancelConclusion(rootElement, sector);
    return true;
  }

  const tiConfirmConclusion = event.target.closest('[data-ti-confirm-conclusion]');
  if (tiConfirmConclusion) {
    event.preventDefault();
    const ticketId = tiConfirmConclusion.dataset.tiConfirmConclusion || '';
    const textarea = rootElement.querySelector(`[data-ti-obs-input="${CSS.escape(ticketId)}"]`);
    const obsError = rootElement.querySelector('[data-ti-obs-error]');
    const obs = textarea?.value?.trim() || '';
    if (!obs) {
      if (obsError) obsError.style.display = '';
      textarea?.focus();
      return true;
    }
    if (obsError) obsError.style.display = 'none';
    tiRequestsModuleHandlers?.confirmConclusion(rootElement, sector, ticketId, obs, viewState.authenticatedUser);
    return true;
  }

  if (tiExpandBtn && !event.target.closest('[data-ti-no-view]')) {
    event.preventDefault();
    tiRequestsModuleHandlers?.expandTicket(rootElement, sector, tiExpandBtn.dataset.tiExpand || '');
    return true;
  }

  const tiExpandCompleted = event.target.closest('[data-ti-expand-completed]');
  if (tiExpandCompleted) {
    event.preventDefault();
    tiRequestsModuleHandlers?.expandCompleted(rootElement, sector, tiExpandCompleted.dataset.tiExpandCompleted || '');
    return true;
  }

  const tiViewTicket = event.target.closest('[data-ti-view-ticket]');
  if (tiViewTicket && !event.target.closest('[data-ti-no-view]')) {
    event.preventDefault();
    const ticketId = tiViewTicket.dataset.tiViewTicket;
    const moduleState = getModuleState(sector.id);
    const ui = moduleState?.ui || {};
    const all = [...(ui.tickets || []), ...(ui.completedTickets || [])];
    const ticket = all.find((t) => t.id === ticketId);
    if (ticket) openTicketDetailModal(ticket);
    return true;
  }

  const tiToggleCol = event.target.closest('[data-ti-toggle-col]');
  if (tiToggleCol) {
    event.preventDefault();
    tiRequestsModuleHandlers?.toggleColExpanded(rootElement, sector, tiToggleCol.dataset.tiToggleCol || '');
    return true;
  }

  const tiOpenFull = event.target.closest('[data-ti-open-full-dashboard]');
  if (tiOpenFull) {
    event.preventDefault();
    tiRequestsModuleHandlers?.openFullDashboard(rootElement, sector);
    return true;
  }

  const tiCloseFull = event.target.closest('[data-ti-close-full-dashboard]');
  if (tiCloseFull) {
    event.preventDefault();
    tiRequestsModuleHandlers?.closeFullDashboard(rootElement, sector);
    return true;
  }

  const tiFullFilter = event.target.closest('[data-ti-full-filter]');
  if (tiFullFilter) {
    event.preventDefault();
    tiRequestsModuleHandlers?.setFullDashboardFilter(rootElement, sector, tiFullFilter.dataset.tiFullFilter || 'Pendente');
    return true;
  }

  const tiFullPeriod = event.target.closest('[data-ti-full-period]');
  if (tiFullPeriod) {
    event.preventDefault();
    tiRequestsModuleHandlers?.setFullDashboardPeriod(rootElement, sector, tiFullPeriod.dataset.tiFullPeriod || 'mes');
    return true;
  }

  // ── Histórico do Colaborador ─────────────────────────────────────────────

  const evalTab = event.target.closest('[data-eval-tab]');
  if (evalTab) {
    event.preventDefault();
    evaluationModuleHandlers?.setActiveTab(rootElement, sector, evalTab.dataset.evalTab || 'avaliacoes');
    return true;
  }

  const evalNextPage = event.target.closest('[data-eval-next-page]');
  if (evalNextPage) {
    event.preventDefault();
    evaluationModuleHandlers?.nextFormPage(rootElement, sector);
    return true;
  }

  const evalPrevPage = event.target.closest('[data-eval-prev-page]');
  if (evalPrevPage && !evalPrevPage.disabled) {
    event.preventDefault();
    evaluationModuleHandlers?.prevFormPage(rootElement, sector);
    return true;
  }

  const historicoTool = event.target.closest('[data-historico-tool]');
  if (historicoTool) {
    event.preventDefault();
    historicoModuleHandlers?.selectTool(rootElement, sector, historicoTool.dataset.historicoTool || '');
    return true;
  }

  const historicoSector = event.target.closest('[data-historico-sector]');
  if (historicoSector) {
    event.preventDefault();
    historicoModuleHandlers?.selectSector(rootElement, sector, historicoSector.dataset.historicoSector || '');
    return true;
  }

  const historicoTab = event.target.closest('[data-historico-tab]');
  if (historicoTab) {
    event.preventDefault();
    historicoModuleHandlers?.setActiveTab(rootElement, sector, historicoTab.dataset.historicoTab || 'timeline');
    return true;
  }

  const historicoRetry = event.target.closest('[data-historico-retry-content]');
  if (historicoRetry) {
    event.preventDefault();
    historicoModuleHandlers?.retryLoadContent(rootElement, sector);
    return true;
  }

  const historicoSearchBtn = event.target.closest('[data-historico-search-btn]');
  if (historicoSearchBtn) {
    event.preventDefault();
    historicoModuleHandlers?.searchUsers(rootElement, sector);
    return true;
  }

  const historicoSelectUser = event.target.closest('[data-historico-select-user]');
  if (historicoSelectUser) {
    event.preventDefault();
    historicoModuleHandlers?.selectUser(rootElement, sector, historicoSelectUser.dataset.historicoSelectUser || '');
    return true;
  }

  // ── Questionários (Admin) ────────────────────────────────────────────────

  const quizNew = event.target.closest('[data-quiz-new]');
  if (quizNew) { event.preventDefault(); questionariosModuleHandlers?.openNewForm(rootElement, sector); return true; }

  const quizBack = event.target.closest('[data-quiz-back]');
  if (quizBack) { event.preventDefault(); questionariosModuleHandlers?.goBack(rootElement, sector); return true; }

  const quizEdit = event.target.closest('[data-quiz-edit]');
  if (quizEdit) { event.preventDefault(); questionariosModuleHandlers?.openEditForm(rootElement, sector, quizEdit.dataset.quizEdit || ''); return true; }

  const quizSave = event.target.closest('[data-quiz-save]');
  if (quizSave) { event.preventDefault(); questionariosModuleHandlers?.save(rootElement, sector); return true; }

  const quizDelete = event.target.closest('[data-quiz-delete]');
  if (quizDelete) { event.preventDefault(); questionariosModuleHandlers?.deleteRecord(rootElement, sector, quizDelete.dataset.quizDelete || ''); return true; }

  // ── Vitrine — tab navigation ─────────────────────────────────────────────

  const vitrineTab = event.target.closest('[data-vitrine-tab]');
  if (vitrineTab) {
    event.preventDefault();
    vitrineModuleHandlers?.setActiveTab(rootElement, sector, vitrineTab.dataset.vitrineTab || '');
    return true;
  }

  const vitrineRetry = event.target.closest('[data-vitrine-retry]');
  if (vitrineRetry) {
    event.preventDefault();
    vitrineModuleHandlers?.retry(rootElement, sector);
    return true;
  }

  // ── Dropdown close fallback ──────────────────────────────────────────────

  if (!event.target.closest('[data-evaluation-picker]')) {
    evaluationModuleHandlers.closeDropdown(rootElement, sector);
  }
  if (!event.target.closest('[data-feedback-picker]')) {
    feedbackModuleHandlers.closeDropdown(rootElement, sector);
  }
  if (!event.target.closest('[data-quality-picker]')) {
    qualityModuleHandlers.closeDropdown(rootElement, sector);
  }

  return false;
}
