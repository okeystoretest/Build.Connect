import { MODULE_IDS } from '../../../constants/module.constants.js';
import { EVALUATION_PERIODS, EVALUATION_TOOL_IDS, EVALUATION_TOOLS } from './evaluation.constants.js';
import {
  buildEvaluationRecordPayload,
  buildMatrixComputedResult,
  clearComputedResultForTool,
  getEvaluationScoreKey,
  getEvaluationToolFields,
  getEvaluationToolNotes,
  getEvaluationUiState,
  getMatrixComputedResult,
} from './evaluation.calculations.js';
import { downloadEvaluationGraphFromPayload } from './evaluation.graph.js';
import { saveEvaluationRecord } from '../../../services/evaluations.service.js';

let moduleContext = null;

export function createEvaluationModuleHandlers(dependencies) {
  moduleContext = dependencies;

  return {
    selectTool: selectEvaluationTool,
    clearSelectedTool: clearSelectedEvaluationTool,
    toggleDropdown: toggleEvaluationDropdown,
    closeDropdown: closeEvaluationDropdown,
    updateSearch: updateEvaluationSearch,
    selectUser: selectEvaluationUser,
    updateScore: updateEvaluationScore,
    updateNotes: updateEvaluationNotes,
    updateField: updateEvaluationField,
    saveResult: saveEvaluationResult,
    downloadGraph: downloadEvaluationGraph,
  };
}

function getModuleState(sectorId) {
  return moduleContext.getModuleState(sectorId);
}

function setModuleState(sectorId, state) {
  moduleContext.setModuleState(sectorId, state);
}

function renderModuleStage(rootElement, sector) {
  moduleContext.renderModuleStage(rootElement, sector);
}

function selectEvaluationTool(rootElement, sector, toolId) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== MODULE_IDS.evaluation || !EVALUATION_TOOLS.some((tool) => tool.id === toolId)) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...getEvaluationUiState(state.ui),
      selectedEvaluationToolId: toolId,
      isEvaluateeListOpen: false,
    },
  });

  renderModuleStage(rootElement, sector);
}

function clearSelectedEvaluationTool(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao') {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...getEvaluationUiState(state.ui),
      selectedEvaluationToolId: '',
      isEvaluateeListOpen: false,
    },
  });

  renderModuleStage(rootElement, sector);
}

function toggleEvaluationDropdown(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao') {
    return;
  }

  const nextUi = getEvaluationUiState(state.ui);
  nextUi.isEvaluateeListOpen = !nextUi.isEvaluateeListOpen;

  setModuleState(sector.id, {
    ...state,
    ui: nextUi,
  });

  renderModuleStage(rootElement, sector);
}

function closeEvaluationDropdown(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao' || !state.ui?.isEvaluateeListOpen) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...getEvaluationUiState(state.ui),
      isEvaluateeListOpen: false,
    },
  });

  renderModuleStage(rootElement, sector);
}

function updateEvaluationSearch(rootElement, sector, query) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao') {
    return;
  }

  const currentUi = getEvaluationUiState(state.ui);
  const selectedUser = (state.moduleData?.users || []).find((user) => user.id === currentUi.selectedEvaluateeId) || null;
  const shouldKeepSelection = selectedUser && `${selectedUser.id} — ${selectedUser.nome}` === query;

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...currentUi,
      evaluateeQuery: query,
      selectedEvaluateeId: shouldKeepSelection ? currentUi.selectedEvaluateeId : '',
      isEvaluateeListOpen: true,
    },
  });

  renderModuleStage(rootElement, sector);

  const input = rootElement.querySelector('[data-evaluatee-search]');

  if (input) {
    const caret = query.length;
    input.focus();
    input.setSelectionRange(caret, caret);
  }
}

function selectEvaluationUser(rootElement, sector, userId) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao') {
    return;
  }

  const user = (state.moduleData?.users || []).find((item) => item.id === userId);

  if (!user) {
    return;
  }

  const nextUi = getEvaluationUiState(state.ui);

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...nextUi,
      selectedEvaluateeId: user.id,
      evaluateeQuery: `${user.id} — ${user.nome}`,
      isEvaluateeListOpen: false,
      evaluationComputedResultsByTool: clearComputedResultForTool(nextUi, nextUi.selectedEvaluationToolId),
    },
  });

  renderModuleStage(rootElement, sector);
}

function updateEvaluationScore(rootElement, sector, criterionId, periodId, value) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao' || !criterionId || !periodId) {
    return;
  }

  const nextUi = getEvaluationUiState(state.ui);
  const selectedToolId = nextUi.selectedEvaluationToolId || EVALUATION_TOOL_IDS.PRE_EFFECTIVE;
  nextUi.evaluationScores[getEvaluationScoreKey(selectedToolId, criterionId, periodId)] = String(value || '');

  nextUi.evaluationSaveStatus = '';
  nextUi.evaluationSaveMessage = '';

  if (selectedToolId === EVALUATION_TOOL_IDS.MATRIX) {
    nextUi.evaluationComputedResultsByTool = clearComputedResultForTool(nextUi, selectedToolId);
  }

  setModuleState(sector.id, {
    ...state,
    ui: nextUi,
  });

  renderModuleStage(rootElement, sector);
}

