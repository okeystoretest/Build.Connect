import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';
import { getFeedbackModuleMarkup } from '../feedback-module.js';
import {
  BEHAVIORAL_EVALUATION_OPTIONS,
  BEHAVIORAL_FORM_DEFAULTS,
  EVALUATION_CRITERIA,
  EVALUATION_PERIODS,
  EVALUATION_TOOL_IDS,
  EVALUATION_TOOLS,
  MATRIX_EMOTIONAL_CRITERIA,
  MATRIX_TECHNICAL_CRITERIA,
} from './evaluation.constants.js';
import {
  formatEvaluationNumber,
  formatEvaluationTimestamp,
  getEvaluationScoreKey,
  getEvaluationToolFields,
  getEvaluationToolNotes,
  getEvaluationTotals,
  getEvaluationUiState,
  getFilteredEvaluationUsers,
  getMatrixComputedResult,
  getMatrixDecisionColor,
  getMatrixGraphPointPosition,
  getUserSectorSummary,
} from './evaluation.calculations.js';

export function getEvaluationModuleMarkup(card, moduleData, moduleUi) {
  const evaluationUi = getEvaluationUiState(moduleUi);
  const activeTab = evaluationUi.activeTab || 'avaliacoes';

  if (activeTab === 'feedback') {
    return getFeedbackTabMarkup(card, moduleData, evaluationUi);
  }

  const selectedTool = EVALUATION_TOOLS.find((tool) => tool.id === evaluationUi.selectedEvaluationToolId) || null;

  if (!selectedTool) {
    return getEvaluationToolsCatalogMarkup(card, activeTab);
  }

  return getEvaluationToolFormMarkup(card, moduleData, evaluationUi, selectedTool, activeTab);
}

function renderEvalTabs(activeTab) {
  return `
    <div class="eval-tabs">
      <button type="button" class="eval-tab ${activeTab === 'avaliacoes' ? 'is-active' : ''}" data-eval-tab="avaliacoes">
        <i data-lucide="clipboard-list"></i><span>Avaliações</span>
      </button>
      <button type="button" class="eval-tab ${activeTab === 'feedback' ? 'is-active' : ''}" data-eval-tab="feedback">
        <i data-lucide="message-square"></i><span>Feedback</span>
      </button>
    </div>
  `;
}

