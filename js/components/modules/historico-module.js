import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';

const TIPO_CONFIG = {
  video: { icon: 'play-circle', label: 'Vídeo assistido', color: 'var(--primary)' },
  documento: { icon: 'file-text', label: 'Documento lido', color: '#3b82f6' },
  instrucao_escrita: { icon: 'book-open', label: 'Instrução lida', color: '#3b82f6' },
  avaliacao: { icon: 'clipboard-check', label: 'Avaliação', color: '#10b981' },
  feedback: { icon: 'message-square', label: 'Feedback recebido', color: '#8b5cf6' },
};

export function getHistoricoModuleMarkup(card, moduleData, ui) {
  return `
    <div class="module-shell historico-shell" data-module-shell>
      <div class="module-shell-header">
        <div>
          <p class="module-eyebrow">DHO</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Consulte o percurso de um colaborador — vídeos assistidos, documentos lidos, avaliações e feedbacks.</p>
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

        ${ui.searchResults?.length ? renderUserResults(ui) : ''}
      </div>

      ${renderHistoricoContent(ui)}
    </div>
  `;
}

function renderUserResults(ui) {
  return `
    <div class="historico-user-results">
      ${ui.searchResults.map((user) => `
        <button
          type="button"
          class="historico-user-option ${ui.selectedUserId === user.id ? 'is-selected' : ''}"
          data-historico-select-user="${sanitizeAttribute(user.id)}"
        >
          <i data-lucide="user"></i>
          <span>${sanitizeText(user.nome)}</span>
          <small>${sanitizeText(user.id)}</small>
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
        <p>Pesquise um colaborador para ver o histórico de atividades.</p>
      </div>
    `;
  }

  if (ui.loadingHistorico) {
    return `
      <div class="historico-loading">
        <i data-lucide="loader-circle"></i>
        <p>Carregando histórico...</p>
      </div>
    `;
  }

  if (!ui.historico?.length) {
    return `
      <div class="historico-empty">
        <i data-lucide="inbox"></i>
        <p>Nenhuma atividade registrada para <strong>${sanitizeText(ui.selectedUserNome || ui.selectedUserId)}</strong>.</p>
      </div>
    `;
  }

  return `
    <div class="historico-timeline-header">
      <strong>${sanitizeText(ui.selectedUserNome || ui.selectedUserId)}</strong>
      <span class="historico-count">${ui.historico.length} atividade${ui.historico.length !== 1 ? 's' : ''}</span>
    </div>
    <ol class="historico-timeline" aria-label="Linha do tempo de atividades">
      ${ui.historico.map(renderTimelineItem).join('')}
    </ol>
  `;
}

function renderTimelineItem(item) {
  const config = TIPO_CONFIG[item.tipo] || { icon: 'circle-dot', label: item.tipo, color: 'var(--muted)' };
  const date = formatDate(item.concluidoEm);
  const subtitulo = item.subtitulo || '';

  return `
    <li class="historico-item" data-tipo="${sanitizeAttribute(item.tipo)}">
      <div class="historico-item-icon" style="color: ${config.color}; border-color: ${config.color}20;">
        <i data-lucide="${sanitizeAttribute(config.icon)}"></i>
      </div>
      <div class="historico-item-body">
        <span class="historico-item-label">${sanitizeText(config.label)}</span>
        <p class="historico-item-title">${sanitizeText(item.titulo)}</p>
        ${subtitulo ? `<p class="historico-item-sub">${sanitizeText(subtitulo)}</p>` : ''}
        <time class="historico-item-date" datetime="${sanitizeAttribute(item.concluidoEm)}">${sanitizeText(date)}</time>
      </div>
    </li>
  `;
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
