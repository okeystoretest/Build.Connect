import {
  BRIDGE_MESSAGE_TYPES,
  BRIDGE_REQUEST_TIMEOUTS,
} from '../config/app.config.js';
import {
  APP_SOURCE_LABEL,
  DOCUMENT_MODULE_IDS,
  DYNAMIC_EXTERNAL_MODULE_IDS,
  MODULE_IDS,
  MODULE_SOURCE_LABELS,
} from '../constants/module.constants.js';
import { requestAppsScriptBridge } from './gas-bridge.service.js';

const moduleCache = new Map();

export { MODULE_SOURCE_LABELS };

export function isDynamicExternalModule(moduleId) {
  return DYNAMIC_EXTERNAL_MODULE_IDS.has(moduleId);
}

export async function loadModuleContent({ sectorId, moduleId, forceRefresh = false }) {
  const cacheKey = `${sectorId}:${moduleId}`;

  if (!forceRefresh && moduleCache.has(cacheKey)) {
    return moduleCache.get(cacheKey);
  }

  if (!isDynamicExternalModule(moduleId)) {
    const staticPayload = {
      success: true,
      code: 'MODULE_STATIC',
      module: {
        id: moduleId,
        source: MODULE_SOURCE_LABELS[moduleId] || APP_SOURCE_LABEL,
      },
      items: [],
      emptyMessage: 'Este módulo continua disponível no fluxo interno do Build.Connect.',
    };

    moduleCache.set(cacheKey, staticPayload);
    return staticPayload;
  }

  const response = await requestModuleContentViaBridge({ sectorId, moduleId });
  const normalizedResponse = normalizeModuleResponse(response, moduleId);

  if (normalizedResponse.success) {
    moduleCache.set(cacheKey, normalizedResponse);
  }

  return normalizedResponse;
}

function requestModuleContentViaBridge({ sectorId, moduleId }) {
  return requestAppsScriptBridge({
    action: 'module-content',
    fields: { sectorId, moduleId },
    messageType: BRIDGE_MESSAGE_TYPES.modules,
    requestIdPrefix: 'module',
    iframeNamePrefix: 'build-connect-module-iframe',
    timeoutMs: BRIDGE_REQUEST_TIMEOUTS.modules,
    timeoutMessage: 'O carregamento do conteúdo demorou mais que o esperado.',
    bridgeLoadErrorMessage: 'Não foi possível carregar o conteúdo do módulo.',
    webAppUrlErrorMessage: 'URL do Web App não configurada para carregar os módulos.',
  });
}

function normalizeModuleResponse(response, moduleId) {
  if (response?.success) {
    return {
      success: true,
      code: response.code || 'MODULE_DATA_OK',
      module: response.module || { id: moduleId, source: MODULE_SOURCE_LABELS[moduleId] || APP_SOURCE_LABEL },
      items: normalizeModuleItems(Array.isArray(response.items) ? response.items : [], moduleId),
      emptyMessage: response.emptyMessage || 'Nenhum conteúdo disponível neste momento.',
      message: response.message || '',
    };
  }

  return {
    success: false,
    code: response?.code || 'MODULE_DATA_ERROR',
    message: response?.message || getModuleFallbackMessage(moduleId),
    module: response?.module || { id: moduleId, source: MODULE_SOURCE_LABELS[moduleId] || APP_SOURCE_LABEL },
    items: [],
  };
}

function getModuleFallbackMessage(moduleId) {
  switch (moduleId) {
    case MODULE_IDS.documents:
    case MODULE_IDS.writtenInstructions:
      return 'Não foi possível carregar os arquivos.';
    case MODULE_IDS.videoInstructions:
      return 'Não foi possível carregar os vídeos do YouTube.';
    default:
      return 'Não foi possível carregar o conteúdo deste módulo.';
  }
}

function normalizeModuleItems(items, moduleId) {
  if (!Array.isArray(items)) {
    return [];
  }

  if (DOCUMENT_MODULE_IDS.has(moduleId)) {
    return items.map(normalizeDocumentItem);
  }

  return items;
}

function normalizeDocumentItem(item) {
  const normalizedItem = item && typeof item === 'object' ? item : {};
  const name = String(normalizedItem.name || normalizedItem.title || normalizedItem.fileName || '').trim();
  const openUrl = String(
    normalizedItem.openUrl ||
    normalizedItem.webViewLink ||
    normalizedItem.url ||
    normalizedItem.viewUrl ||
    ''
  ).trim();
  const previewUrl = String(
    normalizedItem.previewUrl ||
    normalizedItem.viewUrl ||
    normalizedItem.embedUrl ||
    ''
  ).trim();

  return {
    ...normalizedItem,
    name,
    title: name || String(normalizedItem.title || '').trim(),
    openUrl,
    previewUrl,
  };
}
