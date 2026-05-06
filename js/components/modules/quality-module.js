import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { searchEvaluationRecords } from '../../services/evaluations.service.js';
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
  };
}

export function getQualityModuleMarkup(card, moduleData, moduleUi) {
  const qualityUi = getQualityUiState(moduleUi);
  const selectedTool = EVALUATION_TOOLS.find((tool) => tool.id === qualityUi.selectedQualityToolId) || null;

  if (!selectedTool) {
    return getQualityToolsCatalogMarkup(card);
  }

  return getQualitySearchMarkup(card, moduleData, qualityUi, selectedTool);
}

function getQualityToolsCatalogMarkup(card) {
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

function getQualitySearchMarkup(card, moduleData, qualityUi, selectedTool) {
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
          <p class="card-description">Buscando registros salvos para ${sanitizeText(selectedUser.nome || 'o colaborador')}.</p>
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
          <h3 class="card-title">Nenhuma resposta encontrada</h3>
          <p class="card-description">Não há registros salvos para ${sanitizeText(selectedTool.title)} deste colaborador.</p>
        </div>
      </div>
    `;
  }

  return `
    <section class="evaluation-form-section" aria-label="Respostas encontradas">
      <div class="module-shell-header module-shell-header--stacked">
        <div>
          <p class="module-eyebrow">${sanitizeText(qualityUi.qualityRecords.length)} registro(s) encontrado(s)</p>
          <h3 class="module-title">Respostas salvas</h3>
          <p class="module-description">Resultados filtrados por formulário e colaborador.</p>
        </div>
      </div>

      <div class="evaluation-tools-grid">
        ${qualityUi.qualityRecords.map((record) => getQualityRecordCardMarkup(record)).join('')}
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

function getQualityMatrixRecordMarkup(record) {
  const result = {
    ...(record.matrixResult || {}),
    isSaved: true,
  };

  return `
    <article class="matrix-workspace">
      <aside class="matrix-result-panel" aria-label="Resumo da matriz de ${sanitizeText(record.evaluatee?.nome || '')}">
        <div class="matrix-result-summary">
          <span class="evaluation-result-label">${sanitizeText(record.toolTitle || 'Matriz de Decisão')}</span>
          <strong class="matrix-decision-title">${sanitizeText(result.decisionLabel || 'Sem decisão')}</strong>
          <span class="evaluation-result-caption">${sanitizeText(record.evaluatee?.nome || 'Colaborador não identificado')} · ${sanitizeText(record.sectorName || 'Setor não identificado')}</span>
          <span class="evaluation-result-caption">Salvo em ${formatEvaluationTimestamp(record.createdAt || record.savedAt)}.</span>
        </div>

        <div class="matrix-metrics-grid">
          <article class="matrix-metric-card">
            <span>Técnico</span>
            <strong>${formatEvaluationNumber(result.technicalAverage)}</strong>
            <small>Total ${formatEvaluationNumber(result.technicalTotal)}</small>
          </article>
          <article class="matrix-metric-card">
            <span>Emocional</span>
            <strong>${formatEvaluationNumber(result.emotionalAverage)}</strong>
            <small>Total ${formatEvaluationNumber(result.emotionalTotal)}</small>
          </article>
        </div>
      </aside>

      <div class="matrix-chart-card">
        ${getMatrixDecisionGraphMarkup(result)}
      </div>
    </article>
  `;
}

function getQualityFormRecordMarkup(record) {
  return `
    <article class="evaluation-tool-card" aria-label="Registro de ${sanitizeText(record.toolTitle || 'Avaliação')}">
      <span class="card-icon evaluation-tool-icon" aria-hidden="true">
        <i data-lucide="clipboard-check"></i>
      </span>
      <span class="evaluation-tool-copy">
        <span class="evaluation-tool-hint">${sanitizeText(record.sectorName || 'Setor não identificado')}</span>
        <strong class="evaluation-tool-title">${sanitizeText(record.toolTitle || 'Avaliação')}</strong>
        <span class="evaluation-tool-description">Colaborador: ${sanitizeText(record.evaluatee?.nome || 'Não identificado')}</span>
        <span class="evaluation-tool-description">Respondente: ${sanitizeText(record.respondent?.nome || 'Não identificado')}</span>
        <span class="evaluation-tool-description">Salvo em ${formatEvaluationTimestamp(record.createdAt || record.savedAt)}</span>
        ${getQualityRecordSummaryMarkup(record)}
        ${record.notes ? `<span class="evaluation-tool-description"><strong>Observações:</strong> ${sanitizeText(record.notes)}</span>` : ''}
      </span>
    </article>
  `;
}

function getQualityRecordSummaryMarkup(record) {
  if (record.toolId === EVALUATION_TOOL_IDS.PRE_EFFECTIVE) {
    const totals = record.totals || record.summary?.totals || {};

    return `
      <span class="evaluation-tool-description">
        <strong>Totais:</strong> ${EVALUATION_PERIODS.map((period) => `${period.label}: ${sanitizeText(totals[period.id] || 0)}`).join(' · ')}
      </span>
      ${getPreEffectiveScoresMarkup(record)}
    `;
  }

  if (record.toolId === EVALUATION_TOOL_IDS.BEHAVIORAL) {
    const counts = record.summary?.counts || {};
    const distribution = BEHAVIORAL_EVALUATION_OPTIONS.map((option) => `${option.label}: ${counts[option.id] || 0}`).join(' · ');

    return `
      <span class="evaluation-tool-description"><strong>Distribuição:</strong> ${sanitizeText(distribution)}</span>
      ${getBehavioralScoresMarkup(record)}
    `;
  }

  return '';
}

function getPreEffectiveScoresMarkup(record) {
  const scores = record.scores || {};
  const filledCount = Object.keys(scores).length;

  if (!filledCount) {
    return '';
  }

  return `<span class="evaluation-tool-description"><strong>Notas preenchidas:</strong> ${sanitizeText(filledCount)} campo(s)</span>`;
}

function getBehavioralScoresMarkup(record) {
  const scores = record.scores || {};
  const filledCount = Object.keys(scores).length;

  if (!filledCount) {
    return '';
  }

  return `<span class="evaluation-tool-description"><strong>Critérios preenchidos:</strong> ${sanitizeText(filledCount)} resposta(s)</span>`;
}

function getQualityUiState(moduleUi) {
  return {
    ...QUALITY_UI_DEFAULTS,
    ...(moduleUi || {}),
    qualityRecords: Array.isArray(moduleUi?.qualityRecords) ? moduleUi.qualityRecords : [],
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
