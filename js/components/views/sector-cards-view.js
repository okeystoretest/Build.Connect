import {
  getCardsForSector,
  getSectorBreadcrumb,
  isDhoSector,
} from '../../services/navigation.service.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { refreshLucideIcons } from '../../services/icons.service.js';

const CONTENT_CARD_IDS = ['documentos', 'instrucoes-escritas', 'instrucoes-video'];
const CONTENT_CARD_LABELS = {
  'documentos':          'Documentos',
  'instrucoes-escritas': 'Instruções',
  'instrucoes-video':    'Vídeos',
};

export function getSectorCardsViewMarkup(sector, stageState, getModuleStageMarkup, authenticatedUser = null) {
  if (stageState.selectedModuleId) {
    return getModulePageViewMarkup(sector, stageState, getModuleStageMarkup, authenticatedUser);
  }

  const breadcrumb = getSectorBreadcrumb(sector);
  const cards      = getCardsForSector(sector.id, authenticatedUser);
  const cardsLabel = isDhoSector(sector.id) ? 'Cards do setor DHO' : 'Cards padrão do setor';
  const cardAlerts = stageState.cardAlerts || {};
  const cardLocks  = stageState.cardLocks  || {};

  if (stageState.isAlertsLoading) {
    return `
      <section class="content-panel" aria-labelledby="content-title" data-view-panel data-sector-loading>
        <div class="content-header">
          <div>
            <p class="eyebrow reveal-item" data-reveal>Setor selecionado</p>
            <h1 id="content-title" class="reveal-item" data-reveal>${sanitizeText(breadcrumb)}</h1>
            <p class="content-description reveal-item" data-reveal>${sanitizeText(sector.description)}</p>
          </div>
        </div>
        <div class="sector-cards-loading" role="status" aria-live="polite" aria-label="Carregando conteúdo do setor ${sanitizeAttribute(breadcrumb)}…">
          <div class="sector-cards-loading-inner">
            <svg class="sector-loading-spinner" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle class="sector-loading-track" cx="22" cy="22" r="18" fill="none" stroke-width="3"/>
              <circle class="sector-loading-arc" cx="22" cy="22" r="18" fill="none" stroke-width="3"
                stroke-linecap="round" stroke-dasharray="85 200" stroke-dashoffset="0"/>
            </svg>
            <span class="sector-cards-loading-label">Carregando informações do setor…</span>
          </div>
          <div class="sector-cards-skeleton" aria-hidden="true">
            ${cards.map(() => '<div class="sector-card-skeleton"></div>').join('')}
          </div>
        </div>
      </section>
    `;
  }

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
        ${cards.map((card) => renderFeatureCard(
          card, breadcrumb,
          stageState.selectedModuleId,
          cardAlerts[card.id] || null,
          cardLocks[card.id]  || null,
        )).join('')}
      </div>
      ${_renderProgressBar(cardAlerts)}
    </section>
  `;
}

function getModulePageViewMarkup(sector, stageState, getModuleStageMarkup, authenticatedUser) {
  const breadcrumb        = getSectorBreadcrumb(sector);
  const selectedCard      = getCardsForSector(sector.id, authenticatedUser).find((c) => c.id === stageState.selectedModuleId);
  const moduleTitle       = selectedCard?.title || 'Módulo';
  const moduleDescription = selectedCard
    ? selectedCard.getDescription(breadcrumb)
    : `Conteúdo do setor ${breadcrumb}.`;

  return `
    <section class="content-panel module-page-panel" aria-labelledby="content-title" data-view-panel>
      <div class="module-page-header reveal-item" data-reveal>
        <button type="button" class="module-back-button" data-module-back
          aria-label="Voltar para os cards do setor ${sanitizeAttribute(breadcrumb)}">
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
      <section class="module-page-body module-stage reveal-item" data-reveal aria-live="polite"
        data-module-stage data-sector-id="${sanitizeAttribute(sector.id)}">
        ${getModuleStageMarkup(sector, stageState)}
      </section>
    </section>
  `;
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function _renderProgressBar(cardAlerts) {
  const hasData = CONTENT_CARD_IDS.some((id) => cardAlerts[id] != null);
  if (!hasData) return '';

  const completed  = CONTENT_CARD_IDS.filter((id) => cardAlerts[id]?.type === 'complete').length;
  const total      = CONTENT_CARD_IDS.length;
  const percent    = Math.round((completed / total) * 100);
  const isAllDone  = completed === total;

  return `
    <div class="sector-progress" aria-label="Progresso de consumo de conteúdo do setor" data-sector-progress>
      <div class="sector-progress-header">
        <span class="sector-progress-label">
          <i data-lucide="${isAllDone ? 'check-circle-2' : 'book-open'}"></i>
          Progresso do conteúdo
        </span>
        <span class="sector-progress-stat">${completed}/${total} módulos concluídos · ${percent}%</span>
      </div>
      <div class="sector-progress-track" role="progressbar"
        aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"
        aria-label="${percent}% do conteúdo concluído">
        <div class="sector-progress-fill ${isAllDone ? 'is-complete' : ''}"
          style="width:${percent}%"></div>
      </div>
      <div class="sector-progress-pills">
        ${CONTENT_CARD_IDS.map((id) => {
          const alert  = cardAlerts[id];
          const status = alert?.type || 'not-started';
          const icon   = status === 'complete'    ? 'check-circle-2'
                       : status === 'in-progress' ? 'loader'
                       : 'circle-dashed';
          return `
            <span class="sector-progress-pill sector-progress-pill--${status}">
              <i data-lucide="${icon}"></i>
              ${sanitizeText(CONTENT_CARD_LABELS[id] || id)}
            </span>`;
        }).join('')}
      </div>
    </div>
  `;
}

// ── Card pill ────────────────────────────────────────────────────────────────

function _renderCardPill(alert) {
  if (!alert) return '';

  if (alert.type === 'complete') {
    return `<span class="fc-status-pill fc-status-pill--complete" aria-label="Concluído">
      <i data-lucide="check-circle-2"></i><span>Concluído</span>
    </span>`;
  }
  if (alert.type === 'in-progress') {
    return `<span class="fc-status-pill fc-status-pill--in-progress" aria-label="Em andamento">
      <i data-lucide="loader"></i><span>Em andamento</span>
    </span>`;
  }
  if (alert.type === 'not-started') {
    return `<span class="fc-status-pill fc-status-pill--not-started" aria-label="Não iniciado">
      <i data-lucide="circle-dashed"></i><span>Não iniciado</span>
    </span>`;
  }
  const count = alert.count || 0;
  const label = `${count} pendência${count !== 1 ? 's' : ''}`;
  return `<span class="fc-status-pill fc-status-pill--alert" aria-label="${label}">
    <i data-lucide="alert-triangle"></i><span>${label}</span>
  </span>`;
}

function _isNewPillType(alert) {
  return alert && ['not-started', 'in-progress', 'complete'].includes(alert.type);
}

// ── Feature card (normal + Navi locked) ──────────────────────────────────────

function renderFeatureCard(card, sectorName, selectedModuleId, alert = null, lockState = null) {
  const isSelected = selectedModuleId === card.id;
  const isLocked   = Boolean(lockState?.locked);
  const lockReason = lockState?.reason || 'Este conteúdo está bloqueado.';

  if (isLocked) {
    return `
      <button
        type="button"
        class="feature-card feature-card-button reveal-item is-navi-locked"
        data-reveal
        data-module-card
        data-module-id="${sanitizeAttribute(card.id)}"
        aria-pressed="false"
        aria-label="${sanitizeAttribute(card.title)} — Bloqueado"
        data-navi-locked="true"
        data-navi-lock-reason="${sanitizeAttribute(lockReason)}"
      >
        <span class="navi-card-lock-badge" aria-hidden="true">
          <i data-lucide="lock"></i>
        </span>
        <span class="card-icon navi-icon-muted" aria-hidden="true">
          <i data-lucide="${sanitizeAttribute(card.icon)}"></i>
        </span>
        <h2 class="card-title">${sanitizeText(card.title)}</h2>
        <p class="card-description navi-lock-reason">${sanitizeText(lockReason)}</p>
        <div class="feature-card-footer">
          <span class="fc-status-pill fc-status-pill--locked" aria-label="Bloqueado">
            <i data-lucide="lock"></i><span>Bloqueado</span>
          </span>
        </div>
      </button>
    `;
  }

  const pillHtml     = _renderCardPill(alert);
  let   cardModifier = '';
  if (alert && _isNewPillType(alert)) {
    cardModifier = `is-status-${alert.type}`;
  } else if (alert) {
    cardModifier = 'has-alert';
  }

  return `
    <button
      type="button"
      class="feature-card feature-card-button reveal-item ${isSelected ? 'is-selected' : ''} ${cardModifier}"
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
        ${pillHtml}
        <span class="feature-card-hint">${sanitizeText(card.hint)}</span>
      </div>
    </button>
  `;
}
