/**
 * video-module.markup.js
 * Renders the video module list with 3-state content status pills
 * and Navi sequential locking.
 */

import { MODULE_ITEM_TYPES, MODULE_VIEW_MODE, TOOL_FILTER_OPTIONS } from '../../constants/module.constants.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { prepareModuleItems } from './module-items.js';
import { getInProgressRefIds } from '../../services/content-progress.service.js';
import { SEQUENTIAL_MODULE_IDS, isItemSequentiallyLocked } from '../../services/navi.service.js';

export function getVideoModuleMarkup(card, moduleData, moduleUi, renderDependencies) {
  const items = Array.isArray(moduleData?.items) ? moduleData.items : [];
  const {
    getModuleEmptyMarkup,
    getModuleToolbarMarkup,
    getModuleSearchEmptyMarkup,
    getModuleToolFilterMarkup,
  } = renderDependencies;

  const consumedRefIds   = new Set(Array.isArray(moduleData?.consumedRefIds) ? moduleData.consumedRefIds : []);
  const inProgressRefIds = getInProgressRefIds();

  if (!items.length) {
    return getModuleEmptyMarkup(card, moduleData?.emptyMessage || 'Nenhum vídeo foi encontrado para este módulo.');
  }

  const activeFilter  = moduleUi?.selectedToolFilter || '';
  const preparedItems = prepareModuleItems(items, moduleUi, MODULE_ITEM_TYPES.video);
  // Sequential lock: active for all users except Admin (naviSequentialActive=false)
  const isSequential  = SEQUENTIAL_MODULE_IDS.has(card.id) && (moduleUi?.naviSequentialActive !== false);

  return `
    <div class="module-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked">
        <div>
          <p class="module-eyebrow">Conteúdo carregado</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Vídeos carregados automaticamente a partir da base de dados.</p>
        </div>
        ${getModuleToolbarMarkup(card.id, moduleUi, items.length, preparedItems.length, 'Busque por título do vídeo')}
      </div>
      ${getModuleToolFilterMarkup(TOOL_FILTER_OPTIONS, activeFilter)}
      <div class="module-items-grid module-items-grid-video ${moduleUi.view === MODULE_VIEW_MODE.list ? 'is-list-view' : 'is-grid-view'}" data-module-items-container>
        ${preparedItems.length
          ? preparedItems.map((item, idx) => {
              const prevItem  = isSequential && idx > 0 ? preparedItems[idx - 1] : null;
              const prevVidId = prevItem ? _extractVideoId(prevItem.embedUrl) : null;
              const prevRefId = prevVidId ? `video-${prevVidId}` : null;
              const isLocked  = isSequential && isItemSequentiallyLocked(idx, prevRefId, consumedRefIds);
              return renderVideoItemCard(item, consumedRefIds, inProgressRefIds, isLocked);
            }).join('')
          : getModuleSearchEmptyMarkup()}
      </div>
    </div>
  `;
}

export function renderVideoItemCard(item, consumedRefIds = new Set(), inProgressRefIds = new Set(), isLocked = false) {
  const thumbnail  = sanitizeAttribute(item.thumbnailUrl || '');
  const title      = sanitizeText(item.title || 'Vídeo sem título');
  const embedUrl   = sanitizeAttribute(item.embedUrl || '');

  const videoId  = _extractVideoId(item.embedUrl);
  const refId    = videoId ? `video-${videoId}` : null;

  const isDone       = Boolean(refId && consumedRefIds.has(refId));
  const isInProgress = Boolean(!isDone && refId && inProgressRefIds.has(refId));
  const naviAttrs    = isLocked ? ' data-navi-locked="true"' : '';

  return `
    <article class="module-item-card is-video ${isDone ? 'is-done' : ''} ${isLocked ? 'is-navi-locked' : ''}" data-module-entry>
      ${_contentStatusPill(isDone, isInProgress)}
      <div class="video-thumb-wrap ${isLocked ? 'navi-thumb-locked' : ''}">
        ${isLocked
          ? `<div class="navi-video-lock-overlay" aria-hidden="true"><i data-lucide="lock"></i></div>`
          : ''}
        <img class="video-thumb" src="${thumbnail}" alt="Thumbnail ${title}" loading="lazy" />
        <span class="video-duration-badge">${sanitizeText(item.durationLabel || '00:00')}</span>
      </div>
      <div class="module-item-copy">
        <h3 class="module-item-title">${title}</h3>
        ${isLocked ? '<p class="navi-item-lock-note">Conclua o vídeo anterior para desbloquear</p>' : ''}
      </div>
      <div class="module-item-actions">
        <button
          type="button"
          class="module-link-button ${isLocked ? 'navi-item-locked-btn' : ''}"
          data-video-embed-url="${embedUrl}"
          data-video-title="${sanitizeAttribute(item.title || 'Vídeo de treinamento')}"
          ${naviAttrs}
          aria-disabled="${isLocked ? 'true' : 'false'}"
        >
          <i data-lucide="${isLocked ? 'lock' : 'play'}"></i>
          <span>${isLocked ? 'Bloqueado' : 'Assistir'}</span>
        </button>
      </div>
    </article>
  `;
}

export function _contentStatusPill(isDone, isInProgress) {
  if (isDone) {
    return `<span class="content-status-pill content-status-pill--complete" aria-label="Concluído">
      <i data-lucide="check-circle-2"></i><span>Concluído</span>
    </span>`;
  }
  if (isInProgress) {
    return `<span class="content-status-pill content-status-pill--in-progress" aria-label="Em andamento">
      <i data-lucide="loader"></i><span>Em andamento</span>
    </span>`;
  }
  return `<span class="content-status-pill content-status-pill--not-started" aria-label="Não iniciado">
    <i data-lucide="circle-dashed"></i><span>Não iniciado</span>
  </span>`;
}

function _extractVideoId(embedUrl) {
  const match = String(embedUrl || '').match(/youtube\.com\/embed\/([^?&/]+)/);
  return match ? match[1] : null;
}
