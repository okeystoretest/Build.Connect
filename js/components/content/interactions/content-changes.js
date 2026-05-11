export function createChangeHandler(rootElement, sector, dependencies) {
  const { evaluationModuleHandlers, feedbackModuleHandlers, tiRequestsModuleHandlers } = dependencies;

  return (event) => {
    const scoreInput = event.target.closest('[data-evaluation-score]');

    if (scoreInput) {
      evaluationModuleHandlers.updateScore(
        rootElement,
        sector,
        scoreInput.dataset.criterionId || '',
        scoreInput.dataset.period || '',
        scoreInput.value || '',
      );
      return;
    }

    const feedbackCategorySelect = event.target.closest('[data-feedback-category]');

    if (feedbackCategorySelect) {
      feedbackModuleHandlers.updateField(rootElement, sector, 'feedbackCategory', feedbackCategorySelect.value || '');
      return;
    }

    const tiPeriodSelect = event.target.closest('[data-ti-period]');

    if (tiPeriodSelect) {
      tiRequestsModuleHandlers?.changePeriod(rootElement, sector, tiPeriodSelect.value || 'mes');
    }
  };
}
