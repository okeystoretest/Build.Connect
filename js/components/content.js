import {
  DEFAULT_SECTOR_CARDS,
  canUserAccessModule,
  getCardsForSector,
} from '../services/navigation.service.js';
import { refreshLucideIcons } from '../services/icons.service.js';
import {
  MODULE_IDS,
  MODULE_SORT_ORDER,
  MODULE_VIEW_MODE,
} from '../constants/module.constants.js';
import {
  MODULE_UI_DEFAULTS,
  getModuleState,
  resetModuleSelectionForSector,
  setModuleState,
} from '../state/module-state.js';
import { closeActiveOverlayModal } from './shared/overlay-modal.js';
import { getWelcomeViewMarkup } from './views/welcome-view.js';
import { getSectorCardsViewMarkup } from './views/sector-cards-view.js';
import { getModuleStageMarkup } from './modules/module-stage.js';
import { createFeedbackModuleHandlers } from './modules/feedback-module.js';
import { createUserAdminModuleHandlers } from './modules/user-admin-module.js';
import { createEvaluationModuleHandlers } from './modules/evaluation-module.js';
import { createQualityModuleHandlers } from './modules/quality-module.js';
import { createTiRequestsModuleHandlers } from './modules/ti-requests-module.js';
import { createHistoricoModuleHandlers } from './modules/historico/historico.handlers.js';
import { createQuestionariosModuleHandlers } from './modules/questionarios-module.js';
import { createVitrineModuleHandlers } from './modules/vitrine-module.js';
import { VITRINE_SECTOR_CARDS } from '../config/sector-cards.config.js';
import { bindContentInteractions } from './content/content-interactions.js';
import { executeModuleSelection } from './content/content-module-selection.js';
import {
  activateRevealAnimations,
  activateViewTransition,
  disconnectRevealObserver,
} from './shared/reveal-animation.js';

export { resetModuleSelectionForSector } from '../state/module-state.js';

const VIEW_EXIT_DURATION_MS = 180;
const MODULE_CARD_IDS = new Set([...DEFAULT_SECTOR_CARDS, ...getCardsForSector('dho'), ...VITRINE_SECTOR_CARDS].map((card) => card.id));
MODULE_CARD_IDS.add(MODULE_IDS.tiRequest);
let currentRenderToken = 0;

const feedbackModuleHandlers = createFeedbackModuleHandlers({
  getModuleState,
  setModuleState,
  renderModuleStage,
});

const userAdminModuleHandlers = createUserAdminModuleHandlers({
  getModuleState,
  setModuleState,
  renderModuleStage,
});

const evaluationModuleHandlers = createEvaluationModuleHandlers({
  getModuleState,
  setModuleState,
  renderModuleStage,
});

const qualityModuleHandlers = createQualityModuleHandlers({
  getModuleState,
  setModuleState,
  renderModuleStage,
});

const tiRequestsModuleHandlers = createTiRequestsModuleHandlers({
  getModuleState,
  setModuleState,
  renderModuleStage,
});

const historicoModuleHandlers = createHistoricoModuleHandlers({
  getModuleState,
  setModuleState,
  renderModuleStage,
});

const questionariosModuleHandlers = createQuestionariosModuleHandlers({
  getModuleState,
  setModuleState,
  renderModuleStage,
});

const vitrineModuleHandlers = createVitrineModuleHandlers({
  getModuleState,
  setModuleState,
  renderModuleStage,
});

export function renderContentView(rootElement, viewState, options = {}) {
  const { animate = true } = options;
  const nextToken = ++currentRenderToken;
  const currentPanel = rootElement.querySelector('.content-panel');

  closeActiveOverlayModal();

  if (animate && currentPanel) {
    currentPanel.classList.add('is-view-exit');

    window.setTimeout(() => {
      if (nextToken !== currentRenderToken) {
        return;
      }

      mountView(rootElement, viewState);
    }, VIEW_EXIT_DURATION_MS);

    return;
  }

  mountView(rootElement, viewState);
}

function mountView(rootElement, viewState) {
  disconnectRevealObserver();
  rootElement.innerHTML = getViewMarkup(viewState);
  refreshLucideIcons(rootElement);
  activateViewTransition(rootElement);
  activateRevealAnimations(rootElement);
  bindContentInteractions(rootElement, viewState, {
    moduleCardIds: MODULE_CARD_IDS,
    handleModuleSelection,
    clearSelectedModule,
    toggleModuleSort,
    setModuleView,
    updateModuleQuery,
    setModuleToolFilter,
    userAdminModuleHandlers,
    evaluationModuleHandlers,
    feedbackModuleHandlers,
    qualityModuleHandlers,
    tiRequestsModuleHandlers,
    historicoModuleHandlers,
    questionariosModuleHandlers,
    vitrineModuleHandlers,
    getModuleState,
  });
}

