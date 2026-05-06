import {
  BRIDGE_MESSAGE_TYPES,
  BRIDGE_REQUEST_TIMEOUTS,
} from '../config/app.config.js';
import { requestAppsScriptBridge } from './gas-bridge.service.js';

let activeUsersCache = null;

export function clearActiveUsersCache() {
  activeUsersCache = null;
}

export async function loadActiveUsers({ forceRefresh = false } = {}) {
  if (!forceRefresh && Array.isArray(activeUsersCache)) {
    return {
      success: true,
      code: 'USERS_CACHE_OK',
      users: activeUsersCache,
    };
  }

  const response = await requestUsersViaBridge();

  if (response?.success) {
    activeUsersCache = Array.isArray(response.users) ? response.users : [];
    return {
      success: true,
      code: response.code || 'USERS_LIST_OK',
      users: activeUsersCache,
      message: response.message || '',
    };
  }

  return {
    success: false,
    code: response?.code || 'USERS_LIST_ERROR',
    users: [],
    message: response?.message || 'Não foi possível carregar os usuários ativos.',
  };
}

function requestUsersViaBridge() {
  return requestAppsScriptBridge({
    action: 'list-active-users',
    messageType: BRIDGE_MESSAGE_TYPES.users,
    requestIdPrefix: 'users',
    iframeNamePrefix: 'build-connect-users-iframe',
    timeoutMs: BRIDGE_REQUEST_TIMEOUTS.users,
    timeoutMessage: 'A busca pelos usuários ativos demorou mais que o esperado.',
    bridgeLoadErrorMessage: 'Não foi possível carregar a bridge de usuários ativos.',
    webAppUrlErrorMessage: 'URL do Web App não configurada para carregar usuários ativos.',
  });
}
