import { buscarHistoricoColaborador } from '../../../services/historico.service.js';
import { requestApi } from '../../../services/api.service.js';

const DEFAULT_UI = {
  query: '',
  searchResults: [],
  selectedUserId: '',
  selectedUserNome: '',
  historico: [],
  loadingHistorico: false,
};

export function createHistoricoModuleHandlers({ getModuleState, setModuleState, renderModuleStage }) {

  function getUi(state) {
    return { ...DEFAULT_UI, ...(state.ui?.historico || {}) };
  }

  function patchUi(sector, patch) {
    const state = getModuleState(sector.id);
    setModuleState(sector.id, {
      ...state,
      ui: { ...state.ui, historico: { ...getUi(state), ...patch } },
    });
  }

  async function searchUsers(rootElement, sector) {
    const state = getModuleState(sector.id);
    const ui = getUi(state);
    const query = ui.query.trim();

    if (!query) return;

    const response = await requestApi('search-users', { query }).catch(() => null);
    const users = Array.isArray(response?.users) ? response.users : [];

    patchUi(sector, { searchResults: users });
    renderModuleStage(rootElement, sector);
  }

  async function selectUser(rootElement, sector, userId) {
    const state = getModuleState(sector.id);
    const ui = getUi(state);
    const user = ui.searchResults.find((u) => u.id === userId);

    patchUi(sector, {
      selectedUserId: userId,
      selectedUserNome: user?.nome || userId,
      historico: [],
      loadingHistorico: true,
    });
    renderModuleStage(rootElement, sector);

    const response = await buscarHistoricoColaborador(userId);

    patchUi(sector, {
      historico: response.historico,
      loadingHistorico: false,
    });
    renderModuleStage(rootElement, sector);
  }

  function updateQuery(rootElement, sector, value) {
    patchUi(sector, { query: value });
  }

  return { searchUsers, selectUser, updateQuery };
}
