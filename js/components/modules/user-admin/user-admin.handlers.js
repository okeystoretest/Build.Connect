import { MODULE_IDS, MODULE_STATUS } from '../../../constants/module.constants.js';
import {
  createManagedUser,
  deleteManagedUser,
  searchManagedUsers,
  updateManagedUser,
} from '../../../services/admin-users.service.js';
import { clearActiveUsersCache } from '../../../services/users.service.js';
import { USER_ADMIN_UI_DEFAULTS } from './user-admin.constants.js';
import {
  getUserAdminUiState,
  normalizeUserAdminSectors,
  readUserAdminFormData,
  readUserAdminSearchQuery,
} from './user-admin.form.js';

let userAdminModuleContext = null;

export function createUserAdminModuleHandlers(context) {
  userAdminModuleContext = context;

  return {
    searchRecords: searchUserAdminRecords,
    editRecord: editUserAdminRecord,
    clearForm: clearUserAdminForm,
    saveRecord: saveUserAdminRecord,
    deleteRecord: deleteUserAdminRecord,
  };
}

function getModuleState(sectorId) {
  return userAdminModuleContext?.getModuleState(sectorId);
}

function setModuleState(sectorId, state) {
  return userAdminModuleContext?.setModuleState(sectorId, state);
}

function renderModuleStage(rootElement, sector) {
  return userAdminModuleContext?.renderModuleStage(rootElement, sector);
}

async function searchUserAdminRecords(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== MODULE_IDS.userAdmin) {
    return;
  }

  const query = readUserAdminSearchQuery(rootElement);
  const currentUi = getUserAdminUiState(state.ui);

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...currentUi,
      searchQuery: query,
      searchStatus: MODULE_STATUS.loading,
      searchMessage: 'Buscando usuários cadastrados...',
      feedbackMessage: '',
      feedbackType: '',
    },
  });
  renderModuleStage(rootElement, sector);

  try {
    const response = await searchManagedUsers(query);
    const nextState = getModuleState(sector.id);
    const nextUi = getUserAdminUiState(nextState.ui);

    setModuleState(sector.id, {
      ...nextState,
      ui: {
        ...nextUi,
        searchQuery: query,
        searchStatus: response.success ? MODULE_STATUS.success : MODULE_STATUS.error,
        searchResults: response.success ? response.users : [],
        searchMessage: response.message,
        feedbackMessage: response.success ? '' : response.message,
        feedbackType: response.success ? '' : MODULE_STATUS.error,
      },
    });
  } catch (error) {
    const nextState = getModuleState(sector.id);
    const nextUi = getUserAdminUiState(nextState.ui);

    setModuleState(sector.id, {
      ...nextState,
      ui: {
        ...nextUi,
        searchStatus: MODULE_STATUS.error,
        searchResults: [],
        searchMessage: error?.message || 'Não foi possível pesquisar usuários.',
        feedbackMessage: error?.message || 'Não foi possível pesquisar usuários.',
        feedbackType: MODULE_STATUS.error,
      },
    });
  }

  renderModuleStage(rootElement, sector);
}

function editUserAdminRecord(rootElement, sector, userId) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== MODULE_IDS.userAdmin) {
    return;
  }

  const currentUi = getUserAdminUiState(state.ui);
  const selectedUser = currentUi.searchResults.find((user) => user.id === userId);

  if (!selectedUser) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...currentUi,
      mode: 'edit',
      originalId: selectedUser.id,
      form: {
        id: selectedUser.id,
        nome: selectedUser.nome,
        nivel: selectedUser.nivel || '',
        setores: normalizeUserAdminSectors(selectedUser.setorList || selectedUser.setor),
      },
      passwordResult: null,
      feedbackMessage: `Cadastro de ${selectedUser.nome} carregado para edição.`,
      feedbackType: MODULE_STATUS.success,
    },
  });

  renderModuleStage(rootElement, sector);
}

function clearUserAdminForm(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== MODULE_IDS.userAdmin) {
    return;
  }

  const currentUi = getUserAdminUiState(state.ui);

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...currentUi,
      mode: 'create',
      originalId: '',
      form: { ...USER_ADMIN_UI_DEFAULTS.form },
      passwordResult: null,
      feedbackMessage: '',
      feedbackType: '',
    },
  });

  renderModuleStage(rootElement, sector);
}

