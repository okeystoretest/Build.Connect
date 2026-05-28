// ── Configuração da aplicação ──────────────────────────────────────────────
// Em produção (Vercel), defina as variáveis de ambiente:
//   VITE_APPS_SCRIPT_URL, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
// Para desenvolvimento local, os valores abaixo são usados como fallback.
// NUNCA commite valores de produção aqui.

export const APPS_SCRIPT_WEB_APP_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APPS_SCRIPT_URL) ||
  'https://script.google.com/macros/s/AKfycbyNBAJy1nrKG1_alpIfa4NBj_VGsF5BgJ9RK4dBHRgTuFoojcZjslQvTKPFWN6WQS5I/exec';

export const SUPABASE_EDGE_FUNCTION_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://mrdrfcclfbncwqyehknx.supabase.co/functions/v1/bc-api';

// Publishable key — projetada para uso client-side (não é secret).
// Mesmo assim, use variável de ambiente em produção.
export const SUPABASE_PUBLISHABLE_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  'sb_publishable_qOJLHHri-wmnwqku9EpQlg_31Aq_PI5';

export const AUTH_STORAGE_KEY = 'build.connect.auth-user';

export const BRIDGE_MESSAGE_TYPES = Object.freeze({
  auth: 'BUILD_CONNECT_AUTH_RESULT',
  users: 'BUILD_CONNECT_USERS_RESULT',
  modules: 'BUILD_CONNECT_MODULE_RESULT',
});

export const BRIDGE_REQUEST_TIMEOUTS = Object.freeze({
  auth: 15000,
  users: 15000,
  modules: 18000,
  adminUsers: 30000,
});

export const BRIDGE_ALLOWED_ORIGINS = Object.freeze([
  'https://script.google.com',
]);

export const GOOGLE_USER_CONTENT_ORIGIN_PATTERN = /https:\/\/[\w.-]*googleusercontent\.com$/;