import { requestApi } from './api.service.js';

/**
 * Serviço da Central de Denúncias (DHO) — leitura e acompanhamento.
 * Usa requestApi (autenticado). A autorização real (Gestor/Admin) é validada
 * no backend; aqui apenas normalizamos as respostas.
 */

export async function listarDenuncias({ status = '' } = {}) {
  const response = await requestApi('listar-denuncias', { status: String(status || '') })
    .catch((error) => ({ success: false, code: 'NETWORK_ERROR', denuncias: [], message: error?.message || 'Falha ao carregar denúncias.' }));

  return {
    success: !!response?.success,
    denuncias: Array.isArray(response?.denuncias) ? response.denuncias : [],
    message: response?.message || '',
    code: response?.code || 'DENUNCIAS_ERROR',
  };
}

export async function buscarDenuncia(denunciaId) {
  const response = await requestApi('buscar-denuncia', { denunciaId: String(denunciaId || '') })
    .catch((error) => ({ success: false, code: 'NETWORK_ERROR', message: error?.message || 'Falha ao carregar a denúncia.' }));

  return {
    success: !!response?.success,
    denuncia: response?.denuncia || null,
    message: response?.message || '',
    code: response?.code || 'DENUNCIA_DETAIL_ERROR',
  };
}

export async function atualizarStatusDenuncia(denunciaId, status) {
  const response = await requestApi('atualizar-status-denuncia', {
    denunciaId: String(denunciaId || ''),
    status: String(status || ''),
  }).catch((error) => ({ success: false, code: 'NETWORK_ERROR', message: error?.message || 'Falha ao atualizar o status.' }));

  return {
    success: !!response?.success,
    message: response?.message || '',
    code: response?.code || 'DENUNCIA_STATUS_ERROR',
  };
}
