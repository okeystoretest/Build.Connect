/**
 * sector-alerts.service.js
 * Loads card-level alert badges for a sector on navigation.
 * Prefetches pending evaluation users, unread quality records,
 * and content consumption gaps so badges render without flickering.
 */

import { requestApi } from './api.service.js';
import { loadActiveUsers } from './users.service.js';
import { loadModuleContent } from './integrations.service.js';
import { setCardAlert, getModuleState, setModuleState } from '../state/module-state.js';
import { MODULE_IDS } from '../constants/module.constants.js';

const CACHE_MS = 60_000;
const _lastFetch = new Map();
const STORAGE_KEY = 'bc_sector_alerts';

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Synchronously restores cached alerts for a sector into module state.
 * Call this BEFORE the first render so the initial paint already has badge data.
 */
export function syncSectorAlertsFromCache(sectorId) {
  if (!sectorId) return;
  _restoreAlertsFromCache(sectorId);
}

export async function prefetchSectorAlerts(sectorId, authenticatedUser) {
  if (!sectorId) return;
  const nivel = authenticatedUser?.nivel || 'Colaborador';

  const last = _lastFetch.get(sectorId) || 0;
  if (Date.now() - last < CACHE_MS) return;
  _lastFetch.set(sectorId, Date.now());

  const jobs = [_checkContentPending(sectorId)];

  if (nivel === 'Admin' || nivel === 'Gestor') {
    jobs.push(_checkEvaluationPending(sectorId));
    jobs.push(_checkQualityUnread(sectorId));
  }

  await Promise.allSettled(jobs);
  _persistAlertsToCache(sectorId);
}

export function invalidateSectorAlertsCache(sectorId) {
  _lastFetch.delete(sectorId);
  _clearPersistedAlerts(sectorId);
}

// ── Content pending (Docs, Videos, Instructions) ──────────────────────────

async function _checkContentPending(sectorId) {
  try {
    // Load consumed counts from backend
    const consumoResp = await requestApi('buscar-consumo-usuario', { sectorId });
    const consumed = consumoResp?.counts || {};

    // Load content from Apps Script (cached after first call)
    const contentModules = [
      { moduleId: MODULE_IDS.documents,           cardId: MODULE_IDS.documents,           tipo: 'documento' },
      { moduleId: MODULE_IDS.writtenInstructions,  cardId: MODULE_IDS.writtenInstructions,  tipo: 'instrucao_escrita' },
      { moduleId: MODULE_IDS.videoInstructions,    cardId: MODULE_IDS.videoInstructions,    tipo: 'video' },
    ];

    const results = await Promise.allSettled(
      contentModules.map(m => loadModuleContent({ sectorId, moduleId: m.moduleId }))
    );

    for (let i = 0; i < contentModules.length; i++) {
      const { cardId, tipo } = contentModules[i];
      const result = results[i];
      if (result.status !== 'fulfilled' || !result.value?.success) {
        setCardAlert(sectorId, cardId, null);
        continue;
      }

      const total    = Array.isArray(result.value.items) ? result.value.items.length : 0;
      const done     = consumed[tipo] || 0;
      const pending  = Math.max(0, total - done);

      if (total === 0) {
        setCardAlert(sectorId, cardId, null);
      } else if (pending > 0) {
        setCardAlert(sectorId, cardId, { type: 'pending', count: pending });
      } else {
        setCardAlert(sectorId, cardId, { type: 'complete', count: 0 });
      }
    }
  } catch { /* silent */ }
}

// ── Evaluation pending ────────────────────────────────────────────────────

async function _checkEvaluationPending(sectorId) {
  try {
    const usersResponse = await loadActiveUsers();
    const allUsers = Array.isArray(usersResponse.users) ? usersResponse.users : [];

    const sectorUsers = allUsers.filter((u) => {
      if (u.nivel === 'Admin' || u.nivel === 'Gestor') return true;
      const s = String(u.setor || '').toLowerCase();
      return s === 'all' || s.split(/,\s*/).includes(sectorId);
    });

    if (!sectorUsers.length) {
      setCardAlert(sectorId, 'avaliacao', null);
      return;
    }

    const userIds = sectorUsers.map(u => u.id);
    const response = await requestApi('buscar-pendencias-avaliacao', { sectorId, userIds });

    const pendingIds = Array.isArray(response?.pendingUserIds) ? response.pendingUserIds : [];
    setCardAlert(sectorId, 'avaliacao', pendingIds.length > 0
      ? { type: 'pending', count: pendingIds.length }
      : null);

    // Store pendingUserIds + pendingByTool in moduleData if already initialized
    const currentState = getModuleState(sectorId);
    if (currentState.moduleData) {
      setModuleState(sectorId, {
        ...currentState,
        moduleData: {
          ...currentState.moduleData,
          pendingUserIds: pendingIds,
          pendingByTool: response?.pendingByTool || {},
        },
      });
    }

    // Also store pendingByTool in cardAlerts metadata for evaluation view
    const alertData = getModuleState(sectorId).cardAlerts?.avaliacao;
    if (alertData) {
      alertData.pendingByTool = response?.pendingByTool || {};
    }
  } catch { /* silent */ }
}

// ── Quality unread ────────────────────────────────────────────────────────

async function _checkQualityUnread(sectorId) {
  try {
    const response = await requestApi('buscar-registros-nao-lidos', { sectorId });
    const unreadCount = response?.unreadCount ?? 0;
    setCardAlert(sectorId, 'qualidade', unreadCount > 0
      ? { type: 'unread', count: unreadCount }
      : null);
  } catch { /* silent */ }
}

// ── Session cache (flicker prevention) ────────────────────────────────────

function _restoreAlertsFromCache(sectorId) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const all = JSON.parse(raw);
    const cached = all[sectorId];
    if (!cached || typeof cached !== 'object') return;
    for (const [cardId, alert] of Object.entries(cached)) {
      setCardAlert(sectorId, cardId, alert);
    }
  } catch { /* silent */ }
}

function _persistAlertsToCache(sectorId) {
  try {
    const state = getModuleState(sectorId);
    const alerts = state.cardAlerts || {};
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[sectorId] = alerts;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* silent */ }
}

function _clearPersistedAlerts(sectorId) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const all = JSON.parse(raw);
    delete all[sectorId];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* silent */ }
}
