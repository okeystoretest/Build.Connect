import { ACCESS_KEYS, SECTOR_IDS, USER_ADMIN_SECTOR_OPTIONS, USER_LEVEL_OPTIONS, USER_LEVELS } from '../../../constants/sector.constants.js';
import { MODULE_UI_DEFAULTS, USER_ADMIN_UI_DEFAULTS } from './user-admin.constants.js';

export function getUserAdminUiState(moduleUi) {
  const mergedUi = {
    ...MODULE_UI_DEFAULTS,
    ...USER_ADMIN_UI_DEFAULTS,
    ...(moduleUi || {}),
  };

  const form = {
    ...USER_ADMIN_UI_DEFAULTS.form,
    ...(mergedUi.form || {}),
  };

  return {
    ...mergedUi,
    form: {
      ...form,
      nivel: normalizeUserAdminNivel(form.nivel),
      setores: normalizeUserAdminSectors(form.setores),
    },
    searchResults: Array.isArray(mergedUi.searchResults) ? mergedUi.searchResults : [],
  };
}

export function normalizeUserAdminNivel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const valid = new Set(USER_LEVEL_OPTIONS.map((o) => o.id));
  if (valid.has(normalized)) return normalized;
  if (normalized === 'user') return USER_LEVELS.colaborador;
  if (normalized === 'admin') return USER_LEVELS.admin;
  return USER_LEVELS.colaborador;
}

export function normalizeUserAdminSectors(sectors) {
  const values = Array.isArray(sectors) ? sectors : String(sectors || '').split(/[,;|]+/);
  const allowedIds = new Set(USER_ADMIN_SECTOR_OPTIONS.map((option) => option.id));
  const normalized = values
    .map((value) => String(value || '').trim())
    .filter((value) => allowedIds.has(value));

  if (normalized.includes(ACCESS_KEYS.all)) {
    return [ACCESS_KEYS.all];
  }

  return [...new Set(normalized.length ? normalized : [SECTOR_IDS.dho])];
}

export function readUserAdminFormData(rootElement) {
  const id = rootElement.querySelector('[data-user-admin-field="id"]')?.value || '';
  const nome = rootElement.querySelector('[data-user-admin-field="nome"]')?.value || '';
  const nivel = rootElement.querySelector('[data-user-admin-field="nivel"]')?.value || '';
  const senha = rootElement.querySelector('[data-user-admin-field="senha"]')?.value || '';
  const setores = [...rootElement.querySelectorAll('[data-user-admin-sector]:checked')].map((input) => input.value);

  return {
    id: id.trim(),
    nome: nome.trim(),
    nivel: normalizeUserAdminNivel(nivel),
    senha: senha,
    setores: normalizeUserAdminSectors(setores),
  };
}

export function readUserAdminSearchQuery(rootElement) {
  return String(rootElement.querySelector('[data-user-admin-search-query]')?.value || '').trim();
}

