import { requestApi } from './api.service.js';

export async function saveEvaluationRecord(payload) {
  const response = await requestApi('save-evaluation', { payload }).catch((error) => ({
    success: false,
    code: 'NETWORK_ERROR',
    message: error?.message || 'Falha ao salvar a avaliação.',
  }));

  if (response?.success) {
    return { success: true, code: response.code || 'EVALUATION_SAVED', message: response.message || 'Avaliação salva com sucesso.', record: response.record || null };
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
    return { success: true, code: response.code || 'EVALUATIONS_SEARCH_OK', message: response.message || '', records: Array.isArray(response.records) ? response.records : [] };
  }

  return { success: false, code: response?.code || 'EVALUATIONS_SEARCH_ERROR', message: response?.message || 'Não foi possível buscar as avaliações.', records: [] };
}

// Não é mais necessário — tabela já existe no Supabase
export async function setupEvaluationStorage() {
  return { success: true, code: 'EVALUATIONS_STORAGE_READY', message: 'Usando Supabase PostgreSQL.' };
}
