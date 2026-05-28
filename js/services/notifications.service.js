import { requestApi } from './api.service.js';

// ── Estado em memória ──────────────────────────────────────────────────────

let _notifications  = [];
let _unreadCount    = 0;
let _pollingTimer   = null;
let _fetchInFlight  = false;

const POLL_INTERVAL_MS = 15_000; // 15 segundos — tempo real
const VISIBILITY_DEBOUNCE_MS = 3_000;

// ── Getters ────────────────────────────────────────────────────────────────

export function getNotifications() {
  return _notifications;
}

export function getUnreadCount() {
  return _unreadCount;
}

// ── Fetch & polling ────────────────────────────────────────────────────────

export async function fetchNotifications() {
  if (_fetchInFlight) return;
  _fetchInFlight = true;
  try {
    const response = await requestApi('buscar-notificacoes');
    if (response?.success) {
      _notifications = Array.isArray(response.notificacoes) ? response.notificacoes : [];
      _unreadCount   = response.totalNaoLidas ?? 0;
      _syncBadge();
    }
  } catch {
    // Silencioso — notificações não devem interromper o app
  } finally {
    _fetchInFlight = false;
  }
}

export function startPolling() {
  // Limpa polling anterior se existir (guarda contra chamadas duplicadas)
  if (_pollingTimer) {
    clearInterval(_pollingTimer);
    _pollingTimer = null;
  }

  // Busca imediata ao autenticar
  fetchNotifications();

  // Intervalo regular
  _pollingTimer = setInterval(fetchNotifications, POLL_INTERVAL_MS);

  // Volta a buscar quando o usuário retorna à aba
  document.removeEventListener('visibilitychange', _onVisibilityChange);
  document.addEventListener('visibilitychange', _onVisibilityChange);
}

export function stopPolling() {
  if (_pollingTimer) {
    clearInterval(_pollingTimer);
    _pollingTimer = null;
  }
  document.removeEventListener('visibilitychange', _onVisibilityChange);

  // Limpa o estado ao fazer logout
  _notifications = [];
  _unreadCount   = 0;
  _syncBadge();
}

// ── Ações ──────────────────────────────────────────────────────────────────

export async function markNotificationRead(id) {
  // Atualização otimista — reflete na UI antes da resposta do servidor
  _notifications = _notifications.map(n => n.id === id ? { ...n, lida: true } : n);
  _unreadCount   = _notifications.filter(n => !n.lida).length;
  _syncBadge();

  await requestApi('marcar-notificacao-lida', { id }).catch(() => {});
}

export async function markAllRead() {
  _notifications = _notifications.map(n => ({ ...n, lida: true }));
  _unreadCount   = 0;
  _syncBadge();

  await requestApi('marcar-todas-notificacoes-lidas').catch(() => {});
}

/**
 * Envia uma notificação de novo conteúdo para todos os usuários de um setor.
 * @param {{ sectorId: string, titulo: string, mensagem: string }} payload
 */
export async function sendSectorNotification({ sectorId, titulo, mensagem }) {
  return requestApi('criar-notificacao-setor', { sectorId, titulo, mensagem });
}

// ── Badge DOM sync ─────────────────────────────────────────────────────────

function _syncBadge() {
  const badge = document.getElementById('notifications-badge');
  if (!badge) return;
  if (_unreadCount > 0) {
    badge.textContent = _unreadCount > 99 ? '99+' : String(_unreadCount);
    badge.removeAttribute('hidden');
  } else {
    badge.setAttribute('hidden', '');
  }
}

let _visibilityDebounce = null;

function _onVisibilityChange() {
  if (document.visibilityState !== 'visible') return;
  clearTimeout(_visibilityDebounce);
  _visibilityDebounce = setTimeout(fetchNotifications, VISIBILITY_DEBOUNCE_MS);
}
