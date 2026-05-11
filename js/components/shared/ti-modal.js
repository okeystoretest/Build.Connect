import { refreshLucideIcons } from '../../services/icons.service.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { criarChamadoTI } from '../../services/ti-requests.service.js';

const TI_UNITS = ['1', '2', '3', '4', 'Iguatemi', 'Centro Fashion', 'Showroom'];

const TI_CATEGORIES = [
  'Hardware e Equipamentos',
  'Software e Aplicativos',
  'Redes e Conectividade',
  'Acessos e Segurança',
  'Solicitações de Novos Recursos',
  'Desenvolvimento',
  'On-Boarding',
  'Off-Boarding',
];

const MAX_DESC = 150;

let activeTiModal = null;
let activeEscapeHandler = null;

export function openTiModal({ user = null } = {}) {
  closeTiModal();

  const overlay = document.createElement('div');
  overlay.className = 'video-modal-backdrop ti-modal-backdrop';
  overlay.innerHTML = getTiModalMarkup(user);

  const dialog    = overlay.querySelector('[role="dialog"]');
  const closeBtns = overlay.querySelectorAll('[data-ti-close]');
  const form      = overlay.querySelector('[data-ti-form]');
  const textarea  = overlay.querySelector('[data-ti-desc]');
  const charCount = overlay.querySelector('[data-ti-chars]');

  closeBtns.forEach((btn) => btn.addEventListener('click', closeTiModal));

  overlay.addEventListener('click', (e) => {
    if (!dialog.contains(e.target)) closeTiModal();
  });

  activeEscapeHandler = (e) => {
    if (e.key === 'Escape') closeTiModal();
  };
  document.addEventListener('keydown', activeEscapeHandler);

  textarea?.addEventListener('input', () => {
    const len = textarea.value.length;
    if (charCount) {
      charCount.textContent = `${len}/${MAX_DESC}`;
      charCount.classList.toggle('is-near-limit', len >= MAX_DESC * 0.85);
      charCount.classList.toggle('is-at-limit', len >= MAX_DESC);
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitTiForm(overlay, user);
  });

  document.body.appendChild(overlay);
  document.body.classList.add('has-video-modal');
  refreshLucideIcons(overlay);
  activeTiModal = overlay;

  requestAnimationFrame(() => {
    overlay.querySelector('[data-ti-field="unidade"]')?.focus();
  });
}

export function closeTiModal() {
  if (activeEscapeHandler) {
    document.removeEventListener('keydown', activeEscapeHandler);
    activeEscapeHandler = null;
  }

  if (!activeTiModal) {
    document.body.classList.remove('has-video-modal');
    return;
  }

  activeTiModal.remove();
  activeTiModal = null;
  document.body.classList.remove('has-video-modal');
}

async function submitTiForm(overlay, user) {
  const getValue = (field) => overlay.querySelector(`[data-ti-field="${field}"]`)?.value?.trim() || '';
  const unidade   = getValue('unidade');
  const categoria = getValue('categoria');
  const descricao = overlay.querySelector('[data-ti-desc]')?.value?.trim() || '';
  const feedback  = overlay.querySelector('[data-ti-feedback]');
  const submitBtn = overlay.querySelector('[data-ti-submit]');

  if (!unidade || !categoria || !descricao) {
    if (feedback) {
      feedback.textContent = 'Preencha todos os campos antes de enviar.';
      feedback.className = 'ti-modal-feedback is-error';
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'Enviando\u2026';
  }
  if (feedback) feedback.textContent = '';

  try {
    const response = await criarChamadoTI({
      solicitanteId:    String(user?.id   || ''),
      solicitanteNome:  String(user?.nome  || ''),
      solicitanteSetor: String(user?.setor || ''),
      unidade,
      categoria,
      descricao,
    });

    if (response?.success) {
      const formEl    = overlay.querySelector('[data-ti-form]');
      const successEl = overlay.querySelector('[data-ti-success]');
      if (formEl)    formEl.style.display = 'none';
      if (successEl) { successEl.style.display = 'flex'; refreshLucideIcons(successEl); }
    } else {
      if (feedback) { feedback.textContent = response?.message || 'N\u00e3o foi poss\u00edvel registrar o chamado.'; feedback.className = 'ti-modal-feedback is-error'; }
      if (submitBtn) { submitBtn.disabled = false; submitBtn.querySelector('span').textContent = 'Enviar chamado'; }
    }
  } catch (err) {
    if (feedback) { feedback.textContent = err?.message || 'Erro ao enviar. Tente novamente.'; feedback.className = 'ti-modal-feedback is-error'; }
    if (submitBtn) { submitBtn.disabled = false; submitBtn.querySelector('span').textContent = 'Enviar chamado'; }
  }
}

function getTiModalMarkup(user) {
  const nomeDisplay  = user?.nome  ? sanitizeText(user.nome)  : 'Usu\u00e1rio';
  const setorDisplay = user?.setor ? sanitizeText(user.setor) : '\u2014';

  const unitOptions = TI_UNITS.map((u) =>
    `<option value="${sanitizeAttribute(u)}">${sanitizeText(u)}</option>`,
  ).join('');

  const categoryOptions = TI_CATEGORIES.map((c) =>
    `<option value="${sanitizeAttribute(c)}">${sanitizeText(c)}</option>`,
  ).join('');

  return `
    <div class="ti-modal" role="dialog" aria-modal="true" aria-label="Fazer Requisição">
      <div class="ti-modal-head">
        <div class="ti-modal-head-copy">
          <span class="ti-modal-eyebrow">Suporte t\u00e9cnico</span>
          <strong class="ti-modal-title">Fazer Requisição</strong>
        </div>
        <button type="button" class="video-modal-close" data-ti-close aria-label="Fechar">
          <i data-lucide="x"></i>
        </button>
      </div>

      <div class="ti-modal-body">
        <div class="ti-modal-requester">
          <i data-lucide="user-circle-2"></i>
          <span>Solicitante: <strong>${nomeDisplay}</strong> \u00b7 ${setorDisplay}</span>
        </div>

        <form class="ti-modal-form" data-ti-form novalidate>
          <div class="ti-modal-grid">
            <label class="form-field ti-modal-field">
              <span class="form-label">Unidade</span>
              <select class="user-admin-select" data-ti-field="unidade">
                <option value="">Selecione a unidade</option>
                ${unitOptions}
              </select>
            </label>
            <label class="form-field ti-modal-field">
              <span class="form-label">Categoria</span>
              <select class="user-admin-select" data-ti-field="categoria">
                <option value="">Selecione a categoria</option>
                ${categoryOptions}
              </select>
            </label>
          </div>

          <label class="form-field ti-modal-field ti-modal-field--full">
            <span class="form-label ti-modal-desc-label">
              Descri\u00e7\u00e3o
              <span class="ti-modal-char-count" data-ti-chars>0/${MAX_DESC}</span>
            </span>
            <textarea
              class="ti-modal-textarea"
              placeholder="Descreva sua solicita\u00e7\u00e3o, problema ou necessidade\u2026"
              data-ti-desc
              maxlength="${MAX_DESC}"
              rows="4"
            ></textarea>
          </label>

          <div class="ti-modal-feedback" data-ti-feedback aria-live="polite"></div>

          <div class="ti-modal-actions">
            <button type="submit" class="module-action-button" data-ti-submit>
              <i data-lucide="send"></i>
              <span>Enviar chamado</span>
            </button>
            <button type="button" class="module-link-button is-secondary" data-ti-close>
              <i data-lucide="x"></i>
              <span>Cancelar</span>
            </button>
          </div>
        </form>

        <div class="ti-modal-success" data-ti-success>
          <span class="ti-modal-success-icon"><i data-lucide="circle-check"></i></span>
          <div class="ti-modal-success-copy">
            <h3 class="ti-modal-success-title">Chamado enviado com sucesso!</h3>
            <p class="ti-modal-success-desc">Sua solicita\u00e7\u00e3o foi registrada. A equipe de TI entrar\u00e1 em contato em breve.</p>
          </div>
          <button type="button" class="module-link-button is-secondary" data-ti-close>
            <span>Fechar</span>
          </button>
        </div>
      </div>
    </div>
  `;
}
