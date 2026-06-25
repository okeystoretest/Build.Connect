/**
 * evaluation.view-matrix.js
 * Matrix evaluation form markup, decision graph, and criterion row helper.
 * Supports horizontal pagination via currentPage parameter.
 * - Page 0: Competências Técnicas (17 critérios)
 * - Page 1: Competências Emocionais (13 critérios) + resultado
 */

import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';
import {
  MATRIX_EMOTIONAL_CRITERIA,
  MATRIX_TECHNICAL_CRITERIA,
} from './evaluation.constants.js';
import {
  formatEvaluationNumber,
  formatEvaluationTimestamp,
  getEvaluationScoreKey,
  getMatrixComputedResult,
  getMatrixDecisionColor,
  getMatrixGraphPointPosition,
} from './evaluation.calculations.js';
import {
  getEvaluationSaveButtonMarkup,
  getEvaluationSaveFeedbackMarkup,
} from './evaluation.view-forms.js';

// ── Main export ───────────────────────────────────────────────────────────────

export function getMatrixEvaluationMarkup(selectedTool, selectedUser, evaluationUi, moduleData, currentPage = 0) {
  const respondent           = moduleData?.respondent || null;
  const respondentName       = String(respondent?.nome || '').trim();
  const evaluationSectorName = String(moduleData?.evaluationSector?.label || '').trim();
  const computedResult       = getMatrixComputedResult(evaluationUi, selectedTool.id, selectedUser.id);

  const contextGrid = `
    <div class="matrix-context-grid">
      <label class="form-field evaluation-form-field matrix-context-card">
        <span class="form-label">Funcionário</span>
        <input class="evaluation-form-input" type="text" value="${sanitizeAttribute(selectedUser.nome || '')}" readonly aria-label="Funcionário avaliado" />
      </label>
      <label class="form-field evaluation-form-field matrix-context-card">
        <span class="form-label">Respondente</span>
        <input class="evaluation-form-input" type="text" value="${sanitizeAttribute(respondentName || 'Respondente não identificado')}" readonly aria-label="Nome do respondente" />
      </label>
      <label class="form-field evaluation-form-field matrix-context-card">
        <span class="form-label">Setor</span>
        <input class="evaluation-form-input" type="text" value="${sanitizeAttribute(evaluationSectorName || 'Setor não identificado')}" readonly aria-label="Setor da avaliação" />
      </label>
    </div>`;

  if (currentPage === 0) {
    return `
      <section class="matrix-evaluation-page" aria-label="Matriz de decisão — Competências Técnicas">
        ${contextGrid}
        <div class="matrix-workspace">
          <div class="matrix-score-column">
            <article class="matrix-competency-card">
              <header class="matrix-competency-header">
                <div>
                  <span class="evaluation-section-eyebrow">Competências técnicas</span>
                  <h3 class="card-title">Habilidade e conhecimento</h3>
                </div>
                <span class="matrix-scale-badge">0 a 10</span>
              </header>
              <div class="matrix-criteria-list">
                ${MATRIX_TECHNICAL_CRITERIA.map((c, i) => getMatrixCriterionRowMarkup(selectedTool.id, c, 'technical', i, evaluationUi.evaluationScores)).join('')}
              </div>
            </article>
          </div>
        </div>
      </section>`;
  }

  // Page 1: Emotional criteria + result panel
  return `
    <section class="matrix-evaluation-page" aria-label="Matriz de decisão — Competências Emocionais e Resultado">
      <div class="matrix-workspace">
        <div class="matrix-score-column">
          <article class="matrix-competency-card">
            <header class="matrix-competency-header">
              <div>
                <span class="evaluation-section-eyebrow">Competências emocionais</span>
                <h3 class="card-title">Atitude e caráter</h3>
              </div>
              <span class="matrix-scale-badge">0 a 10</span>
            </header>
            <div class="matrix-criteria-list">
              ${MATRIX_EMOTIONAL_CRITERIA.map((c, i) => getMatrixCriterionRowMarkup(selectedTool.id, c, 'emotional', i, evaluationUi.evaluationScores)).join('')}
            </div>
          </article>
        </div>
        <aside class="matrix-result-panel" aria-label="Resultado da matriz de decisão">
          <div class="matrix-result-summary">
            <span class="evaluation-result-label">Resultado</span>
            <strong class="matrix-decision-title">${sanitizeText(computedResult.decisionLabel)}</strong>
            <span class="evaluation-result-caption">${computedResult.isSaved ? `Calculado em ${formatEvaluationTimestamp(computedResult.savedAt)}.` : 'Clique em salvar para calcular a matriz.'}</span>
          </div>
          <div class="matrix-metrics-grid">
            <article class="matrix-metric-card">
              <span>Técnico</span>
              <strong>${formatEvaluationNumber(computedResult.technicalAverage)}</strong>
              <small>Total ${formatEvaluationNumber(computedResult.technicalTotal)}</small>
            </article>
            <article class="matrix-metric-card">
              <span>Emocional</span>
              <strong>${formatEvaluationNumber(computedResult.emotionalAverage)}</strong>
              <small>Total ${formatEvaluationNumber(computedResult.emotionalTotal)}</small>
            </article>
          </div>
          <div class="matrix-actions-row">
            ${getEvaluationSaveButtonMarkup(evaluationUi, 'Salvar e calcular')}
            <span class="evaluation-result-caption">O gráfico da Matriz de Decisão está disponível apenas no card Qualidade do DHO.</span>
            ${getEvaluationSaveFeedbackMarkup(evaluationUi)}
          </div>
        </aside>
      </div>
    </section>`;
}

