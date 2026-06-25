/**
 * celebration.js
 * Dispara animação visual de parabenização na tela.
 * Chamado quando o usuário atinge 100% em qualquer etapa ou conteúdo.
 * Suporta enfileiramento (queueCelebration) para disparar apenas ao retornar ao menu.
 */

import { prefersReducedMotion } from './motion.js';

const PARTICLE_COUNT = 90;
const DURATION_MS    = 3200;
const FADEOUT_MS     = 500;
const COLORS = ['#d4a257', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#a78bfa'];

let _activeOverlay = null;
let _pendingCelebration = null;

/**
 * Dispara a animação de parabenização imediatamente.
 * - Respeitado prefers-reduced-motion.
 * - Chamadas concorrentes são ignoradas (apenas 1 ativa por vez).
 */
export function triggerCelebration({ message = 'Parabéns! Conteúdo concluído.' } = {}) {
  if (prefersReducedMotion()) return;
  if (_activeOverlay) return;

  const overlay = document.createElement('div');
  overlay.className  = 'bc-celebration-overlay';
  overlay.setAttribute('aria-live', 'assertive');
  overlay.setAttribute('aria-label', message);
  overlay.innerHTML  = _buildMessageMarkup(message);

  _spawnParticles(overlay);

  document.body.appendChild(overlay);
  _activeOverlay = overlay;

  overlay.getBoundingClientRect();
  overlay.classList.add('bc-celebration-overlay--visible');

  const timer = setTimeout(() => _dismiss(overlay), DURATION_MS);

  overlay.addEventListener('click', () => {
    clearTimeout(timer);
    _dismiss(overlay);
  }, { once: true });
}

/**
 * Enfileira uma celebração para ser disparada na próxima chamada de flushPendingCelebration().
 * Usar quando o progresso foi registrado mas o usuário ainda não retornou ao menu.
 * @param {{ message?: string }} [opts]
 */
export function queueCelebration(opts = {}) {
  _pendingCelebration = {
    message: opts.message || 'Parabéns! Conteúdo concluído.',
  };
}

/**
 * Dispara a celebração enfileirada (se houver) e limpa a fila.
 * Chamar no momento exato em que o usuário retorna ao menu do setor/sub-setor.
 */
export function flushPendingCelebration() {
  if (!_pendingCelebration) return;
  const opts = _pendingCelebration;
  _pendingCelebration = null;
  triggerCelebration(opts);
}

// ── Private helpers ──────────────────────────────────────────────────────────

function _buildMessageMarkup(msg) {
  return `
    <div class="bc-celebration-card">
      <span class="bc-celebration-emoji" aria-hidden="true">🎉</span>
      <p class="bc-celebration-text">${_escapeHtml(msg)}</p>
    </div>`;
}

function _spawnParticles(parent) {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = document.createElement('span');
    p.className = 'bc-confetti';
    const isCircle = Math.random() > 0.45;
    p.style.cssText = [
      `left:${(Math.random() * 110) - 5}vw`,
      `background:${COLORS[Math.floor(Math.random() * COLORS.length)]}`,
      `animation-delay:${(Math.random() * 900).toFixed(0)}ms`,
      `animation-duration:${(1100 + Math.random() * 2000).toFixed(0)}ms`,
      `width:${(5 + Math.random() * 9).toFixed(1)}px`,
      `height:${(5 + Math.random() * 9).toFixed(1)}px`,
      `border-radius:${isCircle ? '50%' : '2px'}`,
      `opacity:${(0.75 + Math.random() * 0.25).toFixed(2)}`,
    ].join(';');
    parent.appendChild(p);
  }
}

function _dismiss(overlay) {
  if (!overlay.isConnected) return;
  overlay.classList.remove('bc-celebration-overlay--visible');
  overlay.classList.add('bc-celebration-overlay--out');
  setTimeout(() => {
    overlay.remove();
    if (_activeOverlay === overlay) _activeOverlay = null;
  }, FADEOUT_MS);
}

function _escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
