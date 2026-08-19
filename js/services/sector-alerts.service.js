/**
 * sector-alerts.service.js
 * Loads card-level alert badges for a sector on navigation.
 * Also computes Navi lock states (Sistema Navi — sequential learning path).
 */

import { requestApi } from './api.service.js';
import { loadActiveUsers } from './users.service.js';
import { loadModuleContent } from './integrations.service.js';
import { setCardAlert, getModuleState, setModuleState, setCardLock } from '../state/module-state.js';
import { MODULE_IDS } from '../constants/module.constants.js';
import { isAdminUser, isManagerUser } from './access.service.js';
import { buildNaviProgress, computeNaviLocks, isNaviSector } from './navi.service.js';

const CACHE_MS = 60_000;
const _lastFetch = new Map();
// v2 — invalida caches gravados sob o conjunto de regras anterior
// (lock de Avaliações para Gestor e locks de setor/módulo para Admin).
const STORAGE_KEY = 'bc_sector_alerts_v2';

// ── Lockable card IDs for Navi cleanup ──────────────────────────────────────
const NAVI_LOCKABLE_IDS = [
  MODULE_IDS.writtenInstructions,
  MODULE_IDS.videoInstructions,
  MODULE_IDS.evaluation,
  MODULE_IDS.tiRequest,
];

// ── Public API ────────────────────────────────────────────────────────────

export function hasCachedAlerts(sectorId) {
  if (!sectorId) return false;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const all = JSON.parse(raw);
    return Boolean(all[sectorId] && typeof all[sectorId] === 'object');
  } catch { return false; }
}

/**
 * Retorna true se o setor possui cardLocks cacheados no sessionStorage.
 * Usado para decidir se o spinner de carregamento deve ser exibido
 * antes das regras Navi estarem computadas.
 */
export function hasCachedLocks(sectorId) {
  if (!sectorId) return false;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const all = JSON.parse(raw);
    const entry = all[sectorId];
    // Novo formato: { alerts: {}, locks: {} }
    return Boolean(entry && typeof entry === 'object' && 'locks' in entry);
  } catch { return false; }
}

export function isFetchStale(sectorId) {
  if (!sectorId) return true;
  const last = _lastFetch.get(sectorId) || 0;
  return Date.now() - last >= CACHE_MS;
}

export function syncSectorAlertsFromCache(sectorId) {
  if (!sectorId) return;
  _restoreAlertsFromCache(sectorId);
}

