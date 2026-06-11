import { MODULE_UI_DEFAULTS } from '../../../state/module-state.js';
import {
  BEHAVIORAL_EVALUATION_OPTIONS,
  BEHAVIORAL_FORM_DEFAULTS,
  EVALUATION_CRITERIA,
  EVALUATION_PERIODS,
  EVALUATION_TOOL_IDS,
  EVALUATION_TOOLS,
  EVALUATION_UI_DEFAULTS,
  MATRIX_EMOTIONAL_CRITERIA,
  MATRIX_TECHNICAL_CRITERIA,
  WORK_EFFICACY_CRITERIA,
  IE_PERSONAL_CRITERIA,
  IE_SOCIAL_CRITERIA,
} from './evaluation.constants.js';

export function getEvaluationUiState(moduleUi) {
  const mergedUi = {
    ...MODULE_UI_DEFAULTS,
    ...EVALUATION_UI_DEFAULTS,
    ...(moduleUi || {}),
  };

  return {
    ...mergedUi,
    evaluationScores: { ...(mergedUi.evaluationScores || {}) },
    evaluationNotesByTool: { ...(mergedUi.evaluationNotesByTool || {}) },
    evaluationFormFieldsByTool: { ...(mergedUi.evaluationFormFieldsByTool || {}) },
    evaluationComputedResultsByTool: { ...(mergedUi.evaluationComputedResultsByTool || {}) },
    savedEvaluationRecordsByTool: { ...(mergedUi.savedEvaluationRecordsByTool || {}) },
  };
}

export function getFilteredEvaluationUsers(users, query, selectedEvaluateeId) {
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase('pt-BR');

  if (!normalizedQuery) {
    return users;
  }

  return users.filter((user) => {
    const haystack = `${user.id || ''} ${user.nome || ''}`.toLocaleLowerCase('pt-BR');
    if (user.id === selectedEvaluateeId) {
      return true;
    }
    return haystack.includes(normalizedQuery);
  });
}

export function getEvaluationTotals(scores, toolId) {
  return EVALUATION_PERIODS.reduce((accumulator, period) => {
    accumulator[period.id] = EVALUATION_CRITERIA.reduce((total, criterion) => {
      const value = Number(scores[getEvaluationScoreKey(toolId, criterion.id, period.id)] || 0);
      return total + value;
    }, 0);
    return accumulator;
  }, {});
}

export function getEvaluationScoreKey(toolId, criterionId, periodId) {
  return `${toolId || EVALUATION_TOOL_IDS.PRE_EFFECTIVE}:${criterionId}:${periodId}`;
}

export function getEvaluationToolNotes(evaluationUi, toolId) {
  const notesByTool = evaluationUi?.evaluationNotesByTool || {};

  if (Object.prototype.hasOwnProperty.call(notesByTool, toolId)) {
    return notesByTool[toolId] || '';
  }

  if (toolId === EVALUATION_TOOL_IDS.PRE_EFFECTIVE && typeof evaluationUi?.evaluationNotes === 'string') {
    return evaluationUi.evaluationNotes;
  }

  return '';
}

export function getEvaluationToolFields(evaluationUi, toolId) {
  const toolFields = evaluationUi?.evaluationFormFieldsByTool?.[toolId] || {};

  return {
    ...BEHAVIORAL_FORM_DEFAULTS,
    ...toolFields,
  };
}

export function getDefaultMatrixComputedResult() {
  return {
    evaluateeId: '',
    evaluateeName: '',
    respondentName: '',
    technicalTotal: 0,
    technicalAverage: 0,
    emotionalTotal: 0,
    emotionalAverage: 0,
    decisionId: 'pending',
    decisionLabel: 'Aguardando cálculo',
    savedAt: '',
    isSaved: false,
  };
}

export function getMatrixComputedResult(evaluationUi, toolId, selectedEvaluateeId) {
  const storedResult = evaluationUi?.evaluationComputedResultsByTool?.[toolId] || null;

  if (!storedResult || storedResult.evaluateeId !== selectedEvaluateeId) {
    return getDefaultMatrixComputedResult();
  }

  return {
    ...getDefaultMatrixComputedResult(),
    ...storedResult,
    isSaved: Boolean(storedResult.isSaved),
  };
}

export function getEvaluationNumericScore(scores, toolId, criterionId, periodId) {
  const numericValue = Number.parseFloat(scores[getEvaluationScoreKey(toolId, criterionId, periodId)] || '0');

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  if (numericValue < 0) {
    return 0;
  }

  if (numericValue > 10) {
    return 10;
  }

  return numericValue;
}

