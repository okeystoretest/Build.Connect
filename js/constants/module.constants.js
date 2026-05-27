export const APP_SOURCE_LABEL = 'Build.Connect';
export const DEFAULT_LOCALE = 'pt-BR';

export const MODULE_IDS = Object.freeze({
  documents: 'documentos',
  writtenInstructions: 'instrucoes-escritas',
  videoInstructions: 'instrucoes-video',
  evaluation: 'avaliacao',
  feedback: 'feedback',
  userAdmin: 'cadastro-usuarios',
  quality: 'qualidade',
  tiRequest: 'requisicoes-ti',
  historico: 'historico-colaborador',
  mapasIntegracao: 'mapas-integracao',
  documentosDho: 'documentos-dho',
  questionarios: 'questionarios',
});

export const MODULE_STATUS = Object.freeze({
  idle: 'idle',
  loading: 'loading',
  success: 'success',
  error: 'error',
});

export const MODULE_SORT_ORDER = Object.freeze({
  ascending: 'az',
  descending: 'za',
});

export const MODULE_VIEW_MODE = Object.freeze({
  grid: 'grid',
  list: 'list',
});

export const MODULE_ITEM_TYPES = Object.freeze({
  document: 'document',
  video: 'video',
});

export const MODULE_SOURCE_LABELS = Object.freeze({
  [MODULE_IDS.documents]: 'Google Drive',
  [MODULE_IDS.writtenInstructions]: 'Google Drive',
  [MODULE_IDS.videoInstructions]: 'YouTube',
  [MODULE_IDS.evaluation]: APP_SOURCE_LABEL,
  [MODULE_IDS.feedback]: APP_SOURCE_LABEL,
  [MODULE_IDS.quality]: APP_SOURCE_LABEL,
});

export const DOCUMENT_MODULE_IDS = new Set([
  MODULE_IDS.documents,
  MODULE_IDS.writtenInstructions,
  MODULE_IDS.mapasIntegracao,
  MODULE_IDS.documentosDho,
]);

export const VIDEO_MODULE_IDS = new Set([
  MODULE_IDS.videoInstructions,
]);

export const DYNAMIC_EXTERNAL_MODULE_IDS = new Set([
  ...DOCUMENT_MODULE_IDS,
  ...VIDEO_MODULE_IDS,
]);

export const ACTIVE_USERS_MODULE_IDS = new Set([
  MODULE_IDS.evaluation,
  MODULE_IDS.feedback,
  MODULE_IDS.quality,
]);

export const INTERNAL_USER_MODULE_IDS = new Set([
  MODULE_IDS.evaluation,
  MODULE_IDS.feedback,
  MODULE_IDS.quality,
]);

// Modules that manage their own data loading via handlers
export const SELF_LOADING_MODULE_IDS = new Set([
  MODULE_IDS.tiRequest,
  MODULE_IDS.questionarios,
]);

// Tool-based filter options for document and video modules (alphabetical)
export const TOOL_FILTER_OPTIONS = Object.freeze([
  'ALPHA',
  'ATIVIDADES MANUAIS',
  'DESENVOLVIMENTO',
  'DOCUMENTOS',
  'FORMULÁRIO',
  'PLANILHA',
  'RUNRUN.IT',
  'SITE',
  'TREINAMENTO',
]);