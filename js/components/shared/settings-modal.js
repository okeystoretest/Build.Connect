/**
 * settings-modal.js
 * Modal centralizado de configurações: tema e visibilidade de badges.
 * Appended directly to document.body — escapes qualquer stacking context.
 */

import { applyTheme } from '../../utils/theme.js';
import { animateOut } from '../../utils/motion.js';
import {
  getHidePendingBadges,
  setHidePendingBadges,
} from '../../services/settings.service.js';

let activeSettingsModal = null;

export function openSettingsModal({ onThemeChange } = {}) {
  if (activeSettingsModal) {
    _close();
    return;
  }

  const isDark = document.body.dataset.theme === 'dark';
  const hideNotif = getHidePendingBadges();

  const backdrop = document.createElement('div');
  backdrop.className = 'bc-settings-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', 'Configurações');

  backdrop.innerHTML = `
    <div class="bc-settings-modal">
      <div class="bc-settings-header">
        <div class="bc-settings-header-copy">
          <i data-lucide="settings-2"></i>
          <h2 class="bc-settings-title">Configurações</h2>
        </div>
        <button type="button" class="bc-settings-close" aria-label="Fechar configurações">
          <i data-lucide="x"></i>
        </button>
      </div>

      <div class="bc-settings-body">

        <!-- ── Aparência ───────────────────────────────────────── -->
        <section class="bc-settings-section" aria-label="Aparência">
          <span class="bc-settings-section-eyebrow">Aparência</span>
          <div class="bc-settings-theme-grid">
            <button type="button"
              class="bc-settings-theme-btn ${!isDark ? 'is-active' : ''}"
              data-settings-theme="light"
              aria-pressed="${!isDark}"
            >
              <span class="bc-settings-theme-icon">
                <i data-lucide="sun-medium"></i>
              </span>
              <span class="bc-settings-theme-label">Light</span>
              <span class="bc-settings-theme-check" aria-hidden="true">
                <i data-lucide="check"></i>
              </span>
            </button>
            <button type="button"
              class="bc-settings-theme-btn ${isDark ? 'is-active' : ''}"
              data-settings-theme="dark"
              aria-pressed="${isDark}"
            >
              <span class="bc-settings-theme-icon">
                <i data-lucide="moon-star"></i>
              </span>
              <span class="bc-settings-theme-label">Dark</span>
              <span class="bc-settings-theme-check" aria-hidden="true">
                <i data-lucide="check"></i>
              </span>
            </button>
          </div>
        </section>

        <!-- ── Notificações ───────────────────────────────────── -->
        <section class="bc-settings-section" aria-label="Notificações">
          <span class="bc-settings-section-eyebrow">Notificações</span>
          <div class="bc-settings-toggle-row">
            <div class="bc-settings-toggle-info">
              <span class="bc-settings-toggle-label">Ocultar pendências</span>
              <span class="bc-settings-toggle-desc">
                Esconde alertas e notificações relacionados às avaliações pendentes
              </span>
            </div>
            <button
              type="button"
              class="bc-settings-switch ${hideNotif ? 'is-on' : ''}"
              id="bc-hide-notif-toggle"
              aria-pressed="${hideNotif}"
              aria-label="Ocultar notificações de pendências"
            >
              <span class="bc-settings-switch-thumb"></span>
            </button>
          </div>
        </section>

      </div>
    </div>
  `;

  // ── Event binding ────────────────────────────────────────────────────────

  backdrop.querySelector('.bc-settings-close').addEventListener('click', _close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) _close(); });
  document.addEventListener('keydown', _handleEsc);

  // Theme buttons
  backdrop.querySelectorAll('[data-settings-theme]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.settingsTheme;
      applyTheme(theme);
      backdrop.querySelectorAll('[data-settings-theme]').forEach((b) => {
        const active = b.dataset.settingsTheme === theme;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      if (typeof onThemeChange === 'function') onThemeChange(theme);
    });
  });

  // Notification toggle
  backdrop.querySelector('#bc-hide-notif-toggle').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const next = !getHidePendingBadges();
    setHidePendingBadges(next);
    btn.classList.toggle('is-on', next);
    btn.setAttribute('aria-pressed', String(next));
    document.body.classList.toggle('hide-pending-badges', next);
  });

  document.body.appendChild(backdrop);
  activeSettingsModal = backdrop;

  if (window.lucide) window.lucide.createIcons({ root: backdrop });
}

function _handleEsc(e) {
  if (e.key === 'Escape') _close();
}

function _close() {
  document.removeEventListener('keydown', _handleEsc);
  if (!activeSettingsModal) return;
  const target = activeSettingsModal;
  activeSettingsModal = null;
  animateOut(target, 'is-closing', 200, () => target.remove());
}
