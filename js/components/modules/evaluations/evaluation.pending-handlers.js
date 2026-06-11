/**
 * evaluation.pending-handlers.js
 * Handlers for the evaluation pending flow:
 * - Start pending flow on user name click
 * - Advance to next pending tool after save
 * - Mark user as resolved when all pending tools are done
 */

import { EVALUATION_TOOLS } from './evaluation.constants.js';
import {
  buildPendingFlowState,
  advancePendingFlow,
  getPendingToolIds,
  registerValidityTimer,
  sendReEvaluationNotification,
} from './evaluation.pending.js';
import { getEvaluationUiState } from './evaluation.calculations.js';

let _moduleContext = null;

export function initPendingHandlers(dependencies) {
  _moduleContext = dependencies;
}

function _getState(sectorId) {
  return _moduleContext.getModuleState(sectorId);
}

function _setState(sectorId, state) {
  _moduleContext.setModuleState(sectorId, state);
}

function _render(rootElement, sector) {
  _moduleContext.renderModuleStage(rootElement, sector);
}

// ── Start pending flow for a user ──────────────────────────────────────────

/**
 * Initiates the sequential pending-tool flow when a manager clicks
 * a highlighted (pending) user name in the evaluations list.
 *
 * @param {Element} rootElement
 * @param {object} sector
 * @param {string} userId
 */
export function startPendingFlow(rootElement, sector, userId) {
  const state    = _getState(sector.id);
  const users    = Array.isArray(state.moduleData?.users) ? state.moduleData.users : [];
  const user     = users.find((u) => u.id === userId);
  if (!user) return;

  const savedRecords = state.moduleData?.savedRecordsByUserId?.[userId] || {};
  const pendingToolIds = getPendingToolIds(userId, savedRecords);

  if (!pendingToolIds.length) {
    // No pending tools — nothing to navigate
    return;
  }

  const firstToolId   = pendingToolIds[0];
  const pendingState  = buildPendingFlowState(userId, user.nome, pendingToolIds);
  const currentUi     = getEvaluationUiState(state.ui);

  _setState(sector.id, {
    ...state,
    ui: {
      ...currentUi,
      // Select the user in the evaluatee picker
      selectedEvaluateeId: userId,
      evaluateeQuery:      `${user.id} — ${user.nome}`,
      isEvaluateeListOpen: false,
      // Select first pending tool
      selectedEvaluationToolId: firstToolId,
      // Store pending flow metadata
      pendingFlow: pendingState,
    },
  });

  _render(rootElement, sector);
}

// ── Advance pending flow after a successful save ───────────────────────────

/**
 * Called after a successful evaluation save during a pending flow.
 * Registers the validity timer, then advances to the next tool or
 * concludes the flow.
 *
 * @param {Element} rootElement
 * @param {object} sector
 * @param {string} toolId  the tool that was just saved
 * @param {string} savedAt ISO timestamp from the save response
 */
export function advancePendingFlowAfterSave(rootElement, sector, toolId, savedAt) {
  const state = _getState(sector.id);
  const ui    = getEvaluationUiState(state.ui);
  const flow  = ui.pendingFlow;

  if (!flow?.pendingFlowActive) return;

  // Register 3-month countdown for this tool
  registerValidityTimer(flow.pendingFlowUserId, toolId, savedAt || new Date().toISOString());

  const nextFlow = advancePendingFlow(flow);

  if (!nextFlow.pendingFlowActive) {
    // All pending tools completed — clear flow and reset highlight
    _setState(sector.id, {
      ...state,
      ui: {
        ...ui,
        pendingFlow: { ...nextFlow, pendingFlowActive: false },
        selectedEvaluationToolId: '',
        // Preserve selectedEvaluateeId so the completed badge is visible
      },
    });
    _render(rootElement, sector);
    return;
  }

  // Navigate to next pending tool
  const nextToolId = nextFlow.pendingToolQueue[nextFlow.pendingToolIndex];

  _setState(sector.id, {
    ...state,
    ui: {
      ...ui,
      pendingFlow: nextFlow,
      selectedEvaluationToolId: nextToolId,
      // Clear previous save feedback
      evaluationSaveStatus:  '',
      evaluationSaveMessage: '',
      evaluationScores:      {},
    },
  });

  _render(rootElement, sector);
}

// ── Get pending user IDs from module state ─────────────────────────────────

/**
 * Returns a Set of user IDs that have pending evaluations,
 * computed from module data saved records.
 *
 * @param {object} moduleData
 * @returns {Set<string>}
 */
export function computePendingUserIds(moduleData) {
  const users           = Array.isArray(moduleData?.users) ? moduleData.users : [];
  const recordsByUserId = moduleData?.savedRecordsByUserId || {};
  const pendingIds      = new Set();

  for (const user of users) {
    const userRecords  = recordsByUserId[user.id] || {};
    const pendingTools = getPendingToolIds(user.id, userRecords);
    if (pendingTools.length > 0) pendingIds.add(user.id);
  }

  return pendingIds;
}

// ── Pending flow progress metadata ────────────────────────────────────────

/**
 * Returns human-readable pending flow progress string.
 * e.g. "2 de 3 avaliações"
 *
 * @param {object} flow  pendingFlow state object
 * @returns {string}
 */
export function getPendingFlowProgress(flow) {
  if (!flow?.pendingFlowActive && !flow?.pendingToolQueue?.length) return '';
  const total   = flow.pendingToolQueue?.length || 0;
  const current = Math.min((flow.pendingToolIndex || 0) + 1, total);
  return `${current} de ${total} avaliação${total !== 1 ? 'ões' : ''}`;
}

// ── Re-evaluation notification trigger ────────────────────────────────────

/**
 * Manually triggers re-evaluation notifications for all expired users.
 * Can be invoked on dashboard load by managers/admins.
 *
 * @param {object} moduleData
 * @param {string} sectorId
 */
export async function triggerExpiredNotifications(moduleData, sectorId) {
  const users           = Array.isArray(moduleData?.users) ? moduleData.users : [];
  const recordsByUserId = moduleData?.savedRecordsByUserId || {};

  for (const user of users) {
    const userRecords = recordsByUserId[user.id] || {};

    for (const tool of EVALUATION_TOOLS) {
      if (tool.isMultidir) continue;

      const record  = userRecords[tool.id];
      if (!record?.savedAt) continue;

      const savedAt  = new Date(record.savedAt).getTime();
      const elapsed  = Date.now() - savedAt;
      const VALIDITY = 91 * 24 * 60 * 60 * 1000;

      if (elapsed >= VALIDITY) {
        // Fire non-blocking — errors are swallowed inside the function
        sendReEvaluationNotification({
          userId:   user.id,
          userName: user.nome,
          toolId:   tool.id,
          sectorId,
        });
      }
    }
  }
}
