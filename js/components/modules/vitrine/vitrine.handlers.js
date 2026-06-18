import { MODULE_STATUS } from '../../../constants/module.constants.js';
import { loadModuleContent } from '../../../services/integrations.service.js';
import { VITRINE_TABS, VITRINE_UI_DEFAULTS, getDefaultTab } from './vitrine.constants.js';
import { getVitrineUiState } from './vitrine.view.js';

let vitrineContext = null;

export function createVitrineModuleHandlers(context) {
  vitrineContext = context;

  return {
    setActiveTab: vitrineSetActiveTab,
    initDefaultTab: vitrineInitDefaultTab,
    retry: vitrineRetry,
  };
}

function getModuleState(sectorId) {
  return vitrineContext?.getModuleState(sectorId);
}

function setModuleState(sectorId, state) {
  return vitrineContext?.setModuleState(sectorId, state);
}

function renderModuleStage(rootElement, sector) {
  return vitrineContext?.renderModuleStage(rootElement, sector);
}

function patchVitrineUi(sectorId, patch) {
  const state = getModuleState(sectorId);
  if (!state) return;
  const currentUi = state.ui || {};
  const currentVitrine = getVitrineUiState(currentUi);

  setModuleState(sectorId, {
    ...state,
    ui: {
      ...currentUi,
      vitrine: { ...currentVitrine, ...patch },
    },
  });
}

/**
 * Resolves the Apps Script sectorId for a given vitrine tab.
 * Tabs prefixed with 'lovclub-' belong to the Lov Club Vitrine sector;
 * all others belong to the OKEY Vitrine sector.
 */
function _getSectorIdForTab(tabId) {
  return String(tabId || '').startsWith('lovclub-') ? 'lovclub' : 'vitrine';
}

// ── Init — auto-select first tab on module open ───────────────────────

export function vitrineInitDefaultTab(rootElement, sector) {
  const state = getModuleState(sector.id);
  if (!state) return;

  const categoryId = state.selectedModuleId;
  const defaultTab = getDefaultTab(categoryId);
  if (!defaultTab) return;

  vitrineSetActiveTab(rootElement, sector, defaultTab);
}

// ── Tab switching — mirrors historico setActiveTab ─────────────────────

async function vitrineSetActiveTab(rootElement, sector, tabId) {
  const state = getModuleState(sector.id);
  if (!state) return;

  const categoryId = state.selectedModuleId;
  const tabs = VITRINE_TABS[categoryId] || [];
  if (!tabs.find((t) => t.id === tabId)) return;

  const currentVitrine = getVitrineUiState(state.ui);

  // If already on this tab with data loaded, just re-render
  if (currentVitrine.activeTab === tabId && currentVitrine.tabStatus === MODULE_STATUS.success) {
    return;
  }

  // Set loading state and switch tab
  patchVitrineUi(sector.id, {
    activeTab: tabId,
    tabStatus: MODULE_STATUS.loading,
    tabData: null,
    tabError: '',
  });

  // Reset search/sort state for fresh tab content
  const refreshedState = getModuleState(sector.id);
  setModuleState(sector.id, {
    ...refreshedState,
    ui: {
      ...refreshedState.ui,
      query: '',
      selectedToolFilter: '',
    },
  });

  renderModuleStage(rootElement, sector);

  try {
    // FIX: use the correct sectorId based on the tab prefix (lovclub- vs vitrine-)
    const response = await loadModuleContent({
      sectorId: _getSectorIdForTab(tabId),
      moduleId: tabId,
      forceRefresh: false,
    });

    // Guard: user may have switched tabs or modules during loading
    const nextState = getModuleState(sector.id);
    if (!nextState || nextState.selectedModuleId !== categoryId) return;

    const nextVitrine = getVitrineUiState(nextState.ui);
    if (nextVitrine.activeTab !== tabId) return;

    patchVitrineUi(sector.id, {
      tabStatus: response.success ? MODULE_STATUS.success : MODULE_STATUS.error,
      tabData: response.success ? response : null,
      tabError: response.success ? '' : (response.message || 'Erro ao carregar.'),
    });
  } catch (error) {
    const nextState = getModuleState(sector.id);
    if (!nextState) return;

    patchVitrineUi(sector.id, {
      tabStatus: MODULE_STATUS.error,
      tabData: null,
      tabError: error?.message || 'Falha ao comunicar com o servidor.',
    });
  }

  renderModuleStage(rootElement, sector);
}

// ── Retry ─────────────────────────────────────────────────────────────

function vitrineRetry(rootElement, sector) {
  const state = getModuleState(sector.id);
  if (!state) return;

  const vitrineUi = getVitrineUiState(state.ui);
  if (!vitrineUi.activeTab) return;

  // Force reload by clearing current status
  patchVitrineUi(sector.id, {
    tabStatus: MODULE_STATUS.idle,
    tabData: null,
    tabError: '',
  });

  vitrineSetActiveTab(rootElement, sector, vitrineUi.activeTab);
}
