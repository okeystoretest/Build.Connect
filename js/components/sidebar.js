import { refreshLucideIcons } from '../services/icons.service.js';
import { sanitizeAttribute, sanitizeText } from '../utils/sanitize.js';
import { USER_LEVELS } from '../constants/sector.constants.js';
import { applyPendingBadgesSetting } from '../services/settings.service.js';

export { applyPendingBadgesSetting } from '../services/settings.service.js';

export function renderSidebar(rootElement, state, handlers, navigationItems, theme) {
  rootElement.innerHTML = `
    <div class="sidebar-panel">
      <div class="sidebar-header">
        <div class="brand" aria-label="Build.Connect">
          <img class="brand-logo" src="./assets/build-connect-logo.png" alt="Logo da plataforma Build.Connect" />
          <div class="brand-copy">
            <strong class="brand-title">
              <span class="brand-title-accent">Build</span><span class="brand-title-dot">.</span>Connect
            </strong>
            <span class="brand-subtitle">Hub de integração</span>
          </div>
        </div>

        <button
          class="sidebar-toggle"
          type="button"
          id="sidebar-toggle"
          data-collapsed="${state.isSidebarCollapsed ? 'true' : 'false'}"
          aria-label="${state.isSidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}"
          title="${state.isSidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}"
        >
          <i data-lucide="chevron-left"></i>
        </button>
      </div>

      <nav class="sidebar-nav" aria-label="Setores">
        ${navigationItems.map((item) => renderNavigationItem(item, state)).join('')}
      </nav>

      <div class="sidebar-footer" aria-label="Ações rápidas">
        <button
          class="footer-icon-button"
          type="button"
          id="ti-button"
          aria-label="Fazer Requisição"
          title="Fazer Requisição"
        >
          <span class="nav-icon" aria-hidden="true"><i data-lucide="headset"></i></span>
          <span class="item-tooltip">Chamado (TI)</span>
        </button>

        ${(state.authenticatedUser?.nivel === USER_LEVELS.admin || state.authenticatedUser?.nivel === USER_LEVELS.gestor) ? `
        <button
          class="footer-icon-button"
          type="button"
          id="broadcast-button"
          aria-label="Comunicar setor"
          title="Comunicar setor"
        >
          <span class="nav-icon" aria-hidden="true"><i data-lucide="megaphone"></i></span>
          <span class="item-tooltip">Comunicar setor</span>
        </button>
        ` : ''}

        <button
          class="footer-icon-button"
          type="button"
          id="settings-button"
          aria-label="Configurações"
          title="Configurações"
        >
          <span class="nav-icon" aria-hidden="true"><i data-lucide="settings-2"></i></span>
          <span class="item-tooltip">Configurações</span>
        </button>

        <button
          class="footer-icon-button"
          type="button"
          id="logout-button"
          aria-label="Logout"
          title="Logout"
        >
          <span class="nav-icon" aria-hidden="true"><i data-lucide="log-out"></i></span>
          <span class="item-tooltip">Logout</span>
        </button>
      </div>
    </div>
  `;

  refreshLucideIcons(rootElement);
  bindSidebarEvents(rootElement, handlers);
}

function renderNavigationItem(item, state) {
  const hasChildren = Boolean(item.children?.length);
  const isActive = state.activeItemId === item.id;
  const commonTooltip = `<span class="item-tooltip">${sanitizeText(item.label)}</span>`;

  if (!hasChildren) {
    return `
      <button
        class="nav-item ${isActive ? 'is-active' : ''}"
        type="button"
        data-nav-item="${sanitizeAttribute(item.id)}"
        aria-current="${isActive ? 'page' : 'false'}"
        aria-label="${sanitizeText(item.label)}"
        title="${sanitizeText(item.label)}"
      >
        <span class="nav-icon" aria-hidden="true"><i data-lucide="${sanitizeAttribute(item.icon)}"></i></span>
        <span class="nav-text"><span class="nav-label">${sanitizeText(item.label)}</span></span>
        ${commonTooltip}
      </button>
    `;
  }

  const expandedStateMap = {
    comercial: state.isCommercialExpanded,
    producao:  state.isProductionExpanded,
    logistica: state.isLogisticsExpanded,
  };
  const isExpanded = Boolean(expandedStateMap[item.id]);

  return `
    <div class="nav-group" data-nav-group="${sanitizeAttribute(item.id)}" data-expanded="${isExpanded}">
      <button
        class="nav-trigger ${isExpanded ? 'is-expanded' : ''}"
        type="button"
        data-nav-group-toggle="${sanitizeAttribute(item.id)}"
        aria-expanded="${isExpanded}"
        aria-controls="submenu-${sanitizeAttribute(item.id)}"
        aria-label="${sanitizeText(item.label)}"
        title="${sanitizeText(item.label)}"
      >
        <span class="nav-icon" aria-hidden="true"><i data-lucide="${sanitizeAttribute(item.icon)}"></i></span>
        <span class="nav-text"><span class="nav-label">${sanitizeText(item.label)}</span></span>
        <span class="chevron-icon" aria-hidden="true"><i data-lucide="chevron-down"></i></span>
        ${commonTooltip}
      </button>

      <div class="submenu" id="submenu-${sanitizeAttribute(item.id)}" role="group"
        aria-label="Submenu ${sanitizeText(item.label)}" aria-hidden="${String(!isExpanded)}">
        ${item.children.map((child) => renderSubmenuItem(child, state.activeItemId)).join('')}
      </div>
    </div>
  `;
}

function renderSubmenuItem(item, activeItemId) {
  const isActive = activeItemId === item.id;
  return `
    <button
      class="submenu-item ${isActive ? 'is-active' : ''}"
      type="button"
      data-nav-item="${sanitizeAttribute(item.id)}"
      aria-current="${isActive ? 'page' : 'false'}"
      aria-label="${sanitizeText(item.label)}"
      title="${sanitizeText(item.label)}"
    >
      <span class="nav-icon" aria-hidden="true"><i data-lucide="${sanitizeAttribute(item.icon)}"></i></span>
      <span class="nav-text"><span class="submenu-label">${sanitizeText(item.label)}</span></span>
      <span class="item-tooltip">${sanitizeText(item.label)}</span>
    </button>
  `;
}

function bindSidebarEvents(rootElement, handlers) {
  const toggleButton    = rootElement.querySelector('#sidebar-toggle');
  const tiButton        = rootElement.querySelector('#ti-button');
  const logoutButton    = rootElement.querySelector('#logout-button');
  const broadcastButton = rootElement.querySelector('#broadcast-button');
  const settingsButton  = rootElement.querySelector('#settings-button');
  const navItems        = rootElement.querySelectorAll('[data-nav-item]');
  const groupToggles    = rootElement.querySelectorAll('[data-nav-group-toggle]');

  toggleButton?.addEventListener('click', handlers.onSidebarToggle);
  tiButton?.addEventListener('click', handlers.onTiModal);
  logoutButton?.addEventListener('click', handlers.onLogout);
  broadcastButton?.addEventListener('click', handlers.onBroadcast);
  settingsButton?.addEventListener('click', handlers.onSettings);

  navItems.forEach((btn) => btn.addEventListener('click', () => handlers.onNavigate(btn.dataset.navItem)));
  groupToggles.forEach((btn) => btn.addEventListener('click', () => handlers.onGroupToggle(btn.dataset.navGroupToggle)));
}
