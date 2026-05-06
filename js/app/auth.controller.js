import { SECTOR_IDS } from '../constants/sector.constants.js';
import {
  clearAuthenticatedUser,
  getAuthenticatedUser,
  loginUser,
  persistAuthenticatedUser,
} from '../services/auth.service.js';
import {
  persistNavigationState,
  sanitizeActiveItemForNavigation,
} from '../services/navigation.service.js';
import { showAuthenticatedShell, showLoginShell } from './dom.js';

export function createAuthController({
  state,
  loginState,
  roots,
  applyCurrentTheme,
  getAccessibleNavigationItems,
  resetNavigationToHome,
  resetNavigationForAccess,
  resetNavigationForUser,
  syncAppShellState,
  renderApp,
  renderCurrentView,
  renderLoginScreen,
}) {
  function bootstrap() {
    const storedUser = getAuthenticatedUser();

    applyCurrentTheme();

    if (storedUser) {
      state.authenticatedUser = storedUser;
      resetNavigationForUser(storedUser);
      showAuthenticatedApplication();
      return;
    }

    clearAuthenticatedUser();
    state.authenticatedUser = null;
    resetNavigationToHome();
    showLoginScreen();
  }

  async function handleLoginSubmit(credentials) {
    loginState.errorMessage = '';
    loginState.isLoading = true;
    renderLoginScreen();

    try {
      const response = await loginUser(credentials.id, credentials.password);

      if (response.success) {
        loginState.isLoading = false;
        state.authenticatedUser = response.user;
        persistAuthenticatedUser(response.user);
        resetNavigationForUser(response.user);
        showAuthenticatedApplication();
        return;
      }

      loginState.errorMessage = response.message;
    } catch {
      loginState.errorMessage = 'Não foi possível concluir o login.';
    }

    loginState.isLoading = false;
    renderLoginScreen();
  }

  function handleLogout() {
    clearAuthenticatedUser();
    state.authenticatedUser = null;
    state.activeItemId = SECTOR_IDS.home;
    state.isProductionExpanded = false;
    state.isCommercialExpanded = false;
    loginState.errorMessage = '';
    persistNavigationState(state);
    showLoginScreen();
  }

  function showAuthenticatedApplication() {
    const navigationItems = getAccessibleNavigationItems();
    state.activeItemId = sanitizeActiveItemForNavigation(state.activeItemId, navigationItems);
    showAuthenticatedShell(roots);
    syncAppShellState();
    renderApp();
    renderCurrentView({ animate: false });
  }

  function showLoginScreen() {
    showLoginShell(roots);
    renderLoginScreen();
  }

  return {
    bootstrap,
    handleLoginSubmit,
    handleLogout,
    showAuthenticatedApplication,
    showLoginScreen,
  };
}
