import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { animateOut } from '../../utils/motion.js';
import { registrarAtividade } from '../../services/historico.service.js';
import { fetchQuizForVideo, submitQuizAnswer } from '../../services/quiz.service.js';
import {
  markContentInProgress,
  markContentComplete,
} from '../../services/content-progress.service.js';
import { _contentStatusPill } from './video-module.markup.js';
import { queueCelebration } from '../../utils/celebration.js';

export { getVideoModuleMarkup } from './video-module.markup.js';

const WATCH_THRESHOLD = 0.90;
const DURATION_RETRY_INTERVAL_MS = 500;
const DURATION_MAX_RETRIES = 6;

let activeVideoModal = null;
let ytPlayer = null;
let watchedSeconds = 0;
let videoDuration = 0;
let watchInterval = null;
let completionRegistered = false;
let activeVideoContext = null;

// ── YouTube IFrame API ──────────────────────────────────────────────────────

function loadYouTubeAPI() {
  return new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) { resolve(window.YT); return; }

    const timeout = setTimeout(() => reject(new Error('YouTube IFrame API timeout.')), 10000);

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => { clearTimeout(timeout); reject(new Error('Falha ao carregar API YouTube.')); };
      document.head.appendChild(script);
    }

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

  if (duration <= 0) return;

  const required = duration * WATCH_THRESHOLD;

  watchInterval = setInterval(() => {
    if (!player || typeof player.getPlayerState !== 'function') return;
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

// ── Modal ───────────────────────────────────────────────────────────────────

export function openVideoModal(video, context = {}) {
  if (!video.embedUrl) return;

  closeVideoModal();

  const videoId = extractVideoId(video.embedUrl);
  if (!videoId) return;

  activeVideoContext = { ...context, videoId, title: video.title || 'Vídeo de treinamento' };

  // Marca como "em andamento" imediatamente ao abrir
  const refId = `video-${videoId}`;
  markContentInProgress(refId);
  _updateCardBadge(videoId, 'in-progress');

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
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeVideoModal(); });
  document.addEventListener('keydown', _handleEscapeVideo);

  document.body.appendChild(backdrop);
  document.body.classList.add('has-video-modal');
  activeVideoModal = backdrop;

  loadYouTubeAPI()
    .then((YT) => {
      if (!activeVideoModal) return;
      ytPlayer = new YT.Player('bc-yt-player', {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1, origin: window.location.origin },
        events: {
          onReady: async (e) => {
            const duration = await waitForDuration(e.target);
            if (activeVideoModal) startWatchTracking(e.target, duration, _handleVideoComplete);
          },
          onStateChange: (e) => {
            if (e.data === 0 && !completionRegistered) clearInterval(watchInterval);
          },
        },
      });
    })
    .catch(() => {
      if (!activeVideoModal) return;
      const wrap = activeVideoModal.querySelector('.video-modal-frame-wrap');
      if (wrap) {
        wrap.innerHTML = `
          <iframe class="video-modal-frame"
            src="https://www.youtube.com/embed/${sanitizeAttribute(videoId)}?autoplay=1&rel=0"
            title="${sanitizeAttribute(video.title || 'Vídeo')}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen></iframe>`;
      }
    });
}

function _handleEscapeVideo(e) {
  if (e.key === 'Escape') closeVideoModal();
}

async function _handleVideoComplete() {
  if (!activeVideoContext) return;

  const refId = `video-${activeVideoContext.videoId}`;
  const ctx = { ...activeVideoContext };

  // Promove de "em andamento" para "concluído" imediatamente no DOM
  markContentComplete(refId);
  _updateCardBadge(ctx.videoId, 'complete');

  // Aguarda registro no banco antes de enfileirar celebração
  await registrarAtividade({
    tipo: 'video',
    titulo: ctx.title,
    setorId: ctx.sectorId || '',
    moduloId: ctx.moduloId || 'instrucoes-video',
    referenciaId: refId,
  });

  // Celebração disparada apenas ao retornar ao menu (flush em clearSelectedModule)
  queueCelebration({ message: 'Parabéns! Vídeo concluído com sucesso.' });

  // Notifica content.js para atualizar badges de progresso em tempo real
  document.dispatchEvent(new CustomEvent('bc:content-completed', {
    detail: { sectorId: ctx.sectorId, refId },
  }));

  fetchQuizForVideo(ctx.videoId)
    .then((response) => { if (response?.success && response.questionario) openQuizModal(response.questionario, ctx); })
    .catch(() => { /* silencioso */ });
}