export function getMatrixDecision(toolTechnicalAverage, toolEmotionalAverage) {
  if (toolTechnicalAverage >= 9 && toolEmotionalAverage >= 9) {
    return { id: 'promocao', label: 'Promoção' };
  }

  if (toolTechnicalAverage >= 8 && toolEmotionalAverage >= 8) {
    return { id: 'investimento', label: 'Investimento' };
  }

  if (toolTechnicalAverage >= 7 && toolEmotionalAverage >= 7) {
    return { id: 'reconhecimento', label: 'Reconhecimento' };
  }

  if (toolTechnicalAverage < 5 && toolEmotionalAverage < 5) {
    return { id: 'demissao', label: 'Demissão' };
  }

  if (toolTechnicalAverage < 5 && toolEmotionalAverage >= 5) {
    return { id: 'treinamento-tecnico', label: 'Treinamento técnico' };
  }

  if (toolTechnicalAverage >= 5 && toolEmotionalAverage < 5) {
    return { id: 'treinamento-emocional', label: 'Treinamento emocional' };
  }

  return { id: 'acompanhamento', label: 'Acompanhamento' };
}

export function buildMatrixComputedResult(moduleData, evaluationUi, selectedUser) {
  const selectedToolId = EVALUATION_TOOL_IDS.MATRIX;
  const fields = getEvaluationToolFields(evaluationUi, selectedToolId);
  const technicalTotal = MATRIX_TECHNICAL_CRITERIA.reduce((total, criterion) => total + getEvaluationNumericScore(evaluationUi.evaluationScores, selectedToolId, criterion.id, 'technical'), 0);
  const emotionalTotal = MATRIX_EMOTIONAL_CRITERIA.reduce((total, criterion) => total + getEvaluationNumericScore(evaluationUi.evaluationScores, selectedToolId, criterion.id, 'emotional'), 0);
  const technicalAverage = MATRIX_TECHNICAL_CRITERIA.length ? technicalTotal / MATRIX_TECHNICAL_CRITERIA.length : 0;
  const emotionalAverage = MATRIX_EMOTIONAL_CRITERIA.length ? emotionalTotal / MATRIX_EMOTIONAL_CRITERIA.length : 0;
  const decision = getMatrixDecision(technicalAverage, emotionalAverage);

  return {
    evaluateeId: selectedUser?.id || '',
    evaluateeName: selectedUser?.nome || '',
    respondentName: moduleData?.respondent?.nome || '',
    evaluationDate: fields.evaluationDate || '',
    sectorName: moduleData?.evaluationSector?.label || '',
    technicalTotal,
    technicalAverage,
    emotionalTotal,
    emotionalAverage,
    decisionId: decision.id,
    decisionLabel: decision.label,
    savedAt: new Date().toISOString(),
    isSaved: true,
  };
}

export function getMatrixGraphPointPosition(technicalAverage, emotionalAverage) {
  const safeX = Math.max(0, Math.min(10, Number(technicalAverage || 0)));
  const safeY = Math.max(0, Math.min(10, Number(emotionalAverage || 0)));

  return {
    x: 54 + (safeX * 40),
    y: 338 - (safeY * 30),
  };
}

