import {
  BRIDGE_MESSAGE_TYPES,
  BRIDGE_REQUEST_TIMEOUTS,
} from '../config/app.config.js';
import { requestAppsScriptBridge } from './gas-bridge.service.js';

export function searchManagedUsers(query) {
  return requestAdminUsersViaBridge('search-users', { query });
}

export function createManagedUser(payload) {
  return requestAdminUsersViaBridge('create-user', normalizeUserPayload(payload));
}

export function updateManagedUser(payload) {
  return requestAdminUsersViaBridge('update-user', normalizeUserPayload(payload));
}

export function resetManagedUserPassword(id) {
  return requestAdminUsersViaBridge('reset-user-password', { id });
}

export function diagnoseManagedUsersStorage() {
  return requestAdminUsersViaBridge('users-diagnostics');
}

function normalizeUserPayload(payload = {}) {
  return {
    originalId: String(payload.originalId || '').trim(),
    id: String(payload.id || '').trim(),
    nome: String(payload.nome || '').trim(),
    setores: JSON.stringify(Array.isArray(payload.setores) ? payload.setores : []),
  };
}

function requestAdminUsersViaBridge(action, payload = {}) {
  return requestAppsScriptBridge({
    action,
    fields: payload,
    messageType: BRIDGE_MESSAGE_TYPES.users,
    requestIdPrefix: 'admin-users',
    iframeNamePrefix: 'build-connect-admin-users-iframe',
    timeoutMs: BRIDGE_REQUEST_TIMEOUTS.adminUsers,
    timeoutMessage: 'A operação de usuários demorou mais que o esperado.',
    bridgeLoadErrorMessage: 'Não foi possível carregar a bridge de gerenciamento de usuários.',
    webAppUrlErrorMessage: 'URL do Web App não configurada para gerenciar usuários.',
  }).then((response) => normalizeAdminUsersResponse(response));
}

function normalizeAdminUsersResponse(response) {
  const target = normalizeStorageTarget(response?.target);
  const message = appendStorageTargetToMessage(
    response?.message || (response?.success ? 'Operação concluída com sucesso.' : 'Não foi possível concluir a operação de usuários.'),
    target,
    response?.success,
  );

  if (response?.success) {
    return {
      success: true,
      code: response.code || 'ADMIN_USERS_OK',
      message,
      users: Array.isArray(response.users) ? response.users : [],
      user: response.user || null,
      generatedPassword: String(response.generatedPassword || ''),
      target,
    };
  }

  return {
    success: false,
    code: response?.code || 'ADMIN_USERS_ERROR',
    message,
    users: [],
    user: null,
    generatedPassword: '',
    target,
  };
}

function normalizeStorageTarget(target) {
  if (!target || typeof target !== 'object') {
    return null;
  }

  return {
    spreadsheetId: String(target.spreadsheetId || ''),
    spreadsheetName: String(target.spreadsheetName || ''),
    spreadsheetUrl: String(target.spreadsheetUrl || ''),
    sheetName: String(target.sheetName || ''),
    rowNumber: Number(target.rowNumber || 0),
    logicalLastRow: Number(target.logicalLastRow || 0),
    physicalLastRow: Number(target.physicalLastRow || 0),
  };
}

function appendStorageTargetToMessage(message, target, success) {
  const baseMessage = String(message || '').trim();

  if (!success || !target?.sheetName || !target?.rowNumber) {
    return baseMessage;
  }

  return `${baseMessage} Aba ${target.sheetName}, linha ${target.rowNumber}.`;
}

