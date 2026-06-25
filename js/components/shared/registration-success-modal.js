/**
 * registration-success-modal.js
 * Modal de sucesso após cadastro de usuário.
 * Appended a document.body — escapa de stacking contexts transformados.
 */

import { animateOut } from '../../utils/motion.js';
import { sanitizeText } from '../../utils/sanitize.js';

let activeModal = null;

/**
 * @param {{ id: string, senha: string }} credentials
 */
export function openRegistrationSuccessModal({ id, senha }) {
  if (activeModal) activeModal.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'reg-success-backdrop';

  backdrop.innerHTML = `
    <div class="reg-success-modal" role="dialog" aria-modal="true" aria-label="Cadastro realizado com sucesso">
      <div class="reg-success-icon-wrap" aria-hidden="true">
        <i data-lucide="circle-check-big"></i>
      </div>

      <h3 class="reg-success-title">Cadastro realizado</h3>
      <p class="reg-success-subtitle">
        Colaborador cadastrado com sucesso. Copie as credenciais abaixo e envie ao novo colaborador.
      </p>

      <div class="reg-success-data">
        <div class="reg-success-row">
          <span class="reg-success-label">ID do Colaborador</span>
          <strong class="reg-success-value" id="reg-cred-id">${sanitizeText(id)}</strong>
        </div>
        <div class="reg-success-row">
          <span class="reg-success-label">Senha</span>
          <strong class="reg-success-value" id="reg-cred-senha">${sanitizeText(senha)}</strong>
        </div>
      </div>

      <div class="reg-success-actions">
        <button type="button" class="module-action-button" id="reg-copy-btn">
          <i data-lucide="copy"></i>
          <span>Copiar credenciais</span>
        </button>
        <button type="button" class="module-link-button is-secondary" id="reg-close-btn">
          <i data-lucide="x"></i>
          <span>Fechar</span>
        </button>
      </div>
    </div>
  `;

  // ── Events ───────────────────────────────────────────────────────────────

  backdrop.querySelector('#reg-close-btn').addEventListener('click', _close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) _close(); });
  document.addEventListener('keydown', _handleEsc);

  backdrop.querySelector('#reg-copy-btn').addEventListener('click', async () => {
    const text = `ID: ${id}\nSenha: ${senha}`;
    const btn = backdrop.querySelector('#reg-copy-btn');
    const label = btn.querySelector('span');

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* noop */ }
      ta.remove();
    }

    const original = label.textContent;
    label.textContent = 'Copiado!';
    const icon = btn.querySelector('i[data-lucide]');
    if (icon) { icon.setAttribute('data-lucide', 'check'); if (window.lucide) window.lucide.createIcons({ nodes: [icon.parentElement] }); }
    setTimeout(() => {
      label.textContent = original;
      if (icon) { icon.setAttribute('data-lucide', 'copy'); if (window.lucide) window.lucide.createIcons({ nodes: [icon.parentElement] }); }
    }, 2200);
  });

  document.body.appendChild(backdrop);
  activeModal = backdrop;
  if (window.lucide) window.lucide.createIcons({ root: backdrop });
}

function _handleEsc(e) {
  if (e.key === 'Escape') _close();
}

function _close() {
  document.removeEventListener('keydown', _handleEsc);
  if (!activeModal) return;
  const target = activeModal;
  activeModal = null;
  animateOut(target, 'is-closing', 200, () => target.remove());
}
