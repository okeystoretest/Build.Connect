/**
 * historico.dashboard-addons.js
 * Renders:
 *  1. Pending content card (Docs, Instructions, Videos not yet consumed)
 *  2. Kanban integration board with automatic column placement by % consumption
 */

import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';

// ── Kanban column thresholds ─────────────────────────────────────────────────
const KANBAN_COLUMNS = [
  { id: 'boas-vindas',  label: 'Boas-Vindas!',        icon: 'party-popper',   maxPct: 33  },
  { id: 'treinamento',  label: 'Em Treinamento',       icon: 'graduation-cap', minPct: 34, maxPct: 66 },
  { id: 'atividade',    label: 'Em Atividade',         icon: 'briefcase',      minPct: 67, maxPct: 99 },
  { id: 'concluida',   label: 'Integração Concluída', icon: 'award',           minPct: 100 },
];

/**
 * Determines which Kanban column a user belongs to based on consumption %.
 * @param {number} pct  integer 0–100
 * @returns {object}  column config object
 */
function getKanbanColumn(pct) {
  if (pct >= 100) return KANBAN_COLUMNS[3];
  if (pct >= 67)  return KANBAN_COLUMNS[2];
  if (pct >= 34)  return KANBAN_COLUMNS[1];
  return KANBAN_COLUMNS[0];
}

// ── Category config — ordem e metadados das 3 categorias de conteúdo ─────────
const PENDING_CATEGORIES = [
  {
    key:   'docs',
    label: 'Documentos',
    icon:  'file-text',
    color: '#3B82F6',
    /** @param {object} content @returns {Array} */
    getItems: (content) => content.docs || [],
    /** @param {object} item @param {Set<string>} refIds @returns {boolean} */
    isDone: (item, refIds) => {
      const refId = item.previewUrl ? (`doc-${item.previewUrl}`).slice(0, 128) : null;
      return !!(refId && refIds.has(refId));
    },
    getName: (item) => item.title || item.name || 'Documento sem título',
  },
  {
    key:   'instrucoes',
    label: 'Instruções Escritas',
    icon:  'book-open',
    color: '#6366F1',
    getItems: (content) => content.instrucoes || [],
    isDone: (item, refIds) => {
      const refId = item.previewUrl ? (`doc-${item.previewUrl}`).slice(0, 128) : null;
      return !!(refId && refIds.has(refId));
    },
    getName: (item) => item.title || item.name || 'Instrução sem título',
  },
  {
    key:   'videos',
    label: 'Instruções em Vídeo',
    icon:  'play-circle',
    color: '#D4A257',
    getItems: (content) => content.videos || [],
    isDone: (item, refIds) => {
      const vid   = _extractVideoId(item.embedUrl || '');
      const refId = vid ? `video-${vid}` : null;
      return !!(refId && refIds.has(refId));
    },
    getName: (item) => item.title || item.name || 'Vídeo sem título',
  },
];

// ── Pending Content Card ──────────────────────────────────────────────────────

/**
 * Renders the compact pending content card with items grouped by category.
 * Shows only unconsumed items, divided into three sections:
 * Documentos · Instruções Escritas · Instruções em Vídeo.
 * Each item displays only: category icon + file name (spec-compliant).
 *
 * @param {object}      content  contentData from historico state
 * @param {Set<string>} refIds   set of consumed reference IDs
 * @returns {string}  HTML markup
 */
