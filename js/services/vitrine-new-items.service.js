/**
 * vitrine-new-items.service.js
 * Rastreia itens da Vitrine já vistos pelo usuário no localStorage.
 * Responsável pelo badge "Novo!" — some permanentemente na primeira abertura.
 */

const STORAGE_KEY = 'bc_vitrine_seen';
const VITRINE_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif']);

// ── Módulos da Vitrine (tabs) — prefixos que identificam contexto ──────────

/**
 * Retorna true se o moduloId pertence a um sub-setor Vitrine (OKEY ou Lov Club).
 * @param {string} moduloId
 * @returns {boolean}
 */
export function isVitrineModuleId(moduloId) {
  const s = String(moduloId || '');
  return s.startsWith('vitrine-') || s.startsWith('lovclub-');
}

// ── Detecção de imagens ───────────────────────────────────────────────────

/**
 * Retorna true se o item é um arquivo de imagem (pela extensão).
 * @param {{ extension?: string }} item
 * @returns {boolean}
 */
export function isImageItem(item) {
  return VITRINE_IMAGE_EXTS.has(String(item?.extension || '').toLowerCase());
}

/**
 * Deriva o fileId do Google Drive a partir de uma previewUrl.
 * Ex: "https://drive.google.com/file/d/FILE_ID/preview" → "FILE_ID"
 * @param {string} previewUrl
 * @returns {string|null}
 */
export function getDriveFileId(previewUrl) {
  const match = String(previewUrl || '').match(/\/d\/([^/?#]+)/);
  return match ? match[1] : null;
}

/**
 * Gera URL de thumbnail do Google Drive.
 * @param {string} fileId
 * @param {string} [size='w320']
 * @returns {string}
 */
export function getDriveThumbnailUrl(fileId, size = 'w320') {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=${size}`;
}

// ── Estado dos itens novos ────────────────────────────────────────────────

function _load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function _save(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* noop */ }
}

/**
 * Retorna true se o item ainda NÃO foi aberto pelo usuário (badge "Novo!" deve aparecer).
 * @param {string} refId
 * @returns {boolean}
 */
export function isItemNew(refId) {
  if (!refId) return false;
  const data = _load();
  return !data[refId];
}

/**
 * Marca o item como visto — remove o badge "Novo!" permanentemente.
 * @param {string} refId
 */
export function markItemSeen(refId) {
  if (!refId) return;
  const data = _load();
  data[refId] = Date.now();
  _save(data);
}

/**
 * Atualiza o DOM para remover o badge "Novo!" do card correspondente.
 * @param {string} previewUrl
 */
export function removeNewBadgeFromCard(previewUrl) {
  if (!previewUrl) return;
  const btn = document.querySelector(`[data-document-preview-url="${CSS.escape(previewUrl)}"]`);
  const cardEl = btn?.closest('[data-module-entry]');
  if (!cardEl) return;
  cardEl.querySelector('.vitrine-new-badge')?.remove();
}
