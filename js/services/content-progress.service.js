/**
 * content-progress.service.js
 * Rastreia conteúdo "em andamento" (aberto mas não concluído) por sessão.
 * Usa sessionStorage — sem persistência entre sessões (intencional).
 */

const SESSION_KEY = 'bc_content_in_progress';

function _load() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}'); } catch { return {}; }
}

function _save(data) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch { /* noop */ }
}

/**
 * Marca um conteúdo como "em andamento" (ex: vídeo aberto, doc aberto).
 * @param {string} refId  Ex: 'video-dQw4w9WgXcQ'  ou  'doc-https://...'
 */
export function markContentInProgress(refId) {
  if (!refId) return;
  const data = _load();
  data[refId] = true;
  _save(data);
}

/**
 * Remove o conteúdo do estado "em andamento" (ex: vídeo concluído, leitura confirmada).
 * @param {string} refId
 */
export function markContentComplete(refId) {
  if (!refId) return;
  const data = _load();
  delete data[refId];
  _save(data);
}

/**
 * Retorna um Set com todos os refIds atualmente em andamento.
 * @returns {Set<string>}
 */
export function getInProgressRefIds() {
  return new Set(Object.keys(_load()));
}
