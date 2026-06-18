/**
 * quality.view.js — Funções de markup/renderização do módulo Quality.
 * Extraído de quality-module.js (D-004). Máx 500 linhas por módulo.
 */

import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';
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
} from '../evaluations/evaluation.constants.js';
import {
  formatEvaluationNumber,
  formatEvaluationTimestamp,
  getEvaluationScoreKey,
  getFilteredEvaluationUsers,
  getMatrixDecision,
} from '../evaluations/evaluation.calculations.js';
import { getMatrixDecisionGraphMarkup } from '../evaluations/evaluation.view.js';
import { getQualityEfficacyRecordMarkup, getQualityIERecordMarkup } from './quality.scoring.js';

// Inline para evitar dependência circular com quality-module.js
const QUALITY_UI_DEFAULTS = { selectedQualityToolId:'', selectedQualityEvaluateeId:'', qualityEvaluateeQuery:'', isQualityEvaluateeListOpen:false, qualityRecordsStatus:'idle', qualityRecordsMessage:'', qualityRecords:[], qualityView:'evaluations', feedbacksStatus:'idle', feedbacksPendentes:[], feedbacksLidos:[], feedbacksErrorMessage:'', markingReadId:null, multidirConfig:{}, multidirConfigSaveStatus:'' };


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

