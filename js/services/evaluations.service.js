import {
  BRIDGE_MESSAGE_TYPES,
  BRIDGE_REQUEST_TIMEOUTS,
} from '../config/app.config.js';
import { requestAppsScriptBridge } from './gas-bridge.service.js';

export async function saveEvaluationRecord(payload) {
  const response = await requestAppsScriptBridge({
    action: 'save-evaluation',
    fields: {
      payload: JSON.stringify(payload || {}),
    },
    messageType: BRIDGE_MESSAGE_TYPES.modules,
    requestIdPrefix: 'evaluation-save',
    iframeNamePrefix: 'build-connect-evaluation-save-iframe',
    timeoutMs: BRIDGE_REQUEST_TIMEOUTS.modules,
    timeoutMessage: 'O salvamento da avaliação demorou mais que o esperado.',
    bridgeLoadErrorMessage: 'Não foi possível salvar a avaliação.',
    webAppUrlErrorMessage: 'URL do Web App não configurada para salvar avaliações.',
  });

  return normalizeEvaluationSaveResponse(response);
}

export async function searchEvaluationRecords({ toolId, evaluateeId, query = '' }) {
  const response = await requestAppsScriptBridge({
    action: 'search-evaluations',
    fields: {
      toolId,
      evaluateeId,
      query,
    },
    messageType: BRIDGE_MESSAGE_TYPES.modules,
    requestIdPrefix: 'evaluation-search',
    iframeNamePrefix: 'build-connect-evaluation-search-iframe',
    timeoutMs: BRIDGE_REQUEST_TIMEOUTS.modules,
    timeoutMessage: 'A busca por avaliações demorou mais que o esperado.',
    bridgeLoadErrorMessage: 'Não foi possível buscar as avaliações salvas.',
    webAppUrlErrorMessage: 'URL do Web App não configurada para buscar avaliações.',
  });

  return normalizeEvaluationSearchResponse(response);
}

export async function setupEvaluationStorage() {
  const response = await requestAppsScriptBridge({
    action: 'setup-evaluations-storage',
    fields: {},
    messageType: BRIDGE_MESSAGE_TYPES.modules,
    requestIdPrefix: 'evaluation-setup',
    iframeNamePrefix: 'build-connect-evaluation-setup-iframe',
    timeoutMs: BRIDGE_REQUEST_TIMEOUTS.modules,
    timeoutMessage: 'A preparação da planilha de avaliações demorou mais que o esperado.',
    bridgeLoadErrorMessage: 'Não foi possível preparar a planilha de avaliações.',
    webAppUrlErrorMessage: 'URL do Web App não configurada para preparar avaliações.',
  });

  return response;
}

function normalizeEvaluationSaveResponse(response) {
  if (response?.success) {
    return {
      success: true,
      code: response.code || 'EVALUATION_SAVED',
      message: response.message || 'Avaliação salva com sucesso.',
      record: response.record || null,
      target: response.target || null,
    };
  }

  return {
    success: false,
    code: response?.code || 'EVALUATION_SAVE_ERROR',
    message: response?.message || 'Não foi possível salvar a avaliação.',
    record: null,
  };
}

function normalizeEvaluationSearchResponse(response) {
  if (response?.success) {
    return {
      success: true,
      code: response.code || 'EVALUATIONS_SEARCH_OK',
      message: response.message || '',
      records: Array.isArray(response.records) ? response.records : [],
      target: response.target || null,
    };
  }

  return {
    success: false,
    code: response?.code || 'EVALUATIONS_SEARCH_ERROR',
    message: response?.message || 'Não foi possível buscar as avaliações salvas.',
    records: [],
  };
}
