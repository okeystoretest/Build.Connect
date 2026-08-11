/**
 * quality.mirror.js — Espelho da avaliação respondida (Task 2).
 *
 * Renderiza, item a item, as respostas que o avaliador marcou, complementando
 * as métricas consolidadas já exibidas nos cards de resultado.
 *
 * Os dados vêm de record.scores (campos/pontuacoes_json), normalizados por
 * evaluations.service.js. As chaves seguem o formato:
 *   `${toolId}:${criterionId}:${periodOrDimension}`
 *
 * Cobre PRE_EFFECTIVE e BEHAVIORAL (que hoje só mostram chips consolidados).
 * WORK_EFFICACY e EMOTIONAL_INTELLIGENCE já têm detalhamento próprio em
 * quality.scoring.js; para eles o espelho não é duplicado.
 */

import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';
import {
  BEHAVIORAL_EVALUATION_OPTIONS,
  EVALUATION_CRITERIA,
  EVALUATION_PERIODS,
  EVALUATION_TOOL_IDS,
  MATRIX_TECHNICAL_CRITERIA,
  MATRIX_EMOTIONAL_CRITERIA,
} from '../evaluations/evaluation.constants.js';
import { getEvaluationScoreKey } from '../evaluations/evaluation.calculations.js';

/**
 * Retorna o markup do espelho para um registro, ou '' quando o tipo de
 * ferramenta não tem espelho dedicado (evita duplicar detalhamentos existentes).
 */
export function getEvaluationMirrorMarkup(record) {
  const toolId = record.toolId;
  // scores normalmente é objeto (jsonb). Defensivo: aceita string JSON também.
  let scores = record.scores || {};
  if (typeof scores === 'string') {
    try { scores = JSON.parse(scores); } catch { scores = {}; }
  }
  if (typeof scores !== 'object' || scores === null) scores = {};

  let body = '';
  if (toolId === EVALUATION_TOOL_IDS.PRE_EFFECTIVE) {
    body = _getPreEffectiveMirror(toolId, scores);
  } else if (toolId === EVALUATION_TOOL_IDS.BEHAVIORAL) {
    body = _getBehavioralMirror(toolId, scores);
  } else if (toolId === EVALUATION_TOOL_IDS.MATRIX) {
    body = _getMatrixMirror(toolId, scores);
  } else {
    return '';
  }

  if (!body) return '';

  return `
    <details class="qr-mirror">
      <summary class="qr-mirror-summary">
        <span class="qr-mirror-summary-label">
          <i data-lucide="list-checks"></i>
          Ver respostas detalhadas
        </span>
        <i data-lucide="chevron-down" class="qr-mirror-chevron"></i>
      </summary>
      <div class="qr-mirror-body">
        ${body}
      </div>
    </details>
  `;
}

// ── Pré-efetivo: cada critério × período (7/14/21 dias) ─────────────────────
function _getPreEffectiveMirror(toolId, scores) {
  const rows = EVALUATION_CRITERIA.map((criterion, index) => {
    const cells = EVALUATION_PERIODS.map((period) => {
      const key = getEvaluationScoreKey(toolId, criterion.id, period.id);
      const raw = scores[key];
      const filled = raw !== undefined && raw !== null && String(raw) !== '';
      return `
        <td class="qr-mirror-cell ${filled ? '' : 'is-empty'}">
          ${filled ? sanitizeText(String(raw)) : '—'}
        </td>`;
    }).join('');

    return `
      <tr>
        <th scope="row" class="qr-mirror-criterion">
          <span class="qr-mirror-criterion-index">${String(index + 1).padStart(2, '0')}.</span>
          <span class="qr-mirror-criterion-title">${sanitizeText(criterion.title)}</span>
        </th>
        ${cells}
      </tr>`;
  }).join('');

  return `
    <table class="qr-mirror-table">
      <thead>
        <tr>
          <th scope="col" class="qr-mirror-th-criterion">Critério</th>
          ${EVALUATION_PERIODS.map((p) => `<th scope="col" class="qr-mirror-th-period">${sanitizeText(p.label)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Comportamental: cada critério → opção marcada (E/S/R/I) ──────────────────
function _getBehavioralMirror(toolId, scores) {
  const rows = EVALUATION_CRITERIA.map((criterion, index) => {
    const chosen = BEHAVIORAL_EVALUATION_OPTIONS.find((option) => {
      const key = getEvaluationScoreKey(toolId, criterion.id, option.id);
      return String(scores[key] || '') === option.id;
    });

    const answer = chosen
      ? `<span class="qr-mirror-answer" data-opt="${sanitizeAttribute(chosen.id)}">${sanitizeText(chosen.label)} · ${sanitizeText(chosen.title)}</span>`
      : `<span class="qr-mirror-answer is-empty">Sem resposta</span>`;

    return `
      <tr>
        <th scope="row" class="qr-mirror-criterion">
          <span class="qr-mirror-criterion-index">${String(index + 1).padStart(2, '0')}.</span>
          <span class="qr-mirror-criterion-title">${sanitizeText(criterion.title)}</span>
        </th>
        <td class="qr-mirror-cell qr-mirror-cell-answer">${answer}</td>
      </tr>`;
  }).join('');

  return `
    <table class="qr-mirror-table qr-mirror-table-behavioral">
      <thead>
        <tr>
          <th scope="col" class="qr-mirror-th-criterion">Critério</th>
          <th scope="col" class="qr-mirror-th-answer">Resposta marcada</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Matriz de decisão: critérios técnicos e emocionais (nota 0–10) ──────────
function _getMatrixMirror(toolId, scores) {
  const section = (title, icon, criteria, dimension) => {
    const rows = criteria.map((criterion, index) => {
      const key = getEvaluationScoreKey(toolId, criterion.id, dimension);
      const raw = scores[key];
      const filled = raw !== undefined && raw !== null && String(raw) !== '';
      return `
        <tr>
          <th scope="row" class="qr-mirror-criterion">
            <span class="qr-mirror-criterion-index">${String(index + 1).padStart(2, '0')}.</span>
            <span class="qr-mirror-criterion-title">${sanitizeText(criterion.title)}</span>
          </th>
          <td class="qr-mirror-cell qr-mirror-cell-answer ${filled ? '' : 'is-empty'}">
            ${filled ? `<span class="qr-mirror-note">${sanitizeText(String(raw))}<small>/10</small></span>` : '—'}
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="qr-mirror-matrix-section">
        <h5 class="qr-mirror-matrix-heading"><i data-lucide="${icon}"></i> ${sanitizeText(title)}</h5>
        <table class="qr-mirror-table qr-mirror-table-behavioral">
          <thead>
            <tr>
              <th scope="col" class="qr-mirror-th-criterion">Critério</th>
              <th scope="col" class="qr-mirror-th-answer">Nota</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  };

  return `
    ${section('Critérios Técnicos', 'wrench', MATRIX_TECHNICAL_CRITERIA, 'technical')}
    ${section('Critérios Emocionais', 'heart', MATRIX_EMOTIONAL_CRITERIA, 'emotional')}
  `;
}
