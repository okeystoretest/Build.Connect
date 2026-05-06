import { MODULE_SORT_ORDER, MODULE_STATUS, MODULE_VIEW_MODE } from '../../../constants/module.constants.js';
import { SECTOR_IDS } from '../../../constants/sector.constants.js';

export const MODULE_UI_DEFAULTS = Object.freeze({
  query: '',
  sort: MODULE_SORT_ORDER.ascending,
  view: MODULE_VIEW_MODE.grid,
});
export const USER_ADMIN_UI_DEFAULTS = Object.freeze({
  mode: 'create',
  originalId: '',
  form: {
    id: '',
    nome: '',
    setores: [SECTOR_IDS.dho],
  },
  searchQuery: '',
  searchStatus: MODULE_STATUS.idle,
  searchResults: [],
  searchMessage: 'Pesquise por ID ou nome para localizar usuários cadastrados.',
  isSubmitting: false,
  passwordResult: null,
  feedbackType: '',
  feedbackMessage: '',
});
