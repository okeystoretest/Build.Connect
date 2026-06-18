/**
 * evaluation.handlers.js
 * UI interaction handlers for the evaluation module.
 * Save/download/tab logic delegated to evaluation.save-handler.js.
 */

import { MODULE_IDS } from '../../../constants/module.constants.js';
import { EVALUATION_TOOL_IDS, EVALUATION_TOOLS } from './evaluation.constants.js';
import {
  clearComputedResultForTool,
  getEvaluationScoreKey,
  getEvaluationToolFields,
  getEvaluationUiState,
} from './evaluation.calculations.js';
import { checkMultidirEligibility } from '../../../services/evaluations.service.js';
import {
  initPendingHandlers,
  startPendingFlow,
  triggerExpiredNotifications,
} from './evaluation.pending-handlers.js';
import {
  initSaveHandler,
  saveEvaluationResult,
  downloadEvaluationGraph,
  setEvaluationActiveTab,
} from './evaluation.save-handler.js';

let moduleContext = null;

export function createEvaluationModuleHandlers(dependencies) {
  moduleContext = dependencies;
  initPendingHandlers(dependencies);
  initSaveHandler(dependencies);

  return {
    selectTool:   selectEvaluationTool,
    clearSelectedTool: clearSelectedEvaluationTool,
    toggleDropdown:    toggleEvaluationDropdown,
    closeDropdown:     closeEvaluationDropdown,
    updateSearch:      updateEvaluationSearch,
    selectUser:        selectEvaluationUser,
    updateScore:       updateEvaluationScore,
    updateNotes:       updateEvaluationNotes,
    updateField:       updateEvaluationField,
    saveResult:        saveEvaluationResult,
    downloadGraph:     downloadEvaluationGraph,
    setActiveTab:      setEvaluationActiveTab,
    nextFormPage:      nextEvaluationFormPage,
    prevFormPage:      prevEvaluationFormPage,
    startPendingFlow:  (rootEl, sector, userId) => startPendingFlow(rootEl, sector, userId),
    triggerExpiredNotifications: (rootEl, sector) => {
      const state = moduleContext.getModuleState(sector.id);
      triggerExpiredNotifications(state.moduleData, sector.id);
    },
  };
}

function getModuleState(sectorId)         { return moduleContext.getModuleState(sectorId); }
function setModuleState(sectorId, state)  { moduleContext.setModuleState(sectorId, state); }
function renderModuleStage(el, sector)    { moduleContext.renderModuleStage(el, sector); }

// ── Tool selection ─────────────────────────────────────────────────────────

function selectEvaluationTool(rootElement, sector, toolId) {
  const state = getModuleState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.evaluation || !EVALUATION_TOOLS.some((t) => t.id === toolId)) return;
  setModuleState(sector.id, {
    ...state,
    ui: { ...getEvaluationUiState(state.ui), selectedEvaluationToolId: toolId, isEvaluateeListOpen: false, evaluationFormPage: 0 },
  });
  renderModuleStage(rootElement, sector);
}

function clearSelectedEvaluationTool(rootElement, sector) {
  const state = getModuleState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.evaluation) return;
  setModuleState(sector.id, {
    ...state,
    ui: { ...getEvaluationUiState(state.ui), selectedEvaluationToolId: '', isEvaluateeListOpen: false },
  });
  renderModuleStage(rootElement, sector);
}

// ── Dropdown ───────────────────────────────────────────────────────────────

function toggleEvaluationDropdown(rootElement, sector) {
  const state  = getModuleState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.evaluation) return;
  const nextUi = getEvaluationUiState(state.ui);
  nextUi.isEvaluateeListOpen = !nextUi.isEvaluateeListOpen;
  setModuleState(sector.id, { ...state, ui: nextUi });
  renderModuleStage(rootElement, sector);
}

function closeEvaluationDropdown(rootElement, sector) {
  const state = getModuleState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.evaluation || !state.ui?.isEvaluateeListOpen) return;
  setModuleState(sector.id, {
    ...state,
    ui: { ...getEvaluationUiState(state.ui), isEvaluateeListOpen: false },
  });
  renderModuleStage(rootElement, sector);
}

// ── Search & user selection ────────────────────────────────────────────────

