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
  };
}

export function getModuleState(sectorId) {
  return MODULE_STATE_BY_SECTOR.get(sectorId) || createDefaultModuleState();
}

export function setModuleState(sectorId, state) {
  MODULE_STATE_BY_SECTOR.set(sectorId, state);
}

export function resetModuleSelectionForSector(sectorId) {
  if (!sectorId) {
    return;
  }

  // Preserve cardAlerts so badges remain visible after navigating back to the cards view
  const current = getModuleState(sectorId);
  MODULE_STATE_BY_SECTOR.set(sectorId, {
    ...createDefaultModuleState(),
    cardAlerts: current.cardAlerts || {},
  });
}

export function getModuleStateEntries() {
  return Array.from(MODULE_STATE_BY_SECTOR.entries());
}

// ── Card Alerts ────────────────────────────────────────────────────────────
// cardAlerts: { [cardId]: { type: 'pending' | 'unread', count: number } | null }

export function setCardAlert(sectorId, cardId, alert) {
  const current = getModuleState(sectorId);
  const cardAlerts = { ...(current.cardAlerts || {}) };
  if (alert) {
    cardAlerts[cardId] = alert;
  } else {
    delete cardAlerts[cardId];
  }
  MODULE_STATE_BY_SECTOR.set(sectorId, { ...current, cardAlerts });
}

export function clearCardAlert(sectorId, cardId) {
  setCardAlert(sectorId, cardId, null);
}