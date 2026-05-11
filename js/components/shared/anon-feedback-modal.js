import { refreshLucideIcons } from '../../services/icons.service.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { loadActiveUsers } from '../../services/users.service.js';
import { saveEvaluationRecord } from '../../services/evaluations.service.js';

let activeModal = null;
let escHandler  = null;

export async function openAnonFeedbackModal() {
  closeAnonFeedbackModal();

  const overlay = document.createElement('div');
  overlay.className = 'video-modal-backdrop anon-fb-backdrop';
  overlay.innerHTML = getLoadingMarkup();

  document.body.appendChild(overlay);
  document.body.classList.add('has-video-modal');
  refreshLucideIcons(overlay);
  activeModal = overlay;

  escHandler = (e) => { if (e.key === 'Escape') closeAnonFeedbackModal(); };
  document.addEventListener('keydown', escHandler);
  overlay.addEventListener('click', (e) => {
    if (!overlay.querySelector('[role="dialog"]')?.contains(e.target)) closeAnonFeedbackModal();
  });

  // Load users
  let users = [];
  try {
    const res = await loadActiveUsers({ forceRefresh: true });
    users = Array.isArray(res?.users) ? res.users : [];
  } catch (_) { users = []; }

  if (!activeModal) return; // closed while loading

  overlay.innerHTML = getFormMarkup(users);
  refreshLucideIcons(overlay);

  bindFormEvents(overlay, users);
}

export function closeAnonFeedbackModal() {
  if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null; }
  if (!activeModal) { document.body.classList.remove('has-video-modal'); return; }
  activeModal.remove();
  activeModal = null;
  document.body.classList.remove('has-video-modal');
}

function bindFormEvents(overlay, users) {
  overlay.querySelectorAll('[data-anon-close]').forEach((b) => b.addEventListener('click', closeAnonFeedbackModal));

  const searchInput = overlay.querySelector('[data-anon-search]');
  const dropdown    = overlay.querySelector('[data-anon-dropdown]');
  const selectedDiv = overlay.querySelector('[data-anon-selected]');
  const hiddenId    = overlay.querySelector('[data-anon-user-id]');
  const hiddenNome  = overlay.querySelector('[data-anon-user-nome]');
  const hiddenSetor = overlay.querySelector('[data-anon-user-setor]');
  const form        = overlay.querySelector('[data-anon-form]');

  function filterUsers(q) {
    const norm = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return users.filter((u) => {
      const n = (u.nome + ' ' + u.id).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return n.includes(norm);
    });
  }

  function showDropdown(q) {
    const filtered = filterUsers(q);
    dropdown.innerHTML = filtered.length === 0
      ? `<div class="anon-fb-no-results">Nenhum usuário encontrado</div>`
      : filtered.map((u) => `
          <button type="button" class="anon-fb-option" data-user-id="${sanitizeAttribute(u.id)}" data-user-nome="${sanitizeAttribute(u.nome)}" data-user-setor="${sanitizeAttribute(u.setor || '')}">
            <span class="anon-fb-opt-id">${sanitizeText(u.id)}</span>
            <span class="anon-fb-opt-name">${sanitizeText(u.nome)}</span>
          </button>`).join('');
    dropdown.style.display = '';

    dropdown.querySelectorAll('[data-user-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        hiddenId.value    = btn.dataset.userId   || '';
        hiddenNome.value  = btn.dataset.userNome || '';
        hiddenSetor.value = btn.dataset.userSetor|| '';
        searchInput.value = `${btn.dataset.userId} — ${btn.dataset.userNome}`;
        selectedDiv.textContent = `Feedback para ${btn.dataset.userNome}`;
        dropdown.style.display = 'none';
        overlay.querySelector('[data-anon-user-error]').style.display = 'none';
      });
    });
  }

  searchInput?.addEventListener('input', () => {
    hiddenId.value = '';
    if (searchInput.value.trim().length >= 1) { showDropdown(searchInput.value); }
    else { dropdown.style.display = 'none'; }
  });

  searchInput?.addEventListener('focus', () => {
    if (searchInput.value.trim().length >= 1) showDropdown(searchInput.value);
  });

  document.addEventListener('click', function handler(e) {
    if (!overlay.querySelector('.anon-fb-picker')?.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  }, { once: false });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const targetId    = hiddenId.value.trim();
    const targetNome  = hiddenNome.value.trim();
    const targetSetor = hiddenSetor.value.trim();
    const mensagem    = overlay.querySelector('[data-anon-message]')?.value?.trim() || '';
    const userErr     = overlay.querySelector('[data-anon-user-error]');
    const msgErr      = overlay.querySelector('[data-anon-msg-error]');
    const submitBtn   = overlay.querySelector('[data-anon-submit]');

    let valid = true;
    if (!targetId) { if (userErr) userErr.style.display = ''; valid = false; }
    else { if (userErr) userErr.style.display = 'none'; }
    if (!mensagem)  { if (msgErr)  msgErr.style.display  = ''; valid = false; }
    else { if (msgErr)  msgErr.style.display  = 'none'; }
    if (!valid) return;

    if (submitBtn) { submitBtn.disabled = true; submitBtn.querySelector('span').textContent = 'Enviando…'; }

    try {
      const response = await saveEvaluationRecord({
        toolId:    'feedback',
        toolTitle: 'Feedback',
        sectorId:  targetSetor,
        sectorName:targetSetor,
        respondent: { id: 'ANONIMO', nome: 'Feedback Anônimo', nivel: 'anonimo' },
        evaluatee:  { id: targetId, nome: targetNome, setor: targetSetor },
        evaluationDate: new Date().toISOString(),
        notes: mensagem,
        fields: {}, scores: {}, totals: {}, summary: {},
        source: 'Anônimo',
      });

      if (response?.success || response?.record) {
        const f = overlay.querySelector('[data-anon-form]');
        const s = overlay.querySelector('[data-anon-success]');
        if (f) f.style.display = 'none';
        if (s) { s.style.display = 'flex'; refreshLucideIcons(s); }
      } else {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.querySelector('span').textContent = 'Enviar feedback'; }
        const msgErr2 = overlay.querySelector('[data-anon-msg-error]');
        if (msgErr2) { msgErr2.textContent = response?.message || 'Erro ao enviar feedback.'; msgErr2.style.display = ''; }
      }
    } catch (err) {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.querySelector('span').textContent = 'Enviar feedback'; }
    }
  });
}

