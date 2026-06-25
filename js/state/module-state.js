import { MODULE_SORT_ORDER, MODULE_STATUS, MODULE_VIEW_MODE } from '../constants/module.constants.js';

export const MODULE_UI_DEFAULTS = Object.freeze({
  query: '',
  sort: MODULE_SORT_ORDER.ascending,
  view: MODULE_VIEW_MODE.grid,
});

const MODULE_STATE_BY_SECTOR = new Map();

export function createDefaultModuleState() {
  return {
    selectedModuleId: '',
    status: MODULE_STATUS.idle,
    moduleData: null,
    errorMessage: '',
    ui: { ...MODULE_UI_DEFAULTS },
    isAlertsLoading: false,
    cardAlerts: {},
    cardLocks: {},      // Navi — { [cardId]: { locked, reason, pct } | null }
  };
}

export function getModuleState(sectorId) {
  return MODULE_STATE_BY_SECTOR.get(sectorId) || createDefaultModuleState();
}

export function setModuleState(sectorId, state) {
  MODULE_STATE_BY_SECTOR.set(sectorId, state);
}

/**
 * Sets the isAlertsLoading flag for a sector without touching any other state.
 */
export function setModuleAlertsLoading(sectorId, loading) {
  if (!sectorId) return;
  const current = getModuleState(sectorId);
  MODULE_STATE_BY_SECTOR.set(sectorId, { ...current, isAlertsLoading: Boolean(loading) });
}

export function resetModuleSelectionForSector(sectorId) {
  if (!sectorId) return;

  const current = getModuleState(sectorId);
  MODULE_STATE_BY_SECTOR.set(sectorId, {
    ...createDefaultModuleState(),
    cardAlerts:        current.cardAlerts        || {},
    cardLocks:         current.cardLocks         || {},  // preserva locks Navi
    authenticatedUser: current.authenticatedUser || null,
    isAlertsLoading:   false,
  });
}

// ── Card Alerts ────────────────────────────────────────────────────────────

export function setCardAlert(sectorId, cardId, alert) {
  const current = getModuleState(sectorId);
  const cardAlerts = { ...(current.cardAlerts || {}) };
  if (alert) { cardAlerts[cardId] = alert; } else { delete cardAlerts[cardId]; }
  MODULE_STATE_BY_SECTOR.set(sectorId, { ...current, cardAlerts });
}

export function clearCardAlert(sectorId, cardId) {
  setCardAlert(sectorId, cardId, null);
}

// ── Card Locks (Navi) ──────────────────────────────────────────────────────

/**
 * Armazena o estado de bloqueio Navi de um card.
 * @param {string} sectorId
 * @param {string} cardId
 * @param {{ locked: boolean, reason: string, pct: number } | null} lockState
 */
export function setCardLock(sectorId, cardId, lockState) {
  const current = getModuleState(sectorId);
  const cardLocks = { ...(current.cardLocks || {}) };
  if (lockState?.locked) {
    cardLocks[cardId] = lockState;
  } else {
    delete cardLocks[cardId];
  }
  MODULE_STATE_BY_SECTOR.set(sectorId, { ...current, cardLocks });
}
