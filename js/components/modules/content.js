import {
  DEFAULT_SECTOR_CARDS,
  canUserAccessModule,
  getCardsForSector,
  getSectorBreadcrumb,
  isDhoSector,
} from '../services/navigation.service.js';
import { refreshLucideIcons } from '../services/icons.service.js';
import {
  MODULE_SOURCE_LABELS,
  loadModuleContent,
} from '../services/integrations.service.js';
import {
  ACTIVE_USERS_MODULE_IDS,
  APP_SOURCE_LABEL,
  INTERNAL_USER_MODULE_IDS,
  MODULE_IDS,
  MODULE_SORT_ORDER,
  MODULE_STATUS,
  MODULE_VIEW_MODE,
  SELF_LOADING_MODULE_IDS,
} from '../constants/module.constants.js';
import { loadActiveUsers } from '../services/users.service.js';
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
import {
  createFeedbackModuleHandlers,
  FEEDBACK_UI_DEFAULTS,
} from './modules/feedback-module.js';
import {
  createUserAdminModuleHandlers,
} from './modules/user-admin-module.js';
import {
  createEvaluationModuleHandlers,
  EVALUATION_UI_DEFAULTS,
} from './modules/evaluation-module.js';
import {
  createQualityModuleHandlers,
  QUALITY_UI_DEFAULTS,
} from './modules/quality-module.js';
import {
  createTiRequestsModuleHandlers,
  TI_REQUESTS_UI_DEFAULTS,
} from './modules/ti-requests-module.js';
import { createHistoricoModuleHandlers } from './modules/historico/historico.handlers.js';
import {
  createQuestionariosModuleHandlers,
  QUIZ_UI_DEFAULTS,
} from './modules/questionarios-module.js';
import { bindContentInteractions } from './content/content-interactions.js';
import {
  activateRevealAnimations,
  activateViewTransition,
  disconnectRevealObserver,
} from './shared/reveal-animation.js';

export { resetModuleSelectionForSector } from '../state/module-state.js';

const VIEW_EXIT_DURATION_MS = 180;
const MODULE_CARD_IDS = new Set([...DEFAULT_SECTOR_CARDS, ...getCardsForSector('dho')].map((card) => card.id));
MODULE_CARD_IDS.add(MODULE_IDS.tiRequest);
const MODULE_REQUEST_TOKENS = new Map();
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
    userAdminModuleHandlers,
    evaluationModuleHandlers,
    feedbackModuleHandlers,
    qualityModuleHandlers,
    tiRequestsModuleHandlers,
    historicoModuleHandlers,
    questionariosModuleHandlers,
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

function isInternalModule(sectorId, moduleId) {
  if (isDhoSector(sectorId)) {
    return true;
  }

  return INTERNAL_USER_MODULE_IDS.has(moduleId);
}

function requiresActiveUsers(moduleId) {
  return ACTIVE_USERS_MODULE_IDS.has(moduleId);
}