// ── Criterion row ─────────────────────────────────────────────────────────────

export function getMatrixCriterionRowMarkup(toolId, criterion, categoryId, index, scores) {
  const scoreKey     = getEvaluationScoreKey(toolId, criterion.id, categoryId);
  const currentValue = String(scores[scoreKey] || '0');
  return `
    <article class="matrix-criterion-item">
      <div class="matrix-criterion-copy">
        <span class="evaluation-criterion-index">${String(index + 1).padStart(2, '0')}</span>
        <div>
          <strong>${sanitizeText(criterion.title)}</strong>
          <span class="evaluation-criterion-description">${sanitizeText(criterion.description)}</span>
        </div>
      </div>
      <div class="matrix-score-scale" role="radiogroup" aria-label="Nota para ${sanitizeAttribute(criterion.title)}">
        ${Array.from({ length: 11 }, (_, score) => {
          const isChecked = currentValue === String(score);
          return `
            <label class="matrix-score-button">
              <input type="radio"
                name="matrix-${sanitizeAttribute(toolId)}-${sanitizeAttribute(categoryId)}-${sanitizeAttribute(criterion.id)}"
                value="${score}"
                data-evaluation-score
                data-criterion-id="${sanitizeAttribute(criterion.id)}"
                data-period="${sanitizeAttribute(categoryId)}"
                ${isChecked ? 'checked' : ''}
              /><span>${score}</span>
            </label>
          `;
        }).join('')}
      </div>
    </article>
  `;
}

// ── Decision graph ────────────────────────────────────────────────────────────