function getEvaluationToolsCatalogMarkup(card, activeTab = 'avaliacoes') {
  return `
    <div class="module-shell evaluation-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked">
        <div>
          <p class="module-eyebrow">Avaliações</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Selecione uma das ferramentas disponíveis para abrir o preenchimento correspondente.</p>
        </div>
      </div>

      ${renderEvalTabs(activeTab)}

      <div class="evaluation-tools-grid" aria-label="Ferramentas de avaliação disponíveis">
        ${EVALUATION_TOOLS.map((tool) => `
          <button type="button" class="evaluation-tool-card" data-evaluation-tool="${sanitizeAttribute(tool.id)}" aria-label="Abrir avaliação ${sanitizeAttribute(tool.title)}">
            <span class="card-icon evaluation-tool-icon" aria-hidden="true">
              <i data-lucide="${sanitizeAttribute(tool.icon)}"></i>
            </span>
            <span class="evaluation-tool-copy">
              <span class="evaluation-tool-hint">${sanitizeText(tool.hint)}</span>
              <strong class="evaluation-tool-title">${sanitizeText(tool.title)}</strong>
              <span class="evaluation-tool-description">${sanitizeText(tool.description)}</span>
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

function getEvaluationToolFormMarkup(card, moduleData, evaluationUi, selectedTool, activeTab = 'avaliacoes') {
  const users = Array.isArray(moduleData?.users) ? moduleData.users : [];
  const respondent = moduleData?.respondent || null;
  const filteredUsers = getFilteredEvaluationUsers(users, evaluationUi.evaluateeQuery, evaluationUi.selectedEvaluateeId);
  const selectedUser = users.find((user) => user.id === evaluationUi.selectedEvaluateeId) || null;

  return `
    <div class="module-shell evaluation-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked evaluation-tool-header">
        <div>
          <button type="button" class="module-link-button is-secondary evaluation-tools-back" data-evaluation-tools-back>
            <i data-lucide="arrow-left"></i>
            <span>Ver avaliações</span>
          </button>
          <p class="module-eyebrow">Avaliações · ${sanitizeText(selectedTool.hint)}</p>
          <h2 class="module-title">${sanitizeText(selectedTool.title)}</h2>
          <p class="module-description">${sanitizeText(selectedTool.description)} Antes de responder, confirme quem está preenchendo e selecione o colaborador ativo que será avaliado.</p>
        </div>
      </div>

      ${renderEvalTabs(activeTab)}

      <div class="evaluation-meta-grid">
        <div class="evaluation-meta-card">
          <span class="evaluation-meta-label">Respondente</span>
          <strong class="evaluation-meta-value">${sanitizeText(respondent?.id || 'Não identificado')}</strong>
          <span class="evaluation-meta-subvalue">${sanitizeText(respondent?.nome || 'Faça login novamente para identificar o usuário.')}</span>
        </div>

        <div class="evaluation-picker-block">
          <span class="evaluation-meta-label">Colaborador avaliado</span>
          <div class="evaluation-picker" data-evaluation-picker>
            <label class="module-search-shell evaluation-search-shell" aria-label="Pesquisar colaborador ativo">
              <i data-lucide="search"></i>
              <input
                type="search"
                value="${sanitizeAttribute(evaluationUi.evaluateeQuery)}"
                placeholder="Pesquise por ID ou nome do colaborador"
                data-evaluatee-search
                autocomplete="off"
              />
            </label>
            <button type="button" class="module-control-button" data-evaluatee-toggle aria-label="Abrir lista de colaboradores ativos" aria-expanded="${String(evaluationUi.isEvaluateeListOpen)}">
              <i data-lucide="chevrons-up-down"></i>
            </button>
            ${evaluationUi.isEvaluateeListOpen ? getEvaluationUsersDropdownMarkup(filteredUsers) : ''}
          </div>
          <span class="evaluation-picker-feedback">${selectedUser ? `Avaliação direcionada para ${sanitizeText(selectedUser.nome)}.` : 'Selecione um colaborador ativo para liberar o questionário.'}</span>
        </div>
      </div>

      ${selectedUser ? getEvaluationSelectedToolMarkup(selectedTool, selectedUser, evaluationUi, moduleData) : `
        <div class="empty-state is-compact">
          <span class="empty-state-icon" aria-hidden="true">
            <i data-lucide="users"></i>
          </span>
          <div>
            <h3 class="card-title">Selecione o colaborador avaliado</h3>
            <p class="card-description">O questionário é liberado depois que você escolher um usuário ativo na busca acima.</p>
          </div>
        </div>
      `}
    </div>
  `;
}

function getEvaluationSelectedToolMarkup(selectedTool, selectedUser, evaluationUi, moduleData) {
  if (selectedTool.id === EVALUATION_TOOL_IDS.BEHAVIORAL) {
    return getBehavioralEvaluationMarkup(selectedTool, selectedUser, evaluationUi, moduleData);
  }

  if (selectedTool.id === EVALUATION_TOOL_IDS.MATRIX) {
    return getMatrixEvaluationMarkup(selectedTool, selectedUser, evaluationUi, moduleData);
  }

  return getPreEffectiveEvaluationMarkup(selectedTool, evaluationUi);
}

function getPreEffectiveEvaluationMarkup(selectedTool, evaluationUi) {
  const totals = getEvaluationTotals(evaluationUi.evaluationScores, selectedTool.id);
  const notes = getEvaluationToolNotes(evaluationUi, selectedTool.id);

  return `
    <div class="evaluation-table-wrap">
      <table class="evaluation-table">
        <thead>
          <tr>
            <th>Critérios de avaliação</th>
            ${EVALUATION_PERIODS.map((period) => `<th>${period.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${EVALUATION_CRITERIA.map((criterion, index) => getEvaluationCriterionRowMarkup(selectedTool.id, criterion, index, evaluationUi.evaluationScores)).join('')}
          <tr>
            <th>Total</th>
            ${EVALUATION_PERIODS.map((period) => `<td class="evaluation-total-cell">${totals[period.id] || 0}</td>`).join('')}
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

function getBehavioralEvaluationMarkup(selectedTool, selectedUser, evaluationUi, moduleData) {
  const fields = getEvaluationToolFields(evaluationUi, selectedTool.id);
  const respondent = moduleData?.respondent || null;
  const respondentName = String(respondent?.nome || '').trim();
  const evaluationSectorName = String(moduleData?.evaluationSector?.label || '').trim();

  return `
    <div class="evaluation-form-grid">
      <label class="form-field evaluation-form-field">
        <span class="form-label">Funcionário</span>
        <input class="evaluation-form-input" type="text" value="${sanitizeAttribute(selectedUser.nome || '')}" readonly aria-label="Funcionário avaliado" />
      </label>

      <label class="form-field evaluation-form-field">
        <span class="form-label">Data da avaliação</span>
        <input class="evaluation-form-input" type="date" value="${sanitizeAttribute(fields.evaluationDate)}" data-evaluation-field="evaluationDate" aria-label="Data da avaliação" />
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
            ${BEHAVIORAL_EVALUATION_OPTIONS.map((option) => `<th title="${sanitizeAttribute(option.title)}">${sanitizeText(option.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${EVALUATION_CRITERIA.map((criterion, index) => getBehavioralEvaluationCriterionRowMarkup(selectedTool.id, criterion, index, evaluationUi.evaluationScores)).join('')}
        </tbody>
      </table>
    </div>

    <div class="evaluation-legend" aria-label="Legenda da avaliação comportamental">
      ${BEHAVIORAL_EVALUATION_OPTIONS.map((option) => `
        <span><strong>${sanitizeText(option.label)}</strong> - ${sanitizeText(option.title)}</span>
      `).join('')}
    </div>

    <label class="form-field evaluation-notes-field">
      <span class="form-label">Observações</span>
      <textarea class="evaluation-notes-textarea" rows="4" data-evaluation-notes placeholder="Registre observações importantes sobre a avaliação comportamental.">${sanitizeText(getEvaluationToolNotes(evaluationUi, selectedTool.id))}</textarea>
    </label>

    ${getEvaluationSavePanelMarkup(evaluationUi)}
  `;
}

function getMatrixEvaluationMarkup(selectedTool, selectedUser, evaluationUi, moduleData) {
  const fields = getEvaluationToolFields(evaluationUi, selectedTool.id);
  const respondent = moduleData?.respondent || null;
  const respondentName = String(respondent?.nome || '').trim();
  const evaluationSectorName = String(moduleData?.evaluationSector?.label || '').trim();
  const computedResult = getMatrixComputedResult(evaluationUi, selectedTool.id, selectedUser.id);
  return `
    <section class="matrix-evaluation-page" aria-label="Matriz de decisão">
      <div class="matrix-context-grid">
        <label class="form-field evaluation-form-field matrix-context-card">
          <span class="form-label">Funcionário</span>
          <input class="evaluation-form-input" type="text" value="${sanitizeAttribute(selectedUser.nome || '')}" readonly aria-label="Funcionário avaliado" />
        </label>

        <label class="form-field evaluation-form-field matrix-context-card">
          <span class="form-label">Data da avaliação</span>
          <input class="evaluation-form-input" type="date" value="${sanitizeAttribute(fields.evaluationDate)}" data-evaluation-field="evaluationDate" aria-label="Data da avaliação" />
        </label>

        <label class="form-field evaluation-form-field matrix-context-card">
          <span class="form-label">Respondente</span>
          <input class="evaluation-form-input" type="text" value="${sanitizeAttribute(respondentName || 'Respondente não identificado')}" readonly aria-label="Nome do respondente" />
        </label>

        <label class="form-field evaluation-form-field matrix-context-card">
          <span class="form-label">Setor</span>
          <input class="evaluation-form-input" type="text" value="${sanitizeAttribute(evaluationSectorName || 'Setor não identificado')}" readonly aria-label="Setor da avaliação" />
        </label>
      </div>

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
              ${MATRIX_TECHNICAL_CRITERIA.map((criterion, index) => getMatrixCriterionRowMarkup(selectedTool.id, criterion, 'technical', index, evaluationUi.evaluationScores)).join('')}
            </div>
          </article>

          <article class="matrix-competency-card">
            <header class="matrix-competency-header">
              <div>
                <span class="evaluation-section-eyebrow">Competências emocionais</span>
                <h3 class="card-title">Atitude e caráter</h3>
              </div>
              <span class="matrix-scale-badge">0 a 10</span>
            </header>
            <div class="matrix-criteria-list">
              ${MATRIX_EMOTIONAL_CRITERIA.map((criterion, index) => getMatrixCriterionRowMarkup(selectedTool.id, criterion, 'emotional', index, evaluationUi.evaluationScores)).join('')}
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

    </section>
  `;
}


function getEvaluationSavePanelMarkup(evaluationUi) {
  return `
    <div class="matrix-actions-row">
      ${getEvaluationSaveButtonMarkup(evaluationUi, 'Salvar avaliação')}
      ${getEvaluationSaveFeedbackMarkup(evaluationUi)}
    </div>
  `;
}

function getEvaluationSaveButtonMarkup(evaluationUi, label) {
  const isSaving = evaluationUi.evaluationSaveStatus === 'saving';

  return `
    <button type="button" class="module-action-button" data-evaluation-save ${isSaving ? 'disabled aria-disabled="true"' : ''}>
      <i data-lucide="save"></i>
      <span>${sanitizeText(isSaving ? 'Salvando...' : label)}</span>
    </button>
  `;
}

function getEvaluationSaveFeedbackMarkup(evaluationUi) {
  if (!evaluationUi.evaluationSaveMessage) {
    return '';
  }

  return `<span class="evaluation-result-caption">${sanitizeText(evaluationUi.evaluationSaveMessage)}</span>`;
}

function getMatrixCriterionRowMarkup(toolId, criterion, categoryId, index, scores) {
  const scoreKey = getEvaluationScoreKey(toolId, criterion.id, categoryId);
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
              <input
                type="radio"
                name="matrix-${sanitizeAttribute(toolId)}-${sanitizeAttribute(categoryId)}-${sanitizeAttribute(criterion.id)}"
                value="${score}"
                data-evaluation-score
                data-criterion-id="${sanitizeAttribute(criterion.id)}"
                data-period="${sanitizeAttribute(categoryId)}"
                ${isChecked ? 'checked' : ''}
              />
              <span>${score}</span>
            </label>
          `;
        }).join('')}
      </div>
    </article>
  `;
}

export function getMatrixDecisionGraphMarkup(result) {
  const graphPoint = getMatrixGraphPointPosition(result.technicalAverage, result.emotionalAverage);
  const pointColor = getMatrixDecisionColor(result.decisionId);
  const pointMarkup = result.isSaved
    ? `
      <circle cx="${graphPoint.x}" cy="${graphPoint.y}" r="7" fill="${pointColor}"></circle>
      <circle cx="${graphPoint.x}" cy="${graphPoint.y}" r="15" fill="none" stroke="${pointColor}" stroke-width="2" opacity="0.8"></circle>
    `
    : `<circle cx="${graphPoint.x}" cy="${graphPoint.y}" r="6" fill="#687083"></circle>`;

  return `
    <div class="matrix-chart-header">
      <span class="evaluation-section-eyebrow">Matriz</span>
      <strong>${sanitizeText(result.isSaved ? result.decisionLabel : 'Aguardando')}</strong>
    </div>
    <div class="evaluation-graph-stage matrix-chart-stage">
      <svg class="evaluation-graph-svg matrix-chart-svg" viewBox="0 0 520 420" role="img" aria-label="Gráfico da matriz de decisão">
        <defs>
          <linearGradient id="matrixZoneWarm" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#d4a257" stop-opacity="0.18"></stop>
            <stop offset="1" stop-color="#d4a257" stop-opacity="0.05"></stop>
          </linearGradient>
          <linearGradient id="matrixZoneCool" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#5f7fbf" stop-opacity="0.14"></stop>
            <stop offset="1" stop-color="#5f7fbf" stop-opacity="0.04"></stop>
          </linearGradient>
          <linearGradient id="matrixZoneRisk" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#df5b5b" stop-opacity="0.13"></stop>
            <stop offset="1" stop-color="#df5b5b" stop-opacity="0.04"></stop>
          </linearGradient>
          <linearGradient id="matrixZoneGrowth" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#55b87a" stop-opacity="0.15"></stop>
            <stop offset="1" stop-color="#55b87a" stop-opacity="0.04"></stop>
          </linearGradient>
        </defs>

        <rect x="54" y="38" width="400" height="300" rx="18" fill="rgba(255,255,255,0.025)" stroke="var(--border)"></rect>
        <rect x="54" y="188" width="200" height="150" fill="url(#matrixZoneRisk)"></rect>
        <rect x="54" y="38" width="200" height="150" fill="url(#matrixZoneCool)"></rect>
        <rect x="254" y="188" width="200" height="150" fill="url(#matrixZoneGrowth)"></rect>
        <rect x="254" y="38" width="200" height="150" fill="url(#matrixZoneWarm)"></rect>

        ${getMatrixGraphGridLinesMarkup()}
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

function getMatrixGraphGridLinesMarkup() {
  const verticalLines = Array.from({ length: 11 }, (_, index) => {
    const x = 54 + (40 * index);
    return `
      <line x1="${x}" y1="38" x2="${x}" y2="338" stroke="rgba(255,255,255,0.06)" stroke-width="1"></line>
      <text x="${x}" y="360" text-anchor="middle" class="evaluation-graph-scale">${index}</text>
    `;
  }).join('');

  const horizontalLines = Array.from({ length: 11 }, (_, index) => {
    const y = 338 - (30 * index);
    return `
      <line x1="54" y1="${y}" x2="454" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1"></line>
      <text x="42" y="${y + 4}" text-anchor="end" class="evaluation-graph-scale">${index}</text>
    `;
  }).join('');

  return `${verticalLines}${horizontalLines}`;
}

function getEvaluationUsersDropdownMarkup(users) {
  if (!users.length) {
    return `
      <div class="evaluation-users-dropdown">
        <div class="evaluation-users-empty">Nenhum usuário ativo encontrado para esta pesquisa.</div>
      </div>
    `;
  }

  return `
    <div class="evaluation-users-dropdown">
      ${users.map((user) => `
        <button type="button" class="evaluation-user-option" data-evaluatee-option data-user-id="${sanitizeAttribute(user.id)}">
          <span class="evaluation-user-option-id">${sanitizeText(user.id)}</span>
          <span class="evaluation-user-option-name">${sanitizeText(user.nome)}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function getEvaluationCriterionRowMarkup(toolId, criterion, index, scores) {
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
              const scoreKey = getEvaluationScoreKey(toolId, criterion.id, period.id);
              const isChecked = String(scores[scoreKey] || '') === String(score);
              return `
                <label class="evaluation-score-option">
                  <input
                    type="radio"
                    name="evaluation-${sanitizeAttribute(toolId)}-${sanitizeAttribute(criterion.id)}-${sanitizeAttribute(period.id)}"
                    value="${score}"
                    data-evaluation-score
                    data-criterion-id="${sanitizeAttribute(criterion.id)}"
                    data-period="${sanitizeAttribute(period.id)}"
                    ${isChecked ? 'checked' : ''}
                  />
                  <span>${score}</span>
                </label>
              `;
            }).join('')}
          </div>
        </td>
      `).join('')}
    </tr>
  `;
}

function getBehavioralEvaluationCriterionRowMarkup(toolId, criterion, index, scores) {
  return `
    <tr>
      <th>
        <span class="evaluation-criterion-index">${String(index + 1).padStart(2, '0')}.</span>
        <strong>${sanitizeText(criterion.title)}</strong>
        <span class="evaluation-criterion-description">${sanitizeText(criterion.description)}</span>
      </th>
      ${BEHAVIORAL_EVALUATION_OPTIONS.map((option) => {
        const scoreKey = getEvaluationScoreKey(toolId, criterion.id, option.id);
        const isChecked = String(scores[scoreKey] || '') === option.id;

        return `
          <td>
            <label class="evaluation-behavior-option" title="${sanitizeAttribute(option.title)}">
              <input
                type="radio"
                name="evaluation-${sanitizeAttribute(toolId)}-${sanitizeAttribute(criterion.id)}"
                value="${sanitizeAttribute(option.id)}"
                data-evaluation-score
                data-criterion-id="${sanitizeAttribute(criterion.id)}"
                data-period="${sanitizeAttribute(option.id)}"
                ${isChecked ? 'checked' : ''}
              />
              <span>${sanitizeText(option.label)}</span>
            </label>
          </td>
        `;
      }).join('')}
    </tr>
  `;
}


function getFeedbackTabMarkup(card, moduleData, evaluationUi) {
  // Get raw feedback content and inject tabs before the form body
  const feedbackMarkup = getFeedbackModuleMarkup(
    { ...card, title: 'Feedback', id: 'feedback' },
    moduleData,
    evaluationUi
  );
  // Insert eval tabs after the module-shell-header closing tag
  return feedbackMarkup.replace(
    /(<\/div>\s*<\/div>\s*<\/div>)(\s*)/,
    `$1$2${renderEvalTabs('feedback')}$2`
  );
}
