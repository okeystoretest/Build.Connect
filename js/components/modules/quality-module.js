import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { searchEvaluationRecords } from '../../services/evaluations.service.js';
import { listarFeedbacksParaUsuario, marcarFeedbackLido } from '../../services/feedbacks-reader.service.js';
import {
  BEHAVIORAL_EVALUATION_OPTIONS,
  EVALUATION_CRITERIA,
  EVALUATION_PERIODS,
  EVALUATION_TOOL_IDS,
  EVALUATION_TOOLS,
  MATRIX_EMOTIONAL_CRITERIA,
  MATRIX_TECHNICAL_CRITERIA,
} from './evaluations/evaluation.constants.js';
import {
  formatEvaluationNumber,
  formatEvaluationTimestamp,
  getEvaluationScoreKey,
  getFilteredEvaluationUsers,
  getMatrixDecision,
} from './evaluations/evaluation.calculations.js';
import { getMatrixDecisionGraphMarkup } from './evaluations/evaluation.view.js';

export const QUALITY_UI_DEFAULTS = Object.freeze({
  selectedQualityToolId: '',
  selectedQualityEvaluateeId: '',
  qualityEvaluateeQuery: '',
  isQualityEvaluateeListOpen: false,
  qualityRecordsStatus: 'idle',
  qualityRecordsMessage: '',
  qualityRecords: [],
  // Feedback reader
  qualityView: 'evaluations',
  feedbacksStatus: 'idle',
  feedbacksPendentes: [],
  feedbacksLidos: [],
  feedbacksErrorMessage: '',
  markingReadId: null,
});

let moduleContext = null;

export function createQualityModuleHandlers(dependencies) {
  moduleContext = dependencies;

  return {
    selectTool: selectQualityTool,
    clearSelectedTool: clearSelectedQualityTool,
    toggleDropdown: toggleQualityDropdown,
    closeDropdown: closeQualityDropdown,
    updateSearch: updateQualitySearch,
    selectUser: selectQualityUser,
    switchView: switchQualityView,
    loadFeedbacks: loadQualityFeedbacks,
    markFeedbackRead: markQualityFeedbackRead,
  };
}

export function getQualityModuleMarkup(card, moduleData, moduleUi) {
  const qualityUi = getQualityUiState(moduleUi);
  const pendingCount = qualityUi.feedbacksPendentes.length;
  const hasToolSelected = !!qualityUi.selectedQualityToolId;

  const tabs = `
    <div class="quality-view-tabs" role="tablist">
      <button type="button" class="quality-tab-btn ${qualityUi.qualityView === 'evaluations' ? 'is-active' : ''}"
        data-quality-switch-view="evaluations" role="tab" aria-selected="${qualityUi.qualityView === 'evaluations'}">
        <i data-lucide="clipboard-list"></i>
        <span>Avaliações</span>
      </button>
      ${!hasToolSelected ? `
      <button type="button" class="quality-tab-btn ${qualityUi.qualityView === 'feedbacks' ? 'is-active' : ''}"
        data-quality-switch-view="feedbacks" role="tab" aria-selected="${qualityUi.qualityView === 'feedbacks'}">
        <i data-lucide="message-circle"></i>
        <span>Feedbacks</span>
        ${pendingCount > 0 ? `<span class="quality-tab-count">${pendingCount}</span>` : ''}
      </button>` : ''}
    </div>
  `;

  if (qualityUi.qualityView === 'feedbacks') {
    return getQualityFeedbacksMarkup(card, moduleData, qualityUi, tabs);
  }

  const selectedTool = EVALUATION_TOOLS.find((tool) => tool.id === qualityUi.selectedQualityToolId) || null;

  if (!selectedTool) {
    return getQualityToolsCatalogMarkup(card, tabs);
  }

  return getQualitySearchMarkup(card, moduleData, qualityUi, selectedTool, tabs);
}

