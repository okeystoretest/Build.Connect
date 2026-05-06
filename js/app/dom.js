export const appDom = {
  authRoot: document.getElementById('auth-root'),
  sidebarRoot: document.getElementById('sidebar-root'),
  appShell: document.getElementById('app-shell'),
  contentRoot: document.getElementById('content'),
};

export function syncAppShellState(appShell, state) {
  appShell.classList.toggle('is-sidebar-collapsed', state.isSidebarCollapsed);
}

export function showAuthenticatedShell({ authRoot, appShell }) {
  document.body.classList.remove('is-auth-view');
  authRoot.hidden = true;
  appShell.hidden = false;
}

export function showLoginShell({ authRoot, appShell, contentRoot }) {
  document.body.classList.add('is-auth-view');
  appShell.hidden = true;
  authRoot.hidden = false;
  contentRoot.innerHTML = '';
}
