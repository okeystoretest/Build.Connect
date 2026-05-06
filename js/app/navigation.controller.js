import { resetModuleSelectionForSector } from '../components/content.js';
import { ACCESS_KEYS, SECTOR_IDS } from '../constants/sector.constants.js';
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
    state.isSidebarCollapsed = !state.isSidebarCollapsed;

    if (state.isSidebarCollapsed) {
      state.isProductionExpanded = false;
      state.isCommercialExpanded = false;
    }

    persistAndRender({ shouldRenderContent: false });
  }

  function handleNavigation(itemId) {
    const previousItemId = state.activeItemId;

    if (previousItemId && previousItemId !== itemId && !isHomeItem(previousItemId)) {
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

    persistAndRender({ shouldRenderContent: previousItemId !== itemId, animateContent: true });
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