function updateEvaluationSearch(rootElement, sector, query) {
  const state = getModuleState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.evaluation) return;

  const currentUi    = getEvaluationUiState(state.ui);
  const selectedUser = (state.moduleData?.users || []).find((u) => u.id === currentUi.selectedEvaluateeId) || null;
  const keepSelection = selectedUser && `${selectedUser.id} — ${selectedUser.nome}` === query;

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...currentUi,
      evaluateeQuery:      query,
      selectedEvaluateeId: keepSelection ? currentUi.selectedEvaluateeId : '',
      isEvaluateeListOpen: true,
    },
  });
  renderModuleStage(rootElement, sector);

  const input = rootElement.querySelector('[data-evaluatee-search]');
  if (input) { const caret = query.length; input.focus(); input.setSelectionRange(caret, caret); }
}

function selectEvaluationUser(rootElement, sector, userId) {
  const state = getModuleState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.evaluation) return;

  const user = (state.moduleData?.users || []).find((item) => item.id === userId);
  if (!user) return;

  const nextUi     = getEvaluationUiState(state.ui);
  const toolId     = nextUi.selectedEvaluationToolId;
  const isMultidir = EVALUATION_TOOLS.find((t) => t.id === toolId)?.isMultidir || false;

  // Clear scores, notes, and computed results for the active tool when the
  // evaluatee changes — prevents form data from a previous user leaking into
  // the new selection.
  const toolPrefix = toolId ? `${toolId}:` : null;
  const clearedScores = toolPrefix
    ? Object.fromEntries(
        Object.entries(nextUi.evaluationScores || {}).filter(([k]) => !k.startsWith(toolPrefix))
      )
    : { ...nextUi.evaluationScores };

  const clearedNotesByTool = toolId
    ? { ...nextUi.evaluationNotesByTool, [toolId]: '' }
    : { ...nextUi.evaluationNotesByTool };

  const clearedFieldsByTool = toolId
    ? { ...nextUi.evaluationFormFieldsByTool, [toolId]: {} }
    : { ...nextUi.evaluationFormFieldsByTool };

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...nextUi,
      selectedEvaluateeId:             user.id,
      evaluateeQuery:                  `${user.id} — ${user.nome}`,
      isEvaluateeListOpen:             false,
      evaluationFormPage:              0,
      evaluationScores:                clearedScores,
      evaluationNotesByTool:           clearedNotesByTool,
      evaluationFormFieldsByTool:      clearedFieldsByTool,
      evaluationSaveStatus:            '',
      evaluationSaveMessage:           '',
      evaluationComputedResultsByTool: clearComputedResultForTool(nextUi, toolId),
      savedEvaluationRecordsByTool:    toolId
        ? { ...nextUi.savedEvaluationRecordsByTool, [toolId]: null }
        : { ...nextUi.savedEvaluationRecordsByTool },
      multidirEligibility: isMultidir ? {
        ...nextUi.multidirEligibility,
        [`${toolId}:${user.id}`]: { status: 'checking', message: 'Verificando elegibilidade...', remainingResponses: null },
      } : nextUi.multidirEligibility,
    },
  });
  renderModuleStage(rootElement, sector);

  if (isMultidir && toolId && user.id) {
    checkMultidirEligibility({ toolId, evaluateeId: user.id }).then((eligibility) => {
      const latestState = getModuleState(sector.id);
      const latestUi    = getEvaluationUiState(latestState.ui);
      if (latestUi.selectedEvaluateeId !== user.id || latestUi.selectedEvaluationToolId !== toolId) return;
      setModuleState(sector.id, {
        ...latestState,
        ui: {
          ...latestUi,
          multidirEligibility: {
            ...latestUi.multidirEligibility,
            [`${toolId}:${user.id}`]: {
              status:             eligibility.success ? 'eligible' : 'blocked',
              message:            eligibility.message || '',
              remainingResponses: eligibility.remainingResponses ?? null,
              nextAvailableDate:  eligibility.nextAvailableDate  ?? null,
              code:               eligibility.code               ?? '',
            },
          },
        },
      });
      renderModuleStage(rootElement, sector);
    }).catch(() => {
      const latestState = getModuleState(sector.id);
      const latestUi    = getEvaluationUiState(latestState.ui);
      if (latestUi.selectedEvaluateeId !== user.id || latestUi.selectedEvaluationToolId !== toolId) return;
      setModuleState(sector.id, {
        ...latestState,
        ui: {
          ...latestUi,
          multidirEligibility: {
            ...latestUi.multidirEligibility,
            [`${toolId}:${user.id}`]: { status: 'blocked', message: 'Não foi possível verificar elegibilidade.', code: 'NETWORK_ERROR' },
          },
        },
      });
      renderModuleStage(rootElement, sector);
    });
  }
}

