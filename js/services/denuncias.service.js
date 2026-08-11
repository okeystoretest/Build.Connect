import { publicRequestApi } from './api.service.js';

/**
 * Serviço PÚBLICO de Denúncias Anônimas (NR-1) — usado na tela de login.
 *
 * Todas as chamadas passam por publicRequestApi: nenhuma envia token de sessão
 * e nenhuma dispara reload em 401. O envio é anônimo por design — o payload
 * jamais inclui dados do autor. Rate-limit por IP é aplicado no backend.
 */

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_ANEXOS = 5;

export { ALLOWED_MIME as DENUNCIA_ALLOWED_MIME, MAX_FILE_BYTES as DENUNCIA_MAX_FILE_BYTES, MAX_ANEXOS as DENUNCIA_MAX_ANEXOS };

/**
 * Cria a denúncia. Retorna { success, denunciaId, message }.
 * O denunciaId é usado em seguida para anexar evidências.
 */
export async function createDenuncia({ envolvidoId, envolvidoNome, envolvidoSetor, descricao }) {
  const response = await publicRequestApi('save-denuncia', {
    envolvidoId: String(envolvidoId || ''),
    envolvidoNome: String(envolvidoNome || ''),
    envolvidoSetor: String(envolvidoSetor || ''),
    descricao: String(descricao || ''),
  }).catch((error) => ({
    success: false,
    code: 'NETWORK_ERROR',
    message: error?.message || 'Falha ao registrar a denúncia. Verifique sua conexão.',
  }));

  return {
    success: !!response?.success,
    denunciaId: response?.denunciaId || '',
    code: response?.code || (response?.success ? 'DENUNCIA_SAVED' : 'DENUNCIA_ERROR'),
    message: response?.message || '',
  };
}

/**
 * Lê um File como base64 puro (sem o prefixo data:).
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Envia um anexo de evidência para uma denúncia já criada.
 * Valida tipo e tamanho no cliente antes do upload (o backend revalida).
 */
export async function uploadDenunciaAnexo(denunciaId, file) {
  if (!denunciaId) return { success: false, message: 'Denúncia inválida.' };
  if (!ALLOWED_MIME.includes(file.type)) {
    return { success: false, message: `"${file.name}": formato não suportado (use JPEG, PNG, WebP ou PDF).` };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { success: false, message: `"${file.name}": arquivo maior que 10 MB.` };
  }

  let fileBase64;
  try {
    fileBase64 = await fileToBase64(file);
  } catch (err) {
    return { success: false, message: err?.message || 'Falha ao ler o arquivo.' };
  }

  const response = await publicRequestApi('upload-denuncia-anexo', {
    denunciaId: String(denunciaId),
    fileBase64,
    mimeType: file.type,
    fileName: file.name,
  }).catch((error) => ({
    success: false,
    code: 'NETWORK_ERROR',
    message: error?.message || 'Falha ao enviar o anexo.',
  }));

  return {
    success: !!response?.success,
    code: response?.code || (response?.success ? 'ANEXO_UPLOADED' : 'ANEXO_ERROR'),
    message: response?.message || '',
  };
}
