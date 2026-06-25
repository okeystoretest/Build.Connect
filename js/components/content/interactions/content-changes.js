export function createChangeHandler(rootElement, sector, dependencies) {
  const { evaluationModuleHandlers, feedbackModuleHandlers, tiRequestsModuleHandlers, questionariosModuleHandlers } = dependencies;

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
      return;
    }

    const tiMotoristaSelect = event.target.closest('[data-ti-motorista]');

    if (tiMotoristaSelect) {
      tiRequestsModuleHandlers?.changeMotoristaFilter(rootElement, sector, tiMotoristaSelect.value || '');
      return;
    }

    const tiDoneMonthSelect = event.target.closest('[data-ti-done-month]');

    if (tiDoneMonthSelect) {
      tiRequestsModuleHandlers?.changeDoneMonthFilter(rootElement, sector, tiDoneMonthSelect.value || null);
      return;
    }

    // ── Questionários (Admin) ─────────────────────────────────────────

    const quizFilterSector = event.target.closest('[data-quiz-filter-sector]');
    if (quizFilterSector) {
      questionariosModuleHandlers?.selectFilterSector(rootElement, sector, quizFilterSector.value || '');
      return;
    }

    const quizSectorSelect = event.target.closest('[data-quiz-sector]');
    if (quizSectorSelect) {
      questionariosModuleHandlers?.selectFormSector(rootElement, sector, quizSectorSelect.value || '');
      return;
    }

    const quizVideoSelect = event.target.closest('[data-quiz-video]');
    if (quizVideoSelect) {
      const selectedOption = quizVideoSelect.options[quizVideoSelect.selectedIndex];
      const videoTitle = selectedOption?.dataset?.videoTitle || '';
      questionariosModuleHandlers?.selectVideo(rootElement, sector, quizVideoSelect.value || '', videoTitle);
      return;
    }

    const quizGabaritoRadio = event.target.closest('[data-quiz-gabarito]');
    if (quizGabaritoRadio) {
      questionariosModuleHandlers?.setGabarito(rootElement, sector, quizGabaritoRadio.value || '');
      return;
    }

    // ── DHO: seleção automática de setores vinculados ──────────────────────
    // Ao marcar "Logística", inclui automaticamente "Estoque" e "Motorista".
    const sectorCheckbox = event.target.closest('[data-user-admin-sector]');
    if (sectorCheckbox) {
      if (sectorCheckbox.value === 'logistica' && sectorCheckbox.checked) {
        ['estoque', 'motorista'].forEach((id) => {
          const cb = rootElement.querySelector(`[data-user-admin-sector][value="${id}"]`);
          if (cb && !cb.checked) { cb.checked = true; }
        });
      }
      return;
    }
  };
}