// ── Score / Notes / Field updates ──────────────────────────────────────────

function updateEvaluationScore(rootElement, sector, criterionId, periodId, value) {
  const state = getModuleState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.evaluation || !criterionId || !periodId) return;

  const nextUi         = getEvaluationUiState(state.ui);
  const selectedToolId = nextUi.selectedEvaluationToolId || EVALUATION_TOOL_IDS.PRE_EFFECTIVE;
  nextUi.evaluationScores[getEvaluationScoreKey(selectedToolId, criterionId, periodId)] = String(value || '');
  nextUi.evaluationSaveStatus  = '';
  nextUi.evaluationSaveMessage = '';

  if (selectedToolId === EVALUATION_TOOL_IDS.MATRIX) {
    nextUi.evaluationComputedResultsByTool = clearComputedResultForTool(nextUi, selectedToolId);
  }

  setModuleState(sector.id, { ...state, ui: nextUi });
  renderModuleStage(rootElement, sector);
}

function updateEvaluationNotes(rootElement, sector, notes) {
  const state = getModuleState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.evaluation) return;

  const nextUi         = getEvaluationUiState(state.ui);
  const selectedToolId = nextUi.selectedEvaluationToolId || EVALUATION_TOOL_IDS.PRE_EFFECTIVE;

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...nextUi,
      evaluationNotes: notes,
      evaluationNotesByTool: { ...nextUi.evaluationNotesByTool, [selectedToolId]: notes },
      evaluationSaveStatus:  '',
      evaluationSaveMessage: '',
    },
  });
}

function updateEvaluationField(rootElement, sector, fieldName, value) {
  const state = getModuleState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.evaluation || !fieldName) return;

  const nextUi         = getEvaluationUiState(state.ui);
  const selectedToolId = nextUi.selectedEvaluationToolId || EVALUATION_TOOL_IDS.BEHAVIORAL;
  const currentFields  = getEvaluationToolFields(nextUi, selectedToolId);

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...nextUi,
      evaluationFormFieldsByTool: {
        ...nextUi.evaluationFormFieldsByTool,
        [selectedToolId]: { ...currentFields, [fieldName]: value },
      },
      evaluationComputedResultsByTool: selectedToolId === EVALUATION_TOOL_IDS.MATRIX
        ? clearComputedResultForTool(nextUi, selectedToolId)
        : nextUi.evaluationComputedResultsByTool,
      evaluationSaveStatus:  '',
      evaluationSaveMessage: '',
    },
  });
}

// ── Form Page Navigation ───────────────────────────────────────────────────
// Page counts per tool — must match evaluation.view.js TOOL_PAGE_COUNTS
const _PAGE_COUNTS = {
  [EVALUATION_TOOL_IDS.PRE_EFFECTIVE]:          2,
  [EVALUATION_TOOL_IDS.BEHAVIORAL]:             2,
  [EVALUATION_TOOL_IDS.MATRIX]:                 2,
  [EVALUATION_TOOL_IDS.WORK_EFFICACY]:          3,
  [EVALUATION_TOOL_IDS.EMOTIONAL_INTELLIGENCE]: 2,
};

function nextEvaluationFormPage(rootElement, sector) {
  const state  = getModuleState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.evaluation) return;
  const ui     = getEvaluationUiState(state.ui);
  const total  = _PAGE_COUNTS[ui.selectedEvaluationToolId] || 1;
  const next   = Math.min((ui.evaluationFormPage || 0) + 1, total - 1);
  setModuleState(sector.id, { ...state, ui: { ...ui, evaluationFormPage: next } });
  renderModuleStage(rootElement, sector);
  _scrollStageTop(rootElement);
}

function prevEvaluationFormPage(rootElement, sector) {
  const state  = getModuleState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.evaluation) return;
  const ui     = getEvaluationUiState(state.ui);
  const prev   = Math.max((ui.evaluationFormPage || 0) - 1, 0);
  setModuleState(sector.id, { ...state, ui: { ...ui, evaluationFormPage: prev } });
  renderModuleStage(rootElement, sector);
  _scrollStageTop(rootElement);
}

function _scrollStageTop(rootElement) {
  const stage = rootElement.querySelector('[data-module-stage]');
  if (stage) stage.scrollTop = 0;
  const shell = rootElement.querySelector('.evaluation-shell');
  if (shell) shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
