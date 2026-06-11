/**
 * evaluation.save-handler.js
 * Async save logic, graph download, and tab switching.
 * Extracted from evaluation.handlers.js to stay under 400-line cap.
 */

import { MODULE_IDS } from '../../../constants/module.constants.js';
import { EVALUATION_TOOL_IDS, EVALUATION_TOOLS } from './evaluation.constants.js';
import {
  buildEvaluationRecordPayload,
  buildMatrixComputedResult,
  getEvaluationUiState,
  getMatrixComputedResult,
} from './evaluation.calculations.js';
import { downloadEvaluationGraphFromPayload } from './evaluation.graph.js';
import {
  saveEvaluationRecord,
  checkMultidirEligibility,
  saveMultidirEvaluationRecord,
  fetchPendingEvaluationUserIds,
} from '../../../services/evaluations.service.js';
import { advancePendingFlowAfterSave } from './evaluation.pending-handlers.js';
import { setCardAlert } from '../../../state/module-state.js';
import { invalidateSectorAlertsCache } from '../../../services/sector-alerts.service.js';

let _ctx = null;

export function initSaveHandler(dependencies) {
  _ctx = dependencies;
}

function getModuleState(sectorId) { return _ctx.getModuleState(sectorId); }
function setModuleState(sectorId, s) { _ctx.setModuleState(sectorId, s); }
function renderModuleStage(el, sector) { _ctx.renderModuleStage(el, sector); }

// ── Save ──────────────────────────────────────────────────────────────────────

