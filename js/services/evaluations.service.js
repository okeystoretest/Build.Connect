import { requestApi } from './api.service.js';

export async function saveEvaluationRecord(payload) {
  const response = await requestApi('save-evaluation', { payload }).catch((error) => ({
    success: false,
    code: 'NETWORK_ERROR',
    message: error?.message || 'Falha ao salvar a avaliação.',
  }));

  if (response?.success) {
    return {
      success: true,
      code: response.code || 'EVALUATION_SAVED',
      message: response.message || 'Avaliação salva com sucesso.',
      record: response.record ? normalizeRecord(response.record) : null,
    };
  }

  return { success: false, code: response?.code || 'EVALUATION_SAVE_ERROR', message: response?.message || 'Não foi possível salvar a avaliação.', record: null };
}

export async function searchEvaluationRecords({ toolId, evaluateeId, query = '' }) {
  const response = await requestApi('search-evaluations', { toolId, evaluateeId, query }).catch((error) => ({
    success: false,
    code: 'NETWORK_ERROR',
    message: error?.message || 'Falha ao buscar avaliações.',
  }));

  if (response?.success) {
    const records = Array.isArray(response.records) ? response.records.map(normalizeRecord) : [];
    return { success: true, code: response.code || 'EVALUATIONS_SEARCH_OK', message: response.message || '', records };
  }

  return { success: false, code: response?.code || 'EVALUATIONS_SEARCH_ERROR', message: response?.message || 'Não foi possível buscar as avaliações.', records: [] };
}

// Normaliza snake_case do Supabase → camelCase esperado pelas views
function normalizeRecord(r) {
  if (!r) return r;

  // Suporte a ambos os formatos (já normalizado ou vindo do banco)
  const toolId     = r.toolId       ?? r.formulario_id  ?? r.tipo ?? '';
  const toolTitle  = r.toolTitle    ?? r.formulario      ?? '';
  const sectorId   = r.sectorId     ?? r.setor_id        ?? '';
  const sectorName = r.sectorName   ?? r.setor           ?? '';
  const notes      = r.notes        ?? r.observacoes      ?? '';
  const createdAt  = r.createdAt    ?? r.savedAt          ?? r.criado_em       ?? null;
  const evaluationDate = r.evaluationDate ?? r.data_avaliacao ?? null;
  const id         = r.id           ?? r.registro_id     ?? '';

  const evaluatee = r.evaluatee ?? {
    id:    r.avaliado_id   ?? '',
    nome:  r.avaliado      ?? '',
    setor: r.avaliado_setor ?? sectorName,
  };

  const respondent = r.respondent ?? {
    id:    r.avaliador_id    ?? '',
    nome:  r.avaliador       ?? '',
    nivel: r.avaliador_nivel ?? '',
  };

  const fields  = r.fields          ?? r.campos_json      ?? {};
  const scores  = r.scores          ?? r.pontuacoes_json  ?? {};
  const totals  = r.totals          ?? r.totais_json      ?? {};
  const summary = r.summary         ?? r.resumo_json      ?? {};
  const result  = r.result          ?? r.resultado_json   ?? {};
  const source  = r.source          ?? r.origem           ?? '';

  return {
    id,
    toolId,
    toolTitle,
    sectorId,
    sectorName,
    notes,
    createdAt,
    savedAt: createdAt,
    evaluationDate,
    evaluatee,
    respondent,
    fields,
    scores,
    totals,
    summary,
    result,
    matrixResult: result, // alias — compatibilidade com getQualityMatrixRecordMarkup
    source,
    // Mantém campos originais para compatibilidade
    registro_id:     id,
    formulario_id:   toolId,
    formulario:      toolTitle,
    avaliado_id:     evaluatee.id,
    avaliado:        evaluatee.nome,
    avaliador_id:    respondent.id,
    avaliador:       respondent.nome,
    lido:            r.lido    ?? false,
    lido_em:         r.lido_em ?? null,
  };
}

// Não é mais necessário — tabela já existe no Supabase
export async function setupEvaluationStorage() {
  return { success: true, code: 'EVALUATIONS_STORAGE_READY', message: 'Usando Supabase PostgreSQL.' };
}