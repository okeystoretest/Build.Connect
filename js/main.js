import { createAuthController } from './app/auth.controller.js';
import { appDom, syncAppShellState as syncShellState } from './app/dom.js';
import { openTiModal } from './components/shared/ti-modal.js';
import { openNotificationsPanel } from './components/shared/notifications-panel.js';
import { openSendNotificationModal } from './components/shared/send-notification-modal.js';
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
import { applyTheme, toggleTheme } from './utils/theme.js';

const { authRoot, sidebarRoot, appShell, contentRoot } = appDom;

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
  onThemeToggle:   handleThemeToggle,
  onNavigate:      navigationController.handleNavigation,
  onGroupToggle:   navigationController.handleGroupToggle,
  onLogout:        authController.handleLogout,
  onTiModal:       () => openTiModal({ user: state.authenticatedUser }),
  onBroadcast:     () => openSendNotificationModal(state.activeItemId),
};

authController.bootstrap();

// Sino de notificações: vinculado uma vez — persiste em toda a navegação
document.getElementById('notifications-button')
  ?.addEventListener('click', () => openNotificationsPanel());

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

function handleThemeToggle() {
  themeState.currentTheme = toggleTheme();

  if (state.authenticatedUser) {
    renderApp();
    return;
  }

  renderLoginScreen();
}

function persistAndRender({ shouldRenderContent = true, animateContent = false } = {}) {
  persistNavigationState(state);
  syncAppShellState();
  renderApp();

  if (shouldRenderContent) {
    renderCurrentView({ animate: animateContent });
  }
}

function syncAppShellState() {
  syncShellState(appShell, state);
}

function applyCurrentTheme() {
  applyTheme(themeState.currentTheme);
}