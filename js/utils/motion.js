export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Adiciona uma classe de saída ao elemento, aguarda a animação terminar
 * e executa o callback. Respeita prefers-reduced-motion.
 */
export function animateOut(element, closingClass, fallbackDurationMs, onComplete) {
  if (!element || prefersReducedMotion()) {
    onComplete();
    return;
  }

  element.classList.add(closingClass);

  const fallback = setTimeout(onComplete, fallbackDurationMs);

  element.addEventListener('animationend', () => {
    clearTimeout(fallback);
    onComplete();
  }, { once: true });
}
