import { requestApi } from './api.service.js';

export async function registrarAtividade({ tipo, titulo, setorId, moduloId, referenciaId = null }) {
  try {
    await requestApi('registrar-atividade', { tipo, titulo, setorId, moduloId, referenciaId });
  } catch {
    // Falha silenciosa — não interrompe o fluxo do usuário
  }
}

export async function buscarHistoricoColaborador(usuarioId) {
  const response = await requestApi('buscar-historico', { usuarioId }).catch(() => null);

  if (response?.success) {
    return {
      success: true,
      historico: Array.isArray(response.historico) ? response.historico : [],
      total: response.total ?? 0,
      message: response.message ?? '',
    };
  }

  return { success: false, historico: [], total: 0, message: response?.message ?? 'Não foi possível carregar o histórico.' };
}
