export function createInputHandler(rootElement, sector, dependencies) {
  const {
    updateModuleQuery,
    evaluationModuleHandlers,
    feedbackModuleHandlers,
    qualityModuleHandlers,
  } = dependencies;

  return (event) => {
    const searchInput = event.target.closest('[data-module-search]');

    if (searchInput) {
      updateModuleQuery(rootElement, sector, searchInput.value || '');
      return;
    }

    const evaluateeSearchInput = event.target.closest('[data-evaluatee-search]');

    if (evaluateeSearchInput) {
      evaluationModuleHandlers.updateSearch(rootElement, sector, evaluateeSearchInput.value || '');
      return;
    }

    const qualitySearchInput = event.target.closest('[data-quality-evaluatee-search]');

    if (qualitySearchInput) {
      qualityModuleHandlers.updateSearch(rootElement, sector, qualitySearchInput.value || '');
      return;
    }

    const feedbackSearchInput = event.target.closest('[data-feedback-target-search]');

    if (feedbackSearchInput) {
      feedbackModuleHandlers.updateSearch(rootElement, sector, feedbackSearchInput.value || '');
      return;
    }

    const notesInput = event.target.closest('[data-evaluation-notes]');

    if (notesInput) {
      evaluationModuleHandlers.updateNotes(rootElement, sector, notesInput.value || '');
      return;
    }

    const evaluationFieldInput = event.target.closest('[data-evaluation-field]');

    if (evaluationFieldInput) {
      evaluationModuleHandlers.updateField(
        rootElement,
        sector,
        evaluationFieldInput.dataset.evaluationField || '',
        evaluationFieldInput.value || '',
      );
      return;
    }

    const feedbackMessageInput = event.target.closest('[data-feedback-message]');

    if (feedbackMessageInput) {
      feedbackModuleHandlers.updateField(rootElement, sector, 'feedbackMessage', feedbackMessageInput.value || '');
    }
  };
}
