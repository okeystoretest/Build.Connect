import { openDocumentModal } from '../../modules/document-module.js';
import { openVideoModal } from '../../modules/video-module.js';
import { handleSecondaryClicks } from './content-clicks.secondary.js';
import { showToast } from '../../../utils/toast.js';

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
    denunciasModuleHandlers,
    getModuleState,
  } = dependencies;

  return (event) => {
    const cardButton = event.target.closest('[data-module-card]');
    if (cardButton) {
      event.preventDefault();
      const moduleId = cardButton.dataset.moduleId;
      if (!moduleId || !moduleCardIds.has(moduleId)) return;

      // Navi — card bloqueado: exibe motivo e aborta entrada no módulo
      if (cardButton.dataset.naviLocked === 'true') {
        const reason = cardButton.dataset.naviLockReason || 'Este conteúdo está bloqueado.';
        showToast(reason, { type: 'warning', duration: 4500 });
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
      if (videoButton.dataset.naviLocked === 'true') {
        showToast('Conclua o item anterior para acessar este conteúdo.', { type: 'warning' });
        return;
      }
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
      if (documentButton.dataset.naviLocked === 'true') {
        showToast('Conclua o item anterior para acessar este conteúdo.', { type: 'warning' });
        return;
      }
      openDocumentModal({
        title: documentButton.dataset.documentTitle || 'Documento',
        previewUrl: documentButton.dataset.documentPreviewUrl || '',
        moduloId: documentButton.dataset.documentModuloId || 'documentos',
        sectorId: sector.id,
        isImage: documentButton.dataset.documentIsImage === 'true',
      });
      return;
    }

    // ── User Admin ──────────────────────────────────────────────────────────

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

    // ── Evaluation ──────────────────────────────────────────────────────────

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
      // Fluxo obrigatório automático desabilitado: seleção sempre via selectUser.
      evaluationModuleHandlers.selectUser(rootElement, sector, userId);
      return;
    }

    const evaluationSaveButton = event.target.closest('[data-evaluation-save]');
    if (evaluationSaveButton) {
      event.preventDefault();
      evaluationModuleHandlers.saveResult(rootElement, sector);
      return;
    }

    // ── Quality ─────────────────────────────────────────────────────────────

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

    const multidirScoreBtn = event.target.closest('[data-evaluation-score][data-evaluation-period][data-evaluation-value]');
    if (multidirScoreBtn) {
      evaluationModuleHandlers.updateScore(
        rootElement, sector,
        multidirScoreBtn.dataset.evaluationScore  || '',
        multidirScoreBtn.dataset.evaluationPeriod || '',
        multidirScoreBtn.dataset.evaluationValue  || '',
      );
      return;
    }

    // ── Feedback ────────────────────────────────────────────────────────────

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

    // ── Secondary handlers (TI, Histórico, Quiz, Vitrine, dropdown close) ──

    handleSecondaryClicks(event, rootElement, sector, viewState, {
      tiRequestsModuleHandlers,
      historicoModuleHandlers,
      questionariosModuleHandlers,
      vitrineModuleHandlers,
      denunciasModuleHandlers,
      evaluationModuleHandlers,
      feedbackModuleHandlers,
      qualityModuleHandlers,
      getModuleState,
    });
  };
}
