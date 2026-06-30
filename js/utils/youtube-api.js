// ── YouTube IFrame API (utilitário compartilhado) ───────────────────────────
// Extraído de video-module.js para reuso (ex.: onboarding de boas-vindas).
// Mantém o comportamento original: carrega o script uma única vez e resolve
// quando window.YT estiver disponível.

export function loadYouTubeAPI() {
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

export function extractVideoId(embedUrl) {
  const match = String(embedUrl || '').match(/youtube\.com\/embed\/([^?&/]+)/);
  return match ? match[1] : null;
}
