import { openDocumentModal } from '../../modules/document-module.js';
import { openVideoModal } from '../../modules/video-module.js';
import { openTicketDetailModal } from '../../shared/ticket-detail-modal.js';
import { MODULE_IDS } from '../../../constants/module.constants.js';

export function createClickHandler(rootElement, viewState, dependencies) {
  const sector = viewState.selectedItem;
  const {
    moduleCardIds,
    handleModuleSelection,
    clearSelectedModule,
    toggleModuleSort,
    setModuleView,
    setModuleToolFilter,
    userAdminModuleHandlers,
    evaluationModuleHandlers,
    feedbackModuleHandlers,
    qualityModuleHandlers,
    tiRequestsModuleHandlers,
    historicoModuleHandlers,
    questionariosModuleHandlers,
    vitrineModuleHandlers,
    getModuleState,
  } = dependencies;

  return (event) => {
    const cardButton = event.target.closest('[data-module-card]');

    if (cardButton) {
      event.preventDefault();
      const moduleId = cardButton.dataset.moduleId;

      if (!moduleId || !moduleCardIds.has(moduleId)) {
        return;
      }

      handleModuleSelection(rootElement, sector, moduleId, viewState.authenticatedUser);
      return;
    }

    const retryButton = event.target.closest('[data-module-retry]');

    if (retryButton) {
      event.preventDefault();
      const moduleId = retryButton.dataset.moduleId;

      if (moduleId) {
        handleModuleSelection(rootElement, sector, moduleId, viewState.authenticatedUser, { forceRefresh: true });
      }

      return;
    }

    const backButton = event.target.closest('[data-module-back]');

    if (backButton) {
      event.preventDefault();
      clearSelectedModule(rootElement, sector, viewState.authenticatedUser);
      return;
    }

    const sortButton = event.target.closest('[data-module-sort]');

    if (sortButton) {
      event.preventDefault();
      toggleModuleSort(rootElement, sector);
      return;
    }

    const viewButton = event.target.closest('[data-module-view]');

    if (viewButton) {
      event.preventDefault();
      setModuleView(rootElement, sector, viewButton.dataset.moduleView || 'grid');
      return;
    }

    const toolFilterButton = event.target.closest('[data-module-tool-filter]');

    if (toolFilterButton) {
      event.preventDefault();
      setModuleToolFilter(rootElement, sector, toolFilterButton.dataset.moduleToolFilter || '');
      return;
    }

    const videoButton = event.target.closest('[data-video-embed-url]');

    if (videoButton) {
      event.preventDefault();
      openVideoModal(
        {
          title: videoButton.dataset.videoTitle || 'Vídeo de treinamento',
          embedUrl: videoButton.dataset.videoEmbedUrl || '',
        },
        {
          sectorId: sector.id,
          moduloId: 'instrucoes-video',
          userId: viewState.authenticatedUser?.id || '',
        },
      );
      return;
    }

    const documentButton = event.target.closest('[data-document-preview-url]');

    if (documentButton) {
      event.preventDefault();
      openDocumentModal({
        title: documentButton.dataset.documentTitle || 'Documento',
        previewUrl: documentButton.dataset.documentPreviewUrl || '',
        moduloId: documentButton.dataset.documentModuloId || 'documentos',
        sectorId: sector.id,
      });
      return;
    }

    const userAdminSearchButton = event.target.closest('[data-user-admin-search]');

    if (userAdminSearchButton) {
      event.preventDefault();
      userAdminModuleHandlers.searchRecords(rootElement, sector);
      return;
    }

    const userAdminEditButton = event.target.closest('[data-user-admin-edit]');

    if (userAdminEditButton) {
      event.preventDefault();
      userAdminModuleHandlers.editRecord(rootElement, sector, userAdminEditButton.dataset.userId || '');
      return;
    }

    const userAdminClearButton = event.target.closest('[data-user-admin-clear]');

    if (userAdminClearButton) {
      event.preventDefault();
      userAdminModuleHandlers.clearForm(rootElement, sector);
      return;
    }

    const userAdminSaveButton = event.target.closest('[data-user-admin-save]');

    if (userAdminSaveButton) {
      event.preventDefault();
      userAdminModuleHandlers.saveRecord(rootElement, sector);
      return;
    }

    const userAdminDeleteButton = event.target.closest('[data-user-admin-delete]');

    if (userAdminDeleteButton) {
      event.preventDefault();
      userAdminModuleHandlers.deleteRecord(rootElement, sector, userAdminDeleteButton.dataset.userAdminDelete || '');
      return;
    }

    const userAdminResetPasswordButton = event.target.closest('[data-user-admin-reset-password]');

    if (userAdminResetPasswordButton) {
      event.preventDefault();
      userAdminModuleHandlers.resetPassword(rootElement, sector);
      return;
    }

    const userAdminCopyPasswordButton = event.target.closest('[data-user-admin-copy-password]');

    if (userAdminCopyPasswordButton) {
      event.preventDefault();
      userAdminModuleHandlers.copyPassword(rootElement, sector);
      return;
    }

    const pwToggleButton = event.target.closest('[data-pw-toggle]');

    if (pwToggleButton) {
      event.preventDefault();
      const wrap = pwToggleButton.closest('.user-admin-password-wrap');
      const input = wrap?.querySelector('input[data-user-admin-field="senha"]');
      if (!input) return;
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      const icon = pwToggleButton.querySelector('i[data-lucide]') || pwToggleButton.querySelector('svg');
      if (icon) {
        icon.setAttribute('data-lucide', isHidden ? 'eye' : 'eye-off');
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [icon.parentElement] });
      }
      pwToggleButton.setAttribute('aria-label', isHidden ? 'Ocultar senha' : 'Alternar visibilidade da senha');
      return;
    }

    const successCloseButton = event.target.closest('[data-user-admin-close-success]');

    if (successCloseButton) {
      event.preventDefault();
      userAdminModuleHandlers.closeSuccessModal(rootElement, sector);
      return;
    }

    const successCopyButton = event.target.closest('[data-user-admin-copy-info]');

    if (successCopyButton) {
      event.preventDefault();
      userAdminModuleHandlers.copyRegistrationInfo(rootElement, sector);
      return;
    }

    const successBackdrop = event.target.closest('[data-user-admin-success-backdrop]');

    if (successBackdrop && !event.target.closest('.user-admin-success-modal')) {
      event.preventDefault();
      userAdminModuleHandlers.closeSuccessModal(rootElement, sector);
      return;
    }

    const evaluationToolButton = event.target.closest('[data-evaluation-tool]');

    if (evaluationToolButton) {
      event.preventDefault();
      evaluationModuleHandlers.selectTool(rootElement, sector, evaluationToolButton.dataset.evaluationTool || '');
      return;
    }

    const evaluationToolsBackButton = event.target.closest('[data-evaluation-tools-back]');

    if (evaluationToolsBackButton) {
      event.preventDefault();
      evaluationModuleHandlers.clearSelectedTool(rootElement, sector);
      return;
    }

    const evaluateeToggle = event.target.closest('[data-evaluatee-toggle]');

    if (evaluateeToggle) {
      event.preventDefault();
      evaluationModuleHandlers.toggleDropdown(rootElement, sector);
      return;
    }

    const evaluateeOption = event.target.closest('[data-evaluatee-option]');

    if (evaluateeOption) {
      event.preventDefault();
      const userId = evaluateeOption.dataset.userId || '';
      // data-evaluation-pending-user identifica uma pill com avaliações em falta.
      // Nesses casos inicia-se o fluxo contínuo de preenchimento (startPendingFlow),
      // que seleciona o utilizador E a primeira ferramenta pendente automaticamente,
      // avançando para cada ferramenta seguinte após cada gravação bem-sucedida.
      // Para utilizadores sem pendências o comportamento selectUser mantém-se.
      if (evaluateeOption.dataset.evaluationPendingUser) {
        evaluationModuleHandlers.startPendingFlow(rootElement, sector, userId);
      } else {
        evaluationModuleHandlers.selectUser(rootElement, sector, userId);
      }
      return;
    }

    const evaluationSaveButton = event.target.closest('[data-evaluation-save]');

    if (evaluationSaveButton) {
      event.preventDefault();
      evaluationModuleHandlers.saveResult(rootElement, sector);
      return;
    }


    const qualityToolButton = event.target.closest('[data-quality-tool]');

    if (qualityToolButton) {
      event.preventDefault();
      qualityModuleHandlers.selectTool(rootElement, sector, qualityToolButton.dataset.qualityTool || '');
      return;
    }

    const qualityToolsBackButton = event.target.closest('[data-quality-tools-back]');

    if (qualityToolsBackButton) {
      event.preventDefault();
      qualityModuleHandlers.clearSelectedTool(rootElement, sector);
      return;
    }

    const qualitySwitchView = event.target.closest('[data-quality-switch-view]');

    if (qualitySwitchView) {
      event.preventDefault();
      qualityModuleHandlers.switchView?.(rootElement, sector, qualitySwitchView.dataset.qualitySwitchView || 'evaluations');
      return;
    }

    const qualityMarkRead = event.target.closest('[data-quality-mark-read]');

    if (qualityMarkRead) {
      event.preventDefault();
      qualityModuleHandlers.markFeedbackRead?.(rootElement, sector, qualityMarkRead.dataset.qualityMarkRead || '');
      return;
    }

    const qualityEvaluateeToggle = event.target.closest('[data-quality-evaluatee-toggle]');

    if (qualityEvaluateeToggle) {
      event.preventDefault();
      qualityModuleHandlers.toggleDropdown(rootElement, sector);
      return;
    }

    const qualityEvaluateeOption = event.target.closest('[data-quality-evaluatee-option]');

    if (qualityEvaluateeOption) {
      event.preventDefault();
      qualityModuleHandlers.selectUser(rootElement, sector, qualityEvaluateeOption.dataset.userId || '');
      return;
    }

    const multidirConfigSave = event.target.closest('[data-multidir-config-save]');
    if (multidirConfigSave) {
      const toolId  = multidirConfigSave.dataset.multidirConfigSave || '';
      const inputEl = rootElement.querySelector(`[data-multidir-config-tool="${toolId}"]`);
      const value   = inputEl ? Math.max(1, Math.min(20, parseInt(inputEl.value, 10) || 5)) : 5;
      qualityModuleHandlers.saveMultidirConfig?.(rootElement, sector, toolId, value);
      return;
    }

    // Botões de pontuação 1–5 das avaliações multidirecionais
    const multidirScoreBtn = event.target.closest('[data-evaluation-score][data-evaluation-period][data-evaluation-value]');
    if (multidirScoreBtn) {
      evaluationModuleHandlers.updateScore(
        rootElement,
        sector,
        multidirScoreBtn.dataset.evaluationScore  || '',
        multidirScoreBtn.dataset.evaluationPeriod || '',
        multidirScoreBtn.dataset.evaluationValue  || '',
      );
      return;
    }

    const feedbackTargetToggle = event.target.closest('[data-feedback-target-toggle]');

    if (feedbackTargetToggle) {
      event.preventDefault();
      feedbackModuleHandlers.toggleDropdown(rootElement, sector);
      return;
    }

    const feedbackTargetOption = event.target.closest('[data-feedback-target-option]');

    if (feedbackTargetOption) {
      event.preventDefault();
      feedbackModuleHandlers.selectUser(rootElement, sector, feedbackTargetOption.dataset.userId || '');
      return;
    }

    // ── TI Requests ────────────────────────────────────────────────────

    const tiReloadBtn = event.target.closest('[data-ti-reload]');
    if (tiReloadBtn) {
      event.preventDefault();
      tiRequestsModuleHandlers?.reloadTickets(rootElement, sector);
      return;
    }

    const tiExpandBtn = event.target.closest('[data-ti-expand]');

    // ── Action buttons inside cards must be checked BEFORE expand ──────
    // (they live inside [data-ti-expand] containers; closest() would
    //  otherwise match the parent card and toggle expand instead)

    const tiStatusBtn = event.target.closest('[data-ti-status]');
    if (tiStatusBtn) {
      event.preventDefault();
      tiRequestsModuleHandlers?.updateStatus(
        rootElement, sector,
        tiStatusBtn.dataset.tiStatus     || '',
        tiStatusBtn.dataset.tiNextStatus || '',
        viewState.authenticatedUser,
      );
      return;
    }

    const tiStartConclusion = event.target.closest('[data-ti-start-conclusion]');
    if (tiStartConclusion) {
      event.preventDefault();
      tiRequestsModuleHandlers?.startConclusion(rootElement, sector, tiStartConclusion.dataset.tiStartConclusion || '');
      return;
    }

    const tiCancelConclusion = event.target.closest('[data-ti-cancel-conclusion]');
    if (tiCancelConclusion) {
      event.preventDefault();
      tiRequestsModuleHandlers?.cancelConclusion(rootElement, sector);
      return;
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
        return;
      }
      if (obsError) obsError.style.display = 'none';
      tiRequestsModuleHandlers?.confirmConclusion(rootElement, sector, ticketId, obs, viewState.authenticatedUser);
      return;
    }

    // ── Expand (after action buttons) ─────────────────────────────────
    if (tiExpandBtn && !event.target.closest('[data-ti-no-view]')) {
      event.preventDefault();
      tiRequestsModuleHandlers?.expandTicket(rootElement, sector, tiExpandBtn.dataset.tiExpand || '');
      return;
    }

    const tiExpandCompleted = event.target.closest('[data-ti-expand-completed]');
    if (tiExpandCompleted) {
      event.preventDefault();
      tiRequestsModuleHandlers?.expandCompleted(rootElement, sector, tiExpandCompleted.dataset.tiExpandCompleted || '');
      return;
    }

    const tiViewTicket = event.target.closest('[data-ti-view-ticket]');
    if (tiViewTicket && !event.target.closest('[data-ti-no-view]')) {
      event.preventDefault();
      const ticketId = tiViewTicket.dataset.tiViewTicket;
      const moduleState = dependencies.getModuleState(sector.id);
      const ui = moduleState?.ui || {};
      const all = [...(ui.tickets || []), ...(ui.completedTickets || [])];
      const ticket = all.find(t => t.id === ticketId);
      if (ticket) openTicketDetailModal(ticket);
      return;
    }

    const tiToggleCol = event.target.closest('[data-ti-toggle-col]');
    if (tiToggleCol) {
      event.preventDefault();
      tiRequestsModuleHandlers?.toggleColExpanded(rootElement, sector, tiToggleCol.dataset.tiToggleCol || '');
      return;
    }

    const tiOpenFull = event.target.closest('[data-ti-open-full-dashboard]');
    if (tiOpenFull) {
      event.preventDefault();
      tiRequestsModuleHandlers?.openFullDashboard(rootElement, sector);
      return;
    }

    const tiCloseFull = event.target.closest('[data-ti-close-full-dashboard]');
    if (tiCloseFull) {
      event.preventDefault();
      tiRequestsModuleHandlers?.closeFullDashboard(rootElement, sector);
      return;
    }

    const tiFullFilter = event.target.closest('[data-ti-full-filter]');
    if (tiFullFilter) {
      event.preventDefault();
      tiRequestsModuleHandlers?.setFullDashboardFilter(rootElement, sector, tiFullFilter.dataset.tiFullFilter || 'Pendente');
      return;
    }

    const tiFullPeriod = event.target.closest('[data-ti-full-period]');
    if (tiFullPeriod) {
      event.preventDefault();
      tiRequestsModuleHandlers?.setFullDashboardPeriod(rootElement, sector, tiFullPeriod.dataset.tiFullPeriod || 'mes');
      return;
    }

    // ── Histórico do Colaborador ───────────────────────────────────────────
    const evalTab = event.target.closest('[data-eval-tab]');
    if (evalTab) {
      event.preventDefault();
      evaluationModuleHandlers?.setActiveTab(rootElement, sector, evalTab.dataset.evalTab || 'avaliacoes');
      return;
    }

    const historicoTool = event.target.closest('[data-historico-tool]');
    if (historicoTool) {
      event.preventDefault();
      historicoModuleHandlers?.selectTool(rootElement, sector, historicoTool.dataset.historicoTool || '');
      return;
    }

    const historicoSector = event.target.closest('[data-historico-sector]');
    if (historicoSector) {
      event.preventDefault();
      historicoModuleHandlers?.selectSector(rootElement, sector, historicoSector.dataset.historicoSector || '');
      return;
    }

    const historicoTab = event.target.closest('[data-historico-tab]');
    if (historicoTab) {
      event.preventDefault();
      historicoModuleHandlers?.setActiveTab(rootElement, sector, historicoTab.dataset.historicoTab || 'timeline');
      return;
    }

    const historicoRetry = event.target.closest('[data-historico-retry-content]');
    if (historicoRetry) {
      event.preventDefault();
      historicoModuleHandlers?.retryLoadContent(rootElement, sector);
      return;
    }

    const historicoSearchBtn = event.target.closest('[data-historico-search-btn]');
    if (historicoSearchBtn) {
      event.preventDefault();
      historicoModuleHandlers?.searchUsers(rootElement, sector);
      return;
    }

    const historicoSelectUser = event.target.closest('[data-historico-select-user]');
    if (historicoSelectUser) {
      event.preventDefault();
      historicoModuleHandlers?.selectUser(rootElement, sector, historicoSelectUser.dataset.historicoSelectUser || '');
      return;
    }

    // ── Questionários (Admin) ──────────────────────────────────────────────

    const quizNew = event.target.closest('[data-quiz-new]');
    if (quizNew) {
      event.preventDefault();
      questionariosModuleHandlers?.openNewForm(rootElement, sector);
      return;
    }

    const quizBack = event.target.closest('[data-quiz-back]');
    if (quizBack) {
      event.preventDefault();
      questionariosModuleHandlers?.goBack(rootElement, sector);
      return;
    }

    const quizEdit = event.target.closest('[data-quiz-edit]');
    if (quizEdit) {
      event.preventDefault();
      questionariosModuleHandlers?.openEditForm(rootElement, sector, quizEdit.dataset.quizEdit || '');
      return;
    }

    const quizSave = event.target.closest('[data-quiz-save]');
    if (quizSave) {
      event.preventDefault();
      questionariosModuleHandlers?.save(rootElement, sector);
      return;
    }

    const quizDelete = event.target.closest('[data-quiz-delete]');
    if (quizDelete) {
      event.preventDefault();
      questionariosModuleHandlers?.deleteRecord(rootElement, sector, quizDelete.dataset.quizDelete || '');
      return;
    }

    // ── Vitrine — tab navigation ────────────────────────────────────────
    const vitrineTab = event.target.closest('[data-vitrine-tab]');
    if (vitrineTab) {
      event.preventDefault();
      vitrineModuleHandlers?.setActiveTab(rootElement, sector, vitrineTab.dataset.vitrineTab || '');
      return;
    }

    const vitrineRetry = event.target.closest('[data-vitrine-retry]');
    if (vitrineRetry) {
      event.preventDefault();
      vitrineModuleHandlers?.retry(rootElement, sector);
      return;
    }

    if (!event.target.closest('[data-evaluation-picker]')) {
      evaluationModuleHandlers.closeDropdown(rootElement, sector);
    }

    if (!event.target.closest('[data-feedback-picker]')) {
      feedbackModuleHandlers.closeDropdown(rootElement, sector);
    }

    if (!event.target.closest('[data-quality-picker]')) {
      qualityModuleHandlers.closeDropdown(rootElement, sector);
    }
  };
}