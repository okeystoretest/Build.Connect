import { publicRequestApi } from './api.service.js';

/**
 * Serviço do Feedback Anônimo (tela de login, pré-autenticação).
 *
 * Usa exclusivamente publicRequestApi: nenhuma dessas chamadas envia o token de
 * sessão, nem dispara reload em 401. Ambas as ações são públicas no backend
 * ('public-list-users' e 'save-anonymous-feedback') e o envio é limitado por IP.
 */

/** Lista pública e enxuta de colaboradores (id/nome/setor) para o seletor. */
export async function loadPublicUsers() {
  const response = await publicRequestApi('public-list-users').catch((error) => ({
    success: false,
    code: 'NETWORK_ERROR',
    users: [],
    message: error?.message || 'Não foi possível carregar os colaboradores.',
  }));

  const users = Array.isArray(response?.users) ? response.users : [];
  return {
    success: !!response?.success,
    code: response?.code || (response?.success ? 'PUBLIC_USERS_OK' : 'PUBLIC_USERS_ERROR'),
    users,
    message: response?.message || '',
  };
}

/**
 * Envia um feedback anônimo. O payload contém APENAS os dados do destinatário
 * e a mensagem — nada que identifique o remetente. A origem é marcada no
 * backend como 'Anônimo' e o avaliador_id fixado em 'ANONIMO'.
 */
export async function sendAnonymousFeedback({ targetUserId, targetUserNome, targetUserSetor, mensagem }) {
  const response = await publicRequestApi('save-anonymous-feedback', {
    targetUserId: String(targetUserId || ''),
    targetUserNome: String(targetUserNome || ''),
    targetUserSetor: String(targetUserSetor || ''),
    mensagem: String(mensagem || ''),
  }).catch((error) => ({
    success: false,
    code: 'NETWORK_ERROR',
    message: error?.message || 'Falha ao enviar o feedback. Verifique sua conexão.',
  }));

  return {
    success: !!(response?.success || response?.record),
    code: response?.code || (response?.success ? 'EVALUATION_SAVED' : 'FEEDBACK_SAVE_ERROR'),
    message: response?.message || '',
  };
}
