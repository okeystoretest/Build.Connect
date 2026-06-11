/**
 * evaluation.view-forms.js
 * Multidir evaluation markup, save panel, users dropdown, feedback tab.
 * Behavioral/Pre-effective → evaluation.view-behavioral.js
 * Matrix/Graph             → evaluation.view-matrix.js
 */

import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';
import { getFeedbackModuleMarkup } from '../feedback-module.js';
import {
  WORK_EFFICACY_CRITERIA,
  IE_PERSONAL_CRITERIA,
  IE_SOCIAL_CRITERIA,
} from './evaluation.constants.js';
import {
  getEvaluationScoreKey,
} from './evaluation.calculations.js';

// Re-export from submodules so evaluation.view.js has a single import surface
export { getPreEffectiveEvaluationMarkup, getBehavioralEvaluationMarkup } from './evaluation.view-behavioral.js';
export { getMatrixEvaluationMarkup, getMatrixDecisionGraphMarkup }         from './evaluation.view-matrix.js';

// ═══════════════════════════════════════════════════════════════════════════
// AVALIAÇÕES MULTIDIRECIONAIS
// ═══════════════════════════════════════════════════════════════════════════

export function getMultidirEvaluationMarkup(selectedTool, selectedUser, evaluationUi, type) {
  const eligKey = `${selectedTool.id}:${selectedUser.id}`;
  const elig    = evaluationUi.multidirEligibility?.[eligKey];
  const toolId  = selectedTool.id;
  const scores  = evaluationUi.evaluationScores || {};

  if (!elig || elig.status === 'checking') {
    return `
      <div class="empty-state is-compact">
        <span class="empty-state-icon" aria-hidden="true"><i data-lucide="loader-circle"></i></span>
        <div>
          <h3 class="card-title">Verificando elegibilidade</h3>
          <p class="card-description">Aguarde enquanto verificamos se você pode responder esta avaliação para ${sanitizeText(selectedUser.nome)}.</p>
        </div>
      </div>`;
  }

  if (elig.status === 'blocked') {
    const iconName = elig.code === 'COOLDOWN_ACTIVE' ? 'clock' : elig.code === 'MAX_RESPONSES_REACHED' ? 'users' : 'shield-x';
    return `
      <div class="multidir-block">
        <span class="multidir-block-icon"><i data-lucide="${iconName}"></i></span>
        <h3 class="multidir-block-title">Avaliação indisponível</h3>
        <p class="multidir-block-msg">${sanitizeText(elig.message)}</p>
      </div>`;
  }

  const remaining = elig.remainingResponses ?? '?';
  const body = type === 'efficacy' ? _getEfficacyFormBody(toolId, scores) : _getIEFormBody(toolId, scores);

  return `
    <div class="multidir-form-wrap">
      <div class="multidir-status-bar">
        <span class="multidir-status-pill">
          <i data-lucide="users"></i>
          ${remaining} vaga${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}
        </span>
        <span class="multidir-status-note">Você tem 1 resposta disponível para ${sanitizeText(selectedUser.nome)} nesta avaliação.</span>
      </div>
      ${body}
      ${getEvaluationSavePanelMarkup(evaluationUi)}
    </div>
  `;
}

function _getEfficacyFormBody(toolId, scores) {
  return `
    <div class="multidir-criteria-list">
      ${WORK_EFFICACY_CRITERIA.map((criterion) => {
        const keyA  = getEvaluationScoreKey(toolId, criterion.id, 'a');
        const keyB  = getEvaluationScoreKey(toolId, criterion.id, 'b');
        const sA    = Number(scores[keyA] || 0);
        const sB    = Number(scores[keyB] || 0);
        const total = sA && sB ? sA + sB : '—';
        return `
          <div class="multidir-criterion-card">
            <div class="multidir-criterion-head">
              <span class="multidir-criterion-badge">${sanitizeText(criterion.label)}</span>
              <strong class="multidir-criterion-title">${sanitizeText(criterion.title)}</strong>
              <span class="multidir-criterion-total" data-total="${criterion.id}">A+B = ${total}</span>
            </div>
            <div class="multidir-criterion-items">
              ${_scoreRow(toolId, criterion.id, 'a', criterion.a, scores, 'sub-item')}
              ${_scoreRow(toolId, criterion.id, 'b', criterion.b, scores, 'sub-item')}
            </div>
          </div>`;
      }).join('')}
    </div>
  `;
}

