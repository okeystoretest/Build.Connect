import { refreshLucideIcons } from '../../services/icons.service.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { animateOut } from '../../utils/motion.js';
import { getNotifications, markNotificationRead, markAllRead } from '../../services/notifications.service.js';
import { getAuthenticatedUser } from '../../services/auth.service.js';

let _activePanel   = null;
let _escHandler    = null;

// ── Ícone e cor por tipo ──────────────────────────────────────────────────

const TIPO_CONFIG = {
  chamado_status:    { icon: 'headset',        color: '#3B82F6', label: 'Chamado TI'  },
  avaliacao_pendente:{ icon: 'clipboard-check', color: '#F59E0B', label: 'Avaliação'   },
  novo_conteudo:     { icon: 'bell-ring',       color: '#10B981', label: 'Novo conteúdo'},
};

// ── Helpers ───────────────────────────────────────────────────────────────

function _isRetaguardaUser() {
  const user = getAuthenticatedUser();
  if (!user?.setor) return false;
  const setor = user.setor.toLowerCase();
  return setor === 'all' || setor.split(/,\s*/).some(s => s === 'retaguarda');
}

function _getUnreadNotifications() {
  return getNotifications().filter(n => !n.lida);
}

// ── Abertura ──────────────────────────────────────────────────────────────

export function openNotificationsPanel() {
  closeNotificationsPanel();

  const notifications = _getUnreadNotifications();

  const panel = document.createElement('div');
  panel.id        = 'notifications-panel-root';
  panel.className = 'notif-backdrop';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Notificações');
  panel.innerHTML = _buildPanelMarkup(notifications);

  document.body.appendChild(panel);
  refreshLucideIcons(panel);
  _applyDynamicColors(panel);
  _activePanel = panel;

  // Fecha ao clicar fora do painel
  panel.addEventListener('click', e => {
    if (e.target === panel) closeNotificationsPanel();
  });

  // Fecha com Escape
  _escHandler = e => { if (e.key === 'Escape') closeNotificationsPanel(); };
  document.addEventListener('keydown', _escHandler);

  // Botão fechar
  panel.querySelector('#notif-close-btn')?.addEventListener('click', closeNotificationsPanel);

  // Marcar todas como lidas → limpa a lista
  panel.querySelector('[data-notif-mark-all]')?.addEventListener('click', async () => {
    await markAllRead();
    _rerenderList(panel);
  });

  // Clique em notificação individual
  panel.addEventListener('click', async e => {
    const item = e.target.closest('[data-notif-id]');
    if (!item || item.dataset.notifLida === 'true') return;

    const notifId = item.dataset.notifId;
    const notifTipo = item.dataset.notifTipo || '';

    // Marca como lida
    await markNotificationRead(notifId);

    // Se Retaguarda e tipo chamado_status → navega para Requisições de TI
    if (notifTipo === 'chamado_status' && _isRetaguardaUser()) {
      closeNotificationsPanel();
      document.dispatchEvent(new CustomEvent('bc:navigate', { detail: { itemId: 'retaguarda' } }));
      return;
    }

    // Outros usuários → remove da lista com animação
    animateOut(item, 'is-closing', 200, () => {
      item.remove();
      _refreshUnreadIndicator(panel);
      // Se não sobrou nenhuma, mostra estado vazio
      const remaining = panel.querySelectorAll('[data-notif-id]');
      if (!remaining.length) {
        const list = panel.querySelector('[data-notif-list]');
        if (list) {
          list.innerHTML = _buildEmptyMarkup();
          refreshLucideIcons(list);
        }
      }
    });
  });
}

// ── Fechamento ────────────────────────────────────────────────────────────

export function closeNotificationsPanel() {
  if (!_activePanel) return;
  if (_escHandler) {
    document.removeEventListener('keydown', _escHandler);
    _escHandler = null;
  }
  const target = _activePanel;
  _activePanel = null;
  animateOut(target, 'is-closing', 200, () => target.remove());
}

// ── Atualização interna do painel (sem fechar) ────────────────────────────

function _rerenderList(panel) {
  const list = panel.querySelector('[data-notif-list]');
  if (!list) return;
  const notifications = _getUnreadNotifications();
  list.innerHTML = _buildListMarkup(notifications);
  refreshLucideIcons(list);
  _applyDynamicColors(list);
  _refreshUnreadIndicator(panel);
}

