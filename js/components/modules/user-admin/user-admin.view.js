import { MODULE_STATUS } from '../../../constants/module.constants.js';
import { USER_ADMIN_SECTOR_OPTIONS, USER_LEVEL_OPTIONS } from '../../../constants/sector.constants.js';
import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';
import { getUserAdminUiState } from './user-admin.form.js';

export function getUserManagementModuleMarkup(card, moduleData, moduleUi) {
  const adminUi = getUserAdminUiState(moduleUi);
  const isEditMode = adminUi.mode === 'edit';
  const saveLabel = isEditMode ? 'Salvar edição' : 'Cadastrar usuário';
  const saveIcon = isEditMode ? 'save' : 'user-plus';
  const panelTitle = isEditMode ? 'Editar cadastro' : 'Novo cadastro';
  const panelSubtitle = isEditMode
    ? `Atualize os dados de ${sanitizeText(adminUi.originalId)} mantendo o acesso sincronizado.`
    : 'Preencha os dados essenciais para criar um novo acesso.';

  const successModal = adminUi.successModal
    ? renderUserAdminSuccessModal(adminUi.successModal)
    : '';

  return `
    <div class="module-shell user-admin-shell" data-module-shell>
      ${successModal}
      <div class="module-shell-header user-admin-hero">
        <div class="user-admin-hero-copy">
          <p class="module-eyebrow">DHO · Gestão de acessos</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Cadastre, localize e edite acessos de colaboradores em uma área segura e integrada ao banco de dados.</p>
        </div>

        <div class="module-source-pill user-admin-hero-pill" aria-label="Cadastro integrado ao Google Sheets">
          <i data-lucide="shield-check"></i>
          <span>Banco de dados sincronizado</span>
        </div>
      </div>

      <div class="user-admin-grid">
        <section class="user-admin-card user-admin-card--form" aria-label="Formulário de cadastro de usuários">
          <div class="user-admin-card-head">
            <span class="card-icon user-admin-card-icon" aria-hidden="true"><i data-lucide="${isEditMode ? 'user-cog' : 'badge-plus'}"></i></span>
            <div class="user-admin-card-copy">
              <span class="evaluation-meta-label">${isEditMode ? 'Modo edição' : 'Cadastro de colaborador'}</span>
              <h3 class="user-admin-title">${sanitizeText(panelTitle)}</h3>
              <p class="user-admin-subtitle">${sanitizeText(panelSubtitle)}</p>
            </div>
            <span class="user-admin-mode-pill">${isEditMode ? 'Edição' : 'Cadastro'}</span>
          </div>

          <div class="user-admin-form-grid">
            ${isEditMode ? renderEditIdField(adminUi) : renderAutoIdField(adminUi)}

            <label class="form-field user-admin-field">
              <span class="form-label">Nome completo</span>
              <input class="user-admin-input" type="text" value="${sanitizeAttribute(adminUi.form.nome)}" data-user-admin-field="nome" autocomplete="off" placeholder="Nome do colaborador" aria-label="Nome completo do colaborador" />
            </label>

            <label class="form-field user-admin-field">
              <span class="form-label">${isEditMode ? 'Nova senha (deixe em branco para manter)' : 'Senha'}</span>
              <span class="user-admin-password-wrap">
                <input class="user-admin-input" type="password" data-user-admin-field="senha" autocomplete="new-password" placeholder="${isEditMode ? 'Nova senha (opcional)' : 'Defina a senha de acesso'}" aria-label="Senha do colaborador" />
                <button type="button" class="user-admin-pw-toggle" data-pw-toggle aria-label="Alternar visibilidade da senha" tabindex="-1">
                  <i data-lucide="eye-off"></i>
                </button>
              </span>
            </label>
          </div>

          <div class="user-admin-nivel-block">
            <div class="user-admin-section-label">
              <span class="form-label">Nível de acesso</span>
              <small>Define as permissões do colaborador no sistema.</small>
            </div>
            <select class="user-admin-select" data-user-admin-field="nivel" aria-label="Nível de acesso do colaborador">
              ${USER_LEVEL_OPTIONS.map((option) => renderUserAdminNivelOption(option, adminUi.form.nivel)).join('')}
            </select>
          </div>

          <div class="user-admin-sector-block">
            <div class="user-admin-section-label">
              <span class="form-label">Setores de acesso</span>
              <small>Selecione um ou mais setores permitidos.</small>
            </div>
            <div class="user-admin-sector-grid" aria-label="Selecionar setores do usuário">
              ${USER_ADMIN_SECTOR_OPTIONS.map((option) => renderUserAdminSectorOption(option, adminUi.form.setores)).join('')}
            </div>
          </div>

          ${adminUi.feedbackMessage ? renderUserAdminFeedback(adminUi.feedbackMessage, adminUi.feedbackType) : ''}

          <div class="user-admin-actions">
            <button type="button" class="module-action-button" data-user-admin-save ${adminUi.isSubmitting ? 'disabled' : ''}>
              <i data-lucide="${sanitizeAttribute(saveIcon)}"></i>
              <span>${adminUi.isSubmitting ? 'Processando...' : saveLabel}</span>
            </button>
            <button type="button" class="module-link-button is-secondary" data-user-admin-clear ${adminUi.isSubmitting ? 'disabled' : ''}>
              <i data-lucide="rotate-ccw"></i>
              <span>Limpar</span>
            </button>
            ${isEditMode ? `
            <button type="button" class="module-link-button is-danger" data-user-admin-delete="${sanitizeAttribute(adminUi.originalId)}" ${adminUi.isSubmitting ? 'disabled' : ''}>
              <i data-lucide="trash-2"></i>
              <span>Excluir usuário</span>
            </button>
            ` : ''}
          </div>
        </section>

        <section class="user-admin-card user-admin-card--search" aria-label="Pesquisa de usuários cadastrados">
          <div class="user-admin-card-head">
            <span class="card-icon user-admin-card-icon" aria-hidden="true"><i data-lucide="users-round"></i></span>
            <div class="user-admin-card-copy">
              <span class="evaluation-meta-label">Consulta sob demanda</span>
              <h3 class="user-admin-title">Pesquisar usuário</h3>
              <p class="user-admin-subtitle">Localize um cadastro existente.</p>
            </div>
          </div>

          <div class="user-admin-search-row">
            <label class="module-search-shell user-admin-search-shell" aria-label="Pesquisar usuário por ID ou nome">
              <i data-lucide="search"></i>
              <input type="search" value="${sanitizeAttribute(adminUi.searchQuery)}" placeholder="Digite ID ou nome" data-user-admin-search-query autocomplete="off" aria-label="Pesquisar por ID ou nome" />
            </label>
            <button type="button" class="module-control-button" data-user-admin-search ${adminUi.isSubmitting || adminUi.searchStatus === MODULE_STATUS.loading ? 'disabled' : ''}>
              <i data-lucide="search-check"></i>
              <span>${adminUi.searchStatus === MODULE_STATUS.loading ? 'Buscando...' : 'Buscar'}</span>
            </button>
          </div>

          <div class="user-admin-results" aria-live="polite">
            ${renderUserAdminResults(adminUi)}
          </div>
        </section>
      </div>
    </div>
  `;
}

