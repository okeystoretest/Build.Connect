import { refreshLucideIcons } from '../../services/icons.service.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { criarChamadoTI, criarChamadoMotorista } from '../../services/ti-requests.service.js';
import { animateOut } from '../../utils/motion.js';
import { loadActiveUsers } from '../../services/users.service.js';

const TI_UNITS = ['Unidade 1', 'Unidade 2', 'Unidade 3', 'Unidade 4', 'Iguatemi', 'Centro Fashion', 'Showroom'];

const TI_CATEGORIES = [
  'Equipamentos',
  'Aplicativos',
  'Planilhas e Documentos',
  'Internet e Rede',
  'Sites e Sistemas Internos',
  'Acessos e Segurança',
  'Solicitações de Novos Recursos',
  'Desenvolvimento',
  'On-Boarding',
  'Off-Boarding',
];

const MOTORISTA_TIPOS_SERVICO = [
  'Entrega',
  'Coleta',
  'Serviço',
  'Compra',
  'Transporte',
  'Manutenção do Veículo',
];

const MAX_DESC = 2000;

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
    ? _getMotoristaFormMarkup(user)
    : _getRetaguardaFormMarkup(user);

  refreshLucideIcons(dialog);

  dialog.querySelectorAll('[data-ti-close]')
    .forEach((btn) => btn.addEventListener('click', closeTiModal));

  if (destino === 'motorista') {
    _bindMotoristaForm(overlay, dialog, user);
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

// ── Motorista ──────────────────────────────────────────────────────────────

// ── Busca usuários do setor Motorista para o dropdown ─────────────────────

async function _fetchMotoristUsers() {
  try {
    const response = await loadActiveUsers();
    if (!response?.success) return [];
    const users = Array.isArray(response.users) ? response.users : [];
    return users.filter((u) => {
      const sectors = String(u.setor || '').toLowerCase().split(/[,;|]+/).map((s) => s.trim());
      return sectors.includes('motorista');
    });
  } catch { return []; }
}

function _getMotoristaFormMarkup(user) {
  const nomeDisplay  = user?.nome  ? sanitizeText(user.nome)  : 'Usuário';
  const setorDisplay = user?.setor ? sanitizeText(user.setor) : '—';

  const unitOptions = TI_UNITS.map((u) =>
    `<option value="${sanitizeAttribute(u)}">${sanitizeText(u)}</option>`
  ).join('');

  const tipoOptions = MOTORISTA_TIPOS_SERVICO.map((t) =>
    `<option value="${sanitizeAttribute(t)}">${sanitizeText(t)}</option>`
  ).join('');

  return `
    <div class="ti-modal-head">
      <div class="ti-modal-head-copy">
        <span class="ti-modal-eyebrow">Requisição · Motorista</span>
        <strong class="ti-modal-title">Fazer Requisição</strong>
      </div>
      <button type="button" class="video-modal-close" data-ti-close aria-label="Fechar">
        <i data-lucide="x"></i>
      </button>
    </div>
    <div class="ti-modal-body">
      <div class="ti-modal-requester">
        <i data-lucide="user-circle-2"></i>
        <span>Operador: <strong>${nomeDisplay}</strong> · ${setorDisplay}</span>
      </div>
      <form class="ti-modal-form" data-ti-form novalidate>
        <label class="form-field ti-modal-field ti-modal-field--full">
          <span class="form-label">Motorista</span>
          <select class="user-admin-select" data-ti-field="motorista" data-ti-motorista-select>
            <option value="">Carregando motoristas…</option>
          </select>
        </label>
        <div class="ti-modal-grid">
          <label class="form-field ti-modal-field">
            <span class="form-label">Unidade</span>
            <select class="user-admin-select" data-ti-field="unidade">
              <option value="">Selecione a unidade</option>
              ${unitOptions}
            </select>
          </label>
          <label class="form-field ti-modal-field">
            <span class="form-label">Tipo de Serviço</span>
            <select class="user-admin-select" data-ti-field="tipoServico">
              <option value="">Selecione o tipo</option>
              ${tipoOptions}
            </select>
          </label>
        </div>
        <div class="ti-modal-grid">
          <label class="form-field ti-modal-field">
            <span class="form-label">Cidade</span>
            <input type="text" class="user-admin-input" data-ti-field="cidade"
              placeholder="Ex: Fortaleza" maxlength="100" />
          </label>
          <label class="form-field ti-modal-field">
            <span class="form-label">Bairro</span>
            <input type="text" class="user-admin-input" data-ti-field="bairro"
              placeholder="Ex: Meireles" maxlength="100" />
          </label>
        </div>
        <label class="form-field ti-modal-field ti-modal-field--full">
          <span class="form-label">Endereço</span>
          <input type="text" class="user-admin-input" data-ti-field="endereco"
            placeholder="Rua, número, complemento…" maxlength="200" />
        </label>
        <label class="form-field ti-modal-field ti-modal-field--full">
          <span class="form-label ti-modal-desc-label">
            Descrição
            <span class="ti-modal-char-count" data-ti-chars>0/${MAX_DESC}</span>
          </span>
          <textarea
            class="ti-modal-textarea"
            placeholder="Descreva a solicitação com detalhes relevantes…"
            data-ti-desc
            maxlength="${MAX_DESC}"
            rows="3"
          ></textarea>
        </label>
        <div class="ti-modal-feedback" data-ti-feedback aria-live="polite"></div>
        <div class="ti-modal-actions">
          <button type="submit" class="module-action-button" data-ti-submit>
            <i data-lucide="send"></i>
            <span>Enviar requisição</span>
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
          <h3 class="ti-modal-success-title">Requisição enviada com sucesso!</h3>
          <p class="ti-modal-success-desc">Sua solicitação foi registrada e estará disponível para o setor Motorista.</p>
        </div>
        <button type="button" class="module-link-button is-secondary" data-ti-close>
          <span>Fechar</span>
        </button>
      </div>
    </div>
  `;
}

function _bindMotoristaForm(overlay, dialog, user) {
  const textarea      = dialog.querySelector('[data-ti-desc]');
  const charCount     = dialog.querySelector('[data-ti-chars]');
  const form          = dialog.querySelector('[data-ti-form]');
  const motoristaSelect = dialog.querySelector('[data-ti-motorista-select]');

  // Carrega usuários do setor Motorista de forma assíncrona
  _fetchMotoristUsers().then((users) => {
    if (!motoristaSelect || !dialog.isConnected) return;
    if (users.length === 0) {
      motoristaSelect.innerHTML = '<option value="">Nenhum motorista encontrado</option>';
      return;
    }
    motoristaSelect.innerHTML = '<option value="">Selecione o motorista</option>'
      + users.map((u) =>
          `<option value="${sanitizeAttribute(u.id)}"
            data-nome="${sanitizeAttribute(u.nome || '')}"
            data-setor="${sanitizeAttribute(u.setor || 'motorista')}"
          >${sanitizeText(u.nome || u.id)}</option>`
        ).join('');
  });

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
    const motoristaId  = getValue('motorista');
    const unidade      = getValue('unidade');
    const tipoServico  = getValue('tipoServico');
    const cidade       = getValue('cidade');
    const bairro       = getValue('bairro');
    const endereco     = getValue('endereco');
    const descricao    = textarea?.value?.trim() || '';
    const feedback     = dialog.querySelector('[data-ti-feedback]');
    const submitBtn    = dialog.querySelector('[data-ti-submit]');

    if (!motoristaId || !unidade || !tipoServico || !cidade || !bairro || !endereco || !descricao) {
      if (feedback) { feedback.textContent = 'Preencha todos os campos obrigatórios antes de enviar.'; feedback.className = 'ti-modal-feedback is-error'; }
      return;
    }

    // Resolve nome e setor do motorista selecionado a partir do option DOM
    const selectedOption = motoristaSelect?.querySelector(`option[value="${CSS.escape(motoristaId)}"]`);
    const motoristaNome  = selectedOption?.dataset?.nome  || motoristaId;
    const motoristaSetor = selectedOption?.dataset?.setor || 'motorista';

    if (submitBtn) { submitBtn.disabled = true; submitBtn.querySelector('span').textContent = 'Enviando…'; }
    if (feedback) feedback.textContent = '';

    try {
      const response = await criarChamadoMotorista({
        // Solicitante = usuário logado; a edge function usa session.usuario_id para o ID
        // Corrigido: solicitanteNome/Setor devem ser do usuário que abriu o chamado, não do motorista atribuído
        solicitanteId:     String(user?.id    || ''),
        solicitanteNome:   String(user?.nome  || ''),
        solicitanteSetor:  String(user?.setor || ''),
        unidade, tipoServico, cidade, bairro, endereco, descricao,
        // F1: motorista selecionado vira o responsável direto — status inicia como 'Atribuído'
        atribuidoParaId:   motoristaId,
        atribuidoParaNome: motoristaNome,
      });
      if (response?.success) {
        const formEl    = dialog.querySelector('[data-ti-form]');
        const successEl = dialog.querySelector('[data-ti-success]');
        if (formEl)    formEl.style.display = 'none';
        if (successEl) { successEl.style.display = 'flex'; refreshLucideIcons(successEl); }
      } else {
        if (feedback)  { feedback.textContent = response?.message || 'Não foi possível registrar a requisição.'; feedback.className = 'ti-modal-feedback is-error'; }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.querySelector('span').textContent = 'Enviar requisição'; }
      }
    } catch (err) {
      if (feedback)  { feedback.textContent = err?.message || 'Erro ao enviar. Tente novamente.'; feedback.className = 'ti-modal-feedback is-error'; }
      if (submitBtn) { submitBtn.disabled = false; submitBtn.querySelector('span').textContent = 'Enviar requisição'; }
    }
  });
}
