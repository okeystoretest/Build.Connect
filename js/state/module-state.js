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

  MODULE_STATE_BY_SECTOR.set(sectorId, createDefaultModuleState());
}

export function getModuleStateEntries() {
  return Array.from(MODULE_STATE_BY_SECTOR.entries());
}
