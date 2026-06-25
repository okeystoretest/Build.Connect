/**
 * dashboard-lightbox.js — Visualizador de fotos (lightbox) auto-contido
 * para as páginas dedicadas de dashboard. Sem dependências externas além
 * do CSS (.dash-lb-*) presente em dashboard-ti.css e do Lucide global.
 */

'use strict';


let _lbPhotos = [];
let _lbIndex  = 0;
let _lbKeyHandler = null;

export function openLightbox(photos, startIndex = 0) {
  closeLightbox();
  _lbPhotos = photos;
  _lbIndex  = Math.min(Math.max(0, startIndex), photos.length - 1);

  const backdrop = document.createElement('div');
  backdrop.id = 'dash-lightbox';
  backdrop.className = 'dash-lb-backdrop';
  backdrop.innerHTML = `
    <div class="dash-lb-modal" role="dialog" aria-modal="true" aria-label="Visualizador de fotos">
      <div class="dash-lb-header">
        <span class="dash-lb-title"><i data-lucide="image"></i> Foto da ocorrência</span>
        <div class="dash-lb-actions">
          <a class="dash-lb-btn dash-lb-download" id="dash-lb-download" download href="#"><i data-lucide="download"></i> Baixar</a>
          <button type="button" class="dash-lb-close" id="dash-lb-close" aria-label="Fechar"><i data-lucide="x"></i></button>
        </div>
      </div>
      <div class="dash-lb-stage">
        ${photos.length > 1 ? '<button type="button" class="dash-lb-nav dash-lb-prev" id="dash-lb-prev" aria-label="Anterior"><i data-lucide="chevron-left"></i></button>' : ''}
        <img class="dash-lb-image" id="dash-lb-image" src="" alt="Foto" />
        ${photos.length > 1 ? '<button type="button" class="dash-lb-nav dash-lb-next" id="dash-lb-next" aria-label="Próxima"><i data-lucide="chevron-right"></i></button>' : ''}
      </div>
      <div class="dash-lb-footer"><span id="dash-lb-counter"></span></div>
    </div>
  `;
  document.body.appendChild(backdrop);

  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeLightbox(); });
  document.getElementById('dash-lb-close').addEventListener('click', closeLightbox);
  document.getElementById('dash-lb-prev')?.addEventListener('click', () => stepLightbox(-1));
  document.getElementById('dash-lb-next')?.addEventListener('click', () => stepLightbox(1));

  _lbKeyHandler = (e) => {
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
  };
  document.addEventListener('keydown', _lbKeyHandler);

  updateLightbox();
  if (window.lucide) lucide.createIcons();
}

function stepLightbox(delta) {
  if (_lbPhotos.length < 2) return;
  _lbIndex = (_lbIndex + delta + _lbPhotos.length) % _lbPhotos.length;
  updateLightbox();
}

function updateLightbox() {
  const url = _lbPhotos[_lbIndex];
  const img = document.getElementById('dash-lb-image');
  const dl  = document.getElementById('dash-lb-download');
  const cnt = document.getElementById('dash-lb-counter');
  if (img) img.src = url;
  if (dl)  { dl.href = url; dl.setAttribute('download', `foto_${_lbIndex + 1}.jpg`); }
  if (cnt) cnt.textContent = `${_lbIndex + 1} / ${_lbPhotos.length}`;
}

function closeLightbox() {
  const el = document.getElementById('dash-lightbox');
  if (el) el.remove();
  if (_lbKeyHandler) { document.removeEventListener('keydown', _lbKeyHandler); _lbKeyHandler = null; }
}
