import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { MODULE_IDS } from '../../constants/module.constants.js';
import { getFilteredEvaluationUsers } from './evaluations/evaluation.calculations.js';

const MODULE_UI_DEFAULTS = Object.freeze({
  query: '',
  sort: 'az',
  view: 'grid',
});

export const FEEDBACK_UI_DEFAULTS = Object.freeze({
  selectedTargetUserId: '',
  targetUserQuery: '',
  isTargetUserListOpen: false,
  feedbackMessage: '',
});

export function getFeedbackModuleMarkup(card, moduleData, moduleUi) {
  const users = Array.isArray(moduleData?.users) ? moduleData.users : [];
  const respondent = moduleData?.respondent || null;
  const feedbackUi = getFeedbackUiState(moduleUi);
  const filteredUsers = getFilteredEvaluationUsers(users, feedbackUi.targetUserQuery, feedbackUi.selectedTargetUserId);
  const selectedUser = users.find((user) => user.id === feedbackUi.selectedTargetUserId) || null;
  const isReadyToWrite = Boolean(selectedUser);

  return `
    <div class="module-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked">
        <div>
          <p class="module-eyebrow">Feedback</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Antes de registrar o feedback, confirme quem está preenchendo e selecione o colaborador relacionado.</p>
        </div>
      </div>

      <div class="evaluation-meta-grid">
        <div class="evaluation-meta-card">
          <span class="evaluation-meta-label">Respondente</span>
          <strong class="evaluation-meta-value">${sanitizeText(respondent?.id || 'Não identificado')}</strong>
          <span class="evaluation-meta-subvalue">${sanitizeText(respondent?.nome || 'Faça login novamente para identificar o usuário.')}</span>
        </div>

        <div class="evaluation-picker-block">
          <span class="evaluation-meta-label">Colaborador relacionado</span>
          <div class="evaluation-picker" data-feedback-picker>
            <label class="module-search-shell evaluation-search-shell" aria-label="Pesquisar colaborador ativo para o feedback">
              <i data-lucide="search"></i>
              <input
                type="search"
                value="${sanitizeAttribute(feedbackUi.targetUserQuery)}"
                placeholder="Pesquise por ID ou nome do colaborador"
                data-feedback-target-search
                autocomplete="off"
              />
            </label>
            <button type="button" class="module-control-button" data-feedback-target-toggle aria-label="Abrir lista de colaboradores ativos" aria-expanded="${String(feedbackUi.isTargetUserListOpen)}">
              <i data-lucide="chevrons-up-down"></i>
            </button>
            ${feedbackUi.isTargetUserListOpen ? getFeedbackUsersDropdownMarkup(filteredUsers) : ''}
          </div>
          <span class="evaluation-picker-feedback">${selectedUser ? `Feedback vinculado a ${sanitizeText(selectedUser.nome)}.` : 'Selecione um colaborador ativo para continuar.'}</span>
        </div>
      </div>

      ${isReadyToWrite ? `
        <label class="form-field evaluation-notes-field">
          <span class="form-label">Feedback</span>
          <textarea class="evaluation-notes-textarea" rows="5" data-feedback-message placeholder="Escreva aqui o feedback com os detalhes necessários.">${sanitizeText(feedbackUi.feedbackMessage)}</textarea>
        </label>
      ` : `
        <div class="empty-state is-compact feedback-empty-state">
          <span class="empty-state-icon" aria-hidden="true">
            <i data-lucide="messages-square"></i>
          </span>
          <div>
            <h3 class="card-title">Selecione o colaborador relacionado</h3>
            <p class="card-description">Escolha um usuário ativo na busca acima para liberar o campo de escrita do feedback.</p>
          </div>
        </div>
      `}
    </div>
  `;
}

export function getFeedbackUiState(moduleUi) {
  return {
    ...MODULE_UI_DEFAULTS,
    ...FEEDBACK_UI_DEFAULTS,
    ...(moduleUi || {}),
  };
}

export function createFeedbackModuleHandlers({ getModuleState, setModuleState, renderModuleStage }) {
  return {
    toggleDropdown(rootElement, sector) {
      const state = getModuleState(sector.id);

      if (state.selectedModuleId !== MODULE_IDS.feedback) {
        return;
      }

      const nextUi = getFeedbackUiState(state.ui);
      nextUi.isTargetUserListOpen = !nextUi.isTargetUserListOpen;

      setModuleState(sector.id, {
        ...state,
        ui: nextUi,
      });

      renderModuleStage(rootElement, sector);
    },

    closeDropdown(rootElement, sector) {
      const state = getModuleState(sector.id);

      if (state.selectedModuleId !== MODULE_IDS.feedback || !state.ui?.isTargetUserListOpen) {
        return;
      }

      setModuleState(sector.id, {
        ...state,
        ui: {
          ...getFeedbackUiState(state.ui),
          isTargetUserListOpen: false,
        },
      });

      renderModuleStage(rootElement, sector);
    },

    updateSearch(rootElement, sector, query) {
      const state = getModuleState(sector.id);

      if (state.selectedModuleId !== MODULE_IDS.feedback) {
        return;
      }

      const currentUi = getFeedbackUiState(state.ui);
      const selectedUser = (state.moduleData?.users || []).find((user) => user.id === currentUi.selectedTargetUserId) || null;
      const shouldKeepSelection = selectedUser && `${selectedUser.id} — ${selectedUser.nome}` === query;

      setModuleState(sector.id, {
        ...state,
        ui: {
          ...currentUi,
          targetUserQuery: query,
          selectedTargetUserId: shouldKeepSelection ? currentUi.selectedTargetUserId : '',
          isTargetUserListOpen: true,
        },
      });

      renderModuleStage(rootElement, sector);
    },

    selectUser(rootElement, sector, userId) {
      const state = getModuleState(sector.id);

      if (state.selectedModuleId !== MODULE_IDS.feedback) {
        return;
      }

      const selectedUser = (state.moduleData?.users || []).find((user) => user.id === userId);

      if (!selectedUser) {
        return;
      }

      setModuleState(sector.id, {
        ...state,
        ui: {
          ...getFeedbackUiState(state.ui),
          selectedTargetUserId: selectedUser.id,
          targetUserQuery: `${selectedUser.id} — ${selectedUser.nome}`,
          isTargetUserListOpen: false,
        },
      });

      renderModuleStage(rootElement, sector);
    },

    updateField(rootElement, sector, field, value) {
      const state = getModuleState(sector.id);

      if (state.selectedModuleId !== MODULE_IDS.feedback) {
        return;
      }

      setModuleState(sector.id, {
        ...state,
        ui: {
          ...getFeedbackUiState(state.ui),
          [field]: value,
        },
      });

      renderModuleStage(rootElement, sector);
    },
  };
}

function getFeedbackUsersDropdownMarkup(users) {
  if (!users.length) {
    return `
      <div class="evaluation-users-dropdown">
        <div class="evaluation-users-empty">Nenhum usuário ativo encontrado para esta pesquisa.</div>
      </div>
    `;
  }

  return `
    <div class="evaluation-users-dropdown">
      ${users.map((user) => `
        <button type="button" class="evaluation-user-option" data-feedback-target-option data-user-id="${sanitizeAttribute(user.id)}">
          <span class="evaluation-user-option-id">${sanitizeText(user.id)}</span>
          <span class="evaluation-user-option-name">${sanitizeText(user.nome)}</span>
        </button>
      `).join('')}
    </div>
  `;
}

