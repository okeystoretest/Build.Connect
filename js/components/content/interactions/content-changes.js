export function createChangeHandler(rootElement, sector, dependencies) {
  const { evaluationModuleHandlers, feedbackModuleHandlers } = dependencies;

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
    }
  };
}
