// ── Onboarding service ──────────────────────────────────────────────────────
// Controla o marco "vídeo de boas-vindas assistido".
//
// Estratégia à prova de futuro:
//  - Se o backend já enviar o campo no perfil (response.user), ele tem
//    prioridade absoluta.
//  - Enquanto o backend não expuser o campo, usa fallback em localStorage
//    por usuário, e tenta marcar no servidor de forma best-effort.
//
// Quando o backend for atualizado, basta garantir que `welcome_video_assistido`
// venha em response.user e exista a action 'mark-welcome-watched'. Nenhuma
// alteração neste arquivo será necessária.

import { requestApi } from './api.service.js';

// Aceita diferentes nomes possíveis vindos do backend, sem assumir um só.
const BACKEND_FLAG_KEYS = Object.freeze([
  'welcome_video_assistido',
  'welcomeVideoWatched',
  'primeiro_acesso_concluido',
]);

const LOCAL_KEY_PREFIX = 'bc.welcome-watched.';

function localKey(user) {
  return `${LOCAL_KEY_PREFIX}${String(user?.id ?? '')}`;
}

function readBackendFlag(user) {
  if (!user) return false;
  return BACKEND_FLAG_KEYS.some((key) => user[key] === true);
}

function readLocalFlag(user) {
  try {
    return localStorage.getItem(localKey(user)) === '1';
  } catch {
    return false;
  }
}

// true → onboarding NÃO deve rodar.
export function hasWatchedWelcome(user) {
  if (!user?.id) return true; // sem usuário válido, não dispara onboarding
  return readBackendFlag(user) || readLocalFlag(user);
}

// Marca como assistido: grava localmente de imediato e notifica o backend
// de forma best-effort (sem bloquear nem quebrar caso a action não exista).
export function markWelcomeWatched(user) {
  if (!user?.id) return;

  try {
    localStorage.setItem(localKey(user), '1');
  } catch { /* armazenamento indisponível — ignora */ }

  requestApi('mark-welcome-watched', { userId: user.id }).catch(() => {
    /* backend pode ainda não suportar esta action — fallback local cobre */
  });
}
