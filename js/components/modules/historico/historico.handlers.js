import { buscarHistoricoColaborador } from '../../../services/historico.service.js';
import { requestApi } from '../../../services/api.service.js';
import { loadActiveUsers } from '../../../services/users.service.js';
import { loadModuleContent } from '../../../services/integrations.service.js';
import { fetchUserQuizResults, fetchAdminQuizzesBySector } from '../../../services/quiz.service.js';

const DEFAULT_UI = {
  query: '',
  searchResults: [],
  selectedUserId: '',
  selectedUserNome: '',
  selectedUserSetor: '',
  selectedSectorId: '',
  selectedToolId: '',
  historico: [],
  loadingHistorico: false,
  activeTab: 'timeline',
  allUsers: [],
  contentData: null,
  loadingContent: false,
  contentError: false,
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

    // Obtém TODOS os setores do colaborador (não apenas o primeiro)
    const userSetores = getAllSetores(user?.setor || '');
    const effectiveSetores = userSetores.length > 0
      ? userSetores
      : (ui.selectedSectorId ? [ui.selectedSectorId] : []);

    // Armazena como string legível para exibição (ex: "Comercial, Produção")
    const effectiveSetorStr = effectiveSetores.join(', ');

    patchUi(sector, {
      selectedUserId:    userId,
      selectedUserNome:  user?.nome || userId,
      selectedUserSetor: effectiveSetorStr,
      historico:         [],
      contentData:       null,
      loadingHistorico:  true,
    });
    renderModuleStage(rootElement, sector);

    const response = await buscarHistoricoColaborador(userId);

    patchUi(sector, {
      historico:        response.historico,
      loadingHistorico: false,
    });
    renderModuleStage(rootElement, sector);

    // Se dashboard tab estiver ativa, já carrega o conteúdo de todos os setores
    const freshUi = getUi(getModuleState(sector.id));
    if (freshUi.activeTab === 'dashboard' && effectiveSetores.length && !freshUi.contentData) {
      await loadContentData(rootElement, sector, effectiveSetores, userId);
    }
  }

  /** Retorna array com todos os setores válidos de um colaborador. */
  function getAllSetores(setor) {
    if (!setor || setor === 'all') return [];
    return setor.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
  }

  async function loadContentData(rootElement, sector, sectorIdOrIds, userId) {
    // Normaliza para array — suporta string única ou array de setores
    const sectorIds = (Array.isArray(sectorIdOrIds)
      ? sectorIdOrIds
      : [sectorIdOrIds]
    ).map(s => String(s || '').trim()).filter(Boolean);

    if (!sectorIds.length) return;

    patchUi(sector, { loadingContent: true, contentError: false });
    renderModuleStage(rootElement, sector);

    // Para cada setor: busca vídeos, documentos, instruções escritas e quizzes
    const contentRequests = sectorIds.flatMap(sid => [
      loadModuleContent({ sectorId: sid, moduleId: 'instrucoes-video' }),
      loadModuleContent({ sectorId: sid, moduleId: 'documentos' }),
      loadModuleContent({ sectorId: sid, moduleId: 'instrucoes-escritas' }),
      fetchAdminQuizzesBySector(sid),
    ]);
    // Respostas de quiz do colaborador (única chamada, independente de setor)
    contentRequests.push(
      userId
        ? fetchUserQuizResults(userId)
        : Promise.resolve({ success: true, resultados: [] }),
    );

    const results = await Promise.allSettled(contentRequests);

    // results layout: [v0, d0, i0, q0, v1, d1, i1, q1, ..., userQuizResults]
    const N = 4; // requisições por setor
    const rawVideos     = [];
    const rawDocs       = [];
    const rawInstrucoes = [];
    const rawQuizzesAvail = [];

    for (let s = 0; s < sectorIds.length; s++) {
      const offset = s * N;
      const vRes = results[offset];
      const dRes = results[offset + 1];
      const iRes = results[offset + 2];
      const qRes = results[offset + 3];

      if (vRes.status === 'fulfilled') rawVideos.push(...(vRes.value?.items || []));
      if (dRes.status === 'fulfilled') rawDocs.push(...(dRes.value?.items || []));
      if (iRes.status === 'fulfilled') rawInstrucoes.push(...(iRes.value?.items || []));
      if (qRes.status === 'fulfilled') rawQuizzesAvail.push(...(qRes.value?.questionarios || []));
    }

    // Verifica se TODAS as chamadas de conteúdo falharam
    const contentResults = results.slice(0, sectorIds.length * N);
    const allFailed = contentResults.every(r => r.status === 'rejected');

    if (allFailed) {
      patchUi(sector, { loadingContent: false, contentError: true, contentData: null });
      renderModuleStage(rootElement, sector);
      return;
    }

    // Deduplicação — evita contar o mesmo item duas vezes
    // (ex: um vídeo que aparece na playlist de dois setores)
    const dedupeVideos = items => {
      const seen = new Set();
      return items.filter(v => {
        const key = v.id || v.embedUrl || '';
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const dedupeByPreviewUrl = items => {
      const seen = new Set();
      return items.filter(d => {
        const key = d.previewUrl || d.openUrl || '';
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const dedupeQuizzes = items => {
      const seen = new Set();
      return items.filter(q => {
        if (!q.video_id || seen.has(q.video_id)) return false;
        seen.add(q.video_id);
        return true;
      });
    };

    const quizzesAnswRes = results[results.length - 1];
    const quizzesAnsw = quizzesAnswRes.status === 'fulfilled'
      ? (quizzesAnswRes.value?.resultados || []) : [];

    // Inclui respostas de quiz de QUALQUER setor do colaborador
    const sectorSet = new Set(sectorIds);
    const quizzesAnswered = quizzesAnsw.filter(r => sectorSet.has(r.sector_id) || !r.sector_id);

    const contentData = {
      videos:          dedupeVideos(rawVideos),
      docs:            dedupeByPreviewUrl(rawDocs),
      instrucoes:      dedupeByPreviewUrl(rawInstrucoes),
      quizzesAvail:    dedupeQuizzes(rawQuizzesAvail),
      quizzesAnswered,
    };

    patchUi(sector, { contentData, loadingContent: false, contentError: false });
    renderModuleStage(rootElement, sector);
  }

  function updateQuery(rootElement, sector, value) {
    patchUi(sector, { query: value });
  }

  async function selectSector(rootElement, sector, sectorId) {
    const state = getModuleState(sector.id);
    const ui = getUi(state);

    // Load all users if not cached
    let allUsers = ui.allUsers;
    if (!allUsers.length) {
      const response = await loadActiveUsers();
      allUsers = response.users || [];
    }

    // 'all' — ignore any sector division, render every registered user
    const filtered = (sectorId === 'all' || sectorId === 'todos' || !sectorId)
      ? allUsers
      : filterUsersBySector(allUsers, sectorId);

    patchUi(sector, {
      selectedSectorId: sectorId,
      searchResults: filtered,
      query: '',
      allUsers,
      // Reset selected user when switching sector filter
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
    const currentState = getModuleState(sector.id);
    const currentUi   = getUi(currentState);

    // Reconstrói o array de setores a partir da string armazenada
    const effectiveSetores = getAllSetores(currentUi.selectedUserSetor)
      .concat(currentUi.selectedSectorId ? [currentUi.selectedSectorId] : [])
      .filter((v, i, arr) => arr.indexOf(v) === i); // dedup

    const willLoad = (
      tab === 'dashboard' &&
      effectiveSetores.length > 0 &&
      !currentUi.contentData &&
      !currentUi.loadingContent
    );

    patchUi(sector, {
      activeTab: tab,
      ...(willLoad ? { loadingContent: true } : {}),
    });
    renderModuleStage(rootElement, sector);

    if (willLoad) {
      loadContentData(rootElement, sector, effectiveSetores, currentUi.selectedUserId);
    }
  }

  async function retryLoadContent(rootElement, sector) {
    const ui = getUi(getModuleState(sector.id));
    const effectiveSetores = getAllSetores(ui.selectedUserSetor)
      .concat(ui.selectedSectorId ? [ui.selectedSectorId] : [])
      .filter((v, i, arr) => arr.indexOf(v) === i);

    if (effectiveSetores.length) {
      patchUi(sector, { contentData: null });
      await loadContentData(rootElement, sector, effectiveSetores, ui.selectedUserId);
    }
  }

  function selectTool(rootElement, sector, toolId) {
    const state = getModuleState(sector.id);
    const current = getUi(state);
    patchUi(sector, { selectedToolId: current.selectedToolId === toolId ? '' : toolId });
    renderModuleStage(rootElement, sector);
  }

  return { searchUsers, selectUser, updateQuery, setActiveTab, selectSector, retryLoadContent, selectTool };
}