function updateEvaluationNotes(rootElement, sector, notes) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao') {
    return;
  }

  const nextUi = getEvaluationUiState(state.ui);
  const selectedToolId = nextUi.selectedEvaluationToolId || EVALUATION_TOOL_IDS.PRE_EFFECTIVE;

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...nextUi,
      evaluationNotes: notes,
      evaluationNotesByTool: {
        ...nextUi.evaluationNotesByTool,
        [selectedToolId]: notes,
      },
      evaluationSaveStatus: '',
      evaluationSaveMessage: '',
    },
  });
}

function updateEvaluationField(rootElement, sector, fieldName, value) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao' || !fieldName) {
    return;
  }

  const nextUi = getEvaluationUiState(state.ui);
  const selectedToolId = nextUi.selectedEvaluationToolId || EVALUATION_TOOL_IDS.BEHAVIORAL;
  const currentFields = getEvaluationToolFields(nextUi, selectedToolId);

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...nextUi,
      evaluationFormFieldsByTool: {
        ...nextUi.evaluationFormFieldsByTool,
        [selectedToolId]: {
          ...currentFields,
          [fieldName]: value,
        },
      },
      evaluationComputedResultsByTool: selectedToolId === EVALUATION_TOOL_IDS.MATRIX
        ? clearComputedResultForTool(nextUi, selectedToolId)
        : nextUi.evaluationComputedResultsByTool,
      evaluationSaveStatus: '',
      evaluationSaveMessage: '',
    },
  });
}

async function saveEvaluationResult(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== MODULE_IDS.evaluation) {
    return;
  }

  const currentUi = getEvaluationUiState(state.ui);
  const selectedToolId = currentUi.selectedEvaluationToolId || '';
  const selectedUser = (state.moduleData?.users || []).find((user) => user.id === currentUi.selectedEvaluateeId) || null;

  if (!selectedToolId || !selectedUser) {
    return;
  }

  const computedResult = selectedToolId === EVALUATION_TOOL_IDS.MATRIX
    ? buildMatrixComputedResult(state.moduleData, currentUi, selectedUser)
    : null;
  const uiBeforeSave = selectedToolId === EVALUATION_TOOL_IDS.MATRIX
    ? {
        ...currentUi,
        evaluationComputedResultsByTool: {
          ...currentUi.evaluationComputedResultsByTool,
          [selectedToolId]: computedResult,
        },
      }
    : currentUi;

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...uiBeforeSave,
      evaluationSaveStatus: 'saving',
      evaluationSaveMessage: 'Salvando avaliação na planilha...',
    },
  });
  renderModuleStage(rootElement, sector);

  try {
    const payload = buildEvaluationRecordPayload(state.moduleData, uiBeforeSave, selectedToolId, selectedUser);
    const response = await saveEvaluationRecord(payload);
    const latestState = getModuleState(sector.id);
    const latestUi = getEvaluationUiState(latestState.ui);

    if (!response.success) {
      setModuleState(sector.id, {
        ...latestState,
        ui: {
          ...latestUi,
          evaluationSaveStatus: 'error',
          evaluationSaveMessage: response.message || 'Não foi possível salvar a avaliação.',
        },
      });
      renderModuleStage(rootElement, sector);
      return;
    }

    setModuleState(sector.id, {
      ...latestState,
      ui: {
        ...latestUi,
        evaluationSaveStatus: 'success',
        evaluationSaveMessage: response.message || 'Avaliação salva com sucesso.',
        evaluationComputedResultsByTool: selectedToolId === EVALUATION_TOOL_IDS.MATRIX
          ? {
              ...latestUi.evaluationComputedResultsByTool,
              [selectedToolId]: computedResult,
            }
          : latestUi.evaluationComputedResultsByTool,
        savedEvaluationRecordsByTool: {
          ...latestUi.savedEvaluationRecordsByTool,
          [selectedToolId]: response.record || null,
        },
      },
    });
  } catch (error) {
    const latestState = getModuleState(sector.id);
    const latestUi = getEvaluationUiState(latestState.ui);

    setModuleState(sector.id, {
      ...latestState,
      ui: {
        ...latestUi,
        evaluationSaveStatus: 'error',
        evaluationSaveMessage: error?.message || 'Não foi possível salvar a avaliação.',
      },
    });
  }

  renderModuleStage(rootElement, sector);
}

function downloadEvaluationGraph(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== MODULE_IDS.evaluation) {
    return;
  }

  const nextUi = getEvaluationUiState(state.ui);
  const selectedToolId = nextUi.selectedEvaluationToolId || '';

  if (selectedToolId !== EVALUATION_TOOL_IDS.MATRIX) {
    return;
  }

  const selectedUser = (state.moduleData?.users || []).find((user) => user.id === nextUi.selectedEvaluateeId) || null;

  if (!selectedUser) {
    return;
  }

  const computedResult = getMatrixComputedResult(nextUi, selectedToolId, selectedUser.id);
  const exportPayload = computedResult.isSaved ? computedResult : buildMatrixComputedResult(state.moduleData, nextUi, selectedUser);
  downloadEvaluationGraphFromPayload(exportPayload);
}