function getQualityToolsCatalogMarkup(card, tabs = '') {
  return `
    <div class="module-shell evaluation-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked">
        <div>
          <p class="module-eyebrow">DHO · Qualidade</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">
            Consulte resultados, notas, gráficos e formulários salvos. Por segurança, as respostas ficam disponíveis apenas depois de selecionar o tipo de avaliação e buscar um colaborador.
          </p>
        </div>
      </div>

      ${tabs}

      <div class="evaluation-tools-grid" aria-label="Tipos de avaliação disponíveis para consulta">
        ${EVALUATION_TOOLS.map((tool) => `
          <button type="button" class="evaluation-tool-card" data-quality-tool="${sanitizeAttribute(tool.id)}" aria-label="Consultar ${sanitizeAttribute(tool.title)}">
            <span class="card-icon evaluation-tool-icon" aria-hidden="true">
              <i data-lucide="${sanitizeAttribute(tool.icon)}"></i>
            </span>
            <span class="evaluation-tool-copy">
              <span class="evaluation-tool-hint">${sanitizeText(tool.hint)}</span>
              <strong class="evaluation-tool-title">${sanitizeText(tool.title)}</strong>
              <span class="evaluation-tool-description">Busque respostas salvas deste formulário por colaborador.</span>
            </span>
            <span class="evaluation-tool-arrow" aria-hidden="true">
              <i data-lucide="arrow-right"></i>
            </span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function getQualitySearchMarkup(card, moduleData, qualityUi, selectedTool, tabs = '') {
  const users = Array.isArray(moduleData?.users) ? moduleData.users : [];
  const filteredUsers = getFilteredEvaluationUsers(users, qualityUi.qualityEvaluateeQuery, qualityUi.selectedQualityEvaluateeId);
  const selectedUser = users.find((user) => user.id === qualityUi.selectedQualityEvaluateeId) || null;

  return `
    <div class="module-shell evaluation-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked evaluation-tool-header">
        <div>
          <button type="button" class="module-link-button is-secondary evaluation-tools-back" data-quality-tools-back>
            <i data-lucide="arrow-left"></i>
            <span>Ver consultas</span>
          </button>
          <p class="module-eyebrow">DHO · Qualidade · ${sanitizeText(selectedTool.hint)}</p>
          <h2 class="module-title">${sanitizeText(selectedTool.title)}</h2>
          <p class="module-description">Selecione um colaborador ativo para consultar os registros salvos deste formulário.</p>
        </div>
      </div>

      <div class="evaluation-picker-block">
        <span class="evaluation-meta-label">Buscar colaborador</span>
        <div class="evaluation-picker" data-quality-picker>
          <label class="module-search-shell evaluation-search-shell" aria-label="Pesquisar colaborador ativo">
            <i data-lucide="search"></i>
            <input
              type="search"
              value="${sanitizeAttribute(qualityUi.qualityEvaluateeQuery)}"
              placeholder="Pesquise por ID ou nome do colaborador"
              data-quality-evaluatee-search
              autocomplete="off"
            />
          </label>
          <button type="button" class="module-control-button" data-quality-evaluatee-toggle aria-label="Abrir lista de colaboradores ativos" aria-expanded="${String(qualityUi.isQualityEvaluateeListOpen)}">
            <i data-lucide="chevrons-up-down"></i>
          </button>
          ${qualityUi.isQualityEvaluateeListOpen ? getQualityUsersDropdownMarkup(filteredUsers) : ''}
        </div>
        <span class="evaluation-picker-feedback">${selectedUser ? `Consulta direcionada para ${sanitizeText(selectedUser.nome)}.` : 'Selecione um colaborador para liberar as respostas salvas.'}</span>
      </div>

      ${selectedUser ? getQualityRecordsMarkup(qualityUi, selectedTool, selectedUser) : getQualitySearchEmptyMarkup()}
    </div>
  `;
}

function getQualityUsersDropdownMarkup(users) {
  return `
    <div class="evaluation-users-dropdown" role="listbox" aria-label="Colaboradores ativos encontrados">
      ${users.length ? users.map((user) => `
        <button type="button" class="evaluation-user-option" data-quality-evaluatee-option data-user-id="${sanitizeAttribute(user.id)}" role="option">
          <strong>${sanitizeText(user.nome || 'Usuário sem nome')}</strong>
          <span>${sanitizeText(user.id || 'Sem ID')} · ${sanitizeText(user.setor || 'Setor não informado')}</span>
        </button>
      `).join('') : `
        <div class="evaluation-user-option is-empty">
          <strong>Nenhum colaborador encontrado</strong>
          <span>Refine a busca pelo ID ou nome.</span>
        </div>
      `}
    </div>
  `;
}

function getQualitySearchEmptyMarkup() {
  return `
    <div class="empty-state is-compact">
      <span class="empty-state-icon" aria-hidden="true">
        <i data-lucide="search"></i>
      </span>
      <div>
        <h3 class="card-title">Busque um colaborador</h3>
        <p class="card-description">As informações de qualidade só são exibidas após a busca e seleção do colaborador avaliado.</p>
      </div>
    </div>
  `;
}

function getQualityRecordsMarkup(qualityUi, selectedTool, selectedUser) {
  if (qualityUi.qualityRecordsStatus === 'loading') {
    return `
      <div class="empty-state is-compact">
        <span class="empty-state-icon" aria-hidden="true"><i data-lucide="loader-circle"></i></span>
        <div>
          <h3 class="card-title">Carregando respostas</h3>
          <p class="card-description">Buscando registros de ${sanitizeText(selectedUser.nome || 'o colaborador')}…</p>
        </div>
      </div>
    `;
  }

  if (qualityUi.qualityRecordsStatus === 'error') {
    return `
      <div class="empty-state is-compact">
        <span class="empty-state-icon" aria-hidden="true"><i data-lucide="triangle-alert"></i></span>
        <div>
          <h3 class="card-title">Não foi possível carregar</h3>
          <p class="card-description">${sanitizeText(qualityUi.qualityRecordsMessage || 'Tente buscar novamente.')}</p>
        </div>
      </div>
    `;
  }

  if (!qualityUi.qualityRecords.length) {
    return `
      <div class="empty-state is-compact">
        <span class="empty-state-icon" aria-hidden="true"><i data-lucide="badge-check"></i></span>
        <div>
          <h3 class="card-title">Nenhum registro encontrado</h3>
          <p class="card-description">${sanitizeText(selectedTool.title)} não tem registros para ${sanitizeText(selectedUser.nome || 'este colaborador')}.</p>
        </div>
      </div>
    `;
  }

  const count = qualityUi.qualityRecords.length;
  return `
    <section class="qr-results" aria-label="Registros encontrados">
      <header class="qr-results-header">
        <span class="qr-results-badge">
          <i data-lucide="layers"></i>
          ${count} registro${count !== 1 ? 's' : ''}
        </span>
      </header>
      <div class="qr-records-list">
        ${qualityUi.qualityRecords.map((record, i) => `<div class="qr-record-wrap" style="animation-delay:${i * 60}ms">${getQualityRecordCardMarkup(record)}</div>`).join('')}
      </div>
    </section>
  `;
}

function getQualityRecordCardMarkup(record) {
  if (record.toolId === EVALUATION_TOOL_IDS.MATRIX) {
    return getQualityMatrixRecordMarkup(record);
  }

  return getQualityFormRecordMarkup(record);
}

// ── Recálculo de matriz para registros antigos (resultado_json vazio) ────

function _recalcMatrixFromScores(scores) {
  const toolId = EVALUATION_TOOL_IDS.MATRIX;

  const technicalTotal = MATRIX_TECHNICAL_CRITERIA.reduce((sum, c) => {
    const key = getEvaluationScoreKey(toolId, c.id, 'technical');
    return sum + Math.min(10, Math.max(0, Number(scores[key] || 0)));
  }, 0);

  const emotionalTotal = MATRIX_EMOTIONAL_CRITERIA.reduce((sum, c) => {
    const key = getEvaluationScoreKey(toolId, c.id, 'emotional');
    return sum + Math.min(10, Math.max(0, Number(scores[key] || 0)));
  }, 0);

  const technicalAverage = MATRIX_TECHNICAL_CRITERIA.length
    ? technicalTotal / MATRIX_TECHNICAL_CRITERIA.length : 0;
  const emotionalAverage = MATRIX_EMOTIONAL_CRITERIA.length
    ? emotionalTotal / MATRIX_EMOTIONAL_CRITERIA.length : 0;

  const decision = getMatrixDecision(technicalAverage, emotionalAverage);

  return {
    technicalTotal,
    technicalAverage,
    emotionalTotal,
    emotionalAverage,
    decisionId:    decision.id,
    decisionLabel: decision.label,
    isSaved: true,
  };
}

function getQualityMatrixRecordMarkup(record) {
  let result = record.result || record.matrixResult || null;

  const hasData = result && (
    Number(result.technicalAverage) > 0 ||
    Number(result.emotionalAverage) > 0 ||
    result.decisionId !== 'pending'
  );

  if (!hasData) {
    result = _recalcMatrixFromScores(record.scores || {});
  }

  result = { ...(result || {}), isSaved: true };

  const dateStr    = formatEvaluationTimestamp(record.createdAt || record.savedAt);
  const decisionId = result.decisionId || 'pending';

  return `
    <article class="qr-matrix-card" aria-label="Matriz de ${sanitizeText(record.evaluatee?.nome || 'colaborador')}">

      <header class="qr-matrix-card-header">
        <div class="qr-form-card-tool">
          <span class="qr-form-card-icon"><i data-lucide="chart-column"></i></span>
          <span class="qr-form-card-toolname">${sanitizeText(record.toolTitle || 'Matriz de Decisão')}</span>
        </div>
        <time class="qr-form-card-date">${dateStr}</time>
      </header>

      <div class="qr-matrix-body">

        <div class="qr-matrix-left">

          <div class="qr-matrix-decision" data-decision="${sanitizeAttribute(decisionId)}">
            <span class="qr-matrix-decision-label">Decisão</span>
            <strong class="qr-matrix-decision-value">${sanitizeText(result.decisionLabel || '—')}</strong>
          </div>

          <div class="qr-matrix-scores">
            <div class="qr-matrix-score-item">
              <span class="qr-matrix-score-label">Técnico</span>
              <strong class="qr-matrix-score-value">${formatEvaluationNumber(result.technicalAverage)}</strong>
              <small class="qr-matrix-score-total">total ${formatEvaluationNumber(result.technicalTotal)}</small>
            </div>
            <div class="qr-matrix-score-item">
              <span class="qr-matrix-score-label">Emocional</span>
              <strong class="qr-matrix-score-value">${formatEvaluationNumber(result.emotionalAverage)}</strong>
              <small class="qr-matrix-score-total">total ${formatEvaluationNumber(result.emotionalTotal)}</small>
            </div>
          </div>

          <div class="qr-matrix-people">
            <div class="qr-matrix-person">
              <span class="qr-matrix-person-role"><i data-lucide="user"></i> Colaborador</span>
              <strong class="qr-matrix-person-name">${sanitizeText(record.evaluatee?.nome || '—')}</strong>
            </div>
            <div class="qr-matrix-person">
              <span class="qr-matrix-person-role"><i data-lucide="user-check"></i> Respondente</span>
              <strong class="qr-matrix-person-name">${sanitizeText(record.respondent?.nome || '—')}</strong>
            </div>
          </div>

        </div>

        <div class="qr-matrix-graph">
          ${getMatrixDecisionGraphMarkup(result)}
        </div>

      </div>
    </article>
  `;
}

function getQualityFormRecordMarkup(record) {
  const isPreEffective = record.toolId === EVALUATION_TOOL_IDS.PRE_EFFECTIVE;
  const isBehavioral   = record.toolId === EVALUATION_TOOL_IDS.BEHAVIORAL;
  const toolIcon       = isPreEffective ? 'clipboard-check' : isBehavioral ? 'brain-circuit' : 'file-text';
  const dateStr        = formatEvaluationTimestamp(record.createdAt || record.savedAt);

  return `
    <article class="qr-form-card" aria-label="Registro de ${sanitizeText(record.toolTitle || 'Avaliação')}">

      <header class="qr-form-card-header">
        <div class="qr-form-card-tool">
          <span class="qr-form-card-icon"><i data-lucide="${toolIcon}"></i></span>
          <span class="qr-form-card-toolname">${sanitizeText(record.toolTitle || 'Avaliação')}</span>
        </div>
        <time class="qr-form-card-date">${dateStr}</time>
      </header>

      <div class="qr-form-card-meta">
        <div class="qr-meta-item">
          <span class="qr-meta-label"><i data-lucide="user"></i> Colaborador</span>
          <span class="qr-meta-value">${sanitizeText(record.evaluatee?.nome || '—')}</span>
        </div>
        <div class="qr-meta-item">
          <span class="qr-meta-label"><i data-lucide="user-check"></i> Respondente</span>
          <span class="qr-meta-value">${sanitizeText(record.respondent?.nome || '—')}</span>
        </div>
        <div class="qr-meta-item">
          <span class="qr-meta-label"><i data-lucide="building-2"></i> Setor</span>
          <span class="qr-meta-value">${sanitizeText(record.sectorName || '—')}</span>
        </div>
      </div>

      ${_getQualityFormMetricsMarkup(record)}

      ${record.notes ? `
        <div class="qr-form-card-notes">
          <span class="qr-meta-label"><i data-lucide="message-square"></i> Observações</span>
          <p class="qr-form-card-notes-text">${sanitizeText(record.notes)}</p>
        </div>
      ` : ''}

    </article>
  `;
}

function _getQualityFormMetricsMarkup(record) {
  if (record.toolId === EVALUATION_TOOL_IDS.PRE_EFFECTIVE) {
    const totals = record.totals || record.summary?.totals || {};
    return `
      <div class="qr-metrics-row">
        ${EVALUATION_PERIODS.map((p) => `
          <div class="qr-metric-chip">
            <span class="qr-metric-label">${sanitizeText(p.label)}</span>
            <strong class="qr-metric-value">${Number(totals[p.id] || 0)}</strong>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (record.toolId === EVALUATION_TOOL_IDS.BEHAVIORAL) {
    const counts = record.summary?.counts || {};
    return `
      <div class="qr-metrics-row">
        ${BEHAVIORAL_EVALUATION_OPTIONS.map((opt) => `
          <div class="qr-metric-chip">
            <span class="qr-metric-label" title="${sanitizeAttribute(opt.title)}">${sanitizeText(opt.label)}</span>
            <strong class="qr-metric-value">${Number(counts[opt.id] || 0)}</strong>
          </div>
        `).join('')}
      </div>
    `;
  }

  return '';
}

function getQualityUiState(moduleUi) {
  return {
    ...QUALITY_UI_DEFAULTS,
    ...(moduleUi || {}),
    qualityRecords:     Array.isArray(moduleUi?.qualityRecords)     ? moduleUi.qualityRecords     : [],
    feedbacksPendentes: Array.isArray(moduleUi?.feedbacksPendentes) ? moduleUi.feedbacksPendentes : [],
    feedbacksLidos:     Array.isArray(moduleUi?.feedbacksLidos)     ? moduleUi.feedbacksLidos     : [],
  };
}

function getModuleState(sectorId) {
  return moduleContext.getModuleState(sectorId);
}

function setModuleState(sectorId, state) {
  moduleContext.setModuleState(sectorId, state);
}

function renderModuleStage(rootElement, sector) {
  moduleContext.renderModuleStage(rootElement, sector);
}

function selectQualityTool(rootElement, sector, toolId) {
  const state = getModuleState(sector.id);

  if (!EVALUATION_TOOLS.some((tool) => tool.id === toolId)) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...getQualityUiState(state.ui),
      selectedQualityToolId: toolId,
      selectedQualityEvaluateeId: '',
      qualityEvaluateeQuery: '',
      isQualityEvaluateeListOpen: false,
      qualityRecordsStatus: 'idle',
      qualityRecordsMessage: '',
      qualityRecords: [],
    },
  });

  renderModuleStage(rootElement, sector);
}

