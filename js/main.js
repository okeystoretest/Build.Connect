import { createAuthController } from './app/auth.controller.js';
import {
  appDom,
  syncAppShellState as syncShellState,
  setDrawerOpen,
  closeDrawer,
  isDrawerViewport,
} from './app/dom.js';
import { openTiModal } from './components/shared/ti-modal.js';
import { openNotificationsPanel } from './components/shared/notifications-panel.js';
import { openSendNotificationModal } from './components/shared/send-notification-modal.js';
import { openSettingsModal } from './components/shared/settings-modal.js';
import {
  renderApplication,
  renderAuthentication,
  renderCurrentContent,
} from './app/app-renderer.js';
import {
  createAppState,
  createLoginState,
  createThemeState,
} from './app/app-state.js';
import { createNavigationController } from './app/navigation.controller.js';
import {
  getNavigationItemsForUser,
  persistNavigationState,
} from './services/navigation.service.js';
import { applyTheme } from './utils/theme.js';
import { applyPendingBadgesSetting } from './services/settings.service.js';

// Restaura configuração de badges ao iniciar
applyPendingBadgesSetting();

const { authRoot, sidebarRoot, appShell, contentRoot, drawerToggle, drawerScrim } = appDom;

const state = createAppState();
const loginState = createLoginState();
const themeState = createThemeState();

let authController;
let handlers;

const navigationController = createNavigationController({
  state,
  sidebarRoot,
  getAccessibleNavigationItems,
  persistAndRender,
  syncAppShellState,
  renderApp,
});

authController = createAuthController({
  state,
  loginState,
  roots: appDom,
  applyCurrentTheme,
  getAccessibleNavigationItems,
  resetNavigationToHome: navigationController.resetNavigationToHome,
  resetNavigationForAccess: navigationController.resetNavigationForAccess,
  resetNavigationForUser: navigationController.resetNavigationForUser,
  syncAppShellState,
  renderApp,
  renderCurrentView,
  renderLoginScreen,
});

handlers = {
  onSidebarToggle: navigationController.handleSidebarToggle,
  onNavigate:      (itemId) => {
    // Mobile: selecionar um setor fecha a gaveta para revelar o conteudo.
    if (isDrawerViewport()) closeDrawer(appShell);
    navigationController.handleNavigation(itemId);
  },
  onGroupToggle:   navigationController.handleGroupToggle,
  onLogout:        () => { closeDrawer(appShell); authController.handleLogout(); },
  onTiModal:       () => openTiModal({ user: state.authenticatedUser }),
  onBroadcast:     () => openSendNotificationModal(state.activeItemId),
  onSettings:      () => openSettingsModal({ onThemeChange: handleThemeChange }),
};

authController.bootstrap();

// Sino de notificações: vinculado uma vez — persiste em toda a navegação
document.getElementById('notifications-button')
  ?.addEventListener('click', () => openNotificationsPanel());

// ── Drawer mobile (sidebar em gaveta) ─────────────────────────────────────
// Estado vive apenas no DOM; inicia sempre fechado a cada carregamento.

drawerToggle?.addEventListener('click', () => {
  const isOpen = appShell.classList.contains('is-drawer-open');
  setDrawerOpen(appShell, !isOpen);
});

drawerScrim?.addEventListener('click', () => closeDrawer(appShell));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && appShell.classList.contains('is-drawer-open')) {
    closeDrawer(appShell);
  }
});

// Ao voltar para viewport de desktop, garante que o drawer não fique preso
// aberto e que o scroll do body seja liberado.
window.matchMedia('(max-width: 1024px)').addEventListener('change', (e) => {
  if (!e.matches) closeDrawer(appShell);
});

// Navegação disparada por notificações (ex: clicar em chamado TI → Retaguarda)
document.addEventListener('bc:navigate', (e) => {
  const itemId = e.detail?.itemId;
  if (itemId) navigationController.handleNavigation(itemId);
});

function getAccessibleNavigationItems() {
  return getNavigationItemsForUser(state.authenticatedUser);
}

function renderApp() {
  renderApplication({
    sidebarRoot,
    state,
    handlers,
    navigationItems: getAccessibleNavigationItems(),
    currentTheme: themeState.currentTheme,
  });
}

function renderCurrentView(options = {}) {
  renderCurrentContent({
    contentRoot,
    state,
    navigationItems: getAccessibleNavigationItems(),
    options,
  });
}

function renderLoginScreen() {
  renderAuthentication({
    authRoot,
    loginState,
    onSubmit: authController.handleLoginSubmit,
  });
}

function handleThemeChange(theme) {
  themeState.currentTheme = theme;
  if (state.authenticatedUser) { renderApp(); } else { renderLoginScreen(); }
}

function persistAndRender({ shouldRenderContent = true, animateContent = false } = {}) {
  persistNavigationState(state);
  syncAppShellState();
  renderApp();
  if (shouldRenderContent) renderCurrentView({ animate: animateContent });
}

function syncAppShellState() {
  syncShellState(appShell, state);
}

function applyCurrentTheme() {
  applyTheme(themeState.currentTheme);
}
