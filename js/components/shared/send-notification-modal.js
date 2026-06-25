import { refreshLucideIcons } from '../../services/icons.service.js';
import { sanitizeText } from '../../utils/sanitize.js';
import { animateOut } from '../../utils/motion.js';
import { showToast } from '../../utils/toast.js';
import { sendSectorNotification } from '../../services/notifications.service.js';
import { USER_ADMIN_SECTOR_OPTIONS } from '../../constants/sector.constants.js';

let _activeModal = null;
let _escHandler  = null;

const SECTOR_OPTIONS = USER_ADMIN_SECTOR_OPTIONS.filter(s => s.id !== 'all');

// ── Abertura ──────────────────────────────────────────────────────────────

export function openSendNotificationModal(currentSectorId = '') {
  closeSendNotificationModal();

  const overlay = document.createElement('div');
  overlay.className = 'video-modal-backdrop send-notif-backdrop';
  overlay.innerHTML = _buildModalMarkup(currentSectorId);

  document.body.appendChild(overlay);
  refreshLucideIcons(overlay);
  _activeModal = overlay;

  // Fecha ao clicar fora
  overlay.addEventListener('click', e => {
    if (!overlay.querySelector('[role="dialog"]')?.contains(e.target)) {
      closeSendNotificationModal();
    }
  });

  _escHandler = e => { if (e.key === 'Escape') closeSendNotificationModal(); };
  document.addEventListener('keydown', _escHandler);

  overlay.querySelector('[data-send-notif-close]')?.addEventListener('click', closeSendNotificationModal);

  // Submit
  overlay.querySelector('[data-send-notif-form]')?.addEventListener('submit', async e => {
    e.preventDefault();
    await _handleSubmit(overlay);
  });
}

// ── Fechamento ────────────────────────────────────────────────────────────

export function closeSendNotificationModal() {
  if (!_activeModal) return;
  if (_escHandler) {
    document.removeEventListener('keydown', _escHandler);
    _escHandler = null;
  }
  const target = _activeModal;
  _activeModal = null;
  animateOut(target, 'is-closing', 200, () => target.remove());
}

// ── Submit ────────────────────────────────────────────────────────────────

async function _handleSubmit(overlay) {
  const sectorId = overlay.querySelector('[data-send-notif-sector]')?.value || '';
  const titulo   = overlay.querySelector('[data-send-notif-titulo]')?.value?.trim() || '';
  const mensagem = overlay.querySelector('[data-send-notif-mensagem]')?.value?.trim() || '';
  const btn      = overlay.querySelector('[data-send-notif-submit]');
  const errEl    = overlay.querySelector('[data-send-notif-error]');

  if (errEl) errEl.textContent = '';

  if (!sectorId) { if (errEl) errEl.textContent = 'Selecione um setor.'; return; }
  if (!titulo)   { if (errEl) errEl.textContent = 'Preencha o título.'; return; }
  if (!mensagem) { if (errEl) errEl.textContent = 'Preencha a mensagem.'; return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }

  const response = await sendSectorNotification({ sectorId, titulo, mensagem })
    .catch(() => ({ success: false, message: 'Erro ao enviar.' }));

  if (response?.success) {
    showToast(`Notificação enviada para ${response.totalEnviado} usuário${response.totalEnviado !== 1 ? 's' : ''}.`, { type: 'success' });
    closeSendNotificationModal();
  } else {
    if (errEl) errEl.textContent = response?.message || 'Erro ao enviar a notificação.';
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar notificação'; }
  }
}

// ── Markup ────────────────────────────────────────────────────────────────

function _buildModalMarkup(currentSectorId) {
  return `
    <div class="video-modal send-notif-modal" role="dialog" aria-label="Comunicar setor">
      <div class="video-modal-close-row">
        <button type="button" class="video-modal-close" data-send-notif-close aria-label="Fechar">
          <i data-lucide="x"></i>
        </button>
      </div>

      <div class="send-notif-header">
        <div class="send-notif-icon">
          <i data-lucide="megaphone"></i>
        </div>
        <div>
          <h2 class="send-notif-title">Comunicar setor</h2>
          <p class="send-notif-desc">
            Envie uma notificação de novo conteúdo para todos os usuários do setor selecionado.
          </p>
        </div>
      </div>

      <form class="send-notif-form" data-send-notif-form novalidate>
        <label class="form-field">
          <span class="form-label">Setor <span class="form-required">*</span></span>
          <select class="quiz-sector-select" data-send-notif-sector required>
            <option value="">Selecione um setor…</option>
            ${SECTOR_OPTIONS.map(s => `
              <option value="${s.id}" ${s.id === currentSectorId ? 'selected' : ''}>
                ${sanitizeText(s.label)}
              </option>
            `).join('')}
          </select>
        </label>

        <label class="form-field">
          <span class="form-label">Título <span class="form-required">*</span></span>
          <input
            type="text"
            class="quiz-opcao-input"
            placeholder="Ex: Novo vídeo disponível no setor"
            maxlength="120"
            data-send-notif-titulo
            required
          />
        </label>

        <label class="form-field">
          <span class="form-label">Mensagem <span class="form-required">*</span></span>
          <textarea
            class="quiz-textarea"
            rows="3"
            placeholder="Descreva brevemente o novo conteúdo ou mudança…"
            maxlength="500"
            data-send-notif-mensagem
            required
          ></textarea>
        </label>

        <p class="send-notif-error" data-send-notif-error></p>

        <div class="send-notif-footer">
          <button type="button" class="module-link-button is-secondary" data-send-notif-close>
            Cancelar
          </button>
          <button type="submit" class="module-action-button" data-send-notif-submit>
            <i data-lucide="send"></i>
            <span>Enviar notificação</span>
          </button>
        </div>
      </form>
    </div>
  `;
}
