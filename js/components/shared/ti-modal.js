import { refreshLucideIcons } from '../../services/icons.service.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { criarChamadoTI } from '../../services/ti-requests.service.js';
import { animateOut } from '../../utils/motion.js';
import { TI_UNITS, TI_CATEGORIES, MAX_DESC } from './ti-modal.constants.js';
import { getMotoristaFormMarkup, bindMotoristaForm } from './ti-modal.motorista.js';

let activeTiModal = null;
let activeEscapeHandler = null;

export function openTiModal({ user = null } = {}) {
  closeTiModal();

  const overlay = document.createElement('div');
  overlay.className = 'video-modal-backdrop ti-modal-backdrop';
  overlay.innerHTML = getDestinationStepMarkup();

  const dialog = overlay.querySelector('[role="dialog"]');
  document.body.appendChild(overlay);
  document.body.classList.add('has-video-modal');
  refreshLucideIcons(overlay);
  activeTiModal = overlay;

  // Fechar ao clicar no backdrop ou no X
  // Usa closest() em vez de dialog.contains() — mais robusto quando o
  // conteúdo do dialog é substituído dinamicamente (_openForm).
  overlay.addEventListener('click', (e) => {
    if (!e.target.closest('[role="dialog"]')) closeTiModal();
  });
  activeEscapeHandler = (e) => { if (e.key === 'Escape') closeTiModal(); };
  document.addEventListener('keydown', activeEscapeHandler);

  // Bind na seleção de destino — stopPropagation obrigatório:
  // _openForm substitui dialog.innerHTML, removendo o botão clicado do DOM.
  // O evento continua borbulhando; sem stopPropagation, overlay.click →
  // dialog.contains(e.target) = false (elemento desanexado) → closeTiModal().
  overlay.querySelector('[data-ti-dest="retaguarda"]')
    ?.addEventListener('click', (e) => { e.stopPropagation(); _openForm(overlay, user, 'retaguarda'); });
  overlay.querySelector('[data-ti-dest="motorista"]')
    ?.addEventListener('click', (e) => { e.stopPropagation(); _openForm(overlay, user, 'motorista'); });
  overlay.querySelectorAll('[data-ti-close]')
    .forEach((btn) => btn.addEventListener('click', closeTiModal));
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
  const target = activeTiModal;
  activeTiModal = null;
  animateOut(target, 'is-closing', 200, () => {
    target.remove();
    document.body.classList.remove('has-video-modal');
  });
}

// ── Passo 1: seleção de destino ───────────────────────────────────────────

