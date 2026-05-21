import { openDocumentModal } from '../../modules/document-module.js';
import { openVideoModal } from '../../modules/video-module.js';
import { MODULE_IDS } from '../../../constants/module.constants.js';

export function createClickHandler(rootElement, viewState, dependencies) {
  const sector = viewState.selectedItem;
  const {
    moduleCardIds,
    handleModuleSelection,
    clearSelectedModule,
    toggleModuleSort,
    setModuleView,
    userAdminModuleHandlers,
    evaluationModuleHandlers,
    feedbackModuleHandlers,
    qualityModuleHandlers,
    tiRequestsModuleHandlers,
    historicoModuleHandlers,
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
      evaluationModuleHandlers.selectUser(rootElement, sector, evaluateeOption.dataset.userId || '');
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
    if (tiExpandBtn) {
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

    // ── Histórico do Colaborador ───────────────────────────────────────────
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