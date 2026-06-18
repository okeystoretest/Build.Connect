/**
 * evaluation.view.js
 * Top-level markup: module shell, tool catalog, form shell, tool dispatch.
 * Horizontal pagination: each tool form is split into N pages (no vertical scroll).
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
import { getPendingFlowProgress } from './evaluation.pending-handlers.js';
import {
  getMultidirEvaluationMarkup,
  getPreEffectiveEvaluationMarkup,
  getBehavioralEvaluationMarkup,
  getMatrixEvaluationMarkup,
  getEvaluationUsersDropdownMarkup,
  getFeedbackTabMarkup,
  getEvaluationSaveButtonMarkup,
  getEvaluationSaveFeedbackMarkup,
} from './evaluation.view-forms.js';

export { getMatrixDecisionGraphMarkup } from './evaluation.view-forms.js';

// Page counts per tool (must stay in sync with evaluation.handlers.js _PAGE_COUNTS)
const TOOL_PAGE_COUNTS = {
  [EVALUATION_TOOL_IDS.PRE_EFFECTIVE]:          2,
  [EVALUATION_TOOL_IDS.BEHAVIORAL]:             2,
  [EVALUATION_TOOL_IDS.MATRIX]:                 2,
  [EVALUATION_TOOL_IDS.WORK_EFFICACY]:          3,
  [EVALUATION_TOOL_IDS.EMOTIONAL_INTELLIGENCE]: 2,
};

function getToolPageCount(toolId) {
  return TOOL_PAGE_COUNTS[toolId] || 1;
}

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
  const pendingUserIds = new Set(Array.isArray(moduleData?.pendingUserIds) ? moduleData.pendingUserIds : []);
  const filteredUsers  = getFilteredEvaluationUsers(users, evaluationUi.evaluateeQuery, evaluationUi.selectedEvaluateeId);
  const selectedUser   = users.find((u) => u.id === evaluationUi.selectedEvaluateeId) || null;

  const currentPage = evaluationUi.evaluationFormPage || 0;
  const totalPages  = getToolPageCount(selectedTool.id);

  const flow        = evaluationUi.pendingFlow;
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

      ${selectedUser
        ? _getPaginatedFormMarkup(selectedTool, selectedUser, evaluationUi, moduleData, currentPage, totalPages)
        : `<div class="empty-state is-compact">
            <span class="empty-state-icon" aria-hidden="true"><i data-lucide="users"></i></span>
            <div>
              <h3 class="card-title">Selecione o colaborador avaliado</h3>
              <p class="card-description">O questionário é liberado depois que você escolher um usuário ativo na busca acima.</p>
            </div>
          </div>`
      }
    </div>
  `;
}

// ── Paginated form wrapper ────────────────────────────────────────────────────

function _getPaginatedFormMarkup(selectedTool, selectedUser, evaluationUi, moduleData, currentPage, totalPages) {
  const pageContent = _getPageContent(selectedTool, selectedUser, evaluationUi, moduleData, currentPage);
  const isLastPage  = currentPage >= totalPages - 1;
  const isFirstPage = currentPage === 0;

  const dotsHtml = Array.from({ length: totalPages }, (_, i) =>
    `<button type="button" class="eval-page-dot ${i === currentPage ? 'is-active' : ''}"
      aria-label="Ir para página ${i + 1}" aria-current="${i === currentPage ? 'true' : 'false'}"></button>`
  ).join('');

  return `
    <div class="eval-paginated-form" aria-label="Formulário de avaliação — página ${currentPage + 1} de ${totalPages}">
      <div class="eval-form-page">
        ${pageContent}
      </div>

      <div class="eval-page-nav" role="navigation" aria-label="Navegação por páginas da avaliação">
        <button type="button" class="module-link-button is-secondary eval-nav-btn"
          data-eval-prev-page
          ${isFirstPage ? 'disabled aria-disabled="true"' : ''}
          aria-label="Página anterior">
          <i data-lucide="arrow-left"></i><span>Anterior</span>
        </button>

        <div class="eval-page-indicator">
          <div class="eval-page-dots" role="group" aria-label="Progresso das páginas">
            ${dotsHtml}
          </div>
          <span class="eval-page-counter" aria-live="polite">${currentPage + 1} / ${totalPages}</span>
        </div>

        ${isLastPage
          ? `<div class="eval-nav-save-group">
              ${getEvaluationSaveButtonMarkup(evaluationUi, 'Salvar avaliação')}
              ${getEvaluationSaveFeedbackMarkup(evaluationUi)}
             </div>`
          : `<button type="button" class="module-link-button eval-nav-btn"
              data-eval-next-page
              aria-label="Próxima página">
              <span>Próximo</span><i data-lucide="arrow-right"></i>
             </button>`
        }
      </div>
    </div>
  `;
}

// ── Page content dispatch ─────────────────────────────────────────────────────

function _getPageContent(selectedTool, selectedUser, evaluationUi, moduleData, currentPage) {
  if (selectedTool.id === EVALUATION_TOOL_IDS.BEHAVIORAL) {
    return getBehavioralEvaluationMarkup(selectedTool, selectedUser, evaluationUi, moduleData, currentPage);
  }
  if (selectedTool.id === EVALUATION_TOOL_IDS.MATRIX) {
    return getMatrixEvaluationMarkup(selectedTool, selectedUser, evaluationUi, moduleData, currentPage);
  }
  if (selectedTool.id === EVALUATION_TOOL_IDS.WORK_EFFICACY) {
    return getMultidirEvaluationMarkup(selectedTool, selectedUser, evaluationUi, 'efficacy', currentPage);
  }
  if (selectedTool.id === EVALUATION_TOOL_IDS.EMOTIONAL_INTELLIGENCE) {
    return getMultidirEvaluationMarkup(selectedTool, selectedUser, evaluationUi, 'ie', currentPage);
  }
  // PRE_EFFECTIVE (default)
  return getPreEffectiveEvaluationMarkup(selectedTool, evaluationUi, currentPage);
}