export function renderPendingContentCard(content, refIds) {
  if (!content) return '';

  // Resolve each category: compute pending item names
  const resolvedCategories = PENDING_CATEGORIES.map((cat) => {
    const rawItems = cat.getItems(content);
    const pending  = rawItems
      .filter((item) => !cat.isDone(item, refIds))
      .map((item)   => sanitizeText(cat.getName(item)));
    return { ...cat, pending, total: rawItems.length };
  });

  const totalAll     = resolvedCategories.reduce((sum, c) => sum + c.total,   0);
  const totalPending = resolvedCategories.reduce((sum, c) => sum + c.pending.length, 0);

  if (!totalAll) return '';

  // All consumed — show positive empty state
  if (!totalPending) {
    return `
      <div class="hd-pending-card hd-pending-card--empty">
        <div class="hd-pending-card-head">
          <i data-lucide="check-circle-2" style="color:#10B981"></i>
          <span>Sem pendências de consumo</span>
        </div>
      </div>
    `;
  }

  // Only render sections that have at least one pending item
  const activeSections = resolvedCategories.filter((c) => c.pending.length > 0);

  return `
    <div class="hd-pending-card">
      <div class="hd-pending-card-head">
        <i data-lucide="clock-alert"></i>
        <span>Itens Pendentes de Consumo</span>
        <span class="hd-pending-badge">${totalPending} pendente${totalPending !== 1 ? 's' : ''}</span>
      </div>
      <div class="hd-pending-categories">
        ${activeSections.map((cat) => `
          <div class="hd-pending-category">
            <div class="hd-pending-cat-header">
              <i data-lucide="${sanitizeAttribute(cat.icon)}" style="color:${cat.color}" aria-hidden="true"></i>
              <span class="hd-pending-cat-label">${sanitizeText(cat.label)}</span>
              <span class="hd-pending-cat-count" style="background:${cat.color}22;color:${cat.color}">
                ${cat.pending.length}
              </span>
            </div>
            <ul class="hd-pending-list" aria-label="Pendentes em ${sanitizeAttribute(cat.label)}">
              ${cat.pending.map((name) => `
                <li class="hd-pending-item">
                  <i data-lucide="${sanitizeAttribute(cat.icon)}" class="hd-pending-item-icon" style="color:${cat.color}" aria-hidden="true"></i>
                  <span class="hd-pending-item-name">${name}</span>
                  <span class="hd-item-pending-dot" aria-label="Pendente"></span>
                </li>
              `).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ── Kanban Integration Board ──────────────────────────────────────────────────

/**
 * Renders the Kanban board for a single user.
 * Places the user card in the correct column based on their consumption %.
 *
 * @param {string}  userName
 * @param {string}  userSetor
 * @param {number}  pct          overall consumption percentage (0–100)
 * @param {number}  consumed     total consumed items
 * @param {number}  total        total available items
 * @returns {string}  HTML markup
 */
export function renderKanbanBoard(userName, userSetor, pct, consumed, total) {
  const activeColumn = getKanbanColumn(pct);

  return `
    <div class="hd-kanban" role="region" aria-label="Kanban de integração">
      <div class="hd-kanban-head">
        <i data-lucide="layout-kanban"></i>
        <span>Kanban de Integração</span>
      </div>
      <div class="hd-kanban-columns">
        ${KANBAN_COLUMNS.map((col) => {
          const isActive = col.id === activeColumn.id;
          return `
            <div class="hd-kanban-col${isActive ? ' is-active' : ''}" data-kanban-col="${sanitizeAttribute(col.id)}">
              <div class="hd-kanban-col-head">
                <i data-lucide="${sanitizeAttribute(col.icon)}"></i>
                <span>${sanitizeText(col.label)}</span>
              </div>
              ${isActive ? renderKanbanCard(userName, userSetor, pct, consumed, total, col) : '<div class="hd-kanban-empty-col"></div>'}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Renders the user card inside its Kanban column.
 */
function renderKanbanCard(userName, userSetor, pct, consumed, total, col) {
  const colorMap = {
    'boas-vindas': '#D4A257',
    'treinamento': '#3B82F6',
    'atividade':   '#8B5CF6',
    'concluida':  '#10B981',
  };
  const color = colorMap[col.id] || 'var(--primary)';

  return `
    <div class="hd-kanban-card" style="border-left-color:${color}" aria-label="Cartão de integração de ${sanitizeAttribute(userName)}">
      <div class="hd-kanban-card-header">
        <i data-lucide="user-circle" style="color:${color}"></i>
        <div class="hd-kanban-card-info">
          <strong class="hd-kanban-card-name">${sanitizeText(userName)}</strong>
          ${userSetor ? `<span class="hd-kanban-card-setor">${sanitizeText(userSetor)}</span>` : ''}
        </div>
      </div>
      <div class="hd-kanban-card-progress">
        <div class="hd-kanban-progress-track">
          <div class="hd-kanban-progress-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="hd-kanban-progress-label" style="color:${color}">${pct}%</span>
      </div>
      <span class="hd-kanban-card-counts">${consumed}/${total} conteúdos consumidos</span>
    </div>
  `;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _extractVideoId(embedUrl) {
  const match = String(embedUrl || '').match(/youtube\.com\/embed\/([^?&/]+)/);
  return match ? match[1] : null;
}