export function formatEvaluationNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatEvaluationTimestamp(value) {
  if (!value) {
    return 'agora';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'agora';
  }

  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function clearComputedResultForTool(evaluationUi, toolId) {
  const nextResults = { ...(evaluationUi?.evaluationComputedResultsByTool || {}) };
  delete nextResults[toolId];
  return nextResults;
}

export function getUserSectorSummary(user) {
  const sectors = Array.isArray(user?.setorList)
    ? user.setorList
    : String(user?.setor || '').split(/[,;|]+/);

  return sectors
    .map((sector) => String(sector || '').trim())
    .filter(Boolean)
    .join(', ');
}

export function getMatrixDecisionColor(decisionId) {
  const colorMap = {
    pending: '#687083',
    acompanhamento: '#8a92a6',
    demissao: '#df5b5b',
    'treinamento-tecnico': '#5f7fbf',
    'treinamento-emocional': '#55b87a',
    reconhecimento: '#c7a66a',
    investimento: '#d4a257',
    promocao: '#f4be61',
  };

  return colorMap[decisionId] || '#d4a257';
}



export function buildEvaluationRecordPayload(moduleData, evaluationUi, selectedToolId, selectedUser) {
  const selectedTool = EVALUATION_TOOLS.find((tool) => tool.id === selectedToolId) || null;
  const scores = getEvaluationToolScores(evaluationUi.evaluationScores, selectedToolId);
  const notes = getEvaluationToolNotes(evaluationUi, selectedToolId);
  const matrixResult = selectedToolId === EVALUATION_TOOL_IDS.MATRIX
    ? buildMatrixComputedResult(moduleData, evaluationUi, selectedUser)
    : null;

  // Respondent: always from authenticated session — never from UI fields
  const respondent = normalizeEvaluationPerson(moduleData?.respondent || null);

  // Timestamp: always auto-generated at submit — never from user input
  const now = new Date().toISOString();

  return {
    toolId: selectedToolId,
    toolTitle: selectedTool?.title || 'Avaliação',
    type: selectedToolId === EVALUATION_TOOL_IDS.MATRIX ? 'matrix' : 'form',
    sectorId: moduleData?.evaluationSector?.id || '',
    sectorName: moduleData?.evaluationSector?.label || '',
    respondent,
    evaluatee: normalizeEvaluationPerson(selectedUser || null),
    evaluationDate: now,
    notes,
    scores,
    totals: buildEvaluationTotals(evaluationUi, selectedToolId),
    summary: buildEvaluationSummary(evaluationUi, selectedToolId),
    matrixResult,
    createdAt: now,
  };
}

export function getEvaluationToolScores(scores, toolId) {
  const prefix = `${toolId}:`;

  return Object.entries(scores || {}).reduce((accumulator, [key, value]) => {
    if (key.startsWith(prefix) && String(value || '').trim() !== '') {
      accumulator[key] = value;
    }

    return accumulator;
  }, {});
}

function buildEvaluationTotals(evaluationUi, selectedToolId) {
  if (selectedToolId === EVALUATION_TOOL_IDS.PRE_EFFECTIVE) {
    return getEvaluationTotals(evaluationUi.evaluationScores, selectedToolId);
  }

  if (selectedToolId === EVALUATION_TOOL_IDS.MATRIX) {
    const selectedUser = { id: evaluationUi.selectedEvaluateeId, nome: '' };
    const result = getMatrixComputedResult(evaluationUi, selectedToolId, selectedUser.id);

    return {
      technicalTotal: result.technicalTotal || 0,
      technicalAverage: result.technicalAverage || 0,
      emotionalTotal: result.emotionalTotal || 0,
      emotionalAverage: result.emotionalAverage || 0,
    };
  }

  if (selectedToolId === EVALUATION_TOOL_IDS.WORK_EFFICACY) {
    const totals = {};
    let grandTotal = 0;
    for (const c of WORK_EFFICACY_CRITERIA) {
      const a = Number(evaluationUi.evaluationScores[getEvaluationScoreKey(selectedToolId, c.id, 'a')] || 0);
      const b = Number(evaluationUi.evaluationScores[getEvaluationScoreKey(selectedToolId, c.id, 'b')] || 0);
      totals[c.id] = { a, b, total: a + b };
      grandTotal += a + b;
    }
    return { byCriterion: totals, grandTotal };
  }

  if (selectedToolId === EVALUATION_TOOL_IDS.EMOTIONAL_INTELLIGENCE) {
    let totalPessoal = 0;
    let totalSocial  = 0;
    for (const c of IE_PERSONAL_CRITERIA) {
      totalPessoal += Number(evaluationUi.evaluationScores[getEvaluationScoreKey(selectedToolId, c.id, 'score')] || 0);
    }
    for (const c of IE_SOCIAL_CRITERIA) {
      totalSocial += Number(evaluationUi.evaluationScores[getEvaluationScoreKey(selectedToolId, c.id, 'score')] || 0);
    }
    return { totalPessoal, totalSocial, totalGeral: totalPessoal + totalSocial };
  }

  return {};
}

function buildEvaluationSummary(evaluationUi, selectedToolId) {
  if (selectedToolId === EVALUATION_TOOL_IDS.PRE_EFFECTIVE) {
    const totals = getEvaluationTotals(evaluationUi.evaluationScores, selectedToolId);
    return {
      type: 'pre-effective-totals',
      totals,
    };
  }

  if (selectedToolId === EVALUATION_TOOL_IDS.BEHAVIORAL) {
    const counts = BEHAVIORAL_EVALUATION_OPTIONS.reduce((accumulator, option) => {
      accumulator[option.id] = EVALUATION_CRITERIA.reduce((total, criterion) => {
        const key = getEvaluationScoreKey(selectedToolId, criterion.id, option.id);
        return total + (String(evaluationUi.evaluationScores?.[key] || '') === option.id ? 1 : 0);
      }, 0);
      return accumulator;
    }, {});

    return {
      type: 'behavioral-distribution',
      counts,
    };
  }

  if (selectedToolId === EVALUATION_TOOL_IDS.MATRIX) {
    const result = getMatrixComputedResult(evaluationUi, selectedToolId, evaluationUi.selectedEvaluateeId);
    return {
      type: 'matrix-decision',
      decisionId: result.decisionId,
      decisionLabel: result.decisionLabel,
      technicalAverage: result.technicalAverage,
      emotionalAverage: result.emotionalAverage,
    };
  }

  return {};
}

function normalizeEvaluationPerson(person) {
  return {
    id: String(person?.id || '').trim(),
    nome: String(person?.nome || person?.name || '').trim(),
    setor: String(person?.setor || '').trim(),
    nivel: String(person?.nivel || '').trim(),
  };
}
