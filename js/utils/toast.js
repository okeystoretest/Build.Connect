/**
 * Toast — notificações discretas não-bloqueantes.
 * Uso: showToast('Mensagem', { type: 'error' | 'warning' | 'success' | 'info' })
 */

let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.id = 'bc-toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, { type = 'info', duration = 4000 } = {}) {
  const c = getContainer();

  const icons = {
    error:   'circle-alert',
    warning: 'triangle-alert',
    success: 'circle-check',
    info:    'info',
  };

  const toast = document.createElement('div');
  toast.className = `bc-toast bc-toast-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}"></i>
    <span>${String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
    <button type="button" class="bc-toast-close" aria-label="Fechar">×</button>
  `;

  toast.querySelector('.bc-toast-close').addEventListener('click', () => dismiss(toast));
  c.appendChild(toast);

  // Força reflow para iniciar animação de entrada
  void toast.offsetHeight;
  toast.classList.add('bc-toast-visible');

  if (window.lucide) lucide.createIcons({ root: toast });

  const timer = setTimeout(() => dismiss(toast), duration);
  toast._timer = timer;

  return toast;
}

function dismiss(toast) {
  if (!toast || toast._dismissed) return;
  toast._dismissed = true;
  clearTimeout(toast._timer);
  toast.classList.remove('bc-toast-visible');
  toast.classList.add('bc-toast-hiding');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
  setTimeout(() => toast.remove(), 400); // fallback
}
