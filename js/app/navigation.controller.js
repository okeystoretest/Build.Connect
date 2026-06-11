import { resetModuleSelectionForSector } from '../components/content.js';
import { closeVideoModal } from '../components/modules/video-module.js';
import { getModuleState } from '../state/module-state.js';
import { ACCESS_KEYS, SECTOR_IDS } from '../constants/sector.constants.js';
import { prefetchSectorAlerts, syncSectorAlertsFromCache } from '../services/sector-alerts.service.js';
import {
  findItemById,
  getAccessKeysForUser,
  getNavigationItemsForAccess,
  isHomeItem,
  persistNavigationState,
  sanitizeActiveItemForNavigation,
  shouldStartCommercialExpandedForAccess,
  shouldStartCommercialExpandedForUser,
  shouldStartProductionExpandedForAccess,
  shouldStartProductionExpandedForUser,
} from '../services/navigation.service.js';

const EXPANSION_KEY_BY_GROUP = {
  [SECTOR_IDS.commercial]: 'isCommercialExpanded',
  [SECTOR_IDS.production]: 'isProductionExpanded',
};

export function createNavigationController({
  state,
  sidebarRoot,
  getAccessibleNavigationItems,
  persistAndRender,
  syncAppShellState,
  renderApp,
}) {
  function handleSidebarToggle() {
    const newCollapsed = !state.isSidebarCollapsed;
    state.isSidebarCollapsed = newCollapsed;

    if (newCollapsed) {
      state.isProductionExpanded = false;
      state.isCommercialExpanded = false;
    }

    // Animate the existing toggle button icon before the sidebar re-renders
    const toggleBtn = sidebarRoot.querySelector('#sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.dataset.collapsed = String(newCollapsed);
      const label = newCollapsed ? 'Expandir sidebar' : 'Recolher sidebar';
      toggleBtn.setAttribute('aria-label', label);
      toggleBtn.setAttribute('title', label);
    }

    // Apply app-shell class immediately so CSS transitions fire on existing elements
    syncAppShellState();
    persistNavigationState(state);

    // Re-render sidebar after animation completes (matches sidebar-panel 240ms transition)
    setTimeout(renderApp, 240);
  }

  function handleNavigation(itemId) {
    const previousItemId = state.activeItemId;

    // Mesmo setor clicado — verifica se há módulo aberto para voltar ao menu do setor
    if (previousItemId === itemId && !isHomeItem(itemId)) {
      const moduleState = getModuleState(itemId);
      if (moduleState.selectedModuleId) {
        resetModuleSelectionForSector(itemId);
        // Re-sync cached alerts into state before re-rendering the cards view
        syncSectorAlertsFromCache(itemId);
        persistAndRender({ shouldRenderContent: true, animateContent: true });
      }
      return;
    }

    if (previousItemId && previousItemId !== itemId && !isHomeItem(previousItemId)) {
      closeVideoModal();
      resetModuleSelectionForSector(previousItemId);
    }

    state.activeItemId = itemId;

    if (itemId === SECTOR_IDS.home) {
      state.isProductionExpanded = false;
      state.isCommercialExpanded = false;
      persistAndRender({ shouldRenderContent: previousItemId !== itemId, animateContent: true });
      return;
    }

    const selectedItem = findItemById(itemId, getAccessibleNavigationItems());

    if (selectedItem?.parentId === SECTOR_IDS.production) {
      state.isProductionExpanded = true;
    }

    if (selectedItem?.parentId === SECTOR_IDS.commercial) {
      state.isCommercialExpanded = true;
    }

    // Hydrate state with cached alerts synchronously so the very first render
    // already has badge data — eliminates the initial flicker on sector selection.
    if (state.authenticatedUser) {
      syncSectorAlertsFromCache(itemId);
    }

    persistAndRender({ shouldRenderContent: previousItemId !== itemId, animateContent: true });

    // Busca alertas em background — restaura cache imediatamente, re-renderiza só se dados mudaram
    if (itemId !== SECTOR_IDS.home && state.authenticatedUser) {
      const snapshotBefore = JSON.stringify(getModuleState(itemId).cardAlerts || {});
      prefetchSectorAlerts(itemId, state.authenticatedUser).then(() => {
        const snapshotAfter = JSON.stringify(getModuleState(itemId).cardAlerts || {});
        if (snapshotAfter !== snapshotBefore && state.activeItemId === itemId) {
          const ms = getModuleState(itemId);
          if (!ms.selectedModuleId) {
            persistAndRender({ shouldRenderContent: true, animateContent: false });
          }
        }
      }).catch(() => {});
    }
  }

  function handleGroupToggle(groupId) {
    const expansionKey = EXPANSION_KEY_BY_GROUP[groupId];

    if (!expansionKey) {
      return;
    }

    if (state.isSidebarCollapsed) {
      state.isSidebarCollapsed = false;
      state.isCommercialExpanded = false;
      state.isProductionExpanded = false;
      persistNavigationState(state);
      syncAppShellState();
      renderApp();

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          state[expansionKey] = true;
          persistNavigationState(state);
          syncGroupAccordionDOM(groupId);
        });
      });
      return;
    }

    state[expansionKey] = !state[expansionKey];
    persistNavigationState(state);
    syncGroupAccordionDOM(groupId);
  }

  function syncGroupAccordionDOM(groupId) {
    const expansionKey = EXPANSION_KEY_BY_GROUP[groupId];
    const navGroup = sidebarRoot.querySelector(`[data-nav-group="${groupId}"]`);
    const groupButton = sidebarRoot.querySelector(`[data-nav-group-toggle="${groupId}"]`);
    const submenu = sidebarRoot.querySelector(`#submenu-${groupId}`);

    if (!navGroup || !groupButton || !submenu || !expansionKey) {
      renderApp();
      return;
    }

    const isExpanded = Boolean(state[expansionKey]);
    navGroup.dataset.expanded = String(isExpanded);
    groupButton.classList.toggle('is-expanded', isExpanded);
    groupButton.setAttribute('aria-expanded', String(isExpanded));
    submenu.setAttribute('aria-hidden', String(!isExpanded));
    submenu.style.setProperty('--submenu-height', `${submenu.scrollHeight}px`);
  }

  function resetNavigationToHome() {
    resetNavigationForAccess(ACCESS_KEYS.all);
  }

  function resetNavigationForAccess(sectorAccess) {
    const navigationItems = getNavigationItemsForAccess(sectorAccess);
    state.activeItemId = sanitizeActiveItemForNavigation(SECTOR_IDS.home, navigationItems);
    state.isProductionExpanded = shouldStartProductionExpandedForAccess(sectorAccess);
    state.isCommercialExpanded = shouldStartCommercialExpandedForAccess(sectorAccess);
    persistNavigationState(state);
  }

  function resetNavigationForUser(user) {
    const navigationItems = getNavigationItemsForAccess(getAccessKeysForUser(user));
    state.activeItemId = sanitizeActiveItemForNavigation(state.activeItemId, navigationItems);
    state.isProductionExpanded = shouldStartProductionExpandedForUser(user);
    state.isCommercialExpanded = shouldStartCommercialExpandedForUser(user);
    persistNavigationState(state);
  }

  return {
    handleSidebarToggle,
    handleNavigation,
    handleGroupToggle,
    resetNavigationToHome,
    resetNavigationForAccess,
    resetNavigationForUser,
    syncGroupAccordionDOM,
  };
}