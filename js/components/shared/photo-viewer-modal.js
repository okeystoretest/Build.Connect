/**
 * photo-viewer-modal.js
 * Visualizador (lightbox) de fotos anexadas a um chamado concluído.
 * Exibe a foto em tamanho ampliado, permite navegar entre várias fotos e
 * baixar o arquivo atual. Segue o padrão dos demais modais compartilhados.
 */

import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { animateOut } from '../../utils/motion.js';

let activeModal      = null;
let activeEscHandler = null;
let activeKeyHandler = null;
let photos           = [];
let currentIndex     = 0;

/**
 * Abre o visualizador de fotos.
 * @param {string[]} urls   URLs das fotos (Drive ou Storage).
 * @param {object}   [meta] Metadados opcionais para o cabeçalho.
 * @param {string}   [meta.ticketId] ID do chamado, exibido no título.
 * @param {number}   [startIndex] Índice inicial.
 */
export function openPhotoViewerModal(urls, meta = {}, startIndex = 0) {
  const list = (Array.isArray(urls) ? urls : []).map((u) => String(u || '').trim()).filter(Boolean);
  if (!list.length) return;

  closePhotoViewerModal();

  photos       = list;
  currentIndex = Math.min(Math.max(0, startIndex), photos.length - 1);

  const backdrop = document.createElement('div');
  backdrop.className = 'video-modal-backdrop photo-viewer-backdrop';
  backdrop.innerHTML = `
    <div class="photo-viewer-modal" role="dialog" aria-modal="true" aria-label="Visualizador de fotos">
      <div class="pv-header">
        <span class="pv-title">
          <i data-lucide="image"></i>
          ${meta.ticketId ? sanitizeText(meta.ticketId) + ' · ' : ''}Fotos da ocorrência
        </span>
        <div class="pv-header-actions">
          <a class="pv-btn pv-download" data-pv-download download
             href="#" title="Baixar foto">
            <i data-lucide="download"></i><span>Baixar</span>
          </a>
          <button type="button" class="video-modal-close pv-close" aria-label="Fechar" data-pv-close>
            <i data-lucide="x"></i>
          </button>
        </div>
      </div>

      <div class="pv-stage">
        ${photos.length > 1 ? `
          <button type="button" class="pv-nav pv-prev" aria-label="Foto anterior" data-pv-prev>
            <i data-lucide="chevron-left"></i>
          </button>` : ''}
        <img class="pv-image" data-pv-image src="" alt="Foto da ocorrência" />
        ${photos.length > 1 ? `
          <button type="button" class="pv-nav pv-next" aria-label="Próxima foto" data-pv-next>
            <i data-lucide="chevron-right"></i>
          </button>` : ''}
      </div>

      <div class="pv-footer">
        <span class="pv-counter" data-pv-counter></span>
        ${photos.length > 1 ? `<div class="pv-thumbs" data-pv-thumbs></div>` : ''}
      </div>
    </div>
  `;

  backdrop.querySelector('[data-pv-close]').addEventListener('click', closePhotoViewerModal);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closePhotoViewerModal(); });

  const prevBtn = backdrop.querySelector('[data-pv-prev]');
  const nextBtn = backdrop.querySelector('[data-pv-next]');
  if (prevBtn) prevBtn.addEventListener('click', () => _go(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => _go(1));

  // Navegação por teclado (setas) + ESC para fechar.
  activeKeyHandler = (e) => {
    if (e.key === 'ArrowLeft')  _go(-1);
    if (e.key === 'ArrowRight') _go(1);
  };
  activeEscHandler = (e) => { if (e.key === 'Escape') closePhotoViewerModal(); };
  document.addEventListener('keydown', activeKeyHandler);
  document.addEventListener('keydown', activeEscHandler);

  document.body.appendChild(backdrop);
  document.body.classList.add('has-video-modal');
  activeModal = backdrop;

  _renderThumbs();
  _update();

  if (window.lucide) lucide.createIcons({ root: backdrop });
}

export function closePhotoViewerModal() {
  if (!activeModal) return;
  const modal = activeModal;
  activeModal = null;

  if (activeEscHandler) { document.removeEventListener('keydown', activeEscHandler); activeEscHandler = null; }
  if (activeKeyHandler) { document.removeEventListener('keydown', activeKeyHandler); activeKeyHandler = null; }

  animateOut(modal, 'is-closing', 200, () => {
    modal.remove();
    document.body.classList.remove('has-video-modal');
  });
}

function _go(delta) {
  if (photos.length < 2) return;
  currentIndex = (currentIndex + delta + photos.length) % photos.length;
  _update();
}

function _update() {
  if (!activeModal) return;
  const url      = photos[currentIndex];
  const img      = activeModal.querySelector('[data-pv-image]');
  const dl       = activeModal.querySelector('[data-pv-download]');
  const counter  = activeModal.querySelector('[data-pv-counter]');

  if (img) { img.src = url; img.alt = `Foto ${currentIndex + 1} de ${photos.length}`; }
  if (dl)  {
    dl.href = url;
    // Sugere um nome de arquivo amigável; o atributo download pode ser ignorado
    // em cross-origin (Drive), mas o link continua abrindo o arquivo.
    dl.setAttribute('download', `foto_${currentIndex + 1}.jpg`);
  }
  if (counter) counter.textContent = `${currentIndex + 1} / ${photos.length}`;

  const thumbs = activeModal.querySelectorAll('[data-pv-thumb]');
  thumbs.forEach((t, i) => t.classList.toggle('is-active', i === currentIndex));
}

function _renderThumbs() {
  const wrap = activeModal?.querySelector('[data-pv-thumbs]');
  if (!wrap) return;
  wrap.innerHTML = photos.map((url, i) =>
    `<button type="button" class="pv-thumb" data-pv-thumb data-pv-index="${i}" aria-label="Foto ${i + 1}">
       <img src="${sanitizeAttribute(url)}" alt="Miniatura ${i + 1}" loading="lazy" />
     </button>`
  ).join('');
  wrap.querySelectorAll('[data-pv-thumb]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentIndex = Number(btn.dataset.pvIndex) || 0;
      _update();
    });
  });
}
