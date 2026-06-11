import { requestApi } from './api.service.js';

let activeUsersCache = null;
let _inFlight = null;

export function clearActiveUsersCache() {
  activeUsersCache = null;
}

export async function loadActiveUsers({ forceRefresh = false } = {}) {
  if (!forceRefresh && Array.isArray(activeUsersCache)) {
    return { success: true, code: 'USERS_CACHE_OK', users: activeUsersCache };
  }

  // Se já há uma requisição em andamento, aguarda o mesmo Promise
  if (_inFlight) {
    return _inFlight;
  }

  _inFlight = requestApi('list-active-users')
    .catch(() => null)
    .then((response) => {
      _inFlight = null;
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
    });

  return _inFlight;
}
