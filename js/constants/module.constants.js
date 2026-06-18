export const APP_SOURCE_LABEL = 'Build.Connect';
export const DEFAULT_LOCALE = 'pt-BR';

export const MODULE_IDS = Object.freeze({
  documents:           'documentos',
  writtenInstructions: 'instrucoes-escritas',
  videoInstructions:   'instrucoes-video',
  evaluation:          'avaliacao',
  feedback:            'feedback',
  userAdmin:           'cadastro-usuarios',
  quality:             'qualidade',
  tiRequest:           'requisicoes-ti',
  motorRequests:       'requisicoes-motorista',
  historico:           'historico-colaborador',
  mapasIntegracao:     'mapas-integracao',
  documentosDho:       'documentos-dho',
  questionarios:       'questionarios',

  // ── Vitrine OKEY — categorias ────────────────────────────────────────────
  vitrineColecoes:  'vitrine-colecoes',
  vitrineCatalogo:  'vitrine-catalogo',
  vitrineWorkshop:  'vitrine-workshop',

  // ── Vitrine OKEY — sub-módulos ────────────────────────────────────────────
  vitrineEditoriais:       'vitrine-editoriais',
  vitrineMateriaisMarca:   'vitrine-materiais-marca',
  vitrineComposicoes:      'vitrine-composicoes',
  vitrineFotosPrincipais:  'vitrine-fotos-principais',
  vitrineCorresTecidos:    'vitrine-cores-tecidos',
  vitrineAcabamentos:      'vitrine-acabamentos',
  vitrineInstrucoes:       'vitrine-instrucoes',
  vitrineMateriaisApoio:   'vitrine-materiais-apoio',
  vitrineCapacitacao:      'vitrine-capacitacao',

  // ── Vitrine Lov Club — categorias ────────────────────────────────────────
  lovclubColecoes:  'lovclub-colecoes',
  lovclubCatalogo:  'lovclub-catalogo',
  lovclubWorkshop:  'lovclub-workshop',

  // ── Vitrine Lov Club — sub-módulos ────────────────────────────────────────
  lovclubEditoriais:       'lovclub-editoriais',
  lovclubMateriaisMarca:   'lovclub-materiais-marca',
  lovclubComposicoes:      'lovclub-composicoes',
  lovclubFotosPrincipais:  'lovclub-fotos-principais',
  lovclubCorresTecidos:    'lovclub-cores-tecidos',
  lovclubAcabamentos:      'lovclub-acabamentos',
  lovclubInstrucoes:       'lovclub-instrucoes',
  lovclubMateriaisApoio:   'lovclub-materiais-apoio',
  lovclubCapacitacao:      'lovclub-capacitacao',
});

export const MODULE_STATUS = Object.freeze({
  idle:    'idle',
  loading: 'loading',
  success: 'success',
  error:   'error',
});

export const MODULE_SORT_ORDER = Object.freeze({
  ascending:  'az',
  descending: 'za',
});

export const MODULE_VIEW_MODE = Object.freeze({
  grid: 'grid',
  list: 'list',
});

export const MODULE_ITEM_TYPES = Object.freeze({
  document: 'document',
  video:    'video',
});

export const MODULE_SOURCE_LABELS = Object.freeze({
  [MODULE_IDS.documents]:           'Google Drive',
  [MODULE_IDS.writtenInstructions]: 'Google Drive',
  [MODULE_IDS.videoInstructions]:   'YouTube',
  [MODULE_IDS.evaluation]:          APP_SOURCE_LABEL,
  [MODULE_IDS.feedback]:            APP_SOURCE_LABEL,
  [MODULE_IDS.quality]:             APP_SOURCE_LABEL,

  // Vitrine OKEY
  [MODULE_IDS.vitrineEditoriais]:       'Google Drive',
  [MODULE_IDS.vitrineMateriaisMarca]:   'Google Drive',
  [MODULE_IDS.vitrineComposicoes]:      'Google Drive',
  [MODULE_IDS.vitrineFotosPrincipais]:  'Google Drive',
  [MODULE_IDS.vitrineCorresTecidos]:    'Google Drive',
  [MODULE_IDS.vitrineAcabamentos]:      'Google Drive',
  [MODULE_IDS.vitrineInstrucoes]:       'Google Drive',
  [MODULE_IDS.vitrineMateriaisApoio]:   'Google Drive',
  [MODULE_IDS.vitrineCapacitacao]:      'Google Drive',

  // Vitrine Lov Club
  [MODULE_IDS.lovclubEditoriais]:       'Google Drive',
  [MODULE_IDS.lovclubMateriaisMarca]:   'Google Drive',
  [MODULE_IDS.lovclubComposicoes]:      'Google Drive',
  [MODULE_IDS.lovclubFotosPrincipais]:  'Google Drive',
  [MODULE_IDS.lovclubCorresTecidos]:    'Google Drive',
  [MODULE_IDS.lovclubAcabamentos]:      'Google Drive',
  [MODULE_IDS.lovclubInstrucoes]:       'Google Drive',
  [MODULE_IDS.lovclubMateriaisApoio]:   'Google Drive',
  [MODULE_IDS.lovclubCapacitacao]:      'Google Drive',
});

export const DOCUMENT_MODULE_IDS = new Set([
  MODULE_IDS.documents,
  MODULE_IDS.writtenInstructions,
  MODULE_IDS.mapasIntegracao,
  MODULE_IDS.documentosDho,

  // Vitrine OKEY
  MODULE_IDS.vitrineEditoriais,
  MODULE_IDS.vitrineMateriaisMarca,
  MODULE_IDS.vitrineComposicoes,
  MODULE_IDS.vitrineFotosPrincipais,
  MODULE_IDS.vitrineCorresTecidos,
  MODULE_IDS.vitrineAcabamentos,
  MODULE_IDS.vitrineInstrucoes,
  MODULE_IDS.vitrineMateriaisApoio,
  MODULE_IDS.vitrineCapacitacao,

  // Vitrine Lov Club
  MODULE_IDS.lovclubEditoriais,
  MODULE_IDS.lovclubMateriaisMarca,
  MODULE_IDS.lovclubComposicoes,
  MODULE_IDS.lovclubFotosPrincipais,
  MODULE_IDS.lovclubCorresTecidos,
  MODULE_IDS.lovclubAcabamentos,
  MODULE_IDS.lovclubInstrucoes,
  MODULE_IDS.lovclubMateriaisApoio,
  MODULE_IDS.lovclubCapacitacao,
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

export const SELF_LOADING_MODULE_IDS = new Set([
  MODULE_IDS.tiRequest,
  MODULE_IDS.motorRequests,
  MODULE_IDS.questionarios,
]);

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
