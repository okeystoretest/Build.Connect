/**
 * ti-modal.motorista.js
 * Formulario de Requisicao da Central de Motoristas (markup + binding).
 *
 * Extraido de ti-modal.js para respeitar o limite de 500 linhas por modulo.
 * O fechamento do modal permanece no host; este modulo apenas gera markup e\r\n * vincula os eventos do formulario.
 */

import { refreshLucideIcons } from '../../services/icons.service.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { criarChamadoMotorista, listarMotoristas } from '../../services/ti-requests.service.js';

// Sentinela do campo Motorista: valor selecionavel que representa "sem vinculo".
// Distinto de '' (nenhuma escolha feita), permitindo validar que o usuario
// decidiu conscientemente deixar a requisicao em aberto.
import { TI_UNITS, MOTORISTA_TIPOS_SERVICO, MAX_DESC } from './ti-modal.constants.js';

export const OPEN_ASSIGNMENT_VALUE = '__aberto__';
// ── Motorista ──────────────────────────────────────────────────────────────

// ── Busca usuários do setor Motorista para o dropdown ─────────────────────

// Regra de negócio: apenas usuários cujo acesso é EXCLUSIVAMENTE 'motorista'.
// Quem possui setores adicionais (ex.: 'logistica, motorista') ou acesso 'all'
// NÃO aparece como opção. A validação é replicada no backend (handleListMotoristas)
// e reforçada aqui como defesa em profundidade contra respostas inesperadas.
async function _fetchMotoristUsers() {
  try {
    const response = await listarMotoristas();
    if (!response?.success) return [];
    const users = Array.isArray(response.users) ? response.users : [];
    return users.filter((u) => {
      const sectors = String(u.setor || '')
        .toLowerCase()
        .split(/[,;|]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      return sectors.length === 1 && sectors[0] === 'motorista';
    });
  } catch { return []; }
}

export function getMotoristaFormMarkup(user) {
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
          <span class="ti-modal-field-hint">
            Selecione <strong>Em aberto</strong> para deixar a requisição disponível
            na coluna Pendente, permitindo que qualquer motorista assuma.
          </span>
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

export function bindMotoristaForm(overlay, dialog, user) {
  const textarea      = dialog.querySelector('[data-ti-desc]');
  const charCount     = dialog.querySelector('[data-ti-chars]');
  const form          = dialog.querySelector('[data-ti-form]');
  const motoristaSelect = dialog.querySelector('[data-ti-motorista-select]');

  // Carrega usuários do setor Motorista de forma assíncrona
  // Opção "Em aberto": não vincula motorista; o chamado nasce em 'Pendente'
  // e fica disponível para autoatribuição por qualquer motorista.
  const OPEN_OPTION = `<option value="${OPEN_ASSIGNMENT_VALUE}">Em aberto — qualquer motorista</option>`;

  _fetchMotoristUsers().then((users) => {
    if (!motoristaSelect || !dialog.isConnected) return;
    if (users.length === 0) {
      motoristaSelect.innerHTML = '<option value="">Selecione uma opção</option>'
        + OPEN_OPTION;
      return;
    }
    motoristaSelect.innerHTML = '<option value="">Selecione uma opção</option>'
      + OPEN_OPTION
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

    // "Em aberto": envia atribuição vazia — a edge function cria o chamado
    // com status 'Pendente' (hasAssignee === false).
    const isOpenAssignment = motoristaId === OPEN_ASSIGNMENT_VALUE;

    // Resolve nome do motorista selecionado a partir do option DOM
    const selectedOption = isOpenAssignment
      ? null
      : motoristaSelect?.querySelector(`option[value="${CSS.escape(motoristaId)}"]`);
    const motoristaNome = isOpenAssignment ? '' : (selectedOption?.dataset?.nome || motoristaId);

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
        // F1: motorista selecionado vira o responsável direto — status inicia como 'Atribuído'.
        // Em aberto: campos vazios → backend cria com status 'Pendente'.
        atribuidoParaId:   isOpenAssignment ? '' : motoristaId,
        atribuidoParaNome: isOpenAssignment ? '' : motoristaNome,
      });
      if (response?.success) {
        const formEl    = dialog.querySelector('[data-ti-form]');
        const successEl = dialog.querySelector('[data-ti-success]');
        const descEl    = dialog.querySelector('.ti-modal-success-desc');
        if (descEl && isOpenAssignment) {
          descEl.textContent = 'Sua solicitação foi registrada como Pendente e está disponível para qualquer motorista assumir.';
        }
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
