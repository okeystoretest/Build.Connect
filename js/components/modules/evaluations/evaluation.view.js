/**
 * evaluation.view.js
 * Top-level markup: module shell, tool catalog, form shell, tool dispatch.
 * Form-level markup delegates to evaluation.view-forms.js.
 */

import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';
import {
  EVALUATION_TOOL_IDS,
  EVALUATION_TOOLS,
} from './evaluation.constants.js';
import {
  getEvaluationUiState,
  getFilteredEvaluationUsers,
} from './evaluation.calculations.js';
import {
  getPendingFlowProgress,
} from './evaluation.pending-handlers.js';
import {
  getMultidirEvaluationMarkup,
  getPreEffectiveEvaluationMarkup,
  getBehavioralEvaluationMarkup,
  getMatrixEvaluationMarkup,
  getEvaluationUsersDropdownMarkup,
  getFeedbackTabMarkup,
} from './evaluation.view-forms.js';

export { getMatrixDecisionGraphMarkup } from './evaluation.view-forms.js';

// ── Entry point ──────────────────────────────────────────────────────────────

export function getEvaluationModuleMarkup(card, moduleData, moduleUi) {
  const evaluationUi = getEvaluationUiState(moduleUi);
  const activeTab    = evaluationUi.activeTab || 'avaliacoes';

  if (activeTab === 'feedback') {
    return getFeedbackTabMarkup(card, moduleData, evaluationUi, renderEvalTabs);
  }

  const selectedTool = EVALUATION_TOOLS.find((t) => t.id === evaluationUi.selectedEvaluationToolId) || null;

  if (!selectedTool) {
    return getEvaluationToolsCatalogMarkup(card, moduleData, activeTab);
  }

  return getEvaluationToolFormMarkup(card, moduleData, evaluationUi, selectedTool, activeTab);
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function renderEvalTabs(activeTab) {
  return `
    <div class="eval-tabs">
      <button type="button" class="eval-tab ${activeTab === 'avaliacoes' ? 'is-active' : ''}" data-eval-tab="avaliacoes">
        <i data-lucide="clipboard-list"></i><span>Avaliações</span>
      </button>
      <button type="button" class="eval-tab ${activeTab === 'feedback' ? 'is-active' : ''}" data-eval-tab="feedback">
        <i data-lucide="message-square"></i><span>Feedback</span>
      </button>
    </div>
  `;
}

// ── Tool catalog ─────────────────────────────────────────────────────────────

function getEvaluationToolsCatalogMarkup(card, moduleData, activeTab = 'avaliacoes') {
  const pendingByTool = moduleData?.pendingByTool || {};

  return `
    <div class="module-shell evaluation-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked">
        <div>
          <p class="module-eyebrow">Avaliações</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Selecione uma das ferramentas disponíveis para abrir o preenchimento correspondente.</p>
        </div>
      </div>
      ${renderEvalTabs(activeTab)}
      <div class="evaluation-tools-grid" aria-label="Ferramentas de avaliação disponíveis">
        ${EVALUATION_TOOLS.map((tool) => {
          const pending = pendingByTool[tool.id] || 0;
          const badgeHtml = pending > 0
            ? `<span class="eval-tool-pending-badge" aria-label="${pending} pendente${pending !== 1 ? 's' : ''}">${pending}</span>`
            : '';
          return `
          <button type="button" class="evaluation-tool-card ${pending > 0 ? 'has-pending' : ''}" data-evaluation-tool="${sanitizeAttribute(tool.id)}" aria-label="Abrir avaliação ${sanitizeAttribute(tool.title)}">
            <span class="card-icon evaluation-tool-icon" aria-hidden="true">
              <i data-lucide="${sanitizeAttribute(tool.icon)}"></i>
            </span>
            <span class="evaluation-tool-copy">
              <span class="evaluation-tool-hint">${sanitizeText(tool.hint)}</span>
              <strong class="evaluation-tool-title">${sanitizeText(tool.title)}</strong>
              <span class="evaluation-tool-description">${sanitizeText(tool.description)}</span>
            </span>
            ${badgeHtml}
            <span class="evaluation-tool-arrow" aria-hidden="true">
              <i data-lucide="arrow-right"></i>
            </span>
          </button>`;
        }).join('')}
      </div>
    </div>
  `;
}

// ── Tool form shell ───────────────────────────────────────────────────────────

function getEvaluationToolFormMarkup(card, moduleData, evaluationUi, selectedTool, activeTab = 'avaliacoes') {
  const users          = Array.isArray(moduleData?.users) ? moduleData.users : [];
  const respondent     = moduleData?.respondent || null;
  // pendingUserIds comes from the async backend fetch stored in moduleData
  const pendingUserIds = new Set(Array.isArray(moduleData?.pendingUserIds) ? moduleData.pendingUserIds : []);
  const filteredUsers  = getFilteredEvaluationUsers(users, evaluationUi.evaluateeQuery, evaluationUi.selectedEvaluateeId);
  const selectedUser   = users.find((u) => u.id === evaluationUi.selectedEvaluateeId) || null;

  const flow         = evaluationUi.pendingFlow;
  const pendingBanner = flow?.pendingFlowActive
    ? `<div class="evaluation-pending-banner" role="status" aria-live="polite">
        <i data-lucide="list-checks"></i>
        <span>Fluxo de pendências ativo — <strong>${sanitizeText(flow.pendingFlowUserName)}</strong>: ${sanitizeText(getPendingFlowProgress(flow))}</span>
       </div>`
    : '';

  return `
    <div class="module-shell evaluation-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked evaluation-tool-header">
        <div>
          <button type="button" class="module-link-button is-secondary evaluation-tools-back" data-evaluation-tools-back>
            <i data-lucide="arrow-left"></i>
            <span>Ver avaliações</span>
          </button>
          <p class="module-eyebrow">Avaliações · ${sanitizeText(selectedTool.hint)}</p>
          <h2 class="module-title">${sanitizeText(selectedTool.title)}</h2>
          <p class="module-description">${sanitizeText(selectedTool.description)} Antes de responder, confirme quem está preenchendo e selecione o colaborador ativo que será avaliado.</p>
        </div>
      </div>

      ${pendingBanner}
      ${renderEvalTabs(activeTab)}

      <div class="evaluation-meta-grid">
        <div class="evaluation-meta-card">
          <span class="evaluation-meta-label">Respondente</span>
          <strong class="evaluation-meta-value">${sanitizeText(respondent?.id || 'Não identificado')}</strong>
          <span class="evaluation-meta-subvalue">${sanitizeText(respondent?.nome || 'Faça login novamente para identificar o usuário.')}</span>
        </div>

        <div class="evaluation-picker-block">
          <span class="evaluation-meta-label">Colaborador avaliado</span>
          <div class="evaluation-picker evaluation-picker--pills" data-evaluation-picker>
            <label class="module-search-shell evaluation-search-shell" aria-label="Pesquisar colaborador ativo">
              <i data-lucide="search"></i>
              <input
                type="search"
                value="${sanitizeAttribute(evaluationUi.evaluateeQuery)}"
                placeholder="Pesquise por ID ou nome"
                data-evaluatee-search
                autocomplete="off"
              />
            </label>
            ${evaluationUi.isEvaluateeListOpen ? getEvaluationUsersDropdownMarkup(filteredUsers, pendingUserIds) : ''}
          </div>
          <div class="evaluation-user-pills" aria-label="Colaboradores do setor">
            ${users.map((u) => {
              const isPending  = pendingUserIds.has(u.id);
              const isSelected = u.id === evaluationUi.selectedEvaluateeId;
              // data-evaluation-pending-user marca a pill como ponto de entrada do
              // fluxo contínuo — o router de eventos em content-clicks.js usa este
              // atributo para chamar startPendingFlow em vez de selectUser.
              return `<button type="button"
                class="evaluation-user-pill${isPending ? ' is-pending' : ''}${isSelected ? ' is-selected' : ''}"
                data-evaluatee-option
                data-user-id="${sanitizeAttribute(u.id)}"
                ${isPending ? `data-evaluation-pending-user="${sanitizeAttribute(u.id)}"` : ''}
                title="${isPending ? 'Avaliações pendentes — clique para iniciar o fluxo de preenchimento' : sanitizeAttribute(u.nome)}"
              >
                <span class="evaluation-pill-name">${sanitizeText(u.nome)}</span>
                <span class="evaluation-pill-id">${sanitizeText(u.id)}</span>
                ${isPending ? `<span class="evaluation-pill-alert" aria-hidden="true"><i data-lucide="alert-circle"></i></span>` : ''}
              </button>`;
            }).join('')}
          </div>
          <span class="evaluation-picker-feedback">${selectedUser ? `Avaliação direcionada para ${sanitizeText(selectedUser.nome)}.` : 'Selecione um colaborador acima para liberar o questionário.'}</span>
        </div>
      </div>

      ${selectedUser ? getEvaluationSelectedToolMarkup(selectedTool, selectedUser, evaluationUi, moduleData) : `
        <div class="empty-state is-compact">
          <span class="empty-state-icon" aria-hidden="true"><i data-lucide="users"></i></span>
          <div>
            <h3 class="card-title">Selecione o colaborador avaliado</h3>
            <p class="card-description">O questionário é liberado depois que você escolher um usuário ativo na busca acima.</p>
          </div>
        </div>
      `}
    </div>
  `;
}

// ── Tool dispatch ─────────────────────────────────────────────────────────────

function getEvaluationSelectedToolMarkup(selectedTool, selectedUser, evaluationUi, moduleData) {
  if (selectedTool.id === EVALUATION_TOOL_IDS.BEHAVIORAL) {
    return getBehavioralEvaluationMarkup(selectedTool, selectedUser, evaluationUi, moduleData);
  }
  if (selectedTool.id === EVALUATION_TOOL_IDS.MATRIX) {
    return getMatrixEvaluationMarkup(selectedTool, selectedUser, evaluationUi, moduleData);
  }
  if (selectedTool.id === EVALUATION_TOOL_IDS.WORK_EFFICACY) {
    return getMultidirEvaluationMarkup(selectedTool, selectedUser, evaluationUi, 'efficacy');
  }
  if (selectedTool.id === EVALUATION_TOOL_IDS.EMOTIONAL_INTELLIGENCE) {
    return getMultidirEvaluationMarkup(selectedTool, selectedUser, evaluationUi, 'ie');
  }
  return getPreEffectiveEvaluationMarkup(selectedTool, evaluationUi);
}