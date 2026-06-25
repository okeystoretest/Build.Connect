import { requestApi } from './api.service.js';
import { showToast } from '../utils/toast.js';

export async function registrarAtividade({ tipo, titulo, setorId, moduloId, referenciaId = null }) {
  try {
    await requestApi('registrar-atividade', { tipo, titulo, setorId, moduloId, referenciaId });
  } catch (err) {
    // Informa o usuário apenas se for erro de sessão — outros erros são descartados silenciosamente
    const msg = err?.message || '';
    if (msg.includes('401') || msg.toLowerCase().includes('sessão') || msg.toLowerCase().includes('expirada')) {
      showToast('Sua sessão expirou. O progresso desta atividade não foi salvo — faça login novamente.', {
        type: 'warning',
        duration: 6000,
      });
    }
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
