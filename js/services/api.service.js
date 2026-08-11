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

  // Um 401 aqui significa sessão expirada num contexto autenticado: limpa e recarrega.
  if (response.status === 401) {
    clearSessionToken();
    window.location.reload();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!response.ok) throw new Error(`Erro HTTP ${response.status} ao comunicar com o servidor.`);

  return response.json();
}

/**
 * Chamada a ações PÚBLICAS (pré-autenticação), como o feedback anônimo na tela
 * de login. Diferenças críticas em relação a requestApi:
 *  - NUNCA envia o X-Session-Token (a ação é pública e deve ser anônima);
 *  - NUNCA dispara clearSessionToken()/reload em caso de 401 — na tela de login
 *    esse reload derrubava o modal e fazia o botão "não funcionar".
 * Um 401 aqui só ocorreria por má configuração do gateway (verify_jwt); é
 * propagado como erro comum, sem efeitos colaterais de navegação.
 */
export async function publicRequestApi(action, fields = {}) {
  if (!SUPABASE_EDGE_FUNCTION_URL) throw new Error('URL da Edge Function não configurada.');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  };

  const response = await fetch(SUPABASE_EDGE_FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...fields }),
  });

  if (!response.ok) {
    // Tenta extrair a mensagem do corpo JSON antes de falhar.
    let serverMessage = '';
    try { serverMessage = (await response.json())?.message || ''; } catch { /* corpo não-JSON */ }
    throw new Error(serverMessage || `Erro HTTP ${response.status} ao comunicar com o servidor.`);
  }

  return response.json();
}
