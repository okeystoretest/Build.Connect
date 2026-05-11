import { MODULE_IDS } from '../constants/module.constants.js';
import { ACCESS_KEYS, SECTOR_IDS, USER_LEVELS } from '../constants/sector.constants.js';
import {
  COMMERCIAL_CHILD_IDS,
  NAVIGATION_ITEMS,
  PRODUCTION_CHILD_IDS,
} from '../config/navigation.config.js';

export function normalizeSectorAccessKey(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function normalizeUserLevel(value) {
  const normalized = normalizeSectorAccessKey(value);
  if (normalized === 'user') return USER_LEVELS.colaborador;
  return normalized;
}

export function isAdminUser(user) {
  return normalizeUserLevel(user?.nivel) === USER_LEVELS.admin;
}

export function isManagerUser(user) {
  return normalizeUserLevel(user?.nivel) === USER_LEVELS.gestor;
}

export function isCollaboratorUser(user) {
  return normalizeUserLevel(user?.nivel) === USER_LEVELS.colaborador;
}

export function normalizeSectorAccessKeys(value) {
  const values = Array.isArray(value)
    ? value
    : String(value || '')
      .split(/[,;|]+/)
      .map((item) => item.trim());

  const normalizedKeys = values
    .map(normalizeSectorAccessKey)
    .filter(Boolean)
    .map((key) => (key === ACCESS_KEYS.todos ? ACCESS_KEYS.all : key));

  if (!normalizedKeys.length) {
    return [ACCESS_KEYS.all];
  }

  if (normalizedKeys.includes(ACCESS_KEYS.all)) {
    return [ACCESS_KEYS.all];
  }

  return [...new Set(normalizedKeys)];
}

export function normalizeUserSectorAccessKeys(user) {
  const rawAccess = Array.isArray(user?.setorList) && user.setorList.length ? user.setorList : user?.setor;
  const accessKeys = normalizeSectorAccessKeys(rawAccess).filter((accessKey) => accessKey !== ACCESS_KEYS.all && accessKey !== ACCESS_KEYS.todos);

  return [...new Set(accessKeys)];
}

export function getAccessKeysForUser(user) {
  if (isAdminUser(user)) {
    return [ACCESS_KEYS.all];
  }

  return normalizeUserSectorAccessKeys(user);
}

export function isProductionChildAccess(accessKey) {
  return PRODUCTION_CHILD_IDS.includes(accessKey);
}

export function isCommercialChildAccess(accessKey) {
  return COMMERCIAL_CHILD_IDS.includes(accessKey);
}

export function getNavigationItemsForUser(user) {
  return getNavigationItemsForAccess(getAccessKeysForUser(user));
}

export function getNavigationItemsForAccess(sectorAccess) {
  const accessKeys = normalizeSectorAccessKeys(sectorAccess);
  const homeItem = NAVIGATION_ITEMS.find((item) => item.id === SECTOR_IDS.home);

  if (accessKeys.includes(ACCESS_KEYS.all)) {
    return NAVIGATION_ITEMS;
  }

  const baseItems = homeItem ? [homeItem] : [];
  const accessSet = new Set(accessKeys);

  NAVIGATION_ITEMS.forEach((item) => {
    if (item.id === SECTOR_IDS.home) {
      return;
    }

    if (item.id === SECTOR_IDS.commercial) {
      const allowFullCommercial = accessSet.has(SECTOR_IDS.commercial);
      const allowedChildren = allowFullCommercial
        ? item.children || []
        : (item.children || []).filter((child) => accessSet.has(child.id));

      if (allowFullCommercial || allowedChildren.length) {
        baseItems.push({
          ...item,
          children: allowedChildren,
        });
      }

      return;
    }

    if (item.id === SECTOR_IDS.production) {
      const allowFullProduction = accessSet.has(SECTOR_IDS.production);
      const allowedChildren = allowFullProduction
        ? item.children || []
        : (item.children || []).filter((child) => accessSet.has(child.id));

      if (allowFullProduction || allowedChildren.length) {
        baseItems.push({
          ...item,
          children: allowedChildren,
        });
      }

      return;
    }

    if (accessSet.has(item.id)) {
      baseItems.push(item);
    }
  });

  return baseItems;
}

export function getCardsForUserAccess(cards, user) {
  if (!isCollaboratorUser(user)) {
    return cards;
  }

  return cards.filter((card) => card.id !== MODULE_IDS.evaluation);
}

export function canUserAccessModule(user, moduleId) {
  if (isCollaboratorUser(user) && moduleId === MODULE_IDS.evaluation) {
    return false;
  }

  return true;
}

export function shouldStartProductionExpandedForAccess(sectorAccess) {
  return normalizeSectorAccessKeys(sectorAccess).some((accessKey) => accessKey === SECTOR_IDS.production || isProductionChildAccess(accessKey));
}

export function shouldStartCommercialExpandedForAccess(sectorAccess) {
  return normalizeSectorAccessKeys(sectorAccess).some((accessKey) => accessKey === SECTOR_IDS.commercial || isCommercialChildAccess(accessKey));
}

export function shouldStartProductionExpandedForUser(_user) {
  return false;
}

export function shouldStartCommercialExpandedForUser(_user) {
  return false;
}
