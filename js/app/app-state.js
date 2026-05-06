import { getInitialNavigationState } from '../services/navigation.service.js';
import { getInitialTheme } from '../utils/theme.js';

export function createAppState() {
  return {
    ...getInitialNavigationState(),
    authenticatedUser: null,
  };
}

export function createLoginState() {
  return {
    isLoading: false,
    errorMessage: '',
  };
}

export function createThemeState() {
  return {
    currentTheme: getInitialTheme(),
  };
}
