import { buscarHistoricoColaborador } from '../../../services/historico.service.js';
import { requestApi } from '../../../services/api.service.js';
import { loadActiveUsers } from '../../../services/users.service.js';
import { loadModuleContent } from '../../../services/integrations.service.js';

const DEFAULT_UI = {
  query: '',
  searchResults: [],
  selectedUserId: '',
  selectedUserNome: '',
  selectedUserSetor: '',
  selectedSectorId: '',
  historico: [],
  loadingHistorico: false,
  activeTab: 'timeline',
  allUsers: [],
  contentData: null,
  loadingContent: false,
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
    const userSetor = getPrimarySetor(user?.setor || '');

    patchUi(sector, {
      selectedUserId: userId,
      selectedUserNome: user?.nome || userId,
      selectedUserSetor: userSetor,
      historico: [],
      contentData: null,
      loadingHistorico: true,
    });
    renderModuleStage(rootElement, sector);

    const response = await buscarHistoricoColaborador(userId);

    patchUi(sector, {
      historico: response.historico,
      loadingHistorico: false,
    });
    renderModuleStage(rootElement, sector);

    // Se dashboard tab estiver ativa, já carrega o conteúdo
    const freshUi = getUi(getModuleState(sector.id));
    if (freshUi.activeTab === 'dashboard' && userSetor && !freshUi.contentData) {
      await loadContentData(rootElement, sector, userSetor);
    }
  }

  function getPrimarySetor(setor) {
    if (!setor || setor === 'all') return '';
    return setor.split(/[,;]+/).map(s => s.trim()).filter(Boolean)[0] || '';
  }

  async function loadContentData(rootElement, sector, sectorId) {
    if (!sectorId) return;

    patchUi(sector, { loadingContent: true });
    renderModuleStage(rootElement, sector);

    const [videosRes, docsRes, instrRes] = await Promise.allSettled([
      loadModuleContent({ sectorId, moduleId: 'instrucoes-video' }),
      loadModuleContent({ sectorId, moduleId: 'documentos' }),
      loadModuleContent({ sectorId, moduleId: 'instrucoes-escritas' }),
    ]);

    const contentData = {
      videos:     videosRes.status === 'fulfilled' ? (videosRes.value?.items || []) : [],
      docs:       docsRes.status === 'fulfilled'   ? (docsRes.value?.items   || []) : [],
      instrucoes: instrRes.status === 'fulfilled'  ? (instrRes.value?.items  || []) : [],
    };

    patchUi(sector, { contentData, loadingContent: false });
    renderModuleStage(rootElement, sector);
  }

  function updateQuery(rootElement, sector, value) {
    patchUi(sector, { query: value });
  }

  async function selectSector(rootElement, sector, sectorId) {
    const state = getModuleState(sector.id);
    const ui = getUi(state);

    // Se já tem todos os usuários em cache, filtra direto
    let allUsers = ui.allUsers;
    if (!allUsers.length) {
      const response = await loadActiveUsers();
      allUsers = response.users || [];
    }

    const filtered = filterUsersBySector(allUsers, sectorId);

    patchUi(sector, {
      selectedSectorId: sectorId,
      searchResults: filtered,
      query: '',
      allUsers,
      // Limpa usuário selecionado ao trocar de setor
      selectedUserId: '',
      selectedUserNome: '',
      historico: [],
    });
    renderModuleStage(rootElement, sector);
  }

  function filterUsersBySector(users, sectorId) {
    if (!sectorId) return users;
    return users.filter(u => {
      const setor = String(u.setor || '');
      if (setor === 'all') return true;
      return setor.split(/[,;]+/).map(s => s.trim()).includes(sectorId);
    });
  }

  function setActiveTab(rootElement, sector, tab) {
    patchUi(sector, { activeTab: tab });
    renderModuleStage(rootElement, sector);

    // Carrega conteúdo do GAS ao abrir dashboard pela primeira vez
    if (tab === 'dashboard') {
      const ui = getUi(getModuleState(sector.id));
      if (ui.selectedUserSetor && !ui.contentData && !ui.loadingContent) {
        loadContentData(rootElement, sector, ui.selectedUserSetor);
      }
    }
  }

  return { searchUsers, selectUser, updateQuery, setActiveTab, selectSector };
}