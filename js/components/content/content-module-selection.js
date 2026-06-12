import {
  canUserAccessModule,
  getSectorBreadcrumb,
  isDhoSector,
} from '../../services/navigation.service.js';
import { refreshLucideIcons } from '../../services/icons.service.js';
import {
  MODULE_SOURCE_LABELS,
  loadModuleContent,
} from '../../services/integrations.service.js';
import {
  ACTIVE_USERS_MODULE_IDS,
  APP_SOURCE_LABEL,
  INTERNAL_USER_MODULE_IDS,
  MODULE_IDS,
  MODULE_STATUS,
  SELF_LOADING_MODULE_IDS,
} from '../../constants/module.constants.js';
import { loadActiveUsers } from '../../services/users.service.js';
import {
  MODULE_UI_DEFAULTS,
  getModuleState,
  setModuleState,
  setCardAlert,
} from '../../state/module-state.js';
import { fetchPendingEvaluationUserIds } from '../../services/evaluations.service.js';
import { EVALUATION_UI_DEFAULTS } from '../modules/evaluation-module.js';
import { FEEDBACK_UI_DEFAULTS } from '../modules/feedback-module.js';
import { QUALITY_UI_DEFAULTS } from '../modules/quality-module.js';
import { TI_REQUESTS_UI_DEFAULTS } from '../modules/ti-requests-module.js';
import { QUIZ_UI_DEFAULTS } from '../modules/questionarios-module.js';
import {
  VITRINE_CATEGORY_MODULE_IDS,
  VITRINE_UI_DEFAULTS,
} from '../modules/vitrine-module.js';

const MODULE_REQUEST_TOKENS = new Map();

function isInternalModule(sectorId, moduleId) {
  if (isDhoSector(sectorId)) {
    return true;
  }

  return INTERNAL_USER_MODULE_IDS.has(moduleId);
}

function requiresActiveUsers(moduleId) {
  return ACTIVE_USERS_MODULE_IDS.has(moduleId);
}

