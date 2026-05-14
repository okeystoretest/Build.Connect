import { AUTH_STORAGE_KEY } from '../config/app.config.js';
import { clearSessionToken, requestApi, saveSessionToken } from './api.service.js';

export function loginUser(id, password) {
  const normalizedId = String(id ?? '').trim();
  const normalizedPassword = String(password ?? '');

  if (!normalizedId || !normalizedPassword) {
    return Promise.resolve({ success: false, code: 'INVALID_INPUT', message: 'Informe o ID e a senha para continuar.' });
  }

  return requestApi('login', { id: normalizedId, password: normalizedPassword })
    .then(normalizeAuthResponse)
    .catch((error) => ({ success: false, code: 'NETWORK_ERROR', message: error?.message || 'Falha ao comunicar com o servidor.' }));
}

export async function logoutUser() {
  try { await requestApi('logout'); } catch { /* ignora erros de rede no logout */ }
  clearSessionToken();
  clearAuthenticatedUser();
}

export function getAuthenticatedUser() {
  try {
    const storedValue = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!storedValue) return null;
    const parsedValue = JSON.parse(storedValue);
    if (!parsedValue?.id || !parsedValue?.nome || !parsedValue?.nivel) return null;
    return {
      ...parsedValue,
      setor: typeof parsedValue?.setor === 'string' ? parsedValue.setor : '',
      setorList: Array.isArray(parsedValue?.setorList) ? parsedValue.setorList : [],
      setorLabel: typeof parsedValue?.setorLabel === 'string' ? parsedValue.setorLabel : '',
    };
  } catch { return null; }
}

export function persistAuthenticatedUser(user) {
  try { sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user)); } catch {}
}

export function clearAuthenticatedUser() {
  try { sessionStorage.removeItem(AUTH_STORAGE_KEY); } catch {}
}

function normalizeAuthResponse(response) {
  if (response?.success) {
    if (response.sessionToken) saveSessionToken(response.sessionToken);
    return {
      success: true,
      code: response.code || 'AUTH_OK',
      message: response.message || 'Acesso liberado.',
      user: {
        ...response.user,
        setor: typeof response.user?.setor === 'string' ? response.user.setor : '',
        setorList: Array.isArray(response.user?.setorList) ? response.user.setorList : [],
        setorLabel: typeof response.user?.setorLabel === 'string' ? response.user.setorLabel : '',
      },
    };
  }
  return { success: false, code: response?.code || 'AUTH_FAILED', message: response?.message || getFallbackMessage(response?.code) };
}

function getFallbackMessage(code) {
  switch (code) {
    case 'USER_INACTIVE':      return 'Usuário inativo. Procure um administrador.';
    case 'INVALID_PASSWORD':   return 'Senha incorreta.';
    case 'ID_NOT_FOUND':       return 'ID não encontrado.';
    case 'INVALID_SECTOR':     return 'Setor de acesso inválido.';
    case 'TOO_MANY_ATTEMPTS':  return 'Muitas tentativas. Aguarde 15 minutos e tente novamente.';
    default:                   return 'Não foi possível concluir o login.';
  }
}
