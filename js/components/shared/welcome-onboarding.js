// ── Welcome onboarding ──────────────────────────────────────────────────────
// Overlay full-viewport, bloqueante, exibido no primeiro acesso.
// O acesso à plataforma só é liberado quando o vídeo termina (evento ENDED da
// YouTube IFrame API). Sem botão de fechar, sem Escape, sem clique para sair.
//
// Falha ao carregar a API → libera o acesso (não trava o onboarding).

import { loadYouTubeAPI, extractVideoId } from '../../utils/youtube-api.js';
import { markWelcomeWatched } from '../../services/onboarding.service.js';

const WELCOME_VIDEO_EMBED = 'https://www.youtube.com/embed/kvxXe6evgDM';
const BODY_FLAG = 'has-welcome-onboarding';

let activeOverlay = null;
let ytPlayer = null;

// Impede que teclas de navegação/atalhos vazem para a aplicação por trás.
function blockKeydown(e) {
  e.stopPropagation();
}

function teardown(user, { markWatched }) {
  if (markWatched) markWelcomeWatched(user);

  document.removeEventListener('keydown', blockKeydown, true);

  if (ytPlayer && typeof ytPlayer.destroy === 'function') {
    try { ytPlayer.destroy(); } catch { /* noop */ }
  }
  ytPlayer = null;

  const overlay = activeOverlay;
  activeOverlay = null;

  if (overlay) {
    overlay.classList.add('is-closing');
    setTimeout(() => {
      overlay.remove();
      document.body.classList.remove(BODY_FLAG);
    }, 240);
  } else {
    document.body.classList.remove(BODY_FLAG);
  }
}

export function runWelcomeOnboarding(user) {
  if (activeOverlay) return; // já em execução

  const videoId = extractVideoId(WELCOME_VIDEO_EMBED);
  if (!videoId) { markWelcomeWatched(user); return; } // sem vídeo válido, não bloqueia

  const overlay = document.createElement('div');
  overlay.className = 'welcome-onboarding-backdrop';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Vídeo de boas-vindas');
  overlay.innerHTML = `
    <div class="welcome-onboarding-stage">
      <div class="welcome-onboarding-player">
        <div id="bc-welcome-player"></div>
      </div>
      <p class="welcome-onboarding-hint" data-welcome-hint>
        Assista ao vídeo completo para liberar o acesso à plataforma.
      </p>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.classList.add(BODY_FLAG);
  activeOverlay = overlay;

  // Captura teclas antes de chegarem à aplicação enquanto o overlay existe.
  document.addEventListener('keydown', blockKeydown, true);

  loadYouTubeAPI()
    .then((YT) => {
      if (!activeOverlay) return;
      ytPlayer = new YT.Player('bc-welcome-player', {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onStateChange: (e) => {
            // 0 === YT.PlayerState.ENDED
            if (e.data === 0) teardown(user, { markWatched: true });
          },
        },
      });
    })
    .catch(() => {
      // API indisponível → libera o acesso sem travar o onboarding.
      teardown(user, { markWatched: false });
    });
}
