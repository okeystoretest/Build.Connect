import { refreshLucideIcons } from '../../services/icons.service.js';
import { sanitizeText } from '../../utils/sanitize.js';
import { animateOut } from '../../utils/motion.js';
import { getNotifications, markNotificationRead, markAllRead, fetchNotifications } from '../../services/notifications.service.js';

let _activePanel   = null;
let _escHandler    = null;

// ── Ícone e cor por tipo ──────────────────────────────────────────────────

const TIPO_CONFIG = {
  chamado_status:    { icon: 'headset',        color: '#3B82F6', label: 'Chamado TI'  },
  avaliacao_pendente:{ icon: 'clipboard-check', color: '#F59E0B', label: 'Avaliação'   },
  novo_conteudo:     { icon: 'bell-ring',       color: '#10B981', label: 'Novo conteúdo'},
};

// ── Abertura ──────────────────────────────────────────────────────────────

export function openNotificationsPanel() {
  closeNotificationsPanel();

  const notifications = getNotifications();

  const panel = document.createElement('div');
  panel.id        = 'notifications-panel-root';
  panel.className = 'notif-backdrop';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Notificações');
  panel.innerHTML = _buildPanelMarkup(notifications);

  document.body.appendChild(panel);
  refreshLucideIcons(panel);
  _activePanel = panel;

  // Fecha ao clicar fora do painel
  panel.addEventListener('click', e => {
    if (e.target === panel) closeNotificationsPanel();
  });

  // Fecha com Escape
  _escHandler = e => { if (e.key === 'Escape') closeNotificationsPanel(); };
  document.addEventListener('keydown', _escHandler);

  // Marcar todas como lidas
  panel.querySelector('[data-notif-mark-all]')?.addEventListener('click', async () => {
    await markAllRead();
    _rerenderList(panel);
  });

  // Clique em notificação individual → marca como lida
  panel.addEventListener('click', async e => {
    const item = e.target.closest('[data-notif-id]');
    if (!item || item.dataset.notifLida === 'true') return;
    await markNotificationRead(item.dataset.notifId);
    item.classList.add('is-read');
    item.dataset.notifLida = 'true';
    _refreshUnreadIndicator(panel);
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
  const notifications = getNotifications();
  list.innerHTML = _buildListMarkup(notifications);
  refreshLucideIcons(list);
  _refreshUnreadIndicator(panel);
}

function _refreshUnreadIndicator(panel) {
  const notifications = getNotifications();
  const unread  = notifications.filter(n => !n.lida).length;
  const markAll = panel.querySelector('[data-notif-mark-all]');
  const counter = panel.querySelector('[data-notif-counter]');
  if (markAll) markAll.style.display = unread > 0 ? '' : 'none';
  if (counter) counter.textContent = `${unread} não lida${unread !== 1 ? 's' : ''}`;
}

// ── Markup ────────────────────────────────────────────────────────────────

function _buildPanelMarkup(notifications) {
  const unread = notifications.filter(n => !n.lida).length;

  return `
    <div class="notif-panel">
      <div class="notif-panel-head">
        <div class="notif-panel-title">
          <i data-lucide="bell"></i>
          <span>Notificações</span>
          <span class="notif-counter" data-notif-counter">
            ${unread} não lida${unread !== 1 ? 's' : ''}
          </span>
        </div>
        <div class="notif-panel-actions">
          <button type="button" class="notif-mark-all-btn"
            data-notif-mark-all
            style="${unread === 0 ? 'display:none' : ''}">
            <i data-lucide="check-check"></i>
            <span>Marcar todas como lidas</span>
          </button>
          <button type="button" class="notif-close-btn" id="notif-close-btn" aria-label="Fechar">
            <i data-lucide="x"></i>
          </button>
        </div>
      </div>

      <div class="notif-list-wrap" data-notif-list>
        ${_buildListMarkup(notifications)}
      </div>
    </div>
  `;
}

function _buildListMarkup(notifications) {
  if (!notifications.length) {
    return `
      <div class="notif-empty">
        <i data-lucide="bell-off"></i>
        <p>Nenhuma notificação por enquanto.</p>
      </div>
    `;
  }

  return notifications.map(n => {
    const cfg  = TIPO_CONFIG[n.tipo] || TIPO_CONFIG.novo_conteudo;
    const time = _formatTime(n.criado_em);
    return `
      <div class="notif-item ${n.lida ? 'is-read' : ''}"
        data-notif-id="${n.id}"
        data-notif-lida="${n.lida}"
        title="${n.lida ? '' : 'Clique para marcar como lida'}"
        tabindex="0"
        role="button">
        <div class="notif-item-icon" style="color:${cfg.color};background:${cfg.color}18">
          <i data-lucide="${cfg.icon}"></i>
        </div>
        <div class="notif-item-body">
          <div class="notif-item-head">
            <span class="notif-item-badge" style="color:${cfg.color};background:${cfg.color}15">
              ${cfg.label}
            </span>
            <time class="notif-item-time">${time}</time>
          </div>
          <strong class="notif-item-title">${sanitizeText(n.titulo)}</strong>
          <p class="notif-item-msg">${sanitizeText(n.mensagem)}</p>
        </div>
        ${!n.lida ? `<span class="notif-unread-dot" aria-label="Não lida"></span>` : ''}
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
