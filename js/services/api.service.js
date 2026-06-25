import { SUPABASE_EDGE_FUNCTION_URL, SUPABASE_PUBLISHABLE_KEY } from '../config/app.config.js';

const SESSION_TOKEN_KEY = 'build.connect.session-token';

export function getSessionToken() {
  try { return sessionStorage.getItem(SESSION_TOKEN_KEY) || ''; } catch { return ''; }
}

export function saveSessionToken(token) {
  try { sessionStorage.setItem(SESSION_TOKEN_KEY, token); } catch {}
}

export function clearSessionToken() {
  try { sessionStorage.removeItem(SESSION_TOKEN_KEY); } catch {}
}

export async function requestApi(action, fields = {}) {
  if (!SUPABASE_EDGE_FUNCTION_URL) throw new Error('URL da Edge Function não configurada.');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  };

  const token = getSessionToken();
  if (token) headers['X-Session-Token'] = token;

  const response = await fetch(SUPABASE_EDGE_FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...fields }),
  });

  if (response.status === 401) {
    clearSessionToken();
    window.location.reload();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!response.ok) throw new Error(`Erro HTTP ${response.status} ao comunicar com o servidor.`);

  return response.json();
}