function getLoadingMarkup() {
  return `
    <div class="anon-fb-modal" role="dialog" aria-modal="true" aria-label="Feedback anônimo">
      <div class="anon-fb-head">
        <div class="anon-fb-head-copy">
          <span class="anon-fb-eyebrow">Anônimo &amp; privado</span>
          <strong class="anon-fb-title">Deixar Feedback Anônimo</strong>
        </div>
        <button type="button" class="video-modal-close" data-anon-close aria-label="Fechar"><i data-lucide="x"></i></button>
      </div>
      <div class="anon-fb-body">
        <div class="ti-requests-loading"><div class="ti-loading-spinner"><i data-lucide="loader-circle"></i></div><p>Carregando colaboradores…</p></div>
      </div>
    </div>`;
}

function getFormMarkup(users) {
  const hasUsers = users.length > 0;

  return `
    <div class="anon-fb-modal" role="dialog" aria-modal="true" aria-label="Feedback anônimo">
      <div class="anon-fb-head">
        <div class="anon-fb-head-copy">
          <span class="anon-fb-eyebrow">Anônimo &amp; privado</span>
          <strong class="anon-fb-title">Deixar Feedback Anônimo</strong>
        </div>
        <button type="button" class="video-modal-close" data-anon-close aria-label="Fechar"><i data-lucide="x"></i></button>
      </div>

      <div class="anon-fb-body">
        <p class="anon-fb-info">
          <i data-lucide="shield"></i>
          Sua identidade não será registrada. O feedback será armazenado de forma anônima na plataforma.
        </p>

        <form class="anon-fb-form" data-anon-form novalidate>
          <input type="hidden" data-anon-user-id />
          <input type="hidden" data-anon-user-nome />
          <input type="hidden" data-anon-user-setor />

          <div class="form-field anon-fb-field">
            <span class="form-label">Para quem é este feedback?</span>
            <div class="anon-fb-picker">
              <div class="input-shell anon-fb-search-shell">
                <span class="input-icon" aria-hidden="true"><i data-lucide="search"></i></span>
                <input
                  class="anon-fb-search"
                  type="text"
                  placeholder="${hasUsers ? 'Buscar colaborador por nome ou ID…' : 'Nenhum colaborador encontrado'}"
                  data-anon-search
                  autocomplete="off"
                  ${!hasUsers ? 'disabled' : ''}
                />
              </div>
              <div class="anon-fb-dropdown" data-anon-dropdown style="display:none"></div>
            </div>
            <span class="anon-fb-selected" data-anon-selected></span>
            <span class="ti-obs-error" data-anon-user-error style="display:none">Selecione um colaborador.</span>
          </div>

          <div class="form-field anon-fb-field">
            <span class="form-label">Feedback</span>
            <textarea
              class="ti-modal-textarea"
              data-anon-message
              placeholder="Escreva aqui seu feedback de forma construtiva…"
              rows="5"
              maxlength="2000"
            ></textarea>
            <span class="ti-obs-error" data-anon-msg-error style="display:none">Escreva o feedback antes de enviar.</span>
          </div>

          <div class="ti-modal-actions">
            <button type="submit" class="module-action-button" data-anon-submit>
              <i data-lucide="send"></i><span>Enviar feedback</span>
            </button>
            <button type="button" class="module-link-button is-secondary" data-anon-close>
              <i data-lucide="x"></i><span>Cancelar</span>
            </button>
          </div>
        </form>

        <div class="ti-modal-success" data-anon-success>
          <span class="ti-modal-success-icon"><i data-lucide="circle-check"></i></span>
          <div class="ti-modal-success-copy">
            <h3 class="ti-modal-success-title">Feedback enviado!</h3>
            <p class="ti-modal-success-desc">Sua mensagem foi registrada de forma anônima.</p>
          </div>
          <button type="button" class="module-link-button is-secondary" data-anon-close><span>Fechar</span></button>
        </div>
      </div>
    </div>`;
}
