import { MODULE_ITEM_TYPES, MODULE_VIEW_MODE } from '../../constants/module.constants.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { animateOut } from '../../utils/motion.js';
import { registrarAtividade } from '../../services/historico.service.js';
import { prepareModuleItems } from './module-items.js';

const WATCH_THRESHOLD = 0.90; // 90% do vídeo assistido

let activeVideoModal = null;
let ytPlayer = null;
let watchedSeconds = 0;
let videoDuration = 0;
let watchInterval = null;
let completionRegistered = false;
let activeVideoContext = null;

// ── YouTube IFrame API ─────────────────────────────────────────────────────

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT?.Player) { resolve(window.YT); return; }

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve(window.YT);
    };
  });
}

function extractVideoId(embedUrl) {
  const match = String(embedUrl || '').match(/youtube\.com\/embed\/([^?&/]+)/);
  return match ? match[1] : null;
}

function startWatchTracking(player, onComplete) {
  clearInterval(watchInterval);
  watchedSeconds = 0;
  completionRegistered = false;

  watchInterval = setInterval(() => {
    if (!player || typeof player.getPlayerState !== 'function') return;
    const state = player.getPlayerState();

    // YT.PlayerState.PLAYING = 1
    if (state === 1) {
      watchedSeconds += 1;
      const required = videoDuration * WATCH_THRESHOLD;
      if (watchedSeconds >= required && !completionRegistered) {
        completionRegistered = true;
        clearInterval(watchInterval);
        onComplete();
      }
    }
  }, 1000);
}

// ── Modal ──────────────────────────────────────────────────────────────────

export function openVideoModal(video, context = {}) {
  if (!video.embedUrl) return;

  closeVideoModal();

  const videoId = extractVideoId(video.embedUrl);
  if (!videoId) return;

  activeVideoContext = { ...context, videoId, title: video.title || 'Vídeo de treinamento' };

  const backdrop = document.createElement('div');
  backdrop.className = 'video-modal-backdrop';
  backdrop.innerHTML = `
    <div class="video-modal" role="dialog" aria-modal="true" aria-label="${sanitizeAttribute(video.title || 'Vídeo')}">
      <div class="video-modal-header">
        <strong class="video-modal-title">${sanitizeText(video.title || 'Vídeo de treinamento')}</strong>
        <button type="button" class="video-modal-close" aria-label="Fechar vídeo" data-video-close>
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="video-modal-frame-wrap">
        <div id="bc-yt-player"></div>
      </div>
    </div>
  `;

  backdrop.querySelector('[data-video-close]').addEventListener('click', closeVideoModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeVideoModal();
  });
  document.addEventListener('keydown', handleEscapeVideo);

  document.body.appendChild(backdrop);
  document.body.classList.add('has-video-modal');
  activeVideoModal = backdrop;

  // Carrega YT API e cria player
  loadYouTubeAPI().then((YT) => {
    if (!activeVideoModal) return; // modal foi fechado antes da API carregar

    ytPlayer = new YT.Player('bc-yt-player', {
      videoId,
      playerVars: {
        autoplay: 1,
        rel: 0,
        modestbranding: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (e) => {
          videoDuration = e.target.getDuration();
          startWatchTracking(e.target, handleVideoComplete);
        },
        onStateChange: (e) => {
          // YT.PlayerState.ENDED = 0 — não registra se acabou sem ter assistido
          if (e.data === 0 && !completionRegistered) {
            clearInterval(watchInterval);
          }
        },
      },
    });
  });
}

function handleEscapeVideo(e) {
  if (e.key === 'Escape') closeVideoModal();
}

function handleVideoComplete() {
  if (!activeVideoContext) return;
  registrarAtividade({
    tipo: 'video',
    titulo: activeVideoContext.title,
    setorId: activeVideoContext.sectorId || '',
    moduloId: activeVideoContext.moduloId || 'instrucoes-video',
    referenciaId: `video-${activeVideoContext.videoId}`,
  });
}

export function closeVideoModal() {
  document.removeEventListener('keydown', handleEscapeVideo);
  clearInterval(watchInterval);
  watchInterval = null;

  if (ytPlayer && typeof ytPlayer.destroy === 'function') {
    try { ytPlayer.destroy(); } catch { /* noop */ }
    ytPlayer = null;
  }

  watchedSeconds = 0;
  videoDuration = 0;
  completionRegistered = false;
  activeVideoContext = null;

  if (!activeVideoModal) {
    document.body.classList.remove('has-video-modal');
    return;
  }

  const target = activeVideoModal;
  activeVideoModal = null;

  animateOut(target, 'is-closing', 200, () => {
    target.remove();
    document.body.classList.remove('has-video-modal');
  });
}

// ── Markup ─────────────────────────────────────────────────────────────────

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
