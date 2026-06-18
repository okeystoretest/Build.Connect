import {
  DEFAULT_SECTOR_CARDS,
  canUserAccessModule,
  getCardsForSector,
  LOV_CLUB_SECTOR_CARDS,
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
  setModuleAlertsLoading,
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
import { flushPendingCelebration } from '../utils/celebration.js';
import { errorBoundary } from '../utils/error.js';
import {
  invalidateSectorAlertsCache,
  invalidateSectorAlertsFetchTimer,
  prefetchSectorAlerts,
  syncSectorAlertsFromCache,
} from '../services/sector-alerts.service.js';

export { resetModuleSelectionForSector } from '../state/module-state.js';

// ── Runtime render context (para listener de progresso em tempo real) ───────
let _currentRootElement = null;
let _currentSector = null;

// Atualiza badges de progresso do card em tempo real após cada conclusão
document.addEventListener('bc:content-completed', async (e) => {
  const { sectorId } = e.detail || {};
  if (!sectorId || !_currentRootElement || !_currentSector) return;
  if (_currentSector.id !== sectorId) return;

  invalidateSectorAlertsCache(sectorId);
  const state = getModuleState(sectorId);
  const user  = state?.authenticatedUser || null;

  // Injeta refId em consumedRefIds do moduleData local (sem nova requisição)
  const refId = e.detail?.refId;
  if (refId && state?.moduleData) {
    const existing = Array.isArray(state.moduleData.consumedRefIds)
      ? state.moduleData.consumedRefIds : [];
    if (!existing.includes(refId)) {
      setModuleState(sectorId, {
        ...state,
        moduleData: { ...state.moduleData, consumedRefIds: [...existing, refId] },
      });
    }
  }

  // Re-fetch alertas do setor em background e re-renderiza cards
  try {
    await prefetchSectorAlerts(sectorId, user);
  } catch (err) { errorBoundary(err, 'content:bc:content-completed'); }
  renderModuleStage(_currentRootElement, _currentSector);
});

const VIEW_EXIT_DURATION_MS = 180;
const MODULE_CARD_IDS = new Set([
  ...DEFAULT_SECTOR_CARDS,
  ...getCardsForSector('dho'),
  ...VITRINE_SECTOR_CARDS,
  ...LOV_CLUB_SECTOR_CARDS,
].map((card) => card.id));
MODULE_CARD_IDS.add(MODULE_IDS.tiRequest);
MODULE_CARD_IDS.add(MODULE_IDS.motorRequests);
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

/**
 * ANTI-BYPASS: Retorno ao menu de setor com varredura de segurança obrigatória.
 *
 * Fluxo:
 *  1. Reseta seleção de módulo preservando cardLocks (fix root-cause bug em _set).
 *  2. Restaura estado completo (alerts + locks) do cache sessionStorage.
 *  3. Ativa loading screen — cards ficam inacessíveis e não clicáveis durante o scan.
 *  4. Invalida timer de fetch → força nova consulta ao servidor.
 *  5. Aguarda resposta assíncrona — re-computa Navi locks com dados frescos.
 *  6. Remove loading e re-renderiza com estado validado pelo servidor.
 *  7. Verifica token de render — cancela se usuário navegou para outro setor.
 */
async function clearSelectedModule(rootElement, sector, authenticatedUser = null) {
  // Guarda token para cancelar render se o usuário navegar durante o scan.
  const scanToken = ++currentRenderToken;

  // Reset + restaura estado completo do cache (inclui cardLocks Navi).
  resetModuleSelectionForSector(sector.id);
  syncSectorAlertsFromCache(sector.id);

  // Loading screen: bloqueia interação com cards durante a varredura.
  setModuleAlertsLoading(sector.id, true);
  mountView(rootElement, {
    selectedItem: sector,
    isWelcome: false,
    shouldRenderCards: true,
    authenticatedUser,
  });

  try {
    // Força nova consulta ao servidor (timer invalidado; cache sessionStorage preservado).
    invalidateSectorAlertsFetchTimer(sector.id);
    await prefetchSectorAlerts(sector.id, authenticatedUser);
  } catch (err) { errorBoundary(err, 'content:clearSelectedModule:prefetch'); } finally {
    // Cancela render se o usuário navegou para outro setor durante o scan.
    if (scanToken !== currentRenderToken) return;

    setModuleAlertsLoading(sector.id, false);
    flushPendingCelebration(); // Celebração após scan concluído (estado final já validado).
    mountView(rootElement, {
      selectedItem: sector,
      isWelcome: false,
      shouldRenderCards: true,
      authenticatedUser,
    });
  }
}

function renderModuleStage(rootElement, sector) {
  _currentRootElement = rootElement;
  _currentSector = sector;

  const cards = rootElement.querySelectorAll('[data-module-card]');
  const stageElement = rootElement.querySelector('[data-module-stage]');
  const stageState = getModuleState(sector.id);
  const cardAlerts = stageState.cardAlerts || {};
  const cardLocks  = stageState.cardLocks  || {};

  cards.forEach((cardElement) => {
    const moduleId = cardElement.dataset.moduleId;
    // ── Navi lock state DOM patch ──────────────────────────────────────────
    const lockState = cardLocks[moduleId] || null;
    if (lockState?.locked) {
      cardElement.classList.add('is-navi-locked');
      cardElement.dataset.naviLocked = 'true';
      cardElement.dataset.naviLockReason = lockState.reason || '';
    } else {
      cardElement.classList.remove('is-navi-locked');
      delete cardElement.dataset.naviLocked;
      delete cardElement.dataset.naviLockReason;
    }

    const isSelected = moduleId === stageState.selectedModuleId;
    cardElement.classList.toggle('is-selected', isSelected);
    cardElement.setAttribute('aria-pressed', String(isSelected));

    const alert = cardAlerts[moduleId] || null;
    const NEW_PILL_TYPES = ['not-started', 'in-progress', 'complete'];
    const isNewPill = alert && NEW_PILL_TYPES.includes(alert.type);

    // ── New pill system (content cards) ───────────────────────────────────
    if (isNewPill) {
      cardElement.querySelector('.feature-card-alert-badge')?.remove();
      cardElement.querySelector('.feature-card-attention')?.remove();
      cardElement.classList.remove('has-alert');
      cardElement.classList.remove('is-status-not-started', 'is-status-in-progress', 'is-status-complete');
      cardElement.classList.add(`is-status-${alert.type}`);

      const footer = cardElement.querySelector('.feature-card-footer');
      if (footer) {
        const existing = footer.querySelector('.fc-status-pill');
        const icon  = alert.type === 'complete'    ? 'check-circle-2'
                    : alert.type === 'in-progress' ? 'loader' : 'circle-dashed';
        const label = alert.type === 'complete'    ? 'Concluído'
                    : alert.type === 'in-progress' ? 'Em andamento' : 'Não iniciado';
        const pillHtml = `<span class="fc-status-pill fc-status-pill--${alert.type}" aria-label="${label}"><i data-lucide="${icon}"></i><span>${label}</span></span>`;
        if (existing) {
          existing.outerHTML = pillHtml;
        } else {
          footer.insertAdjacentHTML('afterbegin', pillHtml);
        }
        refreshLucideIcons(footer);
      }
      return;
    }

    // ── Legacy badge system (eval/quality pending alerts) ─────────────────
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
      cardElement.classList.remove('has-alert', 'is-status-not-started', 'is-status-in-progress', 'is-status-complete');
      badge?.remove();
      attn?.remove();
    }
  });

  if (!stageElement) {
    // Recupera authenticatedUser do estado persistido pelo _set em content-module-selection.js.
    // Isso garante que getCardsForUserAccess filtre Avaliações para Colaboradores mesmo
    // quando o mountView é acionado fora do fluxo normal de renderização.
    const storedUser = stageState.authenticatedUser || stageState.moduleData?.respondent || null;
    mountView(rootElement, {
      selectedItem: sector,
      isWelcome: false,
      shouldRenderCards: true,
      authenticatedUser: storedUser,
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