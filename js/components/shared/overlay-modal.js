import { refreshLucideIcons } from '../../services/icons.service.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { animateOut } from '../../utils/motion.js';

let activeOverlayModal = null;
let activeEscapeHandler = null;

const ALLOWED_FRAME_ORIGINS = [
  'https://www.youtube.com',
  'https://www.youtube-nocookie.com',
  'https://docs.google.com',
  'https://drive.google.com',
];

function isSafeFrameUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_FRAME_ORIGINS.some((origin) => parsed.origin === origin);
  } catch {
    return false;
  }
}

export function openOverlayModal({ title, frameUrl, closeLabel, modalClassName, frameWrapClassName, frameClassName }) {
  if (!isSafeFrameUrl(frameUrl)) {
    console.error('openOverlayModal: URL de origem não permitida.', frameUrl);
    return;
  }

  closeActiveOverlayModal();

  const overlay = document.createElement('div');
  overlay.className = 'video-modal-backdrop';
  overlay.innerHTML = `
    <div class="${sanitizeAttribute(modalClassName)}" role="dialog" aria-modal="true" aria-label="${sanitizeText(title)}">
      <div class="video-modal-head">
        <strong class="video-modal-title">${sanitizeText(title)}</strong>
        <button type="button" class="video-modal-close" aria-label="${sanitizeAttribute(closeLabel)}">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="${sanitizeAttribute(frameWrapClassName)}">
        <iframe
          class="${sanitizeAttribute(frameClassName)}"
          src="${sanitizeAttribute(frameUrl)}"
          title="${sanitizeAttribute(title)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  `;

  const closeButton = overlay.querySelector('.video-modal-close');
  const dialog = overlay.querySelector('[role="dialog"]');

  function handleBackdropClick(event) {
    if (!dialog.contains(event.target)) {
      closeActiveOverlayModal();
    }
  }

  activeEscapeHandler = (event) => {
    if (event.key === 'Escape') {
      closeActiveOverlayModal();
    }
  };

  closeButton?.addEventListener('click', closeActiveOverlayModal);
  overlay.addEventListener('click', handleBackdropClick);
  document.addEventListener('keydown', activeEscapeHandler);
  document.body.appendChild(overlay);
  document.body.classList.add('has-video-modal');
  refreshLucideIcons(overlay);
  activeOverlayModal = overlay;
}

export function closeActiveOverlayModal() {
  if (activeEscapeHandler) {
    document.removeEventListener('keydown', activeEscapeHandler);
    activeEscapeHandler = null;
  }

  if (!activeOverlayModal) {
    document.body.classList.remove('has-video-modal');
    return;
  }

  const target = activeOverlayModal;
  activeOverlayModal = null;

  animateOut(target, 'is-closing', 200, () => {
    target.remove();
    document.body.classList.remove('has-video-modal');
  });
}
