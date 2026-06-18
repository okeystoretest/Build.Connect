/**
 * evaluation.view-behavioral.js
 * Pre-effective and Behavioral evaluation form markup + criterion row helpers.
 * Supports horizontal pagination via currentPage parameter.
 * - PRE_EFFECTIVE: 2 pages — criteria 0-7 | criteria 8-15 + notes
 * - BEHAVIORAL:    2 pages — meta+criteria 0-7 | criteria 8-15
 */

import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';
import {
  BEHAVIORAL_EVALUATION_OPTIONS,
  EVALUATION_CRITERIA,
  EVALUATION_PERIODS,
} from './evaluation.constants.js';
import {
  getEvaluationScoreKey,
  getEvaluationToolFields,
  getEvaluationToolNotes,
  getEvaluationTotals,
} from './evaluation.calculations.js';

const CRITERIA_PER_PAGE = 8; // 16 total → 2 pages of 8

// ── Pre-Effective ─────────────────────────────────────────────────────────────

export function getPreEffectiveEvaluationMarkup(selectedTool, evaluationUi, currentPage = 0) {
  const totals      = getEvaluationTotals(evaluationUi.evaluationScores, selectedTool.id);
  const notes       = getEvaluationToolNotes(evaluationUi, selectedTool.id);
  const pageSlice   = EVALUATION_CRITERIA.slice(currentPage * CRITERIA_PER_PAGE, (currentPage + 1) * CRITERIA_PER_PAGE);
  const isLastPage  = currentPage >= 1;

  return `
    <div class="evaluation-table-wrap">
      <table class="evaluation-table">
        <thead>
          <tr>
            <th>Critérios de avaliação</th>
            ${EVALUATION_PERIODS.map((p) => `<th>${p.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${pageSlice.map((c, localIdx) => {
            const globalIdx = currentPage * CRITERIA_PER_PAGE + localIdx;
            return getEvaluationCriterionRowMarkup(selectedTool.id, c, globalIdx, evaluationUi.evaluationScores);
          }).join('')}
          ${isLastPage ? `
            <tr>
              <th>Total</th>
              ${EVALUATION_PERIODS.map((p) => `<td class="evaluation-total-cell">${totals[p.id] || 0}</td>`).join('')}
            </tr>` : ''}
        </tbody>
      </table>
    </div>
    ${isLastPage ? `
      <label class="form-field evaluation-notes-field">
        <span class="form-label">Observações</span>
        <textarea class="evaluation-notes-textarea" rows="4" data-evaluation-notes
          placeholder="Registre observações importantes sobre a avaliação.">${sanitizeText(notes)}</textarea>
      </label>` : ''}
  `;
}

// ── Behavioral ────────────────────────────────────────────────────────────────

export function getBehavioralEvaluationMarkup(selectedTool, selectedUser, evaluationUi, moduleData, currentPage = 0) {
  const respondent           = moduleData?.respondent || null;
  const respondentName       = String(respondent?.nome || '').trim();
  const evaluationSectorName = String(moduleData?.evaluationSector?.label || '').trim();
  const pageSlice            = EVALUATION_CRITERIA.slice(currentPage * CRITERIA_PER_PAGE, (currentPage + 1) * CRITERIA_PER_PAGE);
  const isLastPage           = currentPage >= 1;

  const metaBlock = currentPage === 0 ? `
    <div class="evaluation-form-grid">
      <label class="form-field evaluation-form-field">
        <span class="form-label">Funcionário</span>
        <input class="evaluation-form-input" type="text" value="${sanitizeAttribute(selectedUser.nome || '')}" readonly aria-label="Funcionário avaliado" />
      </label>
      <label class="form-field evaluation-form-field">
        <span class="form-label">Chefia imediata</span>
        <input class="evaluation-form-input" type="text" value="${sanitizeAttribute(respondentName || 'Respondente não identificado')}" readonly aria-label="Chefia imediata" />
      </label>
      <label class="form-field evaluation-form-field">
        <span class="form-label">Setor</span>
        <input class="evaluation-form-input" type="text" value="${sanitizeAttribute(evaluationSectorName || 'Setor não identificado')}" readonly aria-label="Setor da avaliação" />
      </label>
    </div>` : '';

  return `
    ${metaBlock}
    <div class="evaluation-table-wrap">
      <table class="evaluation-table evaluation-table--behavioral">
        <thead>
          <tr>
            <th>Critérios de avaliação</th>
            ${BEHAVIORAL_EVALUATION_OPTIONS.map((o) => `<th title="${sanitizeAttribute(o.title)}">${sanitizeText(o.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${pageSlice.map((c, localIdx) => {
            const globalIdx = currentPage * CRITERIA_PER_PAGE + localIdx;
            return getBehavioralCriterionRowMarkup(selectedTool.id, c, globalIdx, evaluationUi.evaluationScores);
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="evaluation-legend" aria-label="Legenda da avaliação comportamental">
      ${BEHAVIORAL_EVALUATION_OPTIONS.map((o) => `<span><strong>${sanitizeText(o.label)}</strong> - ${sanitizeText(o.title)}</span>`).join('')}
    </div>
    ${isLastPage ? `
      <label class="form-field evaluation-notes-field">
        <span class="form-label">Observações</span>
        <textarea class="evaluation-notes-textarea" rows="4" data-evaluation-notes
          placeholder="Registre observações importantes sobre a avaliação comportamental.">${sanitizeText(getEvaluationToolNotes(evaluationUi, selectedTool.id))}</textarea>
      </label>` : ''}
  `;
}

// ── Shared row helpers ────────────────────────────────────────────────────────

export function getEvaluationCriterionRowMarkup(toolId, criterion, index, scores) {
  return `
    <tr>
      <th>
        <span class="evaluation-criterion-index">${String(index + 1).padStart(2, '0')}.</span>
        <strong>${sanitizeText(criterion.title)}</strong>
        <span class="evaluation-criterion-description">${sanitizeText(criterion.description)}</span>
      </th>
      ${EVALUATION_PERIODS.map((period) => `
        <td>
          <div class="evaluation-score-group" role="radiogroup" aria-label="${sanitizeAttribute(criterion.title)} em ${period.label}">
            ${[1, 2, 3, 4, 5].map((score) => {
              const scoreKey  = getEvaluationScoreKey(toolId, criterion.id, period.id);
              const isChecked = String(scores[scoreKey] || '') === String(score);
              return `
                <label class="evaluation-score-option">
                  <input type="radio"
                    name="evaluation-${sanitizeAttribute(toolId)}-${sanitizeAttribute(criterion.id)}-${sanitizeAttribute(period.id)}"
                    value="${score}"
                    data-evaluation-score
                    data-criterion-id="${sanitizeAttribute(criterion.id)}"
                    data-period="${sanitizeAttribute(period.id)}"
                    ${isChecked ? 'checked' : ''}
                  /><span>${score}</span>
                </label>
              `;
            }).join('')}
          </div>
        </td>
      `).join('')}
    </tr>
  `;
}

export function getBehavioralCriterionRowMarkup(toolId, criterion, index, scores) {
  return `
    <tr>
      <th>
        <span class="evaluation-criterion-index">${String(index + 1).padStart(2, '0')}.</span>
        <strong>${sanitizeText(criterion.title)}</strong>
        <span class="evaluation-criterion-description">${sanitizeText(criterion.description)}</span>
      </th>
      ${BEHAVIORAL_EVALUATION_OPTIONS.map((option) => {
        const scoreKey  = getEvaluationScoreKey(toolId, criterion.id, option.id);
        const isChecked = String(scores[scoreKey] || '') === option.id;
        return `
          <td>
            <label class="evaluation-behavior-option" title="${sanitizeAttribute(option.title)}">
              <input type="radio"
                name="evaluation-${sanitizeAttribute(toolId)}-${sanitizeAttribute(criterion.id)}"
                value="${sanitizeAttribute(option.id)}"
                data-evaluation-score
                data-criterion-id="${sanitizeAttribute(criterion.id)}"
                data-period="${sanitizeAttribute(option.id)}"
                ${isChecked ? 'checked' : ''}
              /><span>${sanitizeText(option.label)}</span>
            </label>
          </td>
        `;
      }).join('')}
    </tr>
  `;
}