function _updateCardBadge(videoId, state) {
  if (!videoId) return;
  const btn    = document.querySelector(`[data-video-embed-url*="${CSS.escape(videoId)}"]`);
  const cardEl = btn?.closest('[data-module-entry]');
  if (!cardEl) return;

  if (state === 'complete') cardEl.classList.add('is-done');

  const badge = cardEl.querySelector('.content-status-pill');
  if (!badge) return;

  const isDone       = state === 'complete';
  const isInProgress = state === 'in-progress';
  if (badge.classList.contains('content-status-pill--complete') && !isDone) return;

  badge.outerHTML = _contentStatusPill(isDone, isInProgress);
  const newBadge = cardEl.querySelector('.content-status-pill');
  if (newBadge && window.lucide) window.lucide.createIcons({ nodes: [newBadge] });
}

export function closeVideoModal() {
  document.removeEventListener('keydown', _handleEscapeVideo);
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

// ── Quiz Modal ──────────────────────────────────────────────────────────────

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
            </label>`).join('')}
        </div>
        <div class="quiz-modal-result" id="quiz-modal-result" style="display:none"></div>
      </div>
      <div class="quiz-modal-footer">
        <button type="button" class="module-action-button" id="quiz-modal-submit">
          <i data-lucide="send"></i><span>Confirmar resposta</span>
        </button>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons({ root: backdrop });

  backdrop.querySelector('[data-quiz-modal-close]').addEventListener('click', _closeQuizModal);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) _closeQuizModal(); });
  document.addEventListener('keydown', _handleEscapeQuiz);

  backdrop.querySelector('#quiz-modal-submit').addEventListener('click', async () => {
    const selected = backdrop.querySelector('input[name="quiz-modal-resposta"]:checked');
    if (!selected) return;

    const opcaoEscolhida = selected.value;
    const isCorreta = opcaoEscolhida === quiz.gabarito;

    backdrop.querySelectorAll('input[name="quiz-modal-resposta"]').forEach((el) => { el.disabled = true; });
    backdrop.querySelector('#quiz-modal-submit').disabled = true;

    backdrop.querySelectorAll('[data-opcao]').forEach((el) => {
      if (el.dataset.opcao === quiz.gabarito) el.classList.add('is-correct');
      else if (el.dataset.opcao === opcaoEscolhida && !isCorreta) el.classList.add('is-wrong');
    });

    const resultEl = backdrop.querySelector('#quiz-modal-result');
    resultEl.style.display = '';
    resultEl.className = `quiz-modal-result ${isCorreta ? 'is-correct' : 'is-wrong'}`;
    resultEl.innerHTML = isCorreta
      ? `<i data-lucide="check-circle-2"></i><span>Resposta correta!</span>`
      : `<i data-lucide="x-circle"></i><span>Resposta incorreta. A alternativa correta é <strong>${quiz.gabarito.toUpperCase()}</strong>.</span>`;
    if (window.lucide) window.lucide.createIcons({ root: resultEl });

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

function _handleEscapeQuiz(e) { if (e.key === 'Escape') _closeQuizModal(); }

function _closeQuizModal() {
  document.removeEventListener('keydown', _handleEscapeQuiz);
  if (!activeQuizModal) return;
  const target = activeQuizModal;
  activeQuizModal = null;
  animateOut(target, 'is-closing', 200, () => target.remove());
}
