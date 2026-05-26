import { requestApi } from './api.service.js';

/**
 * Busca o questionário de um vídeo específico (usado no modal pós-vídeo).
 * Retorna { success, questionario: null | {...} }
 */
export async function fetchQuizForVideo(videoId) {
  return requestApi('buscar-questionario-video', { videoId }).catch(() => ({ success: false, questionario: null }));
}

/**
 * Registra a resposta de um colaborador.
 */
export async function submitQuizAnswer({ questionarioId, userId, videoId, sectorId, opcaoEscolhida, isCorreta }) {
  return requestApi('responder-questionario', { questionarioId, userId, videoId, sectorId, opcaoEscolhida, isCorreta });
}

/**
 * Busca todos os resultados de quiz de um usuário (para o dashboard de desempenho).
 * Retorna { success, resultados: [{questionario_id, video_id, sector_id, opcao_escolhida, is_correta, ...}] }
 */
export async function fetchUserQuizResults(userId) {
  return requestApi('buscar-resultados-quiz', { userId }).catch(() => ({ success: false, resultados: [] }));
}

/**
 * Lista todos os questionários de um setor (visão admin).
 */
export async function fetchAdminQuizzesBySector(sectorId) {
  return requestApi('listar-questionarios-setor', { sectorId }).catch(() => ({ success: false, questionarios: [] }));
}

/**
 * Cria ou atualiza um questionário (admin).
 * Se `id` for passado no payload, faz update; caso contrário, cria.
 */
export async function saveQuiz(payload) {
  return requestApi('salvar-questionario', payload);
}

/**
 * Exclui um questionário pelo id (admin).
 */
export async function deleteQuiz(id) {
  return requestApi('deletar-questionario', { id });
}