export async function prefetchSectorAlerts(sectorId, authenticatedUser) {
  if (!sectorId) return;

  const isPrivileged = isAdminUser(authenticatedUser) || isManagerUser(authenticatedUser);

  const last = _lastFetch.get(sectorId) || 0;
  if (Date.now() - last < CACHE_MS) return;
  _lastFetch.set(sectorId, Date.now());

  const jobs = [_checkContentPending(sectorId, authenticatedUser)];

  if (isPrivileged) {
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

/**
 * Invalida apenas o timer de fetch, sem tocar no sessionStorage.
 * Força prefetchSectorAlerts a buscar dados frescos do servidor na
 * próxima chamada, mas preserva o cache como fallback em caso de falha de rede.
 * Usado pelo anti-bypass no retorno ao menu de setor.
 */
export function invalidateSectorAlertsFetchTimer(sectorId) {
  if (sectorId) _lastFetch.delete(sectorId);
}

// ── Content pending + Navi locks ──────────────────────────────────────────

async function _checkContentPending(sectorId, authenticatedUser) {
  try {
    const consumoResp = await requestApi('buscar-consumo-usuario', { sectorId });
    const consumed = consumoResp?.counts || {};

    const contentModules = [
      { moduleId: MODULE_IDS.documents,           cardId: MODULE_IDS.documents,           tipo: 'documento' },
      { moduleId: MODULE_IDS.writtenInstructions,  cardId: MODULE_IDS.writtenInstructions,  tipo: 'instrucao_escrita' },
      { moduleId: MODULE_IDS.videoInstructions,    cardId: MODULE_IDS.videoInstructions,    tipo: 'video' },
    ];

    const results = await Promise.allSettled(
      contentModules.map(m => loadModuleContent({ sectorId, moduleId: m.moduleId }))
    );

    // Collect totals for Navi progress
    const totals = { documentos: 0, instrucoes_escritas: 0, instrucoes_video: 0 };

    for (let i = 0; i < contentModules.length; i++) {
      const { cardId, tipo, moduleId } = contentModules[i];
      const result = results[i];
      if (result.status !== 'fulfilled' || !result.value?.success) {
        setCardAlert(sectorId, cardId, null);
        continue;
      }

      const total   = Array.isArray(result.value.items) ? result.value.items.length : 0;
      const done    = consumed[tipo] || 0;
      const pending = Math.max(0, total - done);

      // Collect total for Navi
      if (moduleId === MODULE_IDS.documents)           totals.documentos = total;
      if (moduleId === MODULE_IDS.writtenInstructions) totals.instrucoes_escritas = total;
      if (moduleId === MODULE_IDS.videoInstructions)   totals.instrucoes_video = total;

      if (total === 0) {
        setCardAlert(sectorId, cardId, null);
      } else if (done === 0) {
        setCardAlert(sectorId, cardId, { type: 'not-started', count: total });
      } else if (pending > 0) {
        setCardAlert(sectorId, cardId, { type: 'in-progress', count: pending });
      } else {
        setCardAlert(sectorId, cardId, { type: 'complete', count: 0 });
      }
    }

    // ── Navi lock computation ──────────────────────────────────────────────
    if (isNaviSector(sectorId)) {
      const naviProgress = buildNaviProgress(consumed, totals);
      const naviLocks    = computeNaviLocks(naviProgress, authenticatedUser, sectorId);

      // Apply new lock states
      for (const [cardId, lockState] of Object.entries(naviLocks)) {
        setCardLock(sectorId, cardId, lockState);
      }
      // Clear locks for cards that are now unlocked
      for (const cardId of NAVI_LOCKABLE_IDS) {
        if (!naviLocks[cardId]) setCardLock(sectorId, cardId, null);
      }
    }
  } catch { /* silent */ }
}

// ── Evaluation pending ──────────────────────────────────────────────────────

async function _checkEvaluationPending(sectorId) {
  try {
    const usersResponse = await loadActiveUsers();
    const allUsers = Array.isArray(usersResponse.users) ? usersResponse.users : [];

    const sectorUsers = allUsers.filter((u) => {
      if (isAdminUser(u) || isManagerUser(u)) return true;
      const s = String(u.setor || '').toLowerCase();
      return s === 'all' || s.split(/,\s*/).includes(sectorId);
    });

    if (!sectorUsers.length) { setCardAlert(sectorId, 'avaliacao', null); return; }

    const userIds = sectorUsers.map(u => u.id);
    const response = await requestApi('buscar-pendencias-avaliacao', { sectorId, userIds });
    const pendingIds = Array.isArray(response?.pendingUserIds) ? response.pendingUserIds : [];

    setCardAlert(sectorId, 'avaliacao', pendingIds.length > 0
      ? { type: 'pending', count: pendingIds.length }
      : null);

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
  } catch { /* silent */ }
}

// ── Quality unread ──────────────────────────────────────────────────────────

async function _checkQualityUnread(sectorId) {
  try {
    const response = await requestApi('buscar-registros-nao-lidos', { sectorId });
    const unreadCount = response?.unreadCount ?? 0;
    setCardAlert(sectorId, 'qualidade', unreadCount > 0
      ? { type: 'unread', count: unreadCount }
      : null);
  } catch { /* silent */ }
}

// ── Session cache ───────────────────────────────────────────────────────────

function _restoreAlertsFromCache(sectorId) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const all = JSON.parse(raw);
    const entry = all[sectorId];
    if (!entry || typeof entry !== 'object') return;

    // Suporte ao formato novo { alerts: {}, locks: {} } e formato legado (flat)
    const alerts = entry.alerts || entry;
    const locks  = entry.locks  || {};

    for (const [cardId, alert] of Object.entries(alerts)) {
      if (cardId !== 'alerts' && cardId !== 'locks') {
        setCardAlert(sectorId, cardId, alert);
      }
    }
    // Restaura locks Navi do cache — elimina a janela de flash de cards desbloqueados
    for (const [cardId, lock] of Object.entries(locks)) {
      setCardLock(sectorId, cardId, lock);
    }
  } catch { /* silent */ }
}

function _persistAlertsToCache(sectorId) {
  try {
    const state  = getModuleState(sectorId);
    const alerts = state.cardAlerts || {};
    const locks  = state.cardLocks  || {};
    const raw    = sessionStorage.getItem(STORAGE_KEY);
    const all    = raw ? JSON.parse(raw) : {};
    // Novo formato: persiste tanto alerts quanto locks juntos
    all[sectorId] = { alerts, locks };
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
