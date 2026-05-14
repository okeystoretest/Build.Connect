import { requestApi } from './api.service.js';

export function listarFeedbacksParaUsuario(usuarioId) {
  return requestApi('listar-feedbacks-usuario', { usuarioId: String(usuarioId || '') });
}

export function marcarFeedbackLido(registroId) {
  return requestApi('marcar-feedback-lido', { registroId: String(registroId || '') });
}