function clearSelectedQualityTool(rootElement, sector) {
  const state = getModuleState(sector.id);

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...getQualityUiState(state.ui),
      selectedQualityToolId: '',
      selectedQualityEvaluateeId: '',
      qualityEvaluateeQuery: '',
      isQualityEvaluateeListOpen: false,
      qualityRecordsStatus: 'idle',
      qualityRecordsMessage: '',
      qualityRecords: [],
    },
  });

  renderModuleStage(rootElement, sector);
}

function toggleQualityDropdown(rootElement, sector) {
  const state = getModuleState(sector.id);
  const nextUi = getQualityUiState(state.ui);

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...nextUi,
      isQualityEvaluateeListOpen: !nextUi.isQualityEvaluateeListOpen,
    },
  });

  renderModuleStage(rootElement, sector);
}

function closeQualityDropdown(rootElement, sector) {
  const state = getModuleState(sector.id);
  const currentUi = getQualityUiState(state.ui);

  if (!currentUi.isQualityEvaluateeListOpen) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...currentUi,
      isQualityEvaluateeListOpen: false,
    },
  });

  renderModuleStage(rootElement, sector);
}

function updateQualitySearch(rootElement, sector, query) {
  const state = getModuleState(sector.id);
  const currentUi = getQualityUiState(state.ui);
  const selectedUser = (state.moduleData?.users || []).find((user) => user.id === currentUi.selectedQualityEvaluateeId) || null;
  const shouldKeepSelection = selectedUser && `${selectedUser.id} — ${selectedUser.nome}` === query;

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...currentUi,
      qualityEvaluateeQuery: query,
      selectedQualityEvaluateeId: shouldKeepSelection ? currentUi.selectedQualityEvaluateeId : '',
      isQualityEvaluateeListOpen: true,
      qualityRecordsStatus: shouldKeepSelection ? currentUi.qualityRecordsStatus : 'idle',
      qualityRecordsMessage: shouldKeepSelection ? currentUi.qualityRecordsMessage : '',
      qualityRecords: shouldKeepSelection ? currentUi.qualityRecords : [],
    },
  });

  renderModuleStage(rootElement, sector);

  const input = rootElement.querySelector('[data-quality-evaluatee-search]');

  if (input) {
    const caret = query.length;
    input.focus();
    input.setSelectionRange(caret, caret);
  }
}