export async function executeModuleSelection(
  rootElement, sector, moduleId, authenticatedUser,
  options,
  { renderModuleStage, tiRequestsModuleHandlers, vitrineModuleHandlers },
) {
  const { forceRefresh = false } = options;
  const currentState = getModuleState(sector.id);

  if (!canUserAccessModule(authenticatedUser, moduleId)) {
    return;
  }

  if (!forceRefresh && currentState.selectedModuleId === moduleId && currentState.status === MODULE_STATUS.success) {
    return;
  }

  setModuleState(sector.id, {
    selectedModuleId: moduleId,
    status: MODULE_STATUS.loading,
    moduleData: null,
    errorMessage: '',
    ui: { ...MODULE_UI_DEFAULTS },
  });
  renderModuleStage(rootElement, sector);

  // Modules that load their own data via handlers (e.g. TI Requests)
  if (SELF_LOADING_MODULE_IDS.has(moduleId)) {
    if (moduleId === MODULE_IDS.questionarios) {
      setModuleState(sector.id, {
        selectedModuleId: moduleId,
        status: MODULE_STATUS.success,
        moduleData: { respondent: authenticatedUser },
        errorMessage: '',
        ui: { ...MODULE_UI_DEFAULTS, questionarios: { ...QUIZ_UI_DEFAULTS } },
      });
      renderModuleStage(rootElement, sector);
      return;
    }

    setModuleState(sector.id, {
      selectedModuleId: moduleId,
      status: MODULE_STATUS.success,
      moduleData: { respondent: authenticatedUser },
      errorMessage: '',
      ui: { ...MODULE_UI_DEFAULTS, ...TI_REQUESTS_UI_DEFAULTS, loadStatus: 'loading' },
    });
    renderModuleStage(rootElement, sector);
    tiRequestsModuleHandlers.loadTickets(rootElement, sector);
    return;
  }

  if (requiresActiveUsers(moduleId)) {
    const defaultUi = moduleId === MODULE_IDS.evaluation
      ? { ...MODULE_UI_DEFAULTS, ...EVALUATION_UI_DEFAULTS }
      : moduleId === MODULE_IDS.quality
        ? { ...MODULE_UI_DEFAULTS, ...QUALITY_UI_DEFAULTS }
        : { ...MODULE_UI_DEFAULTS, ...FEEDBACK_UI_DEFAULTS };

    try {
      const usersResponse = await loadActiveUsers({ forceRefresh });

      if (!usersResponse.success) {
        setModuleState(sector.id, {
          selectedModuleId: moduleId,
          status: MODULE_STATUS.error,
          moduleData: null,
          errorMessage: usersResponse.message || 'Não foi possível carregar os usuários ativos.',
          ui: defaultUi,
        });
        renderModuleStage(rootElement, sector);
        return;
      }

      const allUsers = Array.isArray(usersResponse.users) ? usersResponse.users : [];

      const sectorFilteredUsers = isDhoSector(sector.id)
        ? allUsers
        : allUsers.filter((u) => {
            // Admins and Gestores always visible regardless of their setor field
            if (u.nivel === 'Admin' || u.nivel === 'Gestor') return true;
            const s = String(u.setor || '').toLowerCase();
            return s === 'all' || s.split(/,\s*/).includes(sector.id);
          });

      const moduleData = {
        module: { id: moduleId, source: MODULE_SOURCE_LABELS[moduleId] || APP_SOURCE_LABEL },
        respondent: authenticatedUser || null,
        evaluationSector: {
          id: sector.id,
          label: getSectorBreadcrumb(sector),
        },
        users: sectorFilteredUsers,
      };

      setModuleState(sector.id, {
        selectedModuleId: moduleId,
        status: MODULE_STATUS.success,
        moduleData,
        errorMessage: '',
        ui: defaultUi,
      });

      // Set evaluation card alert for pending evaluations — async, non-blocking
      if (moduleId === MODULE_IDS.evaluation && sectorFilteredUsers.length) {
        const userIds = sectorFilteredUsers.map(u => u.id);
        fetchPendingEvaluationUserIds(sector.id, userIds).then(({ pendingIds, pendingByTool }) => {
          // Store pending IDs + pendingByTool in moduleData so the evaluation view can use them
          const latestState = getModuleState(sector.id);
          if (latestState.moduleData) {
            setModuleState(sector.id, {
              ...latestState,
              moduleData: {
                ...latestState.moduleData,
                pendingUserIds: Array.from(pendingIds),
                pendingByTool,
              },
            });
          }
          setCardAlert(sector.id, 'avaliacao', pendingIds.size > 0
            ? { type: 'pending', count: pendingIds.size }
            : null);
          // Patch badges into DOM immediately without a full re-render
          const cards = rootElement.querySelectorAll('[data-module-card]');
          const alerts = getModuleState(sector.id).cardAlerts || {};
          cards.forEach((cardElement) => {
            const mId = cardElement.dataset.moduleId;
            const alert = alerts[mId] || null;
            let badge = cardElement.querySelector('.feature-card-alert-badge');
            let attn  = cardElement.querySelector('.feature-card-attention');
            if (alert) {
              cardElement.classList.add('has-alert');
              if (!badge) {
                badge = document.createElement('span');
                badge.className = 'feature-card-alert-badge';
                cardElement.prepend(badge);
              }
              badge.innerHTML = `<span class="feature-card-alert-dot"></span>${alert.count > 0 ? `<span class="feature-card-alert-count">${alert.count}</span>` : ''}`;
              if (!attn) {
                attn = document.createElement('span');
                attn.className = 'feature-card-attention';
                attn.setAttribute('aria-hidden', 'true');
                attn.innerHTML = '<i data-lucide="alert-triangle"></i>';
                cardElement.prepend(attn);
                refreshLucideIcons(attn);
              }
            }
          });
          // Re-render module stage so tool-level pending badges become visible
          if (latestState.selectedModuleId === MODULE_IDS.evaluation) {
            renderModuleStage(rootElement, sector);
          }
        }).catch(() => {});
      }

      renderModuleStage(rootElement, sector);
      return;
    } catch (error) {
      setModuleState(sector.id, {
        selectedModuleId: moduleId,
        status: MODULE_STATUS.error,
        moduleData: null,
        errorMessage: error?.message || 'Não foi possível carregar os usuários ativos.',
        ui: defaultUi,
      });
      renderModuleStage(rootElement, sector);
      return;
    }
  }

  if (isInternalModule(sector.id, moduleId)) {
    setModuleState(sector.id, {
      selectedModuleId: moduleId,
      status: MODULE_STATUS.success,
      moduleData: {
        module: { id: moduleId, source: MODULE_SOURCE_LABELS[moduleId] || APP_SOURCE_LABEL },
        items: [],
      },
      errorMessage: '',
      ui: { ...MODULE_UI_DEFAULTS },
    });
    renderModuleStage(rootElement, sector);
    return;
  }

  if (VITRINE_CATEGORY_MODULE_IDS.has(moduleId)) {
    setModuleState(sector.id, {
      selectedModuleId: moduleId,
      status: MODULE_STATUS.success,
      moduleData: { respondent: authenticatedUser },
      errorMessage: '',
      ui: { ...MODULE_UI_DEFAULTS, vitrine: { ...VITRINE_UI_DEFAULTS } },
    });
    renderModuleStage(rootElement, sector);
    vitrineModuleHandlers.initDefaultTab(rootElement, sector);
    return;
  }

  const requestToken = `${sector.id}:${moduleId}:${Date.now()}`;
  MODULE_REQUEST_TOKENS.set(sector.id, requestToken);

  try {
    const response = await loadModuleContent({ sectorId: sector.id, moduleId, forceRefresh });

    if (MODULE_REQUEST_TOKENS.get(sector.id) !== requestToken) {
      return;
    }

    if (response.success) {
      setModuleState(sector.id, {
        selectedModuleId: moduleId,
        status: MODULE_STATUS.success,
        moduleData: response,
        errorMessage: '',
        ui: currentState.selectedModuleId === moduleId ? currentState.ui || { ...MODULE_UI_DEFAULTS } : { ...MODULE_UI_DEFAULTS },
      });
    } else {
      setModuleState(sector.id, {
        selectedModuleId: moduleId,
        status: MODULE_STATUS.error,
        moduleData: null,
        errorMessage: response.message,
        ui: currentState.selectedModuleId === moduleId ? currentState.ui || { ...MODULE_UI_DEFAULTS } : { ...MODULE_UI_DEFAULTS },
      });
    }
  } catch (error) {
    if (MODULE_REQUEST_TOKENS.get(sector.id) !== requestToken) {
      return;
    }

    setModuleState(sector.id, {
      selectedModuleId: moduleId,
      status: MODULE_STATUS.error,
      moduleData: null,
      errorMessage: error?.message || 'Não foi possível carregar o conteúdo deste módulo.',
      ui: currentState.selectedModuleId === moduleId ? currentState.ui || { ...MODULE_UI_DEFAULTS } : { ...MODULE_UI_DEFAULTS },
    });
  }

  renderModuleStage(rootElement, sector);
}
