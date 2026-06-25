import { resetModuleSelectionForSector } from '../components/content.js';
import { closeVideoModal } from '../components/modules/video-module.js';
import { getModuleState, setModuleAlertsLoading } from '../state/module-state.js';
import { ACCESS_KEYS, SECTOR_IDS } from '../constants/sector.constants.js';
import {
  hasCachedAlerts,
  hasCachedLocks,
  invalidateSectorAlertsFetchTimer,
  isFetchStale,
  prefetchSectorAlerts,
  syncSectorAlertsFromCache,
} from '../services/sector-alerts.service.js';
import {
  findItemById,
  getAccessKeysForUser,
  getNavigationItemsForAccess,
  isHomeItem,
  persistNavigationState,
  sanitizeActiveItemForNavigation,
  shouldStartCommercialExpandedForAccess,
  shouldStartCommercialExpandedForUser,
  shouldStartLogisticsExpandedForAccess,
  shouldStartLogisticsExpandedForUser,
  shouldStartProductionExpandedForAccess,
  shouldStartProductionExpandedForUser,
} from '../services/navigation.service.js';

const EXPANSION_KEY_BY_GROUP = {
  [SECTOR_IDS.commercial]: 'isCommercialExpanded',
  [SECTOR_IDS.production]: 'isProductionExpanded',
  [SECTOR_IDS.logistics]:  'isLogisticsExpanded',
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
      state.isLogisticsExpanded  = false;
    }

    const toggleBtn = sidebarRoot.querySelector('#sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.dataset.collapsed = String(newCollapsed);
      const label = newCollapsed ? 'Expandir sidebar' : 'Recolher sidebar';
      toggleBtn.setAttribute('aria-label', label);
      toggleBtn.setAttribute('title', label);
    }

    syncAppShellState();
    persistNavigationState(state);
    setTimeout(renderApp, 240);
  }

  function handleNavigation(itemId) {
    const previousItemId = state.activeItemId;

    if (previousItemId === itemId && !isHomeItem(itemId)) {
      const moduleState = getModuleState(itemId);
      if (moduleState.selectedModuleId) {
        resetModuleSelectionForSector(itemId);
        syncSectorAlertsFromCache(itemId);
        setModuleAlertsLoading(itemId, true);
        persistAndRender({ shouldRenderContent: true, animateContent: true });

        invalidateSectorAlertsFetchTimer(itemId);
        prefetchSectorAlerts(itemId, state.authenticatedUser)
          .then(() => {
            setModuleAlertsLoading(itemId, false);
            if (state.activeItemId !== itemId) return;
            const ms = getModuleState(itemId);
            if (!ms.selectedModuleId) {
              persistAndRender({ shouldRenderContent: true, animateContent: false });
            }
          })
          .catch(() => {
            setModuleAlertsLoading(itemId, false);
            if (state.activeItemId === itemId) {
              persistAndRender({ shouldRenderContent: true, animateContent: false });
            }
          });
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
      state.isLogisticsExpanded  = false;
      persistAndRender({ shouldRenderContent: previousItemId !== itemId, animateContent: true });
      return;
    }

    const selectedItem = findItemById(itemId, getAccessibleNavigationItems());

    if (selectedItem?.parentId === SECTOR_IDS.production) state.isProductionExpanded = true;
    if (selectedItem?.parentId === SECTOR_IDS.commercial) state.isCommercialExpanded = true;
    if (selectedItem?.parentId === SECTOR_IDS.logistics)  state.isLogisticsExpanded  = true;

    const cached     = hasCachedAlerts(itemId);
    const locksReady = hasCachedLocks(itemId);
    const willFetch  = isFetchStale(itemId);
    const needSpinner = (!cached || !locksReady) && willFetch;

    if (state.authenticatedUser) {
      syncSectorAlertsFromCache(itemId);
    }

    if (needSpinner && state.authenticatedUser) {
      setModuleAlertsLoading(itemId, true);
    }

    persistAndRender({ shouldRenderContent: previousItemId !== itemId, animateContent: true });

    if (itemId !== SECTOR_IDS.home && state.authenticatedUser) {
      const msSnap        = getModuleState(itemId);
      const snapshotBefore = JSON.stringify({ alerts: msSnap.cardAlerts || {}, locks: msSnap.cardLocks || {} });

      prefetchSectorAlerts(itemId, state.authenticatedUser)
        .then(() => {
          setModuleAlertsLoading(itemId, false);
          if (state.activeItemId !== itemId) return;
          const ms = getModuleState(itemId);
          if (ms.selectedModuleId) return;
          const snapshotAfter = JSON.stringify({ alerts: ms.cardAlerts || {}, locks: ms.cardLocks || {} });
          if (snapshotAfter !== snapshotBefore || !cached || !locksReady) {
            persistAndRender({ shouldRenderContent: true, animateContent: false });
          }
        })
        .catch(() => {
          setModuleAlertsLoading(itemId, false);
          if (state.activeItemId === itemId) {
            const ms = getModuleState(itemId);
            if (!ms.selectedModuleId) {
              persistAndRender({ shouldRenderContent: true, animateContent: false });
            }
          }
        });
    }
  }

  function handleGroupToggle(groupId) {
    const expansionKey = EXPANSION_KEY_BY_GROUP[groupId];
    if (!expansionKey) return;

    if (state.isSidebarCollapsed) {
      state.isSidebarCollapsed   = false;
      state.isCommercialExpanded = false;
      state.isProductionExpanded = false;
      state.isLogisticsExpanded  = false;
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
    const navGroup    = sidebarRoot.querySelector(`[data-nav-group="${groupId}"]`);
    const groupButton = sidebarRoot.querySelector(`[data-nav-group-toggle="${groupId}"]`);
    const submenu     = sidebarRoot.querySelector(`#submenu-${groupId}`);

    if (!navGroup || !groupButton || !submenu || !expansionKey) { renderApp(); return; }

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
    state.activeItemId         = sanitizeActiveItemForNavigation(SECTOR_IDS.home, navigationItems);
    state.isProductionExpanded = shouldStartProductionExpandedForAccess(sectorAccess);
    state.isCommercialExpanded = shouldStartCommercialExpandedForAccess(sectorAccess);
    state.isLogisticsExpanded  = shouldStartLogisticsExpandedForAccess(sectorAccess);
    persistNavigationState(state);
  }

  function resetNavigationForUser(user) {
    const navigationItems = getNavigationItemsForAccess(getAccessKeysForUser(user));
    state.activeItemId         = sanitizeActiveItemForNavigation(state.activeItemId, navigationItems);
    state.isProductionExpanded = shouldStartProductionExpandedForUser(user);
    state.isCommercialExpanded = shouldStartCommercialExpandedForUser(user);
    state.isLogisticsExpanded  = shouldStartLogisticsExpandedForUser(user);
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