async function selectQualityUser(rootElement, sector, userId) {
  const state = getModuleState(sector.id);
  const user = (state.moduleData?.users || []).find((item) => item.id === userId);
  const currentUi = getQualityUiState(state.ui);

  if (!user || !currentUi.selectedQualityToolId) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...currentUi,
      selectedQualityEvaluateeId: user.id,
      qualityEvaluateeQuery: `${user.id} — ${user.nome}`,
      isQualityEvaluateeListOpen: false,
      qualityRecordsStatus: 'loading',
      qualityRecordsMessage: 'Buscando respostas salvas...',
      qualityRecords: [],
    },
  });
  renderModuleStage(rootElement, sector);

  try {
    const response = await searchEvaluationRecords({
      toolId: currentUi.selectedQualityToolId,
      evaluateeId: user.id,
    });
    const latestState = getModuleState(sector.id);
    const latestUi = getQualityUiState(latestState.ui);

    setModuleState(sector.id, {
      ...latestState,
      ui: {
        ...latestUi,
        qualityRecordsStatus: response.success ? 'success' : 'error',
        qualityRecordsMessage: response.message || '',
        qualityRecords: response.success ? response.records : [],
      },
    });
  } catch (error) {
    const latestState = getModuleState(sector.id);
    const latestUi = getQualityUiState(latestState.ui);

    setModuleState(sector.id, {
      ...latestState,
      ui: {
        ...latestUi,
        qualityRecordsStatus: 'error',
        qualityRecordsMessage: error?.message || 'Não foi possível buscar as respostas salvas.',
        qualityRecords: [],
      },
    });
  }

  renderModuleStage(rootElement, sector);
}