function getViewMarkup(viewState) {
  if (viewState.isWelcome) {
    return getWelcomeViewMarkup(viewState.authenticatedUser);
  }

  if (viewState.shouldRenderCards && viewState.selectedItem?.id) {
    const sectorId = viewState.selectedItem.id;
    const stageState = getModuleState(sectorId);

    if (stageState.selectedModuleId && !canUserAccessModule(viewState.authenticatedUser, stageState.selectedModuleId)) {
      resetModuleSelectionForSector(sectorId);
    }

    return getSectorCardsViewMarkup(
      viewState.selectedItem,
      getModuleState(sectorId),
      getModuleStageMarkup,
      viewState.authenticatedUser,
    );
  }

  return getWelcomeViewMarkup(viewState.authenticatedUser);
}

async function handleModuleSelection(rootElement, sector, moduleId, authenticatedUser, options = {}) {
  return executeModuleSelection(
    rootElement, sector, moduleId, authenticatedUser, options,
    { renderModuleStage, tiRequestsModuleHandlers, vitrineModuleHandlers },
  );
}

function toggleModuleSort(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (!state.selectedModuleId) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...MODULE_UI_DEFAULTS,
      ...(state.ui || {}),
      sort: state.ui?.sort === MODULE_SORT_ORDER.ascending ? MODULE_SORT_ORDER.descending : MODULE_SORT_ORDER.ascending,
    },
  });

  renderModuleStage(rootElement, sector);
}

function setModuleView(rootElement, sector, view) {
  if (view !== MODULE_VIEW_MODE.grid && view !== MODULE_VIEW_MODE.list) {
    return;
  }

  const state = getModuleState(sector.id);

  if (!state.selectedModuleId) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...MODULE_UI_DEFAULTS,
      ...(state.ui || {}),
      view,
    },
  });

  renderModuleStage(rootElement, sector);
}

function updateModuleQuery(rootElement, sector, query) {
  const state = getModuleState(sector.id);

  if (!state.selectedModuleId) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...MODULE_UI_DEFAULTS,
      ...(state.ui || {}),
      query,
    },
  });

  renderModuleStage(rootElement, sector);

  const searchInput = rootElement.querySelector('[data-module-search]');

  if (searchInput) {
    const caretPosition = query.length;
    searchInput.focus();
    searchInput.setSelectionRange(caretPosition, caretPosition);
  }
}

function setModuleToolFilter(rootElement, sector, filter) {
  const state = getModuleState(sector.id);

  if (!state.selectedModuleId) {
    return;
  }

  // Toggle: clicar no filtro ativo desseleciona
  const currentFilter = state.ui?.selectedToolFilter || '';
  const nextFilter = currentFilter === filter ? '' : filter;

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...MODULE_UI_DEFAULTS,
      ...(state.ui || {}),
      selectedToolFilter: nextFilter,
    },
  });

  renderModuleStage(rootElement, sector);
}

function clearSelectedModule(rootElement, sector, authenticatedUser = null) {
  resetModuleSelectionForSector(sector.id);

  mountView(rootElement, {
    selectedItem: sector,
    isWelcome: false,
    shouldRenderCards: true,
    authenticatedUser,
  });
}

function renderModuleStage(rootElement, sector) {
  const cards = rootElement.querySelectorAll('[data-module-card]');
  const stageElement = rootElement.querySelector('[data-module-stage]');
  const stageState = getModuleState(sector.id);
  const cardAlerts = stageState.cardAlerts || {};

  cards.forEach((cardElement) => {
    const moduleId = cardElement.dataset.moduleId;
    const isSelected = moduleId === stageState.selectedModuleId;
    cardElement.classList.toggle('is-selected', isSelected);
    cardElement.setAttribute('aria-pressed', String(isSelected));

    // Sync card alert badge directly in the DOM without a full re-render
    const alert = cardAlerts[moduleId] || null;
    let badge = cardElement.querySelector('.feature-card-alert-badge');
    let attn  = cardElement.querySelector('.feature-card-attention');

    if (alert) {
      cardElement.classList.add('has-alert');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'feature-card-alert-badge';
        cardElement.prepend(badge);
      }
      badge.innerHTML = `<span class="feature-card-alert-dot"></span>${alert.count > 0 ? `<span class="feature-card-alert-count">${alert.count}</span>` : ''}`;
      badge.setAttribute('aria-label', `${alert.count} pendência${alert.count !== 1 ? 's' : ''}`);
      if (!attn) {
        attn = document.createElement('span');
        attn.className = 'feature-card-attention';
        attn.setAttribute('aria-hidden', 'true');
        attn.innerHTML = '<i data-lucide="alert-triangle"></i>';
        cardElement.prepend(attn);
        refreshLucideIcons(attn);
      }
    } else {
      cardElement.classList.remove('has-alert');
      badge?.remove();
      attn?.remove();
    }
  });

  if (!stageElement) {
    mountView(rootElement, {
      selectedItem: sector,
      isWelcome: false,
      shouldRenderCards: true,
      authenticatedUser: stageState.moduleData?.respondent || null,
    });
    return;
  }

  stageElement.innerHTML = getModuleStageMarkup(sector, stageState);
  stageElement.classList.remove('is-module-stage-visible');
  stageElement.classList.add('is-visible');

  refreshLucideIcons(stageElement);

  requestAnimationFrame(() => {
    stageElement.classList.add('is-module-stage-visible');
  });
}