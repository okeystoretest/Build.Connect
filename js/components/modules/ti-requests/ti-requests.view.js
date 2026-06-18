/**
 * ti-requests.view.js
 * Entry point — module header and body routing.
 * Delegates heavy rendering to:
 *   • ti-requests.view.kanban.js  (kanban, cards, conclusion)
 *   • ti-requests.view.charts.js  (dashboard, full-dashboard, charts)
 */

import { sanitizeText } from '../../../utils/sanitize.js';
import { TI_REQUESTS_UI_DEFAULTS } from './ti-requests.constants.js';
import { USER_LEVELS } from '../../../constants/sector.constants.js';
import { MODULE_IDS } from '../../../constants/module.constants.js';
import { renderKanban, buildKanbanCardDetailHTML } from './ti-requests.view.kanban.js';
import { renderDashboard, renderFullDashboard } from './ti-requests.view.charts.js';

export { buildKanbanCardDetailHTML } from './ti-requests.view.kanban.js';

// ── Helpers ───────────────────────────────────────────────────────────────

function _isMotoristaModule(card) {
  return card?.id === MODULE_IDS.motorRequests;
}

// ── Module entry ──────────────────────────────────────────────────────────

export function getTiRequestsModuleMarkup(card, moduleData, moduleUi) {
  const ui          = { ...TI_REQUESTS_UI_DEFAULTS, ...(moduleUi || {}) };
  const respondent  = moduleData?.respondent || null;
  const isMotorista = _isMotoristaModule(card);

  if (ui.dashboardFullOpen && ui.loadStatus === 'success') {
    return renderFullDashboard(ui, isMotorista);
  }

  const eyebrow     = isMotorista ? 'Motorista · Requisições' : 'Retaguarda · TI';
  const description = isMotorista
    ? 'Gerencie as requisições de serviço, entregas, coletas e demandas operacionais do Motorista.'
    : 'Gerencie chamados técnicos, acompanhe atribuições e visualize indicadores de desempenho do suporte.';

  return `
    <div class="module-shell ti-requests-shell" data-module-shell>
      <div class="module-shell-header ti-requests-hero">
        <div>
          <p class="module-eyebrow">${sanitizeText(eyebrow)}</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">${sanitizeText(description)}</p>
        </div>
        <div class="ti-header-actions">
          ${!isMotorista ? `
          <a href="./dashboard-ti.html" target="_blank" rel="noopener noreferrer" class="module-action-button ti-full-dashboard-btn">
            <i data-lucide="maximize-2"></i>
            <span>Tela cheia</span>
          </a>` : ''}
          <div class="module-source-pill" aria-label="Sincronizado com a planilha">
            <i data-lucide="shield-check"></i>
            <span>Banco de dados sincronizado</span>
          </div>
        </div>
      </div>
      ${renderBody(ui, respondent, isMotorista)}
    </div>
  `;
}

// ── Body router ───────────────────────────────────────────────────────────

function renderBody(ui, respondent, isMotorista = false) {
  if (ui.loadStatus === 'idle' || ui.loadStatus === 'loading') {
    return `<div class="ti-requests-loading"><div class="ti-loading-spinner"><i data-lucide="loader-circle"></i></div><p>Carregando requisições…</p></div>`;
  }

  if (ui.loadStatus === 'error') {
    return `
      <div class="ti-requests-error">
        <i data-lucide="circle-alert"></i>
        <div><h3>Erro ao carregar requisições</h3><p>${sanitizeText(ui.errorMessage || 'Tente novamente.')}</p></div>
        <button type="button" class="module-link-button is-secondary" data-ti-reload>
          <i data-lucide="refresh-cw"></i><span>Tentar novamente</span>
        </button>
      </div>`;
  }

  const tickets          = Array.isArray(ui.tickets)          ? ui.tickets          : [];
  const completedTickets = Array.isArray(ui.completedTickets) ? ui.completedTickets : [];
  const nivel            = respondent?.nivel || '';
  const isPrivileged     = nivel === USER_LEVELS.admin || nivel === USER_LEVELS.gestor;

  return `
    ${renderKanban(tickets, completedTickets, ui, respondent, isMotorista)}
    ${isPrivileged && !isMotorista ? renderDashboard(ui.dashboard, ui.dashboardPeriod || 'mes') : ''}
  `;
}


