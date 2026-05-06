import { createAuthController } from './app/auth.controller.js';
import { appDom, syncAppShellState as syncShellState } from './app/dom.js';
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
  onThemeToggle: handleThemeToggle,
  onNavigate: navigationController.handleNavigation,
  onGroupToggle: navigationController.handleGroupToggle,
  onLogout: authController.handleLogout,
};

authController.bootstrap();

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
