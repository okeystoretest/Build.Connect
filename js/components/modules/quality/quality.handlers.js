/**
 * quality.handlers.js — Handlers de estado e interação do módulo Quality.
 * Extraído de quality-module.js (D-004). Máx 500 linhas por módulo.
 * Handlers de 591 linhas: getModuleState → saveMultidirConfigHandler.
 */

import { errorBoundary } from '../../../utils/error.js';
import { searchEvaluationRecords, fetchMultidirConfig, saveMultidirConfig, markEvaluationRecordRead } from '../../../services/evaluations.service.js';
import { listarFeedbacksParaUsuario, marcarFeedbackLido } from '../../../services/feedbacks-reader.service.js';
import { setCardAlert, clearCardAlert } from '../../../state/module-state.js';
import { invalidateSectorAlertsCache } from '../../../services/sector-alerts.service.js';
import { EVALUATION_TOOL_IDS, EVALUATION_TOOLS } from '../evaluations/evaluation.constants.js';

// Inline para evitar dependência circular com quality-module.js (fachada)
const QUALITY_UI_DEFAULTS = {
  selectedQualityToolId: '', selectedQualityEvaluateeId: '',
  qualityEvaluateeQuery: '', isQualityEvaluateeListOpen: false,
  qualityRecordsStatus: 'idle', qualityRecordsMessage: '', qualityRecords: [],
  qualityView: 'evaluations', feedbacksStatus: 'idle',
  feedbacksPendentes: [], feedbacksLidos: [], feedbacksErrorMessage: '',
  markingReadId: null, multidirConfig: {}, multidirConfigSaveStatus: '',
};

let moduleContext = null;

/** Inicializa o contexto de dependências injetado pela fachada. */
export function createQualityModuleHandlersInternal(dependencies) {
  moduleContext = dependencies;
  return {
    selectTool:       selectQualityTool,
    clearSelectedTool:clearSelectedQualityTool,
    toggleDropdown:   toggleQualityDropdown,
    closeDropdown:    closeQualityDropdown,
    updateSearch:     updateQualitySearch,
    selectUser:       selectQualityUser,
    switchView:       switchQualityView,
    loadFeedbacks:    loadQualityFeedbacks,
    markFeedbackRead: markQualityFeedbackRead,
    loadMultidirConfig:   loadMultidirConfigInternal,
    saveMultidirConfig:   saveMultidirConfigHandler,
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

