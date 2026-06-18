import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { errorBoundary } from '../../utils/error.js';
import { searchEvaluationRecords, fetchMultidirConfig, saveMultidirConfig, markEvaluationRecordRead } from '../../services/evaluations.service.js';
import { listarFeedbacksParaUsuario, marcarFeedbackLido } from '../../services/feedbacks-reader.service.js';
import { setCardAlert, clearCardAlert } from '../../state/module-state.js';
import { invalidateSectorAlertsCache } from '../../services/sector-alerts.service.js';
import {
  BEHAVIORAL_EVALUATION_OPTIONS,
  EVALUATION_CRITERIA,
  EVALUATION_PERIODS,
  EVALUATION_TOOL_IDS,
  EVALUATION_TOOLS,
  MATRIX_EMOTIONAL_CRITERIA,
  MATRIX_TECHNICAL_CRITERIA,
  WORK_EFFICACY_CRITERIA,
  IE_PERSONAL_CRITERIA,
  IE_SOCIAL_CRITERIA,
  MULTIDIR_RULES,
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
  // Config limite respondentes multidir
  multidirConfig: {},           // { [toolId]: { maxRespondentes, status } }
  multidirConfigSaveStatus: '', // 'saving' | 'success' | 'error'
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
    loadMultidirConfig:   loadMultidirConfig,
    saveMultidirConfig:   saveMultidirConfigHandler,
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
    return getQualityToolsCatalogMarkup(card, tabs, qualityUi);
  }

  return getQualitySearchMarkup(card, moduleData, qualityUi, selectedTool, tabs);
}

