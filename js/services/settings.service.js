/**
 * settings.service.js
 * Gerencia preferências do usuário: visibilidade de badges e tema.
 */

const HIDE_BADGES_KEY = 'build.connect.hide-pending-badges';

export function getHidePendingBadges() {
  try { return localStorage.getItem(HIDE_BADGES_KEY) === 'true'; } catch { return false; }
}

export function setHidePendingBadges(value) {
  try { localStorage.setItem(HIDE_BADGES_KEY, String(value)); } catch { /* noop */ }
}

export function applyPendingBadgesSetting() {
  document.body.classList.toggle('hide-pending-badges', getHidePendingBadges());
}
