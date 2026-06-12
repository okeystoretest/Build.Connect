import { MODULE_STATUS } from '../../../constants/module.constants.js';

export const VITRINE_CATEGORY_IDS = Object.freeze({
  colecoes: 'vitrine-colecoes',
  catalogo: 'vitrine-catalogo',
  workshop: 'vitrine-workshop',
});

export const VITRINE_CATEGORY_MODULE_IDS = new Set(Object.values(VITRINE_CATEGORY_IDS));

export const VITRINE_TABS = Object.freeze({
  [VITRINE_CATEGORY_IDS.colecoes]: [
    { id: 'vitrine-editoriais', label: 'Fotos', icon: 'camera' },
    { id: 'vitrine-materiais-marca', label: 'Vídeos', icon: 'video' },
    { id: 'vitrine-composicoes', label: 'Influencers', icon: 'user-plus' },
  ],
  [VITRINE_CATEGORY_IDS.catalogo]: [
    { id: 'vitrine-fotos-principais', label: 'Cores', icon: 'image' },
    { id: 'vitrine-cores-tecidos', label: 'Cores', icon: 'video' },
    { id: 'vitrine-acabamentos', label: 'Catálogo', icon: 'swatch-book' },
  ],
  [VITRINE_CATEGORY_IDS.workshop]: [
    { id: 'vitrine-instrucoes', label: 'Instruções', icon: 'clapperboard' },
    { id: 'vitrine-materiais-apoio', label: 'Materiais de Apoio', icon: 'file-text' },
    { id: 'vitrine-capacitacao', label: 'Capacitação', icon: 'graduation-cap' },
  ],
});

export const VITRINE_CATEGORY_META = Object.freeze({
  [VITRINE_CATEGORY_IDS.colecoes]: {
    title: 'Coleções',
    eyebrow: 'Vitrine · Coleções',
    description: 'Explore os materiais visuais das campanhas e coleções da marca.',
  },
  [VITRINE_CATEGORY_IDS.catalogo]: {
    title: 'Catálogo',
    eyebrow: 'Vitrine · Catálogo',
    description: 'Visualize imagens, vídeos de cores e outras informações complementares da coleção.',
  },
  [VITRINE_CATEGORY_IDS.workshop]: {
    title: 'Workshop',
    eyebrow: 'Vitrine · Workshop',
    description: 'Acesse instruções, materiais de apoio e conteúdos de capacitação.',
  },
});

export function getDefaultTab(categoryId) {
  const tabs = VITRINE_TABS[categoryId];
  return tabs?.[0]?.id || null;
}

export const VITRINE_UI_DEFAULTS = Object.freeze({
  activeTab: null,
  tabStatus: MODULE_STATUS.idle,
  tabData: null,
  tabError: '',
});