// ── Aplica cores dinâmicas por tipo via DOM (compatível com CSP style-src 'self') ──
function _applyDynamicColors(scope) {
  scope.querySelectorAll('[data-notif-id]').forEach(item => {
    const color = item.dataset.notifColor;
    if (!color) return;
    const icon  = item.querySelector('[data-notif-icon]');
    const badge = item.querySelector('[data-notif-badge]');
    if (icon) {
      icon.style.color      = color;
      icon.style.background = `${color}18`;
    }
    if (badge) {
      badge.style.color      = color;
      badge.style.background = `${color}15`;
    }
  });
}

function _refreshUnreadIndicator(panel) {
  const unread   = _getUnreadNotifications().length;
  const subhead  = panel.querySelector('[data-notif-subhead]');
  const counter  = panel.querySelector('[data-notif-counter]');
  if (subhead) subhead.hidden = unread === 0;
  if (counter) counter.textContent = `${unread} não lida${unread !== 1 ? 's' : ''}`;
}

// ── Markup ────────────────────────────────────────────────────────────────

function _buildPanelMarkup(notifications) {
  const unread = notifications.length;

  return `
    <div class="notif-panel">

      <!-- Linha 1: título + fechar -->
      <div class="notif-panel-head">
        <div class="notif-panel-title">
          <i data-lucide="bell"></i>
          <span>Notificações</span>
        </div>
        <button type="button" class="notif-close-btn" id="notif-close-btn" aria-label="Fechar notificações">
          <i data-lucide="x"></i>
        </button>
      </div>

      <!-- Linha 2: contador + marcar todas (só aparece quando há não lidas) -->
      <div class="notif-panel-subhead" data-notif-subhead ${unread === 0 ? 'hidden' : ''}>
        <span class="notif-counter" data-notif-counter>
          ${unread} não lida${unread !== 1 ? 's' : ''}
        </span>
        <button type="button" class="notif-mark-all-btn" data-notif-mark-all>
          <i data-lucide="check-check"></i>
          <span>Marcar todas como lidas</span>
        </button>
      </div>

      <!-- Lista -->
      <div class="notif-list-wrap" data-notif-list>
        ${_buildListMarkup(notifications)}
      </div>
    </div>
  `;
}

function _buildEmptyMarkup() {
  return `
    <div class="notif-empty">
      <i data-lucide="bell-off"></i>
      <p>Nenhuma notificação por enquanto.</p>
    </div>
  `;
}

function _buildListMarkup(notifications) {
  if (!notifications.length) return _buildEmptyMarkup();

  return notifications.map(n => {
    const cfg  = TIPO_CONFIG[n.tipo] || TIPO_CONFIG.novo_conteudo;
    const time = _formatTime(n.criado_em);
    return `
      <div class="notif-item"
        data-notif-id="${sanitizeAttribute(String(n.id))}"
        data-notif-tipo="${sanitizeAttribute(String(n.tipo || ''))}"
        data-notif-lida="${n.lida}"
        title="Clique para ${n.tipo === 'chamado_status' && _isRetaguardaUser() ? 'abrir requisições' : 'dispensar'}"
        tabindex="0"
        role="button"
        data-notif-color="${sanitizeAttribute(cfg.color)}">
        <div class="notif-item-icon" data-notif-icon>
          <i data-lucide="${cfg.icon}"></i>
        </div>
        <div class="notif-item-body">
          <div class="notif-item-head">
            <span class="notif-item-badge" data-notif-badge>
              ${cfg.label}
            </span>
            <time class="notif-item-time">${time}</time>
          </div>
          <strong class="notif-item-title">${sanitizeText(n.titulo)}</strong>
          <p class="notif-item-msg">${sanitizeText(n.mensagem)}</p>
        </div>
        <span class="notif-unread-dot" aria-label="Não lida"></span>
      </div>
    `;
  }).join('');
}

function _formatTime(iso) {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    const now  = new Date();
    const diffMs = now - date;
    const diffMin  = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay  = Math.floor(diffHour / 24);

    if (diffMin < 1)   return 'Agora mesmo';
    if (diffMin < 60)  return `Há ${diffMin} min`;
    if (diffHour < 24) return `Há ${diffHour}h`;
    if (diffDay < 7)   return `Há ${diffDay} dia${diffDay > 1 ? 's' : ''}`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}
