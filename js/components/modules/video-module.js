import { MODULE_ITEM_TYPES, MODULE_VIEW_MODE } from '../../constants/module.constants.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { openOverlayModal } from '../shared/overlay-modal.js';
import { prepareModuleItems } from './module-items.js';

export function getVideoModuleMarkup(card, moduleData, moduleUi, renderDependencies) {
  const items = Array.isArray(moduleData?.items) ? moduleData.items : [];
  const { getModuleEmptyMarkup, getModuleToolbarMarkup, getModuleSearchEmptyMarkup } = renderDependencies;

  if (!items.length) {
    return getModuleEmptyMarkup(card, moduleData?.emptyMessage || 'Nenhum vídeo foi encontrado para este módulo.');
  }

  const preparedItems = prepareModuleItems(items, moduleUi, MODULE_ITEM_TYPES.video);

  return `
    <div class="module-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked">
        <div>
          <p class="module-eyebrow">Conteúdo carregado</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Vídeos carregados automaticamente a partir da playlist configurada no YouTube.</p>
        </div>

        ${getModuleToolbarMarkup(card.id, moduleUi, items.length, preparedItems.length, 'Busque por título do vídeo')}
      </div>

      <div class="module-items-grid module-items-grid-video ${moduleUi.view === MODULE_VIEW_MODE.list ? 'is-list-view' : 'is-grid-view'}" data-module-items-container>
        ${preparedItems.length ? preparedItems.map(renderVideoItemCard).join('') : getModuleSearchEmptyMarkup()}
      </div>
    </div>
  `;
}

export function openVideoModal(video) {
  if (!video.embedUrl) {
    return;
  }

  openOverlayModal({
    title: video.title,
    frameUrl: `${video.embedUrl}?autoplay=1&rel=0`,
    closeLabel: 'Fechar vídeo',
    modalClassName: 'video-modal',
    frameWrapClassName: 'video-modal-frame-wrap',
    frameClassName: 'video-modal-frame',
  });
}

function renderVideoItemCard(item) {
  const thumbnail = sanitizeAttribute(item.thumbnailUrl || '');
  const title = sanitizeText(item.title || 'Vídeo sem título');
  const embedUrl = sanitizeAttribute(item.embedUrl || '');

  return `
    <article class="module-item-card is-video" data-module-entry>
      <div class="video-thumb-wrap">
        <img class="video-thumb" src="${thumbnail}" alt="Thumbnail do vídeo ${title}" loading="lazy" />
        <span class="video-duration-badge">${sanitizeText(item.durationLabel || '00:00')}</span>
      </div>

      <div class="module-item-copy">
        <h3 class="module-item-title">${title}</h3>
      </div>

      <div class="module-item-actions">
        <button
          type="button"
          class="module-link-button"
          data-video-embed-url="${embedUrl}"
          data-video-title="${sanitizeAttribute(item.title || 'Vídeo de treinamento')}"
        >
          <i data-lucide="play"></i>
          <span>Assistir</span>
        </button>
      </div>
    </article>
  `;
}