export async function saveEvaluationResult(rootElement, sector) {
  const state = getModuleState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.evaluation) return;

  const currentUi      = getEvaluationUiState(state.ui);
  const selectedToolId = currentUi.selectedEvaluationToolId || '';
  const selectedUser   = (state.moduleData?.users || []).find((u) => u.id === currentUi.selectedEvaluateeId) || null;
  const isMultidir     = EVALUATION_TOOLS.find((t) => t.id === selectedToolId)?.isMultidir || false;

  if (!selectedToolId || !selectedUser) return;

  if (isMultidir) {
    const eligKey = `${selectedToolId}:${selectedUser.id}`;
    const elig    = currentUi.multidirEligibility?.[eligKey];
    if (!elig || elig.status !== 'eligible') {
      setModuleState(sector.id, {
        ...state,
        ui: { ...currentUi, evaluationSaveStatus: 'error', evaluationSaveMessage: elig?.message || 'Não autorizado a responder esta avaliação.' },
      });
      renderModuleStage(rootElement, sector);
      return;
    }
  }

  const computedResult = selectedToolId === EVALUATION_TOOL_IDS.MATRIX
    ? buildMatrixComputedResult(state.moduleData, currentUi, selectedUser)
    : null;

  const uiBeforeSave = selectedToolId === EVALUATION_TOOL_IDS.MATRIX
    ? { ...currentUi, evaluationComputedResultsByTool: { ...currentUi.evaluationComputedResultsByTool, [selectedToolId]: computedResult } }
    : currentUi;

  setModuleState(sector.id, {
    ...state,
    ui: { ...uiBeforeSave, evaluationSaveStatus: 'saving', evaluationSaveMessage: 'Salvando avaliação...' },
  });
  renderModuleStage(rootElement, sector);

  try {
    const payload  = buildEvaluationRecordPayload(state.moduleData, uiBeforeSave, selectedToolId, selectedUser);
    const response = isMultidir
      ? await saveMultidirEvaluationRecord(payload)
      : await saveEvaluationRecord(payload);

    const latestState = getModuleState(sector.id);
    const latestUi    = getEvaluationUiState(latestState.ui);

    if (!response.success) {
      setModuleState(sector.id, {
        ...latestState,
        ui: { ...latestUi, evaluationSaveStatus: 'error', evaluationSaveMessage: response.message || 'Não foi possível salvar a avaliação.' },
      });
      renderModuleStage(rootElement, sector);
      return;
    }

    const eligKey          = `${selectedToolId}:${selectedUser.id}`;
    const savedAtTimestamp = response.record?.savedAt || response.record?.createdAt || new Date().toISOString();
    const successMsg       = response.message || (response.completed
      ? 'Avaliação registrada! Limite de respostas atingido — o módulo DHO foi notificado.'
      : 'Avaliação registrada com sucesso.');

    setModuleState(sector.id, {
      ...latestState,
      ui: {
        ...latestUi,
        evaluationSaveStatus:  'success',
        evaluationSaveMessage: successMsg,
        evaluationComputedResultsByTool: selectedToolId === EVALUATION_TOOL_IDS.MATRIX
          ? { ...latestUi.evaluationComputedResultsByTool, [selectedToolId]: computedResult }
          : latestUi.evaluationComputedResultsByTool,
        savedEvaluationRecordsByTool: { ...latestUi.savedEvaluationRecordsByTool, [selectedToolId]: response.record || null },
        multidirEligibility: isMultidir ? {
          ...latestUi.multidirEligibility,
          [eligKey]: { status: 'blocked', message: 'Você já registrou sua resposta. Próxima disponível em 3 meses.', code: 'JUST_SUBMITTED' },
        } : latestUi.multidirEligibility,
      },
    });

    renderModuleStage(rootElement, sector);

    // Signal the "Resultados de Avaliações" (qualidade) card that a new unread record exists
    setCardAlert(sector.id, 'qualidade', { type: 'unread', count: 1 });

    // Invalidate sector alerts cache so returning to the cards grid re-fetches fresh counts
    invalidateSectorAlertsCache(sector.id);

    // Re-fetch pending data so the pending list updates in real-time after save
    const allUsers = Array.isArray(latestState.moduleData?.users) ? latestState.moduleData.users : [];
    if (allUsers.length) {
      fetchPendingEvaluationUserIds(sector.id, allUsers.map(u => u.id))
        .then(({ pendingIds, pendingByTool }) => {
          const refreshedState = getModuleState(sector.id);
          if (refreshedState.selectedModuleId !== MODULE_IDS.evaluation) return;
          if (refreshedState.moduleData) {
            setModuleState(sector.id, {
              ...refreshedState,
              moduleData: {
                ...refreshedState.moduleData,
                pendingUserIds: Array.from(pendingIds),
                pendingByTool,
              },
            });
          }
          setCardAlert(sector.id, 'avaliacao', pendingIds.size > 0
            ? { type: 'pending', count: pendingIds.size }
            : null);
          renderModuleStage(rootElement, sector);
        })
        .catch(() => {});
    }

    advancePendingFlowAfterSave(rootElement, sector, selectedToolId, savedAtTimestamp);
    return;

  } catch (error) {
    const latestState = getModuleState(sector.id);
    const latestUi    = getEvaluationUiState(latestState.ui);
    setModuleState(sector.id, {
      ...latestState,
      ui: { ...latestUi, evaluationSaveStatus: 'error', evaluationSaveMessage: error?.message || 'Erro inesperado ao salvar.' },
    });
  }

  renderModuleStage(rootElement, sector);
}

// ── Download graph ─────────────────────────────────────────────────────────

export function downloadEvaluationGraph(rootElement, sector) {
  const state = getModuleState(sector.id);
  if (state.selectedModuleId !== MODULE_IDS.evaluation) return;

  const nextUi         = getEvaluationUiState(state.ui);
  const selectedToolId = nextUi.selectedEvaluationToolId || '';
  if (selectedToolId !== EVALUATION_TOOL_IDS.MATRIX) return;

  const selectedUser = (state.moduleData?.users || []).find((u) => u.id === nextUi.selectedEvaluateeId) || null;
  if (!selectedUser) return;

  const computedResult = getMatrixComputedResult(nextUi, selectedToolId, selectedUser.id);
  const exportPayload  = computedResult.isSaved ? computedResult : buildMatrixComputedResult(state.moduleData, nextUi, selectedUser);
  downloadEvaluationGraphFromPayload(exportPayload);
}

// ── Active tab ─────────────────────────────────────────────────────────────

export function setEvaluationActiveTab(rootElement, sector, tab) {
  const state = getModuleState(sector.id);
  const prev  = state.ui || {};
  setModuleState(sector.id, { ...state, ui: { ...prev, activeTab: tab } });
  renderModuleStage(rootElement, sector);
}
