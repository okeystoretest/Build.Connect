import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';

export function getModuleLoadingMarkup(card) {
  return `
    <div class="module-shell" data-module-shell>
      <div class="module-shell-header">
        <div>
          <p class="module-eyebrow">Carregando conteúdo</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Estamos buscando os itens deste módulo.</p>
        </div>
      </div>

      <div class="module-items-grid" aria-hidden="true">
        ${Array.from({ length: card.id === 'instrucoes-video' ? 4 : 6 }, (_, index) => getSkeletonCardMarkup(index)).join('')}
      </div>
    </div>
  `;
}

export function getModuleErrorMarkup(card, message) {
  return `
    <div class="module-shell" data-module-shell>
      <div class="module-shell-header">
        <div>
          <p class="module-eyebrow">Falha ao carregar</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">${sanitizeText(message)}</p>
        </div>
      </div>

      <div class="empty-state is-compact">
        <span class="empty-state-icon" aria-hidden="true">
          <i data-lucide="wifi-off"></i>
        </span>
        <div>
          <h3 class="card-title">Não foi possível concluir a consulta</h3>
          <p class="card-description">Verifique a configuração da integração e tente novamente.</p>
        </div>
        <button type="button" class="module-action-button" data-module-retry data-module-id="${sanitizeAttribute(card.id)}">
          <i data-lucide="refresh-cw"></i>
          <span>Tentar novamente</span>
        </button>
      </div>
    </div>
  `;
}

export function getInternalModuleMarkup(card) {
  return `
    <div class="module-shell" data-module-shell>
      <div class="module-shell-header">
        <div>
          <p class="module-eyebrow">Fluxo interno</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Ainda não há nada para mostrar.</p>
        </div>
      </div>

      <div class="empty-state is-compact">
        <span class="empty-state-icon" aria-hidden="true">
          <i data-lucide="sparkles"></i>
        </span>
        <div>
          <h3 class="card-title">Módulo preparado</h3>
          <p class="card-description">Ainda não há conteúdo disponível para exibição.</p>
        </div>
      </div>
    </div>
  `;
}

export function getModuleEmptyMarkup(card, message) {
  return `
    <div class="module-shell" data-module-shell>
      <div class="module-shell-header">
        <div>
          <p class="module-eyebrow">Sem itens disponíveis</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">${sanitizeText(message)}</p>
        </div>
      </div>

      <div class="empty-state is-compact">
        <span class="empty-state-icon" aria-hidden="true">
          <i data-lucide="folder-search"></i>
        </span>
        <div>
          <h3 class="card-title">Nenhum conteúdo encontrado</h3>
          <p class="card-description">Assim que houver itens configurados para este setor, eles aparecerão aqui automaticamente.</p>
        </div>
      </div>
    </div>
  `;
}

export function getModuleToolbarMarkup(moduleId, moduleUi, totalCount, filteredCount, searchPlaceholder) {
  const sortLabel = moduleUi.sort === 'az' ? 'A-Z' : 'Z-A';

  return `
    <div class="module-toolbar" aria-label="Controles de visualização do módulo">
      <button type="button" class="module-control-button" data-module-sort data-module-id="${sanitizeAttribute(moduleId)}" aria-label="Alternar ordenação alfabética">
        <i data-lucide="arrow-up-down"></i>
        <span>${sortLabel}</span>
      </button>

      <div class="module-view-toggle" role="group" aria-label="Alternar visualização do conteúdo">
        <button type="button" class="module-view-button ${moduleUi.view === 'grid' ? 'is-active' : ''}" data-module-view="grid" aria-pressed="${String(moduleUi.view === 'grid')}">
          <i data-lucide="layout-grid"></i>
          <span class="visually-hidden">Visualização em grade</span>
        </button>
        <button type="button" class="module-view-button ${moduleUi.view === 'list' ? 'is-active' : ''}" data-module-view="list" aria-pressed="${String(moduleUi.view === 'list')}">
          <i data-lucide="list"></i>
          <span class="visually-hidden">Visualização em lista</span>
        </button>
      </div>

      <label class="module-search-shell" aria-label="Pesquisar itens do módulo">
        <i data-lucide="search"></i>
        <input type="search" value="${sanitizeAttribute(moduleUi.query)}" placeholder="${sanitizeAttribute(searchPlaceholder)}" data-module-search autocomplete="off" />
      </label>

      <span class="module-results-count">${filteredCount}/${totalCount}</span>
    </div>
  `;
}

export function getModuleSearchEmptyMarkup() {
  return `
    <div class="empty-state is-compact is-search-empty">
      <span class="empty-state-icon" aria-hidden="true">
        <i data-lucide="search-x"></i>
      </span>
      <div>
        <h3 class="card-title">Nenhum item encontrado</h3>
        <p class="card-description">Ajuste a pesquisa ou altere a ordenação para localizar o conteúdo desejado.</p>
      </div>
    </div>
  `;
}

export function getModuleToolFilterMarkup(filterOptions, activeFilter) {
  return `
    <div class="module-tool-filter-btns" aria-label="Filtrar por ferramenta">
      ${filterOptions.map(opt => `
        <button type="button"
          class="module-tool-filter-btn ${activeFilter === opt ? 'is-active' : ''}"
          data-module-tool-filter="${sanitizeAttribute(opt)}">
          #${sanitizeText(opt)}
        </button>
      `).join('')}
    </div>
  `;
}

function getSkeletonCardMarkup(index) {
  return `
    <article class="module-item-card is-skeleton" data-skeleton-index="${index}">
      <div class="skeleton-line skeleton-line-thumb"></div>
      <div class="skeleton-line skeleton-line-title"></div>
      <div class="skeleton-line skeleton-line-meta"></div>
      <div class="skeleton-actions">
        <div class="skeleton-line skeleton-line-action"></div>
        <div class="skeleton-line skeleton-line-action"></div>
      </div>
    </article>
  `;
}
