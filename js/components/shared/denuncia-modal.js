import { refreshLucideIcons } from '../../services/icons.service.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { loadPublicUsers } from '../../services/anon-feedback.service.js';
import { createDenuncia, uploadDenunciaAnexo, DENUNCIA_MAX_ANEXOS } from '../../services/denuncias.service.js';
import { animateOut } from '../../utils/motion.js';

let activeModal = null;
let escHandler  = null;
let selectedFiles = [];

export async function openDenunciaModal() {
  closeDenunciaModal();
  selectedFiles = [];

  const overlay = document.createElement('div');
  overlay.className = 'video-modal-backdrop anon-fb-backdrop';
  overlay.innerHTML = getLoadingMarkup();

  document.body.appendChild(overlay);
  document.body.classList.add('has-video-modal');
  refreshLucideIcons(overlay);
  activeModal = overlay;

  escHandler = (e) => { if (e.key === 'Escape') closeDenunciaModal(); };
  document.addEventListener('keydown', escHandler);
  overlay.addEventListener('click', (e) => {
    if (!overlay.querySelector('[role="dialog"]')?.contains(e.target)) closeDenunciaModal();
  });

  // Colaboradores para o seletor de envolvido (opcional). Rota pública.
  let users = [];
  try {
    const res = await loadPublicUsers();
    users = Array.isArray(res?.users) ? res.users : [];
  } catch (_) { users = []; }

  if (!activeModal) return;

  overlay.innerHTML = getFormMarkup(users);
  refreshLucideIcons(overlay);
  bindFormEvents(overlay, users);
}

export function closeDenunciaModal() {
  if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null; }
  selectedFiles = [];
  if (!activeModal) { document.body.classList.remove('has-video-modal'); return; }

  const target = activeModal;
  activeModal = null;
  animateOut(target, 'is-closing', 200, () => {
    target.remove();
    document.body.classList.remove('has-video-modal');
  });
}

function bindFormEvents(overlay, users) {
  overlay.querySelectorAll('[data-den-close]').forEach((b) => b.addEventListener('click', closeDenunciaModal));

  // ── Seletor de envolvido (opcional) ────────────────────────────────────
  const searchInput = overlay.querySelector('[data-den-search]');
  const dropdown    = overlay.querySelector('[data-den-dropdown]');
  const hiddenId    = overlay.querySelector('[data-den-user-id]');
  const hiddenNome  = overlay.querySelector('[data-den-user-nome]');
  const hiddenSetor = overlay.querySelector('[data-den-user-setor]');

  function filterUsers(q) {
    const norm = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return users.filter((u) => {
      const n = (u.nome + ' ' + u.id).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return n.includes(norm);
    });
  }

  function showDropdown(q) {
    const filtered = filterUsers(q);
    dropdown.innerHTML = filtered.length === 0
      ? `<div class="anon-fb-no-results">Nenhum colaborador encontrado</div>`
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
        hiddenSetor.value = btn.dataset.userSetor || '';
        searchInput.value = `${btn.dataset.userId} — ${btn.dataset.userNome}`;
        dropdown.style.display = 'none';
      });
    });
  }

  searchInput?.addEventListener('input', () => {
    hiddenId.value = ''; hiddenNome.value = ''; hiddenSetor.value = '';
    if (searchInput.value.trim().length >= 1) showDropdown(searchInput.value);
    else dropdown.style.display = 'none';
  });
  document.addEventListener('click', (e) => {
    if (!overlay.querySelector('.anon-fb-picker')?.contains(e.target)) dropdown.style.display = 'none';
  });

  // ── Anexos ─────────────────────────────────────────────────────────────
  const fileInput = overlay.querySelector('[data-den-file]');
  const fileList  = overlay.querySelector('[data-den-file-list]');

  function renderFileList() {
    fileList.innerHTML = selectedFiles.map((f, i) => `
      <li class="den-file-item">
        <i data-lucide="${f.type === 'application/pdf' ? 'file-text' : 'image'}"></i>
        <span class="den-file-name">${sanitizeText(f.name)}</span>
        <button type="button" class="den-file-remove" data-den-file-remove="${i}" aria-label="Remover anexo"><i data-lucide="x"></i></button>
      </li>`).join('');
    refreshLucideIcons(fileList);
    fileList.querySelectorAll('[data-den-file-remove]').forEach((b) => {
      b.addEventListener('click', () => {
        selectedFiles.splice(Number(b.dataset.denFileRemove), 1);
        renderFileList();
      });
    });
  }

  fileInput?.addEventListener('change', () => {
    const incoming = Array.from(fileInput.files || []);
    for (const f of incoming) {
      if (selectedFiles.length >= DENUNCIA_MAX_ANEXOS) break;
      selectedFiles.push(f);
    }
    fileInput.value = '';
    renderFileList();
  });

  // ── Submit ─────────────────────────────────────────────────────────────
  const form = overlay.querySelector('[data-den-form]');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const descricao = overlay.querySelector('[data-den-descricao]')?.value?.trim() || '';
    const descErr   = overlay.querySelector('[data-den-desc-error]');
    const submitBtn = overlay.querySelector('[data-den-submit]');

    if (!descricao) {
      if (descErr) descErr.style.display = '';
      return;
    }
    if (descErr) descErr.style.display = 'none';

    const setLabel = (t) => {
      if (!submitBtn) return;
      const span = submitBtn.querySelector('span');
      if (span) span.textContent = t; else submitBtn.textContent = t;
    };
    const setLoading = (on) => {
      if (!submitBtn) return;
      submitBtn.disabled = on;
      submitBtn.classList.toggle('is-loading', on);
    };

    setLoading(true);
    setLabel('Enviando…');

    try {
      const created = await createDenuncia({
        envolvidoId: hiddenId.value.trim(),
        envolvidoNome: hiddenNome.value.trim(),
        envolvidoSetor: hiddenSetor.value.trim(),
        descricao,
      });

      if (!created.success) {
        setLoading(false); setLabel('Enviar denúncia');
        if (descErr) { descErr.textContent = created.message || 'Erro ao registrar a denúncia.'; descErr.style.display = ''; }
        return;
      }

      // Upload sequencial dos anexos (best-effort; falha de anexo não invalida a denúncia).
      let anexoFalhas = 0;
      for (const file of selectedFiles) {
        setLabel(`Enviando anexos…`);
        const up = await uploadDenunciaAnexo(created.denunciaId, file);
        if (!up.success) anexoFalhas++;
      }

      const f = overlay.querySelector('[data-den-form]');
      const s = overlay.querySelector('[data-den-success]');
      if (f) f.style.display = 'none';
      if (s) {
        if (anexoFalhas > 0) {
          const note = s.querySelector('[data-den-success-note]');
          if (note) note.textContent = `Denúncia registrada. ${anexoFalhas} anexo(s) não puderam ser enviados.`;
        }
        s.style.display = 'flex';
        refreshLucideIcons(s);
      }
    } catch (err) {
      setLoading(false); setLabel('Enviar denúncia');
      if (descErr) { descErr.textContent = err?.message || 'Falha ao enviar. Tente novamente.'; descErr.style.display = ''; }
    }
  });
}

