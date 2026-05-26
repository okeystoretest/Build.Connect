import { SECTOR_IDS } from '../constants/sector.constants.js';
import {
  clearAuthenticatedUser,
  getAuthenticatedUser,
  loginUser,
  logoutUser,
  persistAuthenticatedUser,
} from '../services/auth.service.js';
import { requestApi, getSessionToken, clearSessionToken } from '../services/api.service.js';
import { startPolling, stopPolling } from '../services/notifications.service.js';
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
  async function bootstrap() {
    const storedUser   = getAuthenticatedUser();
    const sessionToken = getSessionToken();

    applyCurrentTheme();

    // Sem dados locais → login imediato
    if (!storedUser || !sessionToken) {
      clearAuthenticatedUser();
      clearSessionToken();
      state.authenticatedUser = null;
      resetNavigationToHome();
      showLoginScreen();
      return;
    }

    // Mostra o app imediatamente (evita tela branca)
    state.authenticatedUser = storedUser;
    resetNavigationForUser(storedUser);
    showAuthenticatedApplication();

    // Valida o token em background sem bloquear a UI
    try {
      const validation = await requestApi('validate-session');
      if (!validation?.success) {
        // Token rejeitado pelo servidor — força novo login
        clearAuthenticatedUser();
        clearSessionToken();
        state.authenticatedUser = null;
        resetNavigationToHome();
        showLoginScreen();
      }
    } catch {
      // Falha de rede — mantém sessão local sem forçar logout
    }
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

  async function handleLogout() {
    stopPolling();
    await logoutUser();
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
    startPolling();
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