async function saveUserAdminRecord(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== MODULE_IDS.userAdmin) {
    return;
  }

  const form = readUserAdminFormData(rootElement);
  const currentUi = getUserAdminUiState(state.ui);
  const isEditMode = currentUi.mode === 'edit';

  if (!form.id || !form.nome || !form.setores.length) {
    setModuleState(sector.id, {
      ...state,
      ui: { ...currentUi, form, feedbackMessage: 'Informe ID, nome e pelo menos um setor.', feedbackType: MODULE_STATUS.error },
    });
    renderModuleStage(rootElement, sector);
    return;
  }

  if (!isEditMode && !form.senha) {
    setModuleState(sector.id, {
      ...state,
      ui: { ...currentUi, form, feedbackMessage: 'Informe a senha para criar o usuário.', feedbackType: MODULE_STATUS.error },
    });
    renderModuleStage(rootElement, sector);
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: { ...currentUi, form, isSubmitting: true, feedbackMessage: '', feedbackType: '' },
  });
  renderModuleStage(rootElement, sector);

  try {
    const response = currentUi.mode === 'edit'
      ? await updateManagedUser({ originalId: currentUi.originalId, ...form })
      : await createManagedUser(form);
    const nextState = getModuleState(sector.id);
    const nextUi = getUserAdminUiState(nextState.ui);

    clearActiveUsersCache();

    const isCreate = currentUi.mode === 'create';

    setModuleState(sector.id, {
      ...nextState,
      ui: {
        ...nextUi,
        // Após criar: limpa tudo para próximo cadastro
        // Após editar: permanece em modo edição com dados atualizados
        mode: response.success && isCreate ? 'create' : response.success ? 'edit' : currentUi.mode,
        originalId: response.success && !isCreate ? (response.user?.id || form.id) : '',
        form: response.success && isCreate
          ? { ...USER_ADMIN_UI_DEFAULTS.form }
          : response.success
            ? {
                id: response.user?.id || form.id,
                nome: response.user?.nome || form.nome,
                nivel: response.user?.nivel || form.nivel,
                senha: '',
                setores: normalizeUserAdminSectors(response.user?.setorList || form.setores),
              }
            : form,
        isSubmitting: false,
        feedbackMessage: response.message,
        feedbackType: response.success ? MODULE_STATUS.success : MODULE_STATUS.error,
      },
    });
  } catch (error) {
    const nextState = getModuleState(sector.id);
    const nextUi = getUserAdminUiState(nextState.ui);

    setModuleState(sector.id, {
      ...nextState,
      ui: { ...nextUi, form, isSubmitting: false, feedbackMessage: error?.message || 'Não foi possível salvar o cadastro.', feedbackType: MODULE_STATUS.error },
    });
  }

  renderModuleStage(rootElement, sector);
}



async function deleteUserAdminRecord(rootElement, sector, userId) {
  if (!userId) return;
  if (!window.confirm(`Confirma a exclusão definitiva do usuário "${userId}"? Esta ação não pode ser desfeita.`)) return;

  const state = getModuleState(sector.id);
  const currentUi = getUserAdminUiState(state.ui);

  setModuleState(sector.id, {
    ...state,
    ui: { ...currentUi, isSubmitting: true, feedbackMessage: 'Excluindo usuário...', feedbackType: '' },
  });
  renderModuleStage(rootElement, sector);

  try {
    const response = await deleteManagedUser(userId);
    clearActiveUsersCache();

    const nextState = getModuleState(sector.id);
    const nextUi = getUserAdminUiState(nextState.ui);

    setModuleState(sector.id, {
      ...nextState,
      ui: {
        ...nextUi,
        mode: 'create',
        originalId: '',
        form: { ...USER_ADMIN_UI_DEFAULTS.form },
        isSubmitting: false,
        feedbackMessage: response.success ? `Usuário ${userId} excluído com sucesso.` : (response.message || 'Erro ao excluir.'),
        feedbackType: response.success ? MODULE_STATUS.success : MODULE_STATUS.error,
      },
    });
  } catch (error) {
    const nextState = getModuleState(sector.id);
    const nextUi = getUserAdminUiState(nextState.ui);
    setModuleState(sector.id, {
      ...nextState,
      ui: { ...nextUi, isSubmitting: false, feedbackMessage: error?.message || 'Erro ao excluir usuário.', feedbackType: MODULE_STATUS.error },
    });
  }

  renderModuleStage(rootElement, sector);
}