function getLoadingMarkup() {
  return `
    <div class="anon-fb-modal anon-fb-dialog den-dialog" role="dialog" aria-modal="true" aria-label="Denúncia anônima">
      <div class="anon-fb-head">
        <div class="anon-fb-head-copy">
          <span class="anon-fb-eyebrow">Canal confidencial &amp; anônimo</span>
          <strong class="anon-fb-title">Denúncia Anônima</strong>
        </div>
        <button type="button" class="video-modal-close" data-den-close aria-label="Fechar"><i data-lucide="x"></i></button>
      </div>
      <div class="anon-fb-body">
        <div class="ti-requests-loading"><div class="ti-loading-spinner"><i data-lucide="loader-circle"></i></div><p>Carregando…</p></div>
      </div>
    </div>`;
}

function getFormMarkup(users) {
  const hasUsers = users.length > 0;
  return `
    <div class="anon-fb-modal anon-fb-dialog den-dialog" role="dialog" aria-modal="true" aria-label="Denúncia anônima">
      <div class="anon-fb-head">
        <div class="anon-fb-head-copy">
          <span class="anon-fb-eyebrow">Canal confidencial &amp; anônimo</span>
          <strong class="anon-fb-title">Denúncia Anônima</strong>
        </div>
        <button type="button" class="video-modal-close" data-den-close aria-label="Fechar"><i data-lucide="x"></i></button>
      </div>

      <div class="anon-fb-body">
        <p class="anon-fb-info">
          <i data-lucide="shield"></i>
          Sua identidade não é registrada. Este canal atende à NR-1 e é tratado de forma confidencial pelo DHO.
        </p>

        <form class="anon-fb-form" data-den-form novalidate>
          <input type="hidden" data-den-user-id />
          <input type="hidden" data-den-user-nome />
          <input type="hidden" data-den-user-setor />

          <div class="form-field anon-fb-field">
            <span class="form-label">Envolvido / destinatário <em class="den-optional">(opcional)</em></span>
            <div class="anon-fb-picker">
              <div class="input-shell anon-fb-search-shell">
                <span class="input-icon" aria-hidden="true"><i data-lucide="search"></i></span>
                <input class="anon-fb-search" type="text" placeholder="${hasUsers ? 'Buscar colaborador por nome ou ID…' : 'Lista indisponível no momento'}" data-den-search autocomplete="off" ${!hasUsers ? 'disabled' : ''} />
              </div>
              <div class="anon-fb-dropdown" data-den-dropdown style="display:none"></div>
            </div>
          </div>

          <div class="form-field anon-fb-field">
            <span class="form-label">Descrição dos fatos</span>
            <textarea class="ti-modal-textarea" data-den-descricao placeholder="Descreva o ocorrido com o máximo de detalhes possível…" rows="6" maxlength="1000"></textarea>
            <span class="ti-obs-error" data-den-desc-error style="display:none">Descreva os fatos antes de enviar.</span>
          </div>

          <div class="form-field anon-fb-field">
            <span class="form-label">Anexos <em class="den-optional">(fotos ou PDF, até ${DENUNCIA_MAX_ANEXOS})</em></span>
            <label class="den-file-drop">
              <i data-lucide="paperclip"></i>
              <span>Adicionar evidências</span>
              <input type="file" data-den-file accept="image/jpeg,image/png,image/webp,application/pdf" multiple hidden />
            </label>
            <ul class="den-file-list" data-den-file-list></ul>
          </div>

          <div class="ti-modal-actions">
            <button type="submit" class="module-action-button" data-den-submit>
              <i data-lucide="send"></i><span>Enviar denúncia</span>
            </button>
            <button type="button" class="module-link-button is-secondary" data-den-close>
              <i data-lucide="x"></i><span>Cancelar</span>
            </button>
          </div>
        </form>

        <div class="ti-modal-success" data-den-success>
          <span class="ti-modal-success-icon"><i data-lucide="circle-check"></i></span>
          <div class="ti-modal-success-copy">
            <h3 class="ti-modal-success-title">Denúncia registrada!</h3>
            <p class="ti-modal-success-desc" data-den-success-note>Sua denúncia foi registrada de forma anônima e será tratada pelo DHO.</p>
          </div>
          <button type="button" class="module-link-button is-secondary" data-den-close><span>Fechar</span></button>
        </div>
      </div>
    </div>`;
}