// ── Feedback view markup ──────────────────────────────────────────────────

function getQualityFeedbacksMarkup(card, moduleData, qualityUi, tabs) {
  const respondent = moduleData?.respondent || null;
  const pendentes  = qualityUi.feedbacksPendentes;
  const lidos      = qualityUi.feedbacksLidos;

  let body = '';

  if (qualityUi.feedbacksStatus === 'idle') {
    body = `<div class="quality-fb-idle"><i data-lucide="loader-circle"></i><p>Carregando feedbacks…</p></div>`;
  } else if (qualityUi.feedbacksStatus === 'loading') {
    body = `<div class="quality-fb-idle"><i data-lucide="loader-circle"></i><p>Carregando feedbacks…</p></div>`;
  } else if (qualityUi.feedbacksStatus === 'error') {
    body = `
      <div class="quality-fb-error">
        <i data-lucide="circle-alert"></i>
        <span>${sanitizeText(qualityUi.feedbacksErrorMessage || 'Erro ao carregar feedbacks.')}</span>
      </div>`;
  } else {
    body = `
      ${renderFeedbackGroup('Pendentes de leitura', pendentes, true,  qualityUi.markingReadId, respondent)}
      ${renderFeedbackGroup('Já lidos',             lidos,     false, qualityUi.markingReadId, respondent)}
    `;
  }

  return `
    <div class="module-shell evaluation-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked">
        <div>
          <p class="module-eyebrow">DHO · Qualidade</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Feedbacks recebidos por ${sanitizeText(respondent?.nome || 'você')}, enviados pela equipe.</p>
        </div>
      </div>

      ${tabs}

      <div class="quality-feedbacks-body">
        ${body}
      </div>
    </div>
  `;
}

