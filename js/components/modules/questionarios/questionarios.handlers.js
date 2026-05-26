import { loadModuleContent } from '../../../services/integrations.service.js';
import { fetchAdminQuizzesBySector, saveQuiz, deleteQuiz } from '../../../services/quiz.service.js';
import { QUIZ_FORM_DEFAULTS, QUIZ_UI_DEFAULTS } from './questionarios.constants.js';

export function createQuestionariosModuleHandlers({ getModuleState, setModuleState, renderModuleStage }) {

  function getUi(state) {
    return { ...QUIZ_UI_DEFAULTS, ...(state.ui?.questionarios || {}) };
  }

  function patchUi(sector, patch) {
    const state = getModuleState(sector.id);
    setModuleState(sector.id, {
      ...state,
      ui: { ...state.ui, questionarios: { ...getUi(state), ...patch } },
    });
  }

  // ── Navigation ────────────────────────────────────────────

  function openNewForm(rootElement, sector) {
    patchUi(sector, {
      mode: 'form',
      editingQuizId: null,
      selectedVideoId: '',
      selectedVideoTitle: '',
      selectedSectorId: '',
      videos: [],
      form: { ...QUIZ_FORM_DEFAULTS },
      saveMessage: '',
      saveError: false,
    });
    renderModuleStage(rootElement, sector);
  }

  async function openEditForm(rootElement, sector, quizId) {
    const ui = getUi(getModuleState(sector.id));
    const quiz = ui.quizzes.find((q) => q.id === quizId);
    if (!quiz) return;

    patchUi(sector, {
      mode: 'form',
      editingQuizId: quizId,
      selectedSectorId: quiz.sector_id || '',
      selectedVideoId: quiz.video_id || '',
      selectedVideoTitle: quiz.video_title || quiz.video_id || '',
      form: {
        pergunta: quiz.pergunta || '',
        opcao_a:  quiz.opcao_a  || '',
        opcao_b:  quiz.opcao_b  || '',
        opcao_c:  quiz.opcao_c  || '',
        gabarito: quiz.gabarito || '',
      },
      saveMessage: '',
      saveError: false,
    });
    renderModuleStage(rootElement, sector);
  }

  function goBack(rootElement, sector) {
    patchUi(sector, {
      mode: 'list',
      editingQuizId: null,
      form: { ...QUIZ_FORM_DEFAULTS },
      saveMessage: '',
      saveError: false,
    });
    renderModuleStage(rootElement, sector);
    // Reload the list for the currently selected sector
    const ui = getUi(getModuleState(sector.id));
    if (ui.selectedSectorId) {
      loadQuizzesBySector(rootElement, sector, ui.selectedSectorId);
    }
  }

  // ── Sector / Video selection ──────────────────────────────

  async function selectFilterSector(rootElement, sector, sectorId) {
    patchUi(sector, { selectedSectorId: sectorId, quizzes: [], quizzesLoading: !!sectorId });
    renderModuleStage(rootElement, sector);

    if (sectorId) {
      await loadQuizzesBySector(rootElement, sector, sectorId);
    }
  }

  async function loadQuizzesBySector(rootElement, sector, sectorId) {
    const response = await fetchAdminQuizzesBySector(sectorId);
    patchUi(sector, {
      quizzes: Array.isArray(response?.questionarios) ? response.questionarios : [],
      quizzesLoading: false,
    });
    renderModuleStage(rootElement, sector);
  }

  async function selectFormSector(rootElement, sector, sectorId) {
    patchUi(sector, {
      selectedSectorId: sectorId,
      selectedVideoId: '',
      selectedVideoTitle: '',
      videos: [],
      videosLoading: !!sectorId,
      videosError: false,
    });
    renderModuleStage(rootElement, sector);

    if (!sectorId) return;

    const response = await loadModuleContent({ sectorId, moduleId: 'instrucoes-video', forceRefresh: true });
    patchUi(sector, {
      videos: Array.isArray(response?.items) ? response.items : [],
      videosLoading: false,
      videosError: !response?.success,
    });
    renderModuleStage(rootElement, sector);
  }

  function selectVideo(rootElement, sector, videoId, videoTitle) {
    patchUi(sector, { selectedVideoId: videoId, selectedVideoTitle: videoTitle || videoId });
    renderModuleStage(rootElement, sector);
  }

  // ── Form field updates ────────────────────────────────────

  function updateField(rootElement, sector, field, value) {
    const state = getModuleState(sector.id);
    const ui = getUi(state);
    patchUi(sector, { form: { ...ui.form, [field]: value } });
  }

  function setGabarito(rootElement, sector, value) {
    const state = getModuleState(sector.id);
    const ui = getUi(state);
    patchUi(sector, { form: { ...ui.form, gabarito: value } });
    renderModuleStage(rootElement, sector);
  }

  // ── Save ──────────────────────────────────────────────────

  async function save(rootElement, sector) {
    const ui = getUi(getModuleState(sector.id));
    const { form, editingQuizId, selectedVideoId, selectedVideoTitle, selectedSectorId } = ui;

    if (!editingQuizId && !selectedVideoId) {
      patchUi(sector, { saveMessage: 'Selecione um vídeo antes de salvar.', saveError: true });
      renderModuleStage(rootElement, sector);
      return;
    }

    if (!form.pergunta?.trim()) {
      patchUi(sector, { saveMessage: 'Preencha o texto da pergunta.', saveError: true });
      renderModuleStage(rootElement, sector);
      return;
    }

    if (!form.opcao_a?.trim() || !form.opcao_b?.trim() || !form.opcao_c?.trim()) {
      patchUi(sector, { saveMessage: 'Preencha todas as alternativas.', saveError: true });
      renderModuleStage(rootElement, sector);
      return;
    }

    if (!form.gabarito) {
      patchUi(sector, { saveMessage: 'Marque qual alternativa é a correta (gabarito).', saveError: true });
      renderModuleStage(rootElement, sector);
      return;
    }

    patchUi(sector, { isSaving: true, saveMessage: '', saveError: false });
    renderModuleStage(rootElement, sector);

    const response = await saveQuiz({
      id:          editingQuizId || undefined,
      video_id:    editingQuizId ? ui.selectedVideoId : selectedVideoId,
      video_title: editingQuizId ? ui.selectedVideoTitle : (selectedVideoTitle || selectedVideoId),
      sector_id:   editingQuizId ? ui.selectedSectorId : selectedSectorId,
      pergunta:    form.pergunta.trim(),
      opcao_a:     form.opcao_a.trim(),
      opcao_b:     form.opcao_b.trim(),
      opcao_c:     form.opcao_c.trim(),
      gabarito:    form.gabarito,
    });

    if (response?.success) {
      patchUi(sector, {
        isSaving: false,
        saveMessage: editingQuizId ? 'Questionário atualizado com sucesso.' : 'Questionário criado com sucesso.',
        saveError: false,
        editingQuizId: response.questionario?.id || editingQuizId,
      });
    } else {
      patchUi(sector, {
        isSaving: false,
        saveMessage: response?.message || 'Erro ao salvar o questionário.',
        saveError: true,
      });
    }

    renderModuleStage(rootElement, sector);
  }

  // ── Delete ────────────────────────────────────────────────

  async function deleteRecord(rootElement, sector, quizId) {
    patchUi(sector, { isDeleting: true });
    renderModuleStage(rootElement, sector);

    const response = await deleteQuiz(quizId);

    if (response?.success) {
      goBack(rootElement, sector);
    } else {
      patchUi(sector, {
        isDeleting: false,
        saveMessage: response?.message || 'Erro ao excluir o questionário.',
        saveError: true,
      });
      renderModuleStage(rootElement, sector);
    }
  }

  return {
    openNewForm,
    openEditForm,
    goBack,
    selectFilterSector,
    selectFormSector,
    selectVideo,
    updateField,
    setGabarito,
    save,
    deleteRecord,
  };
}
