/**
 * evaluation.view-behavioral.js
 * Pre-effective and Behavioral evaluation form markup + criterion row helpers.
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
import { getEvaluationSavePanelMarkup } from './evaluation.view-forms.js';

export function getPreEffectiveEvaluationMarkup(selectedTool, evaluationUi) {
  const totals = getEvaluationTotals(evaluationUi.evaluationScores, selectedTool.id);
  const notes  = getEvaluationToolNotes(evaluationUi, selectedTool.id);
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
          ${EVALUATION_CRITERIA.map((c, i) => getEvaluationCriterionRowMarkup(selectedTool.id, c, i, evaluationUi.evaluationScores)).join('')}
          <tr>
            <th>Total</th>
            ${EVALUATION_PERIODS.map((p) => `<td class="evaluation-total-cell">${totals[p.id] || 0}</td>`).join('')}
          </tr>
        </tbody>
      </table>
    </div>
    <label class="form-field evaluation-notes-field">
      <span class="form-label">Observações</span>
      <textarea class="evaluation-notes-textarea" rows="4" data-evaluation-notes placeholder="Registre observações importantes sobre a avaliação.">${sanitizeText(notes)}</textarea>
    </label>
    ${getEvaluationSavePanelMarkup(evaluationUi)}
  `;
}

export function getBehavioralEvaluationMarkup(selectedTool, selectedUser, evaluationUi, moduleData) {
  const fields               = getEvaluationToolFields(evaluationUi, selectedTool.id);
  const respondent           = moduleData?.respondent || null;
  const respondentName       = String(respondent?.nome || '').trim();
  const evaluationSectorName = String(moduleData?.evaluationSector?.label || '').trim();

  return `
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
    </div>
    <div class="evaluation-table-wrap">
      <table class="evaluation-table evaluation-table--behavioral">
        <thead>
          <tr>
            <th>Critérios de avaliação</th>
            ${BEHAVIORAL_EVALUATION_OPTIONS.map((o) => `<th title="${sanitizeAttribute(o.title)}">${sanitizeText(o.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${EVALUATION_CRITERIA.map((c, i) => getBehavioralCriterionRowMarkup(selectedTool.id, c, i, evaluationUi.evaluationScores)).join('')}
        </tbody>
      </table>
    </div>
    <div class="evaluation-legend" aria-label="Legenda da avaliação comportamental">
      ${BEHAVIORAL_EVALUATION_OPTIONS.map((o) => `<span><strong>${sanitizeText(o.label)}</strong> - ${sanitizeText(o.title)}</span>`).join('')}
    </div>
    <label class="form-field evaluation-notes-field">
      <span class="form-label">Observações</span>
      <textarea class="evaluation-notes-textarea" rows="4" data-evaluation-notes placeholder="Registre observações importantes sobre a avaliação comportamental.">${sanitizeText(getEvaluationToolNotes(evaluationUi, selectedTool.id))}</textarea>
    </label>
    ${getEvaluationSavePanelMarkup(evaluationUi)}
  `;
}

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