// ── ID field helpers ──────────────────────────────────────────────────────

function renderAutoIdField(adminUi) {
  const idDisplay = adminUi.nextIdLoading
    ? 'Carregando...'
    : adminUi.nextId || 'Gerado automaticamente';

  return `
    <div class="form-field user-admin-field user-admin-auto-id-field">
      <span class="form-label">ID do colaborador</span>
      <div class="user-admin-auto-id-display" aria-label="ID gerado automaticamente">
        <i data-lucide="hash"></i>
        <span>${sanitizeText(idDisplay)}</span>
        <span class="user-admin-auto-id-badge">Auto</span>
      </div>
    </div>
  `;
}

function renderEditIdField(adminUi) {
  return `
    <label class="form-field user-admin-field">
      <span class="form-label">ID do colaborador</span>
      <input class="user-admin-input" type="text" value="${sanitizeAttribute(adminUi.form.id)}" data-user-admin-field="id" autocomplete="off" placeholder="Ex.: 1024" aria-label="ID do colaborador" />
    </label>
  `;
}

// ── Success modal ─────────────────────────────────────────────────────────

function renderUserAdminSuccessModal(modal) {
  return `
    <div class="user-admin-success-overlay" data-user-admin-success-backdrop>
      <div class="user-admin-success-modal" role="dialog" aria-modal="true" aria-label="Cadastro realizado com sucesso">
        <div class="user-admin-success-icon-wrap">
          <i data-lucide="circle-check-big"></i>
        </div>
        <h3 class="user-admin-success-title">Cadastro realizado</h3>
        <p class="user-admin-success-subtitle">O colaborador foi cadastrado com sucesso. Anote ou copie as credenciais abaixo.</p>

        <div class="user-admin-success-data">
          <div class="user-admin-success-row">
            <span class="user-admin-success-label">ID do Colaborador</span>
            <strong class="user-admin-success-value">${sanitizeText(modal.id)}</strong>
          </div>
          <div class="user-admin-success-row">
            <span class="user-admin-success-label">Senha</span>
            <strong class="user-admin-success-value">${sanitizeText(modal.senha)}</strong>
          </div>
        </div>

        <div class="user-admin-success-actions">
          <button type="button" class="module-action-button" data-user-admin-copy-info>
            <i data-lucide="copy"></i>
            <span>Copiar Informações</span>
          </button>
          <button type="button" class="module-link-button is-secondary" data-user-admin-close-success>
            <i data-lucide="x"></i>
            <span>Fechar</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── Existing helpers ──────────────────────────────────────────────────────

function renderUserAdminNivelOption(option, selectedNivel) {
  const selected = option.id === selectedNivel ? 'selected' : '';
  return `<option value="${sanitizeAttribute(option.id)}" ${selected}>${sanitizeText(option.label)}</option>`;
}

function renderUserAdminSectorOption(option, selectedSectors) {
  const checked = selectedSectors.includes(option.id);

  return `
    <label class="user-admin-sector-option">
      <input type="checkbox" value="${sanitizeAttribute(option.id)}" data-user-admin-sector ${checked ? 'checked' : ''} />
      <span class="user-admin-sector-check" aria-hidden="true"><i data-lucide="check"></i></span>
      <span class="user-admin-sector-name">${sanitizeText(option.label)}</span>
    </label>
  `;
}

function renderUserAdminFeedback(message, type) {
  return `
    <div class="user-admin-feedback ${type === MODULE_STATUS.error ? 'is-error' : 'is-success'}">
      <i data-lucide="${type === MODULE_STATUS.error ? 'circle-alert' : 'circle-check'}"></i>
      <span>${sanitizeText(message)}</span>
    </div>
  `;
}

function renderUserAdminPasswordResult(password) {
  return `
    <div class="user-admin-password-box">
      <div>
        <span class="evaluation-meta-label">Senha temporária</span>
        <strong class="user-admin-password-value">${sanitizeText(password)}</strong>
      </div>
      <button type="button" class="module-link-button is-secondary" data-user-admin-copy-password data-password="${sanitizeAttribute(password)}">
        <i data-lucide="copy"></i>
        <span>Copiar</span>
      </button>
    </div>
  `;
}

function renderUserAdminResults(adminUi) {
  if (adminUi.searchStatus === MODULE_STATUS.loading) {
    return `
      <div class="empty-state is-compact user-admin-empty-state">
        <span class="empty-state-icon" aria-hidden="true"><i data-lucide="loader-circle"></i></span>
        <div>
          <h3 class="card-title">Buscando usuários</h3>
          <p class="card-description">Aguarde enquanto consultamos a planilha Usuarios.</p>
        </div>
      </div>
    `;
  }

  if (!adminUi.searchResults.length && adminUi.searchStatus === MODULE_STATUS.idle) {
    return '';
  }

  if (!adminUi.searchResults.length) {
    return `
      <div class="empty-state is-compact user-admin-empty-state">
        <span class="empty-state-icon" aria-hidden="true"><i data-lucide="user-search"></i></span>
        <div>
          <h3 class="card-title">${adminUi.searchStatus === MODULE_STATUS.success ? 'Nenhum usuário encontrado' : 'Erro na busca'}</h3>
          <p class="card-description">${sanitizeText(adminUi.searchMessage)}</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="user-admin-result-list">
      ${adminUi.searchResults.map(renderUserAdminResultItem).join('')}
    </div>
  `;
}

function renderUserAdminResultItem(user) {
  const nivelOption = USER_LEVEL_OPTIONS.find((o) => o.id === String(user.nivel || '').trim().toLowerCase());
  const nivelLabel = nivelOption?.label || sanitizeText(user.nivel || '—');
  const nivelKey = nivelOption?.id || 'colaborador';

  return `
    <article class="user-admin-result-card">
      <span class="user-admin-result-icon" aria-hidden="true"><i data-lucide="user-round"></i></span>
      <div class="user-admin-result-copy">
        <strong class="user-admin-result-id">${sanitizeText(user.id)}</strong>
        <p class="user-admin-result-name">${sanitizeText(user.nome)}</p>
      </div>
      <span class="user-admin-nivel-badge is-${sanitizeAttribute(nivelKey)}" aria-label="Nível ${nivelLabel}">${nivelLabel}</span>
      <span class="user-admin-status ${user.status ? 'is-active' : 'is-inactive'}">${user.status ? 'Ativo' : 'Inativo'}</span>
      <button type="button" class="module-link-button is-secondary" data-user-admin-edit data-user-id="${sanitizeAttribute(user.id)}">
        <i data-lucide="pencil"></i>
        <span>Editar</span>
      </button>
    </article>
  `;
}