function getDestinationStepMarkup() {
  return `
    <div class="ti-modal" role="dialog" aria-modal="true" aria-label="Abrir Chamado — Selecionar Destino">
      <div class="ti-modal-head">
        <div class="ti-modal-head-copy">
          <span class="ti-modal-eyebrow">Novo chamado</span>
          <strong class="ti-modal-title">Para onde deseja enviar?</strong>
        </div>
        <button type="button" class="video-modal-close" data-ti-close aria-label="Fechar">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="ti-modal-body ti-dest-body">
        <p class="ti-dest-hint">Selecione o setor que irá receber e tratar este chamado.</p>
        <div class="ti-dest-grid">
          <button type="button" class="ti-dest-card" data-ti-dest="retaguarda">
            <span class="ti-dest-icon"><i data-lucide="monitor-cog"></i></span>
            <strong class="ti-dest-label">Retaguarda</strong>
            <span class="ti-dest-sub">Suporte técnico e desenvolvimento</span>
          </button>
          <button type="button" class="ti-dest-card" data-ti-dest="motorista">
            <span class="ti-dest-icon"><i data-lucide="car"></i></span>
            <strong class="ti-dest-label">Central de Motoristas</strong>
            <span class="ti-dest-sub">Entregas, coletas e outros serviços</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── Passo 2: formulário específico por destino ────────────────────────────

function _openForm(overlay, user, destino) {
  const dialog = overlay.querySelector('[role="dialog"]');
  dialog.innerHTML = destino === 'motorista'
    ? getMotoristaFormMarkup(user)
    : _getRetaguardaFormMarkup(user);

  refreshLucideIcons(dialog);

  dialog.querySelectorAll('[data-ti-close]')
    .forEach((btn) => btn.addEventListener('click', closeTiModal));

  if (destino === 'motorista') {
    bindMotoristaForm(overlay, dialog, user);
  } else {
    _bindRetaguardaForm(overlay, dialog, user);
  }

  requestAnimationFrame(() => {
    dialog.querySelector('[data-ti-field="unidade"]')?.focus();
  });
}

// ── Retaguarda ─────────────────────────────────────────────────────────────

function _getRetaguardaFormMarkup(user) {
  const nomeDisplay  = user?.nome  ? sanitizeText(user.nome)  : 'Usuário';
  const setorDisplay = user?.setor ? sanitizeText(user.setor) : '—';

  const unitOptions = TI_UNITS.map((u) =>
    `<option value="${sanitizeAttribute(u)}">${sanitizeText(u)}</option>`
  ).join('');

  const categoryOptions = TI_CATEGORIES.map((c) =>
    `<option value="${sanitizeAttribute(c)}">${sanitizeText(c)}</option>`
  ).join('');

  return `
    <div class="ti-modal-head">
      <div class="ti-modal-head-copy">
        <span class="ti-modal-eyebrow">Suporte técnico · Retaguarda</span>
        <strong class="ti-modal-title">Fazer Requisição</strong>
      </div>
      <button type="button" class="video-modal-close" data-ti-close aria-label="Fechar">
        <i data-lucide="x"></i>
      </button>
    </div>
    <div class="ti-modal-body">
      <div class="ti-modal-requester">
        <i data-lucide="user-circle-2"></i>
        <span>Solicitante: <strong>${nomeDisplay}</strong> · ${setorDisplay}</span>
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
            Descrição
            <span class="ti-modal-char-count" data-ti-chars>0/${MAX_DESC}</span>
          </span>
          <textarea
            class="ti-modal-textarea"
            placeholder="Descreva sua solicitação, problema ou necessidade…"
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
          <p class="ti-modal-success-desc">Sua solicitação foi registrada. A equipe de TI entrará em contato em breve.</p>
        </div>
        <button type="button" class="module-link-button is-secondary" data-ti-close>
          <span>Fechar</span>
        </button>
      </div>
    </div>
  `;
}

function _bindRetaguardaForm(overlay, dialog, user) {
  const textarea  = dialog.querySelector('[data-ti-desc]');
  const charCount = dialog.querySelector('[data-ti-chars]');
  const form      = dialog.querySelector('[data-ti-form]');

  textarea?.addEventListener('input', () => {
    const len = textarea.value.length;
    if (charCount) {
      charCount.textContent = `${len}/${MAX_DESC}`;
      charCount.classList.toggle('is-near-limit', len >= MAX_DESC * 0.85);
      charCount.classList.toggle('is-at-limit', len >= MAX_DESC);
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const getValue = (field) => dialog.querySelector(`[data-ti-field="${field}"]`)?.value?.trim() || '';
    const unidade   = getValue('unidade');
    const categoria = getValue('categoria');
    const descricao = textarea?.value?.trim() || '';
    const feedback  = dialog.querySelector('[data-ti-feedback]');
    const submitBtn = dialog.querySelector('[data-ti-submit]');

    if (!unidade || !categoria || !descricao) {
      if (feedback) { feedback.textContent = 'Preencha todos os campos antes de enviar.'; feedback.className = 'ti-modal-feedback is-error'; }
      return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.querySelector('span').textContent = 'Enviando…'; }
    if (feedback) feedback.textContent = '';

    try {
      const response = await criarChamadoTI({
        solicitanteId:    String(user?.id   || ''),
        solicitanteNome:  String(user?.nome  || ''),
        solicitanteSetor: String(user?.setor || ''),
        unidade, categoria, descricao,
      });
      if (response?.success) {
        const formEl    = dialog.querySelector('[data-ti-form]');
        const successEl = dialog.querySelector('[data-ti-success]');
        if (formEl)    formEl.style.display = 'none';
        if (successEl) { successEl.style.display = 'flex'; refreshLucideIcons(successEl); }
      } else {
        if (feedback)  { feedback.textContent = response?.message || 'Não foi possível registrar o chamado.'; feedback.className = 'ti-modal-feedback is-error'; }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.querySelector('span').textContent = 'Enviar chamado'; }
      }
    } catch (err) {
      if (feedback)  { feedback.textContent = err?.message || 'Erro ao enviar. Tente novamente.'; feedback.className = 'ti-modal-feedback is-error'; }
      if (submitBtn) { submitBtn.disabled = false; submitBtn.querySelector('span').textContent = 'Enviar chamado'; }
    }
  });
}