function _getIEFormBody(toolId, scores) {
  const personal     = IE_PERSONAL_CRITERIA;
  const social       = IE_SOCIAL_CRITERIA;
  const totalPessoal = personal.reduce((s, c) => s + Number(scores[getEvaluationScoreKey(toolId, c.id, 'score')] || 0), 0);
  const totalSocial  = social.reduce((s, c)   => s + Number(scores[getEvaluationScoreKey(toolId, c.id, 'score')] || 0), 0);
  const totalGeral   = totalPessoal + totalSocial;
  const allFilled    = [...personal, ...social].every((c) => scores[getEvaluationScoreKey(toolId, c.id, 'score')]);

  return `
    <div class="multidir-ie-wrap">
      <div class="multidir-ie-section">
        <header class="multidir-ie-section-head"><i data-lucide="user-round"></i><strong>Competências Emocionais Pessoais</strong></header>
        ${personal.map((c) => _scoreRow(toolId, c.id, 'score', `<strong>${sanitizeText(c.title)}</strong> — ${sanitizeText(c.description)}`, scores, 'ie-item')).join('')}
        <div class="multidir-ie-subtotal">Total pessoal: <strong>${totalPessoal}</strong> / ${personal.length * 5}</div>
      </div>
      <div class="multidir-ie-section">
        <header class="multidir-ie-section-head"><i data-lucide="users-round"></i><strong>Competências Emocionais Sociais</strong></header>
        ${social.map((c) => _scoreRow(toolId, c.id, 'score', `<strong>${sanitizeText(c.title)}</strong> — ${sanitizeText(c.description)}`, scores, 'ie-item')).join('')}
        <div class="multidir-ie-subtotal">Total social: <strong>${totalSocial}</strong> / ${social.length * 5}</div>
      </div>
      ${allFilled ? `<div class="multidir-ie-total">Total geral: <strong>${totalGeral}</strong> / ${(personal.length + social.length) * 5}</div>` : ''}
    </div>
  `;
}

function _scoreRow(toolId, criterionId, periodId, label, scores, variant) {
  const key     = getEvaluationScoreKey(toolId, criterionId, periodId);
  const current = String(scores[key] || '');
  const buttons = [1, 2, 3, 4, 5].map((n) => `
    <button type="button"
      class="multidir-score-btn ${current === String(n) ? 'is-selected' : ''}"
      data-evaluation-score="${criterionId}"
      data-evaluation-period="${periodId}"
      data-evaluation-value="${n}"
      aria-label="Nota ${n}"
      aria-pressed="${current === String(n)}"
    >${n}</button>`).join('');
  return `
    <div class="multidir-score-row multidir-score-row--${variant}">
      <p class="multidir-score-label">${label}</p>
      <div class="multidir-score-buttons" role="group" aria-label="Selecione uma nota">${buttons}</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// SAVE PANEL
// ═══════════════════════════════════════════════════════════════════════════

export function getEvaluationSavePanelMarkup(evaluationUi) {
  return `
    <div class="matrix-actions-row">
      ${getEvaluationSaveButtonMarkup(evaluationUi, 'Salvar avaliação')}
      ${getEvaluationSaveFeedbackMarkup(evaluationUi)}
    </div>
  `;
}

export function getEvaluationSaveButtonMarkup(evaluationUi, label) {
  const isSaving = evaluationUi.evaluationSaveStatus === 'saving';
  return `
    <button type="button" class="module-action-button" data-evaluation-save ${isSaving ? 'disabled aria-disabled="true"' : ''}>
      <i data-lucide="save"></i>
      <span>${sanitizeText(isSaving ? 'Salvando...' : label)}</span>
    </button>
  `;
}

export function getEvaluationSaveFeedbackMarkup(evaluationUi) {
  if (!evaluationUi.evaluationSaveMessage) return '';
  const status = evaluationUi.evaluationSaveStatus || '';
  const cls  = status === 'success' ? 'is-success' : status === 'error' ? 'is-error' : '';
  const icon = status === 'success' ? '<i data-lucide="circle-check"></i>'
             : status === 'error'   ? '<i data-lucide="circle-alert"></i>' : '';
  return `
    <span class="evaluation-save-feedback ${cls}" role="status" aria-live="polite">
      ${icon}${sanitizeText(evaluationUi.evaluationSaveMessage)}
    </span>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// USERS DROPDOWN + FEEDBACK TAB
// ═══════════════════════════════════════════════════════════════════════════

export function getEvaluationUsersDropdownMarkup(users, pendingUserIds = new Set()) {
  if (!users.length) {
    return `
      <div class="evaluation-users-dropdown">
        <div class="evaluation-users-empty">Nenhum usuário ativo encontrado para esta pesquisa.</div>
      </div>`;
  }
  return `
    <div class="evaluation-users-dropdown">
      ${users.map((user) => {
        const hasPending = pendingUserIds.has(user.id);
        return `
          <button type="button"
            class="evaluation-user-option${hasPending ? ' has-pending' : ''}"
            data-evaluatee-option
            data-user-id="${sanitizeAttribute(user.id)}"
            ${hasPending ? `data-evaluation-pending-user="${sanitizeAttribute(user.id)}"` : ''}
            title="${hasPending ? 'Pendências de avaliação — clique para iniciar o fluxo' : ''}"
          >
            <span class="evaluation-user-option-id">${sanitizeText(user.id)}</span>
            <span class="evaluation-user-option-name${hasPending ? ' is-pending' : ''}">${sanitizeText(user.nome)}</span>
            ${hasPending ? `<span class="evaluation-pending-dot" aria-label="Pendências"><i data-lucide="alert-circle"></i></span>` : ''}
          </button>`;
      }).join('')}
    </div>`;
}

export function getFeedbackTabMarkup(card, moduleData, evaluationUi, renderEvalTabsFn) {
  const feedbackMarkup = getFeedbackModuleMarkup(
    { ...card, title: 'Feedback', id: 'feedback' },
    moduleData,
    evaluationUi
  );
  return feedbackMarkup.replace(
    /(<\/div>\s*<\/div>\s*<\/div>)(\s*)/,
    `$1$2${renderEvalTabsFn('feedback')}$2`
  );
}
