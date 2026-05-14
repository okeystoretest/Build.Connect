import { requestApi } from './api.service.js';

let activeUsersCache = null;

export function clearActiveUsersCache() {
  activeUsersCache = null;
}

export async function loadActiveUsers({ forceRefresh = false } = {}) {
  if (!forceRefresh && Array.isArray(activeUsersCache)) {
    return { success: true, code: 'USERS_CACHE_OK', users: activeUsersCache };
  }

  const response = await requestApi('list-active-users').catch(() => null);

  if (response?.success) {
    activeUsersCache = Array.isArray(response.users) ? response.users : [];
    return { success: true, code: response.code || 'USERS_LIST_OK', users: activeUsersCache, message: response.message || '' };
  }

  return {
    success: false,
    code: response?.code || 'USERS_LIST_ERROR',
    users: [],
    message: response?.message || 'Não foi possível carregar os usuários ativos.',
  };
}
