import { MODULE_ITEM_TYPES, MODULE_VIEW_MODE } from '../../constants/module.constants.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { animateOut } from '../../utils/motion.js';
import { registrarAtividade } from '../../services/historico.service.js';
import { prepareModuleItems } from './module-items.js';

const WATCH_THRESHOLD = 0.90;
const DURATION_RETRY_INTERVAL_MS = 1000;
const DURATION_MAX_RETRIES = 10;

let activeVideoModal = null;
let ytPlayer = null;
let watchedSeconds = 0;
let videoDuration = 0;
let watchInterval = null;
let completionRegistered = false;
let activeVideoContext = null;

// ── YouTube IFrame API ─────────────────────────────────────────────────────

function loadYouTubeAPI() {
  return new Promise((resolve, reject) => {
    // API já carregada
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }

    // Timeout de segurança: 10s
    const timeout = setTimeout(() => {
      reject(new Error('YouTube IFrame API não carregou a tempo.'));
    }, 10000);

    // Injeta o script se ainda não existir
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Falha ao carregar a API do YouTube.'));
      };
      document.head.appendChild(script);
    }

    // Encadeia com callbacks anteriores para não quebrar múltiplas chamadas
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      if (typeof prev === 'function') prev();
      resolve(window.YT);
    };
  });
}

function extractVideoId(embedUrl) {
  const match = String(embedUrl || '').match(/youtube\.com\/embed\/([^?&/]+)/);
  return match ? match[1] : null;
}

// Aguarda a duração ficar disponível (getDuration retorna 0 antes dos metadados carregarem)
function waitForDuration(player, retries = 0) {
  const d = player.getDuration?.() ?? 0;
  if (d > 0) return Promise.resolve(d);
  if (retries >= DURATION_MAX_RETRIES) return Promise.resolve(0);
  return new Promise((res) =>
    setTimeout(() => res(waitForDuration(player, retries + 1)), DURATION_RETRY_INTERVAL_MS)
  );
}

function startWatchTracking(player, duration, onComplete) {
  clearInterval(watchInterval);
  watchedSeconds = 0;
  completionRegistered = false;
  videoDuration = duration;

  if (duration <= 0) {
    // Duração desconhecida — não registra
    return;
  }

  const required = duration * WATCH_THRESHOLD;

  watchInterval = setInterval(() => {
    if (!player || typeof player.getPlayerState !== 'function') return;

    // 1 = PLAYING
    if (player.getPlayerState() === 1) {
      watchedSeconds += 1;
      if (!completionRegistered && watchedSeconds >= required) {
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
      <div class="video-modal-head">
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
  loadYouTubeAPI()
    .then((YT) => {
      if (!activeVideoModal) return;

      ytPlayer = new YT.Player('bc-yt-player', {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: async (e) => {
            // Espera duração ficar disponível antes de iniciar o tracking
            const duration = await waitForDuration(e.target);
            if (activeVideoModal) {
              startWatchTracking(e.target, duration, handleVideoComplete);
            }
          },
          onStateChange: (e) => {
            // ENDED (0) sem ter completado — limpa intervalo
            if (e.data === 0 && !completionRegistered) {
              clearInterval(watchInterval);
            }
          },
        },
      });
    })
    .catch(() => {
      // Fallback: abre iframe direto se a API falhar
      if (!activeVideoModal) return;
      const wrap = activeVideoModal.querySelector('.video-modal-frame-wrap');
      if (wrap) {
        wrap.innerHTML = `
          <iframe
            class="video-modal-frame"
            src="https://www.youtube.com/embed/${sanitizeAttribute(videoId)}?autoplay=1&rel=0"
            title="${sanitizeAttribute(video.title || 'Vídeo')}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        `;
      }
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