export function getMatrixDecisionGraphMarkup(result) {
  const graphPoint  = getMatrixGraphPointPosition(result.technicalAverage, result.emotionalAverage);
  const pointColor  = getMatrixDecisionColor(result.decisionId);
  const pointMarkup = result.isSaved
    ? `<circle cx="${graphPoint.x}" cy="${graphPoint.y}" r="7" fill="${pointColor}"></circle>
       <circle cx="${graphPoint.x}" cy="${graphPoint.y}" r="15" fill="none" stroke="${pointColor}" stroke-width="2" opacity="0.8"></circle>`
    : `<circle cx="${graphPoint.x}" cy="${graphPoint.y}" r="6" fill="#687083"></circle>`;

  return `
    <div class="matrix-chart-header">
      <span class="evaluation-section-eyebrow">Matriz</span>
      <strong>${sanitizeText(result.isSaved ? result.decisionLabel : 'Aguardando')}</strong>
    </div>
    <div class="evaluation-graph-stage matrix-chart-stage">
      <svg class="evaluation-graph-svg matrix-chart-svg" viewBox="0 0 520 420" role="img" aria-label="Gráfico da matriz de decisão">
        <defs>
          <linearGradient id="matrixZoneWarm" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#d4a257" stop-opacity="0.18"></stop><stop offset="1" stop-color="#d4a257" stop-opacity="0.05"></stop></linearGradient>
          <linearGradient id="matrixZoneCool" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#5f7fbf" stop-opacity="0.14"></stop><stop offset="1" stop-color="#5f7fbf" stop-opacity="0.04"></stop></linearGradient>
          <linearGradient id="matrixZoneRisk" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#df5b5b" stop-opacity="0.13"></stop><stop offset="1" stop-color="#df5b5b" stop-opacity="0.04"></stop></linearGradient>
          <linearGradient id="matrixZoneGrowth" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#55b87a" stop-opacity="0.15"></stop><stop offset="1" stop-color="#55b87a" stop-opacity="0.04"></stop></linearGradient>
        </defs>
        <rect x="54" y="38" width="400" height="300" rx="18" fill="rgba(255,255,255,0.025)" stroke="var(--border)"></rect>
        <rect x="54" y="188" width="200" height="150" fill="url(#matrixZoneRisk)"></rect>
        <rect x="54" y="38" width="200" height="150" fill="url(#matrixZoneCool)"></rect>
        <rect x="254" y="188" width="200" height="150" fill="url(#matrixZoneGrowth)"></rect>
        <rect x="254" y="38" width="200" height="150" fill="url(#matrixZoneWarm)"></rect>
        ${_gridLines()}
        <line x1="254" y1="38" x2="254" y2="338" stroke="var(--primary)" stroke-width="2.4"></line>
        <line x1="54" y1="188" x2="454" y2="188" stroke="var(--primary)" stroke-width="2.4"></line>
        <path d="M334 128 L334 98 L374 98 L374 68 L414 68 L414 38" fill="none" stroke="var(--primary)" stroke-width="2" opacity="0.85"></path>
        <text x="104" y="112" class="evaluation-graph-region">TÉCNICO</text>
        <text x="104" y="268" class="evaluation-graph-region">DEMISSÃO</text>
        <text x="310" y="268" class="evaluation-graph-region">EMOCIONAL</text>
        <text x="326" y="126" class="evaluation-graph-region">RECONHECER</text>
        <text x="372" y="88" class="evaluation-graph-region">INVESTIR</text>
        <text x="407" y="58" class="evaluation-graph-region">PROMOVER</text>
        ${pointMarkup}
        <text x="254" y="392" text-anchor="middle" class="evaluation-graph-axis">Competências técnicas</text>
        <text x="18" y="188" text-anchor="middle" class="evaluation-graph-axis" transform="rotate(-90 18 188)">Competências emocionais</text>
      </svg>
    </div>
  `;
}

function _gridLines() {
  const v = Array.from({ length: 11 }, (_, i) => {
    const x = 54 + (40 * i);
    return `<line x1="${x}" y1="38" x2="${x}" y2="338" stroke="rgba(255,255,255,0.06)" stroke-width="1"></line><text x="${x}" y="360" text-anchor="middle" class="evaluation-graph-scale">${i}</text>`;
  }).join('');
  const h = Array.from({ length: 11 }, (_, i) => {
    const y = 338 - (30 * i);
    return `<line x1="54" y1="${y}" x2="454" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1"></line><text x="42" y="${y + 4}" text-anchor="end" class="evaluation-graph-scale">${i}</text>`;
  }).join('');
  return `${v}${h}`;
}
