/**
 * evaluation.pending.js
 * Manages evaluation pending queues, 3-month validity timers,
 * and re-evaluation notifications for Gestores/Admins.
 */

import { requestApi } from '../../../services/api.service.js';
import { sendSectorNotification } from '../../../services/notifications.service.js';
import { EVALUATION_TOOLS, EVALUATION_TOOL_IDS } from './evaluation.constants.js';

// ── Constants ────────────────────────────────────────────────────────────────

/** 3 months in milliseconds (91 days) */
const VALIDITY_MS = 91 * 24 * 60 * 60 * 1000;

/** LocalStorage key prefix for validity timers */
const TIMER_KEY_PREFIX = 'eval_validity:';

// ── Pending Detection ─────────────────────────────────────────────────────────

/**
 * Given a list of users and their saved evaluation records,
 * returns the set of userIds that have at least one tool pending.
 * A tool is "pending" if the user has NO record for it OR the last record
 * exceeds the 3-month validity window.
 *
 * @param {Array<{id: string, nome: string}>} users
 * @param {Record<string, Record<string, {savedAt: string}>>} recordsByUserId
 *   e.g. { 'user-1': { 'analise-desempenho-comportamental': { savedAt: '2024-01-10T...' } } }
 * @returns {Set<string>} Set of userIds with pending evaluations
 */
export function getPendingUserIds(users, recordsByUserId) {
  const pendingIds = new Set();

  for (const user of users) {
    const userRecords = recordsByUserId[user.id] || {};

    for (const tool of EVALUATION_TOOLS) {
      // Multidirecional tools are peer-driven — skip them from manager pending list
      if (tool.isMultidir) continue;

      const record = userRecords[tool.id];
      if (!record || !record.savedAt) {
        pendingIds.add(user.id);
        break;
      }

      const savedAt = new Date(record.savedAt).getTime();
      if (isNaN(savedAt) || Date.now() - savedAt >= VALIDITY_MS) {
        pendingIds.add(user.id);
        break;
      }
    }
  }

  return pendingIds;
}

/**
 * Returns ordered list of tool IDs still pending for a given user.
 * Order matches EVALUATION_TOOLS definition order.
 *
 * @param {string} userId
 * @param {Record<string, {savedAt: string}>} userRecords  keyed by toolId
 * @returns {string[]}  array of pending toolIds in sequence
 */
export function getPendingToolIds(userId, userRecords) {
  const pending = [];

  for (const tool of EVALUATION_TOOLS) {
    if (tool.isMultidir) continue;

    const record = userRecords?.[tool.id];
    if (!record || !record.savedAt) {
      pending.push(tool.id);
      continue;
    }

    const savedAt = new Date(record.savedAt).getTime();
    if (isNaN(savedAt) || Date.now() - savedAt >= VALIDITY_MS) {
      pending.push(tool.id);
    }
  }

  return pending;
}

// ── Validity Timer ─────────────────────────────────────────────────────────────

/**
 * Registers (or resets) the 3-month countdown for a given user+tool
 * immediately after a save. Uses localStorage so it persists across sessions.
 *
 * @param {string} userId
 * @param {string} toolId
 * @param {string|number} savedAt  ISO string or timestamp
 */
export function registerValidityTimer(userId, toolId, savedAt) {
  if (!userId || !toolId) return;

  try {
    const key = `${TIMER_KEY_PREFIX}${userId}:${toolId}`;
    const timestamp = savedAt
      ? new Date(savedAt).getTime()
      : Date.now();

    localStorage.setItem(key, String(timestamp));
    _scheduleExpiryCheck(userId, toolId, timestamp);
  } catch {
    // localStorage not available — silent fallback
  }
}

/**
 * Returns remaining milliseconds until expiry for a given user+tool.
 * Returns 0 if already expired or no record found.
 *
 * @param {string} userId
 * @param {string} toolId
 * @returns {number}
 */
export function getValidityRemainingMs(userId, toolId) {
  try {
    const key = `${TIMER_KEY_PREFIX}${userId}:${toolId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return 0;

    const savedAt = Number(stored);
    if (isNaN(savedAt)) return 0;

    const elapsed = Date.now() - savedAt;
    return Math.max(0, VALIDITY_MS - elapsed);
  } catch {
    return 0;
  }
}

// ── Re-evaluation Notification ────────────────────────────────────────────────

/**
 * Fires a re-evaluation notification to Gestores/Admins of a given sector.
 * Called automatically when a validity timer fires on the client,
 * or can be triggered from the backend (via GAS/edge function).
 *
 * @param {{ userId: string, userName: string, toolId: string, sectorId: string }} params
 */
export async function sendReEvaluationNotification({ userId, userName, toolId, sectorId }) {
  const tool = EVALUATION_TOOLS.find((t) => t.id === toolId);
  const toolTitle = tool?.title || toolId;

  const titulo = `Reavaliação necessária — ${userName}`;
  const mensagem = `A validade da avaliação "${toolTitle}" para ${userName} expirou (3 meses). Realize a reavaliação.`;

  try {
    // Notify via platform notification system
    await sendSectorNotification({ sectorId, titulo, mensagem });
  } catch {
    // Non-blocking — notification failure should not disrupt UX
  }

  // Also persist a scheduled re-evaluation request via API so backend can
  // fan-out to all managers/admins even when client is offline
  try {
    await requestApi('solicitar-reavaliacao', {
      userId,
      userName,
      toolId,
      toolTitle,
      sectorId,
    });
  } catch {
    // Backend endpoint may not exist yet — silent
  }
}

// ── Pending Flow State ────────────────────────────────────────────────────────

/**
 * Builds the initial pending-flow state for a given user.
 * Sets the first pending tool as active and records the full queue.
 *
 * @param {string} userId
 * @param {string} userName
 * @param {string[]} pendingToolIds
 * @returns {{ pendingFlowUserId: string, pendingFlowUserName: string,
 *             pendingToolQueue: string[], pendingToolIndex: number,
 *             pendingFlowActive: boolean }}
 */
export function buildPendingFlowState(userId, userName, pendingToolIds) {
  return {
    pendingFlowUserId:   userId,
    pendingFlowUserName: userName,
    pendingToolQueue:    pendingToolIds,
    pendingToolIndex:    0,
    pendingFlowActive:   pendingToolIds.length > 0,
  };
}

/**
 * Advances the pending queue to the next tool.
 * If all tools are done, marks the flow as complete.
 *
 * @param {object} currentPendingState
 * @returns {object} next pending state
 */
export function advancePendingFlow(currentPendingState) {
  const { pendingToolQueue, pendingToolIndex } = currentPendingState;
  const nextIndex = pendingToolIndex + 1;
  const isComplete = nextIndex >= pendingToolQueue.length;

  return {
    ...currentPendingState,
    pendingToolIndex: nextIndex,
    pendingFlowActive: !isComplete,
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** schedules a one-time expiry check in the browser. Fires notification if expired. */
function _scheduleExpiryCheck(userId, toolId, savedAtMs) {
  const remaining = VALIDITY_MS - (Date.now() - savedAtMs);
  if (remaining <= 0) return;

  // Cap to 31 days to avoid integer overflow in setTimeout
  const delay = Math.min(remaining, 31 * 24 * 60 * 60 * 1000);

  setTimeout(() => {
    const stillRemaining = getValidityRemainingMs(userId, toolId);
    if (stillRemaining === 0) {
      // Retrieve sector from DOM context if available
      const sectorId = document.body.dataset.currentSector || '';
      sendReEvaluationNotification({ userId, userName: userId, toolId, sectorId });
    }
  }, delay);
}
