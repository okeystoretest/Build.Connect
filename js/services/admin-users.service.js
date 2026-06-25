import { requestApi } from './api.service.js';

export function searchManagedUsers(query) {
  return requestAdminApi('search-users', { query });
}

export function createManagedUser(payload) {
  return requestAdminApi('create-user', normalizeUserPayload(payload));
}

export function updateManagedUser(payload) {
  return requestAdminApi('update-user', normalizeUserPayload(payload));
}

export function resetManagedUserPassword(id) {
  return requestAdminApi('reset-user-password', { id });
}

export function fetchNextUserId() {
  return requestAdminApi('generate-next-user-id', {});
}

function normalizeUserPayload(payload = {}) {
  return {
    originalId: String(payload.originalId || '').trim(),
    id: String(payload.id || '').trim(),
    nome: String(payload.nome || '').trim(),
    nivel: normalizeNivelForBackend(payload.nivel),
    senha: String(payload.senha || ''),
    setores: Array.isArray(payload.setores) ? payload.setores : [],
  };
}

function normalizeNivelForBackend(nivel) {
  const map = { admin: 'Admin', gestor: 'Gestor', colaborador: 'Colaborador', user: 'Colaborador' };
  return map[String(nivel || '').trim().toLowerCase()] || 'Colaborador';
}

async function requestAdminApi(action, payload = {}) {
  const response = await requestApi(action, payload).catch((error) => ({
    success: false,
    code: 'NETWORK_ERROR',
    message: error?.message || 'Falha ao comunicar com o servidor.',
  }));

  if (response?.success) {
    return {
      success: true,
      code: response.code || 'ADMIN_USERS_OK',
      message: response.message || 'Operação concluída com sucesso.',
      users: Array.isArray(response.users) ? response.users : [],
      user: response.user || null,
      generatedPassword: String(response.generatedPassword || ''),
      nextId: String(response.nextId || ''),
    };
  }

  return {
    success: false,
    code: response?.code || 'ADMIN_USERS_ERROR',
    message: response?.message || 'Não foi possível concluir a operação.',
    users: [],
    user: null,
    generatedPassword: '',
    nextId: '',
  };
}

export function deleteManagedUser(userId) {
  return requestApi('delete-user', { userId: String(userId || '') });
}
