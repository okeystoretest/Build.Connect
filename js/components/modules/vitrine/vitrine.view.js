import { MODULE_STATUS } from '../../../constants/module.constants.js';
import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';
import { getDocumentModuleMarkup } from '../document-module.js';
import {
  getModuleEmptyMarkup,
  getModuleToolbarMarkup,
  getModuleSearchEmptyMarkup,
  getModuleToolFilterMarkup,
} from '../module-shell.js';
import {
  VITRINE_CATEGORY_META,
  VITRINE_TABS,
  VITRINE_UI_DEFAULTS,
} from './vitrine.constants.js';

export function getVitrineUiState(moduleUi) {
  return {
    ...VITRINE_UI_DEFAULTS,
    ...(moduleUi?.vitrine || {}),
  };
}

export function getVitrineModuleMarkup(card, moduleData, moduleUi) {
  const categoryId = card.id;
  const vitrineUi = getVitrineUiState(moduleUi);
  const meta = VITRINE_CATEGORY_META[categoryId];
  const tabs = VITRINE_TABS[categoryId] || [];

  if (!meta || !tabs.length) return '';

  const activeTab = vitrineUi.activeTab || tabs[0].id;

  return `
    <div class="module-shell vitrine-shell" data-module-shell>
      <div class="module-shell-header">
        <div>
          <p class="module-eyebrow">${sanitizeText(meta.eyebrow)}</p>
          <h2 class="module-title">${sanitizeText(meta.title)}</h2>
          <p class="module-description">${sanitizeText(meta.description)}</p>
        </div>
      </div>

      <div class="vitrine-tabs">
        ${tabs.map((tab) => `
          <button type="button"
            class="vitrine-tab ${activeTab === tab.id ? 'is-active' : ''}"
            data-vitrine-tab="${sanitizeAttribute(tab.id)}">
            <i data-lucide="${sanitizeAttribute(tab.icon)}"></i>
            <span>${sanitizeText(tab.label)}</span>
          </button>
        `).join('')}
      </div>

      ${renderVitrineTabContent(activeTab, vitrineUi, moduleUi)}
    </div>
  `;
}

function renderVitrineTabContent(activeTab, vitrineUi, moduleUi) {
  if (vitrineUi.tabStatus === MODULE_STATUS.loading) {
    return `
      <div class="vitrine-tab-loading">
        <i data-lucide="loader-circle"></i>
        <p>Carregando arquivos…</p>
      </div>
    `;
  }

  if (vitrineUi.tabStatus === MODULE_STATUS.error) {
    return `
      <div class="vitrine-tab-empty">
        <i data-lucide="circle-alert"></i>
        <p>${sanitizeText(vitrineUi.tabError || 'Não foi possível carregar o conteúdo.')}</p>
        <button type="button" class="module-link-button" data-vitrine-retry>
          <i data-lucide="refresh-cw"></i>
          <span>Tentar novamente</span>
        </button>
      </div>
    `;
  }

  if (!vitrineUi.tabData || vitrineUi.tabStatus === MODULE_STATUS.idle) {
    return `
      <div class="vitrine-tab-empty">
        <i data-lucide="folder-open"></i>
        <p>Selecione uma aba para visualizar o conteúdo.</p>
      </div>
    `;
  }

  const allTabs = Object.values(VITRINE_TABS).flat();
  const tabMeta = allTabs.find((t) => t.id === activeTab);

  const syntheticCard = {
    id: activeTab,
    title: tabMeta?.label || 'Conteúdo',
    icon: tabMeta?.icon || 'folder-open',
    hint: '',
    getDescription: () => '',
  };

  return getDocumentModuleMarkup(syntheticCard, vitrineUi.tabData, moduleUi, {
    getModuleEmptyMarkup,
    getModuleToolbarMarkup,
    getModuleSearchEmptyMarkup,
    getModuleToolFilterMarkup,
  });
}