function renderFeedbackGroup(title, records, isPending, markingReadId, respondent) {
  return `
    <section class="quality-fb-group">
      <div class="quality-fb-group-head">
        <h3 class="quality-fb-group-title">
          <i data-lucide="${isPending ? 'inbox' : 'check-circle-2'}"></i>
          ${sanitizeText(title)}
        </h3>
        <span class="quality-fb-count ${isPending && records.length > 0 ? 'is-pending' : 'is-read'}">${records.length}</span>
      </div>

      <div class="quality-fb-list">
        ${records.length === 0
          ? `<div class="quality-fb-empty"><span>${isPending ? 'Nenhum feedback pendente. Tudo lido!' : 'Nenhum feedback lido ainda.'}</span></div>`
          : records.map((r) => renderFeedbackCard(r, isPending, markingReadId)).join('')
        }
      </div>
    </section>
  `;
}

function renderFeedbackCard(record, isPending, markingReadId) {
  const isAnon     = record.respondent?.id === 'ANONIMO';
  const fromName   = isAnon ? 'Anônimo' : (record.respondent?.nome || 'Desconhecido');
  const dateStr    = record.createdAt
    ? new Date(record.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
  const isMarking  = markingReadId === record.id;

  return `
    <article class="quality-fb-card ${!isPending ? 'is-read' : ''}">
      <div class="quality-fb-card-head">
        <div class="quality-fb-sender">
          <span class="quality-fb-sender-icon" aria-hidden="true">
            <i data-lucide="${isAnon ? 'user-x' : 'user-round'}"></i>
          </span>
          <span class="quality-fb-sender-name ${isAnon ? 'is-anon' : ''}">${sanitizeText(fromName)}</span>
        </div>
        <span class="quality-fb-date">${sanitizeText(dateStr)}</span>
      </div>

      <p class="quality-fb-message">${sanitizeText(record.notes || '—')}</p>

      ${isPending ? `
        <div class="quality-fb-actions">
          ${isMarking
            ? `<span class="ti-updating"><i data-lucide="loader-circle"></i> Marcando…</span>`
            : `<button type="button" class="module-link-button is-secondary quality-fb-read-btn"
                data-quality-mark-read="${sanitizeAttribute(record.id)}">
                <i data-lucide="check"></i>
                <span>Marcar como lido</span>
              </button>`
          }
        </div>` : ''
      }
    </article>
  `;
}

// ── Feedback handlers ─────────────────────────────────────────────────────

function switchQualityView(rootElement, sector, view) {
  const state = getModuleState(sector.id);
  const currentUi = getQualityUiState(state.ui);

  setModuleState(sector.id, { ...state, ui: { ...currentUi, qualityView: view } });
  renderModuleStage(rootElement, sector);

  if (view === 'feedbacks' && currentUi.feedbacksStatus === 'idle') {
    loadQualityFeedbacks(rootElement, sector);
  }
}

async function loadQualityFeedbacks(rootElement, sector) {
  const state = getModuleState(sector.id);
  const currentUi = getQualityUiState(state.ui);
  const userId = state.moduleData?.respondent?.id || '';

  if (!userId) return;

  setModuleState(sector.id, { ...state, ui: { ...currentUi, feedbacksStatus: 'loading', feedbacksErrorMessage: '' } });
  renderModuleStage(rootElement, sector);

  try {
    const response = await listarFeedbacksParaUsuario(userId);
    const nextState = getModuleState(sector.id);
    const nextUi = getQualityUiState(nextState.ui);

    if (response?.success) {
      setModuleState(sector.id, {
        ...nextState,
        ui: {
          ...nextUi,
          feedbacksStatus: 'success',
          feedbacksPendentes: Array.isArray(response.pendentes) ? response.pendentes : [],
          feedbacksLidos:     Array.isArray(response.lidos)     ? response.lidos     : [],
          feedbacksErrorMessage: '',
        },
      });
    } else {
      setModuleState(sector.id, { ...nextState, ui: { ...nextUi, feedbacksStatus: 'error', feedbacksErrorMessage: response?.message || 'Não foi possível carregar os feedbacks.' } });
    }
  } catch (err) {
    const nextState = getModuleState(sector.id);
    setModuleState(sector.id, { ...nextState, ui: { ...getQualityUiState(nextState.ui), feedbacksStatus: 'error', feedbacksErrorMessage: err?.message || 'Erro ao carregar feedbacks.' } });
  }

  renderModuleStage(rootElement, sector);
}

async function markQualityFeedbackRead(rootElement, sector, recordId) {
  const state = getModuleState(sector.id);
  const currentUi = getQualityUiState(state.ui);

  setModuleState(sector.id, { ...state, ui: { ...currentUi, markingReadId: recordId } });
  renderModuleStage(rootElement, sector);

  try {
    await marcarFeedbackLido(recordId);
  } catch (_) { /* reload anyway */ }

  const nextState = getModuleState(sector.id);
  setModuleState(sector.id, { ...nextState, ui: { ...getQualityUiState(nextState.ui), markingReadId: null } });
  await loadQualityFeedbacks(rootElement, sector);
}