function getQualityToolsCatalogMarkup(card, tabs = '', qualityUi = {}) {
  const multidirTools = EVALUATION_TOOLS.filter((t) => t.isMultidir);
  const cfg = qualityUi.multidirConfig || {};
  const saveStatus = qualityUi.multidirConfigSaveStatus || '';

  const configPanel = multidirTools.length ? `
    <section class="multidir-config-panel" aria-label="Configurações das avaliações multidirecionais">
      <header class="multidir-config-panel-head">
        <i data-lucide="settings-2"></i>
        <span>Configurar limite de respondentes</span>
      </header>
      <div class="multidir-config-grid">
        ${multidirTools.map((tool) => {
          const current = cfg[tool.id]?.maxRespondentes ?? 5;
          return `
            <div class="multidir-config-row">
              <span class="multidir-config-label">
                <i data-lucide="${sanitizeAttribute(tool.icon)}"></i>
                ${sanitizeText(tool.hint)}
              </span>
              <div class="multidir-config-input-row">
                <label class="multidir-config-input-label" for="mdc-${sanitizeAttribute(tool.id)}">Máximo de respondentes:</label>
                <input
                  id="mdc-${sanitizeAttribute(tool.id)}"
                  type="number"
                  min="1"
                  max="20"
                  value="${sanitizeAttribute(String(current))}"
                  class="multidir-config-input"
                  data-multidir-config-tool="${sanitizeAttribute(tool.id)}"
                  data-multidir-config-input
                />
                <button
                  type="button"
                  class="multidir-config-save-btn ${saveStatus === 'saving' ? 'is-saving' : ''}"
                  data-multidir-config-save="${sanitizeAttribute(tool.id)}"
                  ${saveStatus === 'saving' ? 'disabled' : ''}
                >
                  <i data-lucide="${saveStatus === 'saving' ? 'loader-circle' : 'check'}"></i>
                  ${saveStatus === 'saving' ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
              ${cfg[tool.id]?.feedback ? `<span class="multidir-config-feedback multidir-config-feedback--${cfg[tool.id].feedbackType || 'info'}">${sanitizeText(cfg[tool.id].feedback)}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </section>
  ` : '';

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

      ${configPanel}
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
        ${qualityUi.qualityRecords.map((record, i) => `<div class="qr-record-wrap${!record.lido ? ' is-unread' : ''}" style="animation-delay:${i * 60}ms">${!record.lido ? '<span class="qr-unread-dot" aria-label="Não lida"></span>' : ''}${getQualityRecordCardMarkup(record)}</div>`).join('')}
      </div>
    </section>
  `;
}

function getQualityRecordCardMarkup(record) {
  if (record.toolId === EVALUATION_TOOL_IDS.MATRIX) {
    return getQualityMatrixRecordMarkup(record);
  }

  if (record.toolId === EVALUATION_TOOL_IDS.WORK_EFFICACY) {
    return getQualityEfficacyRecordMarkup(record);
  }

  if (record.toolId === EVALUATION_TOOL_IDS.EMOTIONAL_INTELLIGENCE) {
    return getQualityIERecordMarkup(record);
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
    multidirConfig:     (moduleUi?.multidirConfig && typeof moduleUi.multidirConfig === 'object') ? moduleUi.multidirConfig : {},
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

    // Update the "qualidade" card alert based on remaining unread records
    if (response.success) {
      const unreadCount = (response.records || []).filter(r => !r.lido).length;
      setCardAlert(sector.id, 'qualidade', unreadCount > 0
        ? { type: 'unread', count: unreadCount }
        : null);

      // Mark all unread records as read (non-blocking — best effort)
      const unreadIds = (response.records || [])
        .filter(r => !r.lido && r.id)
        .map(r => r.id);
      if (unreadIds.length) {
        // Fire-and-forget: don't await, don't surface errors to user
        Promise.allSettled(unreadIds.map(id => markEvaluationRecordRead(id)))
          .then(() => {
            clearCardAlert(sector.id, 'qualidade');
            invalidateSectorAlertsCache(sector.id);
          })
          .catch(err => errorBoundary(err, 'quality:selectUser:cardAlert'));
      }
    }
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

// ═══════════════════════════════════════════════════════════════════════════
// QUADRO-RESUMO MULTIDIRECIONAL — Exibido apenas na tela de Resultados DHO
// ═══════════════════════════════════════════════════════════════════════════

// ── Helper: extrai score de um item de um registro ───────────────────────

function _getScore(scores, toolId, criterionId, subId) {
  const key = `${toolId}:${criterionId}:${subId}`;
  return Number(scores?.[key] || 0);
}

// ── Helper: calcula média de um array de valores ─────────────────────────

function _avg(values) {
  const nonZero = values.filter((v) => v > 0);
  if (!nonZero.length) return null;
  return nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
}

// ── F_10 — Quadro-Resumo de Eficácia no Trabalho ─────────────────────────

function getQualityEfficacyRecordMarkup(record) {
  // Na lista de resultados cada "record" é de um respondente —
  // este markup mostra o card individual + totais por critério
  const toolId  = record.toolId;
  const scores  = record.scores || {};
  const dateStr = formatEvaluationTimestamp(record.createdAt || record.savedAt);

  return `
    <article class="qr-multidir-card" aria-label="Eficácia — ${sanitizeText(record.respondent?.nome || 'Respondente')}">
      <header class="qr-form-card-header">
        <div class="qr-form-card-tool">
          <span class="qr-form-card-icon"><i data-lucide="target"></i></span>
          <span class="qr-form-card-toolname">Eficácia no Trabalho · ${sanitizeText(record.respondent?.nome || 'Anônimo')}</span>
        </div>
        <time class="qr-form-card-date">${dateStr}</time>
      </header>
      <div class="qr-multidir-table-wrap">
        <table class="qr-multidir-table">
          <thead>
            <tr>
              <th>Competência</th>
              <th class="qr-col-num">A</th>
              <th class="qr-col-num">B</th>
              <th class="qr-col-total">A+B</th>
            </tr>
          </thead>
          <tbody>
            ${WORK_EFFICACY_CRITERIA.map((c) => {
              const a = _getScore(scores, toolId, c.id, 'a');
              const b = _getScore(scores, toolId, c.id, 'b');
              const tot = a && b ? a + b : '—';
              return `
                <tr>
                  <td><span class="qr-et-badge">${sanitizeText(c.label)}</span> ${sanitizeText(c.title)}</td>
                  <td class="qr-col-num">${a || '—'}</td>
                  <td class="qr-col-num">${b || '—'}</td>
                  <td class="qr-col-total">${tot}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

// ── F_11 — Quadro-Resumo de Inteligência Emocional ───────────────────────

function getQualityIERecordMarkup(record) {
  const toolId  = record.toolId;
  const scores  = record.scores || {};
  const dateStr = formatEvaluationTimestamp(record.createdAt || record.savedAt);

  const totalPessoal = IE_PERSONAL_CRITERIA.reduce((s, c) => s + _getScore(scores, toolId, c.id, 'score'), 0);
  const totalSocial  = IE_SOCIAL_CRITERIA.reduce((s, c) =>   s + _getScore(scores, toolId, c.id, 'score'), 0);
  const totalGeral   = totalPessoal + totalSocial;

  return `
    <article class="qr-multidir-card" aria-label="IE — ${sanitizeText(record.respondent?.nome || 'Respondente')}">
      <header class="qr-form-card-header">
        <div class="qr-form-card-tool">
          <span class="qr-form-card-icon"><i data-lucide="heart-handshake"></i></span>
          <span class="qr-form-card-toolname">Inteligência Emocional · ${sanitizeText(record.respondent?.nome || 'Anônimo')}</span>
        </div>
        <time class="qr-form-card-date">${dateStr}</time>
      </header>

      <div class="qr-multidir-ie-grid">

        <div class="qr-multidir-ie-section">
          <span class="qr-multidir-ie-section-label"><i data-lucide="user-round"></i> Pessoais</span>
          ${IE_PERSONAL_CRITERIA.map((c) => {
            const v = _getScore(scores, toolId, c.id, 'score');
            return `
              <div class="qr-multidir-ie-row">
                <span class="qr-multidir-ie-num">${sanitizeText(c.label)}</span>
                <span class="qr-multidir-ie-name">${sanitizeText(c.title)}</span>
                <span class="qr-multidir-ie-score ${v ? 'has-score' : ''}">${v || '—'}</span>
              </div>`;
          }).join('')}
          <div class="qr-multidir-ie-subtotal">Total pessoal: <strong>${totalPessoal}</strong> / ${IE_PERSONAL_CRITERIA.length * 5}</div>
        </div>

        <div class="qr-multidir-ie-section">
          <span class="qr-multidir-ie-section-label"><i data-lucide="users-round"></i> Sociais</span>
          ${IE_SOCIAL_CRITERIA.map((c) => {
            const v = _getScore(scores, toolId, c.id, 'score');
            return `
              <div class="qr-multidir-ie-row">
                <span class="qr-multidir-ie-num">${sanitizeText(c.label)}</span>
                <span class="qr-multidir-ie-name">${sanitizeText(c.title)}</span>
                <span class="qr-multidir-ie-score ${v ? 'has-score' : ''}">${v || '—'}</span>
              </div>`;
          }).join('')}
          <div class="qr-multidir-ie-subtotal">Total social: <strong>${totalSocial}</strong> / ${IE_SOCIAL_CRITERIA.length * 5}</div>
        </div>

      </div>

      <div class="qr-multidir-ie-total">
        <span>Total Geral</span>
        <strong>${totalGeral}</strong>
        <span class="qr-multidir-ie-total-max">/ ${(IE_PERSONAL_CRITERIA.length + IE_SOCIAL_CRITERIA.length) * 5}</span>
      </div>
    </article>
  `;
}

// ── Configuração de limite de respondentes multidir ───────────────────────

export async function loadMultidirConfig(rootElement, sector) {
  const state = getModuleState(sector.id);
  const currentUi = getQualityUiState(state.ui);

  setModuleState(sector.id, {
    ...state,
    ui: { ...currentUi, multidirConfig: { ...currentUi.multidirConfig, _loading: true } },
  });

  try {
    const configs = await fetchMultidirConfig();
    const latestState = getModuleState(sector.id);
    const latestUi    = getQualityUiState(latestState.ui);

    // Mescla configs recebidas com o estado atual
    const newConfig = { ...latestUi.multidirConfig };
    delete newConfig._loading;
    for (const [toolId, cfg] of Object.entries(configs)) {
      newConfig[toolId] = { ...newConfig[toolId], maxRespondentes: cfg.maxRespondentes };
    }

    setModuleState(sector.id, {
      ...latestState,
      ui: { ...latestUi, multidirConfig: newConfig },
    });
  } catch {
    const latestState = getModuleState(sector.id);
    const latestUi    = getQualityUiState(latestState.ui);
    const newConfig = { ...latestUi.multidirConfig };
    delete newConfig._loading;
    setModuleState(sector.id, { ...latestState, ui: { ...latestUi, multidirConfig: newConfig } });
  }

  renderModuleStage(rootElement, sector);
}

async function saveMultidirConfigHandler(rootElement, sector, toolId, maxRespondentes) {
  const state = getModuleState(sector.id);
  const currentUi = getQualityUiState(state.ui);

  setModuleState(sector.id, {
    ...state,
    ui: { ...currentUi, multidirConfigSaveStatus: 'saving' },
  });
  renderModuleStage(rootElement, sector);

  const response = await saveMultidirConfig({ toolId, maxRespondentes });

  const latestState = getModuleState(sector.id);
  const latestUi    = getQualityUiState(latestState.ui);
  const success = response?.success;

  setModuleState(sector.id, {
    ...latestState,
    ui: {
      ...latestUi,
      multidirConfigSaveStatus: success ? 'success' : 'error',
      multidirConfig: {
        ...latestUi.multidirConfig,
        [toolId]: {
          maxRespondentes: success ? maxRespondentes : (latestUi.multidirConfig[toolId]?.maxRespondentes ?? 5),
          feedback: success ? `Limite atualizado para ${maxRespondentes} respondente(s).` : (response?.message || 'Erro ao salvar.'),
          feedbackType: success ? 'success' : 'error',
        },
      },
    },
  });

  renderModuleStage(rootElement, sector);

  // Limpa o feedback após 4s
  setTimeout(() => {
    const s = getModuleState(sector.id);
    const u = getQualityUiState(s.ui);
    const toolCfg = u.multidirConfig[toolId];
    if (toolCfg?.feedback) {
      setModuleState(sector.id, {
        ...s,
        ui: {
          ...u,
          multidirConfigSaveStatus: '',
          multidirConfig: { ...u.multidirConfig, [toolId]: { ...toolCfg, feedback: '', feedbackType: '' } },
        },
      });
      renderModuleStage(rootElement, sector);
    }
  }, 4000);
}