async function handleModuleSelection(rootElement, sector, moduleId, authenticatedUser, options = {}) {
  const { forceRefresh = false } = options;
  const currentState = getModuleState(sector.id);

  if (!canUserAccessModule(authenticatedUser, moduleId)) {
    return;
  }

  if (!forceRefresh && currentState.selectedModuleId === moduleId && currentState.status === MODULE_STATUS.success) {
    return;
  }

  setModuleState(sector.id, {
    selectedModuleId: moduleId,
    status: MODULE_STATUS.loading,
    moduleData: null,
    errorMessage: '',
    ui: { ...MODULE_UI_DEFAULTS },
  });
  renderModuleStage(rootElement, sector);

  // Modules that load their own data via handlers (e.g. TI Requests)
  if (SELF_LOADING_MODULE_IDS.has(moduleId)) {
    if (moduleId === MODULE_IDS.questionarios) {
      setModuleState(sector.id, {
        selectedModuleId: moduleId,
        status: MODULE_STATUS.success,
        moduleData: { respondent: authenticatedUser },
        errorMessage: '',
        ui: { ...MODULE_UI_DEFAULTS, questionarios: { ...QUIZ_UI_DEFAULTS } },
      });
      renderModuleStage(rootElement, sector);
      return;
    }

    setModuleState(sector.id, {
      selectedModuleId: moduleId,
      status: MODULE_STATUS.success,
      moduleData: { respondent: authenticatedUser },
      errorMessage: '',
      ui: { ...MODULE_UI_DEFAULTS, ...TI_REQUESTS_UI_DEFAULTS, loadStatus: 'loading' },
    });
    renderModuleStage(rootElement, sector);
    tiRequestsModuleHandlers.loadTickets(rootElement, sector);
    return;
  }

  if (requiresActiveUsers(moduleId)) {
    const defaultUi = moduleId === MODULE_IDS.evaluation
      ? { ...MODULE_UI_DEFAULTS, ...EVALUATION_UI_DEFAULTS }
      : moduleId === MODULE_IDS.quality
        ? { ...MODULE_UI_DEFAULTS, ...QUALITY_UI_DEFAULTS }
        : { ...MODULE_UI_DEFAULTS, ...FEEDBACK_UI_DEFAULTS };

    try {
      const usersResponse = await loadActiveUsers({ forceRefresh });

      if (!usersResponse.success) {
        setModuleState(sector.id, {
          selectedModuleId: moduleId,
          status: MODULE_STATUS.error,
          moduleData: null,
          errorMessage: usersResponse.message || 'Não foi possível carregar os usuários ativos.',
          ui: defaultUi,
        });
        renderModuleStage(rootElement, sector);
        return;
      }

      setModuleState(sector.id, {
        selectedModuleId: moduleId,
        status: MODULE_STATUS.success,
        moduleData: {
          module: { id: moduleId, source: MODULE_SOURCE_LABELS[moduleId] || APP_SOURCE_LABEL },
          respondent: authenticatedUser || null,
          evaluationSector: {
            id: sector.id,
            label: getSectorBreadcrumb(sector),
          },
          users: Array.isArray(usersResponse.users) ? usersResponse.users : [],
        },
        errorMessage: '',
        ui: defaultUi,
      });
      renderModuleStage(rootElement, sector);
      return;
    } catch (error) {
      setModuleState(sector.id, {
        selectedModuleId: moduleId,
        status: MODULE_STATUS.error,
        moduleData: null,
        errorMessage: error?.message || 'Não foi possível carregar os usuários ativos.',
        ui: defaultUi,
      });
      renderModuleStage(rootElement, sector);
      return;
    }
  }

  if (isInternalModule(sector.id, moduleId)) {
    setModuleState(sector.id, {
      selectedModuleId: moduleId,
      status: MODULE_STATUS.success,
      moduleData: {
        module: { id: moduleId, source: MODULE_SOURCE_LABELS[moduleId] || APP_SOURCE_LABEL },
        items: [],
      },
      errorMessage: '',
      ui: { ...MODULE_UI_DEFAULTS },
    });
    renderModuleStage(rootElement, sector);
    return;
  }

  const requestToken = `${sector.id}:${moduleId}:${Date.now()}`;
  MODULE_REQUEST_TOKENS.set(sector.id, requestToken);

  try {
    const response = await loadModuleContent({ sectorId: sector.id, moduleId, forceRefresh });

    if (MODULE_REQUEST_TOKENS.get(sector.id) !== requestToken) {
      return;
    }

    if (response.success) {
      setModuleState(sector.id, {
        selectedModuleId: moduleId,
        status: MODULE_STATUS.success,
        moduleData: response,
        errorMessage: '',
        ui: currentState.selectedModuleId === moduleId ? currentState.ui || { ...MODULE_UI_DEFAULTS } : { ...MODULE_UI_DEFAULTS },
      });
    } else {
      setModuleState(sector.id, {
        selectedModuleId: moduleId,
        status: MODULE_STATUS.error,
        moduleData: null,
        errorMessage: response.message,
        ui: currentState.selectedModuleId === moduleId ? currentState.ui || { ...MODULE_UI_DEFAULTS } : { ...MODULE_UI_DEFAULTS },
      });
    }
  } catch (error) {
    if (MODULE_REQUEST_TOKENS.get(sector.id) !== requestToken) {
      return;
    }

    setModuleState(sector.id, {
      selectedModuleId: moduleId,
      status: MODULE_STATUS.error,
      moduleData: null,
      errorMessage: error?.message || 'Não foi possível carregar o conteúdo deste módulo.',
      ui: currentState.selectedModuleId === moduleId ? currentState.ui || { ...MODULE_UI_DEFAULTS } : { ...MODULE_UI_DEFAULTS },
    });
  }

  renderModuleStage(rootElement, sector);
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

function clearSelectedModule(rootElement, sector, authenticatedUser = null) {
  resetModuleSelectionForSector(sector.id);

  mountView(rootElement, {
    selectedItem: sector,
    isWelcome: false,
    shouldRenderCards: true,
    authenticatedUser: null,
  });
}

function renderModuleStage(rootElement, sector) {
  const cards = rootElement.querySelectorAll('[data-module-card]');
  const stageElement = rootElement.querySelector('[data-module-stage]');
  const stageState = getModuleState(sector.id);

  cards.forEach((cardElement) => {
    const isSelected = cardElement.dataset.moduleId === stageState.selectedModuleId;
    cardElement.classList.toggle('is-selected', isSelected);
    cardElement.setAttribute('aria-pressed', String(isSelected));
  });

  if (!stageElement) {
    mountView(rootElement, {
      selectedItem: sector,
      isWelcome: false,
      shouldRenderCards: true,
      authenticatedUser: null,
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