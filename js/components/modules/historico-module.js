/**
 * historico-module.js
 * Main entry point for Histórico module markup.
 * Dashboard rendering delegated to historico/historico.dashboard.js.
 */

import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { USER_ADMIN_SECTOR_OPTIONS } from '../../constants/sector.constants.js';
import { renderDashboard } from './historico/historico.dashboard.js';

const TIPO_CONFIG = {
  video:            { icon: 'play-circle',     label: 'Vídeo assistido',   color: '#D4A257' },
  documento:        { icon: 'file-text',       label: 'Documento lido',    color: '#3B82F6' },
  instrucao_escrita:{ icon: 'book-open',       label: 'Instrução lida',    color: '#3B82F6' },
  avaliacao:        { icon: 'clipboard-check', label: 'Avaliação',         color: '#10B981' },
  feedback:         { icon: 'message-square',  label: 'Feedback recebido', color: '#8B5CF6' },
};

export function getHistoricoModuleMarkup(card, moduleData, ui) {
  return `
    <div class="module-shell historico-shell" data-module-shell>
      <div class="module-shell-header">
        <div>
          <p class="module-eyebrow">DHO</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Consulte o percurso e o acompanhamento de conteúdo de um colaborador.</p>
        </div>
      </div>

      <div class="historico-search-row">
        <div class="historico-search-wrap">
          <input
            class="historico-search-input"
            type="text"
            placeholder="Pesquisar colaborador por ID ou nome..."
            value="${sanitizeAttribute(ui.query || '')}"
            data-historico-search
            autocomplete="off"
          />
          <button type="button" class="module-action-button" data-historico-search-btn>
            <i data-lucide="search"></i>
            <span>Buscar</span>
          </button>
        </div>

        <div class="historico-sector-btns">
          ${USER_ADMIN_SECTOR_OPTIONS.map(s => `
            <button
              type="button"
              class="historico-sector-btn ${ui.selectedSectorId === s.id ? 'is-active' : ''}"
              data-historico-sector="${sanitizeAttribute(s.id)}"
            >
              ${sanitizeText(s.label)}
            </button>
          `).join('')}
        </div>

        ${ui.searchResults?.length ? renderUserResults(ui) : ''}
      </div>

      ${renderHistoricoContent(ui)}
    </div>
  `;
}

function renderUserResults(ui) {
  return `
    <div class="historico-user-pills">
      ${ui.searchResults.map((user) => `
        <button
          type="button"
          class="historico-user-pill ${ui.selectedUserId === user.id ? 'is-selected' : ''}"
          data-historico-select-user="${sanitizeAttribute(user.id)}"
        >
          <span class="historico-pill-name">${sanitizeText(user.nome)}</span>
          <span class="historico-pill-id">${sanitizeText(user.id)}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderHistoricoContent(ui) {
  if (!ui.selectedUserId) {
    return `
      <div class="historico-empty">
        <i data-lucide="user-search"></i>
        <p>Pesquise um colaborador ou selecione um setor para dar início ao acompanhamento.</p>
      </div>
    `;
  }

  if (ui.loadingHistorico) {
    return `
      <div class="historico-loading">
        <i data-lucide="loader-circle"></i>
        <p>Carregando dados...</p>
      </div>
    `;
  }

  const activeTab = ui.activeTab || 'timeline';

  return `
    <div class="historico-tabs">
      <button type="button"
        class="historico-tab ${activeTab === 'timeline' ? 'is-active' : ''}"
        data-historico-tab="timeline">
        <i data-lucide="clock"></i>
        <span>Linha do Tempo</span>
      </button>
      <button type="button"
        class="historico-tab ${activeTab === 'dashboard' ? 'is-active' : ''}"
        data-historico-tab="dashboard">
        <i data-lucide="layout-dashboard"></i>
        <span>Dashboard de Acompanhamento</span>
      </button>
    </div>

    ${activeTab === 'dashboard'
      ? renderDashboard(ui)
      : renderTimeline(ui)
    }
  `;
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function renderTimeline(ui) {
  const historico    = ui.historico || [];
  const selectedTool = ui.selectedToolId || '';

  if (!historico.length) {
    return `
      <div class="historico-empty">
        <i data-lucide="inbox"></i>
        <p>Nenhuma atividade registrada para <strong>${sanitizeText(ui.selectedUserNome || ui.selectedUserId)}</strong>.</p>
      </div>
    `;
  }

  const toolsMap = new Map();
  historico.forEach(item => {
    const match = String(item.titulo || '').match(/#([\w\-\u00C0-\u024F ]+)$/);
    if (match) { const t = match[1].trim(); if (t) toolsMap.set(t.toLowerCase(), t); }
  });
  const tools = [...toolsMap.entries()];

  const filtered = selectedTool
    ? historico.filter(item => {
        const match = String(item.titulo || '').match(/#([\w\-\u00C0-\u024F ]+)$/);
        return match && match[1].trim().toLowerCase() === selectedTool;
      })
    : historico;

  return `
    <div class="historico-timeline-header">
      <strong>${sanitizeText(ui.selectedUserNome || ui.selectedUserId)}</strong>
      <span class="historico-count">${filtered.length} atividade${filtered.length !== 1 ? 's' : ''}</span>
    </div>

    ${tools.length ? `
      <div class="historico-tool-btns">
        ${tools.map(([id, label]) =>
          `<button type="button"
            class="historico-sector-btn ${selectedTool === id ? 'is-active' : ''}"
            data-historico-tool="${sanitizeAttribute(id)}">
            #${sanitizeText(label)}
          </button>`
        ).join('')}
      </div>
    ` : ''}

    <ol class="historico-timeline" aria-label="Linha do tempo de atividades">
      ${filtered.length ? filtered.map(renderTimelineItem).join('') : `
        <li class="historico-empty" style="list-style:none;padding:20px 0">
          <p>Nenhuma atividade com #${sanitizeText(selectedTool)}.</p>
        </li>`}
    </ol>
  `;
}

function renderTimelineItem(item) {
  const config = TIPO_CONFIG[item.tipo] || { icon: 'circle-dot', label: item.tipo, color: 'var(--muted)' };
  const date   = formatDate(item.concluidoEm);

  return `
    <li class="historico-item" data-tipo="${sanitizeAttribute(item.tipo)}">
      <div class="historico-item-icon" style="color:${config.color};border-color:${config.color}30;">
        <i data-lucide="${sanitizeAttribute(config.icon)}"></i>
      </div>
      <div class="historico-item-body">
        <span class="historico-item-label">${sanitizeText(config.label)}</span>
        <p class="historico-item-title">${sanitizeText(item.titulo)}</p>
        ${item.subtitulo ? `<p class="historico-item-sub">${sanitizeText(item.subtitulo)}</p>` : ''}
        <time class="historico-item-date" datetime="${sanitizeAttribute(item.concluidoEm)}">${sanitizeText(date)}</time>
      </div>
    </li>
  `;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch { return iso; }
}
