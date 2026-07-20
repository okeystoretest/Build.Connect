export const appDom = {
  authRoot: document.getElementById('auth-root'),
  sidebarRoot: document.getElementById('sidebar-root'),
  appShell: document.getElementById('app-shell'),
  contentRoot: document.getElementById('content'),
  drawerToggle: document.getElementById('sidebar-drawer-toggle'),
  drawerScrim: document.getElementById('sidebar-scrim'),
};

// Largura a partir da qual a sidebar volta ao modo fixo (espelha o breakpoint
// de responsive-mobile.css). Mantido em um único ponto para evitar divergência.
export const DRAWER_BREAKPOINT = 1024;

export function isDrawerViewport() {
  return window.matchMedia(`(max-width: ${DRAWER_BREAKPOINT}px)`).matches;
}

/**
 * Abre/fecha o drawer. O estado vive apenas no DOM (classe no shell) — não é
 * persistido, pois o drawer deve iniciar fechado a cada carregamento.
 */
export function setDrawerOpen(appShell, isOpen) {
  if (!appShell) return;
  appShell.classList.toggle('is-drawer-open', isOpen);

  const toggle = appDom.drawerToggle;
  const scrim  = appDom.drawerScrim;

  if (toggle) {
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
  }
  if (scrim) scrim.hidden = !isOpen;

  // Trava o scroll do body enquanto o drawer estiver aberto (iOS/Android).
  document.body.classList.toggle('has-drawer-open', isOpen);
}

export function closeDrawer(appShell) {
  setDrawerOpen(appShell, false);
}

export function syncAppShellState(appShell, state) {
  appShell.classList.toggle('is-sidebar-collapsed', state.isSidebarCollapsed);
}

export function showAuthenticatedShell({ authRoot, appShell }) {
  document.body.classList.remove('is-auth-view');
  authRoot.hidden = true;
  appShell.hidden = false;
  appShell.classList.add('is-entering');
  requestAnimationFrame(() => {
    appShell.addEventListener('animationend', () => appShell.classList.remove('is-entering'), { once: true });
  });
}

export function showLoginShell({ authRoot, appShell, contentRoot }) {
  document.body.classList.add('is-auth-view');
  appShell.hidden = true;
  appShell.classList.remove('is-entering');
  authRoot.hidden = false;
  if (contentRoot) contentRoot.innerHTML = '';
}
