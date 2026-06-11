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
