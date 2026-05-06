import {
  getCardsForSector,
  getSectorBreadcrumb,
  isDhoSector,
} from '../../services/navigation.service.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';

export function getSectorCardsViewMarkup(sector, stageState, getModuleStageMarkup, authenticatedUser = null) {
  if (stageState.selectedModuleId) {
    return getModulePageViewMarkup(sector, stageState, getModuleStageMarkup, authenticatedUser);
  }

  const breadcrumb = getSectorBreadcrumb(sector);
  const cards = getCardsForSector(sector.id, authenticatedUser);
  const cardsLabel = isDhoSector(sector.id) ? 'Cards do setor DHO' : 'Cards padrão do setor';

  return `
    <section class="content-panel" aria-labelledby="content-title" data-view-panel>
      <div class="content-header">
        <div>
          <p class="eyebrow reveal-item" data-reveal>Setor selecionado</p>
          <h1 id="content-title" class="reveal-item" data-reveal>${sanitizeText(breadcrumb)}</h1>
          <p class="content-description reveal-item" data-reveal>${sanitizeText(sector.description)}</p>
        </div>
      </div>

      <div class="cards-grid" aria-label="${sanitizeAttribute(cardsLabel)}">
        ${cards.map((card) => renderFeatureCard(card, breadcrumb, stageState.selectedModuleId)).join('')}
      </div>
    </section>
  `;
}

function getModulePageViewMarkup(sector, stageState, getModuleStageMarkup, authenticatedUser) {
  const breadcrumb = getSectorBreadcrumb(sector);
  const selectedCard = getCardsForSector(sector.id, authenticatedUser).find((card) => card.id === stageState.selectedModuleId);
  const moduleTitle = selectedCard?.title || 'Módulo';
  const moduleDescription = selectedCard
    ? selectedCard.getDescription(breadcrumb)
    : `Conteúdo do setor ${breadcrumb}.`;

  return `
    <section class="content-panel module-page-panel" aria-labelledby="content-title" data-view-panel>
      <div class="module-page-header reveal-item" data-reveal>
        <button type="button" class="module-back-button" data-module-back aria-label="Voltar para os cards do setor ${sanitizeAttribute(breadcrumb)}">
          <i data-lucide="arrow-left"></i>
          <span>Voltar</span>
        </button>

        <div class="module-page-copy">
          <p class="eyebrow">Conteúdo do módulo</p>
          <h1 id="content-title">${sanitizeText(moduleTitle)}</h1>
          <p class="content-description">${sanitizeText(moduleDescription)}</p>
          <span class="module-page-breadcrumb">${sanitizeText(breadcrumb)}</span>
        </div>
      </div>

      <section class="module-page-body module-stage reveal-item" data-reveal aria-live="polite" data-module-stage data-sector-id="${sanitizeAttribute(sector.id)}">
        ${getModuleStageMarkup(sector, stageState)}
      </section>
    </section>
  `;
}

function renderFeatureCard(card, sectorName, selectedModuleId) {
  const isSelected = selectedModuleId === card.id;

  return `
    <button
      type="button"
      class="feature-card feature-card-button reveal-item ${isSelected ? 'is-selected' : ''}"
      data-reveal
      data-module-card
      data-module-id="${sanitizeAttribute(card.id)}"
      aria-pressed="${String(isSelected)}"
      aria-label="Abrir módulo ${sanitizeAttribute(card.title)} do setor ${sanitizeAttribute(sectorName)}"
    >
      <span class="card-icon" aria-hidden="true">
        <i data-lucide="${sanitizeAttribute(card.icon)}"></i>
      </span>
      <h2 class="card-title">${sanitizeText(card.title)}</h2>
      <p class="card-description">${sanitizeText(card.getDescription(sectorName))}</p>
      <div class="feature-card-footer">
        <span class="feature-card-status">Padrão</span>
        <span class="feature-card-hint">${sanitizeText(card.hint)}</span>
      </div>
    </button>
  `;
}
