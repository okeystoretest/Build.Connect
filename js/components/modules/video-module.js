import { MODULE_ITEM_TYPES, MODULE_VIEW_MODE, TOOL_FILTER_OPTIONS } from '../../constants/module.constants.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { animateOut } from '../../utils/motion.js';
import { registrarAtividade } from '../../services/historico.service.js';
import { fetchQuizForVideo, submitQuizAnswer } from '../../services/quiz.service.js';
import { prepareModuleItems } from './module-items.js';

const WATCH_THRESHOLD = 0.90;
const DURATION_RETRY_INTERVAL_MS = 500;
const DURATION_MAX_RETRIES = 6; // max 3s de espera (6 × 500ms)

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

  // Verifica se o vídeo possui questionário e abre o modal
  const ctx = { ...activeVideoContext };
  fetchQuizForVideo(ctx.videoId).then((response) => {
    if (response?.success && response.questionario) {
      openQuizModal(response.questionario, ctx);
    }
  }).catch(() => { /* silencioso — não interrompe a experiência */ });
}

// ── Quiz Modal ─────────────────────────────────────────────────────────────

let activeQuizModal = null;

function openQuizModal(quiz, context) {
  if (activeQuizModal) return;

  const opcoes = [
    { key: 'a', texto: quiz.opcao_a },
    { key: 'b', texto: quiz.opcao_b },
    { key: 'c', texto: quiz.opcao_c },
  ];

  const backdrop = document.createElement('div');
  backdrop.className = 'quiz-modal-backdrop';
  backdrop.innerHTML = `
    <div class="quiz-modal" role="dialog" aria-modal="true" aria-label="Questionário">
      <div class="quiz-modal-head">
        <strong class="quiz-modal-title">Questionário</strong>
        <button type="button" class="video-modal-close" data-quiz-modal-close aria-label="Fechar">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="quiz-modal-body">
        <p class="quiz-modal-pergunta">${sanitizeText(quiz.pergunta)}</p>
        <div class="quiz-modal-opcoes" id="quiz-modal-opcoes">
          ${opcoes.map((o) => `
            <label class="quiz-modal-opcao" data-opcao="${sanitizeAttribute(o.key)}">
              <input type="radio" name="quiz-modal-resposta" value="${sanitizeAttribute(o.key)}" />
              <span class="quiz-opcao-letter">${o.key.toUpperCase()}</span>
              <span class="quiz-opcao-texto">${sanitizeText(o.texto)}</span>
            </label>
          `).join('')}
        </div>
        <div class="quiz-modal-result" id="quiz-modal-result" style="display:none"></div>
      </div>
      <div class="quiz-modal-footer">
        <button type="button" class="module-action-button" id="quiz-modal-submit">
          <i data-lucide="send"></i>
          <span>Confirmar resposta</span>
        </button>
      </div>
    </div>
  `;

  // Lucide icons
  if (window.lucide) window.lucide.createIcons({ root: backdrop });

  // Close button
  backdrop.querySelector('[data-quiz-modal-close]').addEventListener('click', closeQuizModal);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeQuizModal(); });
  document.addEventListener('keydown', handleEscapeQuiz);

  // Submit
  backdrop.querySelector('#quiz-modal-submit').addEventListener('click', async () => {
    const selected = backdrop.querySelector('input[name="quiz-modal-resposta"]:checked');
    if (!selected) return;

    const opcaoEscolhida = selected.value;
    const isCorreta = opcaoEscolhida === quiz.gabarito;

    // Disable options after answer
    backdrop.querySelectorAll('input[name="quiz-modal-resposta"]').forEach((el) => { el.disabled = true; });
    backdrop.querySelector('#quiz-modal-submit').disabled = true;

    // Visual feedback on options
    backdrop.querySelectorAll('[data-opcao]').forEach((el) => {
      const key = el.dataset.opcao;
      if (key === quiz.gabarito) el.classList.add('is-correct');
      else if (key === opcaoEscolhida && !isCorreta) el.classList.add('is-wrong');
    });

    // Result message
    const resultEl = backdrop.querySelector('#quiz-modal-result');
    resultEl.style.display = '';
    resultEl.className = `quiz-modal-result ${isCorreta ? 'is-correct' : 'is-wrong'}`;
    resultEl.innerHTML = isCorreta
      ? `<i data-lucide="check-circle-2"></i><span>Resposta correta!</span>`
      : `<i data-lucide="x-circle"></i><span>Resposta incorreta. A alternativa correta é <strong>${quiz.gabarito.toUpperCase()}</strong>.</span>`;
    if (window.lucide) window.lucide.createIcons({ root: resultEl });

    // Save answer (best-effort)
    await submitQuizAnswer({
      questionarioId: quiz.id,
      userId: context.userId || '',
      videoId: context.videoId || '',
      sectorId: context.sectorId || '',
      opcaoEscolhida,
      isCorreta,
    }).catch(() => {});
  });

  document.body.appendChild(backdrop);
  activeQuizModal = backdrop;
  if (window.lucide) window.lucide.createIcons({ root: backdrop });
}

function handleEscapeQuiz(e) {
  if (e.key === 'Escape') closeQuizModal();
}

function closeQuizModal() {
  document.removeEventListener('keydown', handleEscapeQuiz);
  if (!activeQuizModal) return;
  const target = activeQuizModal;
  activeQuizModal = null;
  animateOut(target, 'is-closing', 200, () => target.remove());
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
  const { getModuleEmptyMarkup, getModuleToolbarMarkup, getModuleSearchEmptyMarkup, getModuleToolFilterMarkup } = renderDependencies;
  const consumedRefIds = new Set(Array.isArray(moduleData?.consumedRefIds) ? moduleData.consumedRefIds : []);

  if (!items.length) {
    return getModuleEmptyMarkup(card, moduleData?.emptyMessage || 'Nenhum vídeo foi encontrado para este módulo.');
  }

  const activeFilter = moduleUi?.selectedToolFilter || '';
  const preparedItems = prepareModuleItems(items, moduleUi, MODULE_ITEM_TYPES.video);

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
        ${preparedItems.length ? preparedItems.map((item) => renderVideoItemCard(item, consumedRefIds)).join('') : getModuleSearchEmptyMarkup()}
      </div>
    </div>
  `;
}

function renderVideoItemCard(item, consumedRefIds = new Set()) {
  const thumbnail = sanitizeAttribute(item.thumbnailUrl || '');
  const title = sanitizeText(item.title || 'Vídeo sem título');
  const embedUrl = sanitizeAttribute(item.embedUrl || '');

  const videoIdMatch = String(item.embedUrl || '').match(/youtube\.com\/embed\/([^?&/]+)/);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;
  const refId = videoId ? `video-${videoId}` : null;
  const isDone = refId && consumedRefIds.has(refId);

  return `
    <article class="module-item-card is-video ${isDone ? 'is-done' : ''}" data-module-entry>
      <span class="module-item-status-badge ${isDone ? 'is-complete' : 'is-pending'}" aria-label="${isDone ? 'Concluído' : 'Atenção'}">
        <i data-lucide="${isDone ? 'check-circle-2' : 'alert-triangle'}"></i>
        <span>${isDone ? 'Concluído' : 'Atenção'}</span>
      </span>
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