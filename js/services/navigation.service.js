import {
  COMMERCIAL_SECTOR_IDS,
  LOGISTICS_SECTOR_IDS,
  NAVIGATION_ITEMS,
  STORAGE_KEYS,
} from '../config/navigation.config.js';
import {
  COMMERCIAL_SECTOR_CARDS,
  DEFAULT_SECTOR_CARDS,
  DHO_SECTOR_CARDS,
  LOV_CLUB_SECTOR_CARDS,
  MOTORISTA_SECTOR_CARDS,
  RETAGUARDA_SECTOR_CARDS,
  VITRINE_SECTOR_CARDS,
} from '../config/sector-cards.config.js';
import { APP_SOURCE_LABEL } from '../constants/module.constants.js';
import { SECTOR_IDS } from '../constants/sector.constants.js';
import { getCardsForUserAccess } from './access.service.js';

export { NAVIGATION_ITEMS, STORAGE_KEYS } from '../config/navigation.config.js';
export {
  COMMERCIAL_SECTOR_CARDS,
  DEFAULT_SECTOR_CARDS,
  DHO_SECTOR_CARDS,
  LOV_CLUB_SECTOR_CARDS,
  MOTORISTA_SECTOR_CARDS,
  RETAGUARDA_SECTOR_CARDS,
  VITRINE_SECTOR_CARDS,
} from '../config/sector-cards.config.js';
export {
  canUserAccessModule,
  getAccessKeysForUser,
  getCardsForUserAccess,
  getNavigationItemsForAccess,
  getNavigationItemsForUser,
  isCommercialChildAccess,
  isLogisticsChildAccess,
  isProductionChildAccess,
  normalizeSectorAccessKey,
  normalizeSectorAccessKeys,
  shouldStartCommercialExpandedForAccess,
  shouldStartCommercialExpandedForUser,
  shouldStartLogisticsExpandedForAccess,
  shouldStartLogisticsExpandedForUser,
  shouldStartProductionExpandedForAccess,
  shouldStartProductionExpandedForUser,
} from './access.service.js';

export function sanitizeActiveItemForNavigation(itemId, navigationItems) {
  if (!itemId || isGroupItem(itemId) || !findItemById(itemId, navigationItems)) {
    return SECTOR_IDS.home;
  }
  return itemId;
}

export function getCardsForSector(itemId, authenticatedUser = null) {
  let cards = DEFAULT_SECTOR_CARDS;

  if (isDhoSector(itemId)) {
    cards = DHO_SECTOR_CARDS;
  } else if (itemId === SECTOR_IDS.backoffice) {
    cards = RETAGUARDA_SECTOR_CARDS;
  } else if (itemId === SECTOR_IDS.vitrine) {
    cards = VITRINE_SECTOR_CARDS;
  } else if (itemId === SECTOR_IDS.lovclub) {
    cards = LOV_CLUB_SECTOR_CARDS;
  } else if (itemId === SECTOR_IDS.motorista) {
    cards = MOTORISTA_SECTOR_CARDS;
  } else if (COMMERCIAL_SECTOR_IDS.has(itemId)) {
    cards = COMMERCIAL_SECTOR_CARDS;
  }
  // 'estoque' and all other sectors fall through to DEFAULT_SECTOR_CARDS

  return getCardsForUserAccess(cards, authenticatedUser);
}

export function getInitialNavigationState() {
  const storedActiveItem = getStoredValue(STORAGE_KEYS.activeItem, SECTOR_IDS.home);
  const activeItemId = sanitizeActiveItem(storedActiveItem);
  return {
    activeItemId,
    isSidebarCollapsed:   getStoredBoolean(STORAGE_KEYS.sidebarCollapsed,   false),
    isProductionExpanded: getStoredBoolean(STORAGE_KEYS.productionExpanded,  false),
    isCommercialExpanded: getStoredBoolean(STORAGE_KEYS.commercialExpanded,  false),
    isLogisticsExpanded:  getStoredBoolean(STORAGE_KEYS.logisticsExpanded,   false),
  };
}

export function persistNavigationState(state) {
  localStorage.setItem(STORAGE_KEYS.activeItem,         state.activeItemId);
  localStorage.setItem(STORAGE_KEYS.sidebarCollapsed,   String(state.isSidebarCollapsed));
  localStorage.setItem(STORAGE_KEYS.productionExpanded,  String(state.isProductionExpanded));
  localStorage.setItem(STORAGE_KEYS.commercialExpanded,  String(state.isCommercialExpanded));
  localStorage.setItem(STORAGE_KEYS.logisticsExpanded,   String(state.isLogisticsExpanded ?? false));
}

export function findItemById(itemId, items = NAVIGATION_ITEMS) {
  for (const item of items) {
    if (item.id === itemId) return item;
    if (item.children?.length) {
      const foundChild = item.children.find((child) => child.id === itemId);
      if (foundChild) return { ...foundChild, parentId: item.id, parentLabel: item.label };
    }
  }
  return null;
}

export function isHomeItem(itemId) { return itemId === SECTOR_IDS.home; }

export function isGroupItem(itemId) {
  return itemId === SECTOR_IDS.production
    || itemId === SECTOR_IDS.commercial
    || itemId === SECTOR_IDS.logistics;
}

export function isDhoSector(itemId) { return itemId === SECTOR_IDS.dho; }

export function shouldRenderDefaultSectorCards(itemId, items = NAVIGATION_ITEMS) {
  if (!itemId || isHomeItem(itemId) || isGroupItem(itemId)) return false;
  return Boolean(findItemById(itemId, items));
}

export function getSectorBreadcrumb(item) {
  if (!item) return APP_SOURCE_LABEL;
  if (item.parentLabel) return `${item.parentLabel} > ${item.label}`;
  return item.label;
}

function sanitizeActiveItem(itemId) {
  if (!itemId || isGroupItem(itemId) || !findItemById(itemId)) return SECTOR_IDS.home;
  return itemId;
}

function getStoredValue(key, fallbackValue) {
  try { return localStorage.getItem(key) ?? fallbackValue; } catch { return fallbackValue; }
}

function getStoredBoolean(key, fallbackValue) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallbackValue;
    return value === 'true';
  } catch { return fallbackValue; }
}
