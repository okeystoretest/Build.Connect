import { prefersReducedMotion } from '../../utils/motion.js';

let revealObserver = null;

export function activateViewTransition(rootElement) {
  const panel = rootElement.querySelector('[data-view-panel]');

  if (!panel) {
    return;
  }

  if (prefersReducedMotion()) {
    panel.classList.add('is-view-active');
    return;
  }

  panel.classList.add('is-view-entering');

  requestAnimationFrame(() => {
    panel.classList.add('is-view-active');
    panel.classList.remove('is-view-entering');
  });
}

export function activateRevealAnimations(rootElement) {
  const revealItems = [...rootElement.querySelectorAll('[data-reveal]')];

  revealItems.forEach((item, index) => {
    item.style.setProperty('--reveal-index', String(index));
  });

  if (!revealItems.length) {
    return;
  }

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('is-visible');
        revealObserver?.unobserve(entry.target);
      });
    },
    {
      threshold: 0.14,
      rootMargin: '0px 0px -10% 0px',
    },
  );

  revealItems.forEach((item) => revealObserver?.observe(item));
}

export function disconnectRevealObserver() {
  if (!revealObserver) {
    return;
  }

  revealObserver.disconnect();
  revealObserver = null;
}
