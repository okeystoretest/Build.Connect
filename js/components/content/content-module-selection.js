import {
  canUserAccessModule,
  getSectorBreadcrumb,
  isDhoSector,
} from '../../services/navigation.service.js';
import { refreshLucideIcons } from '../../services/icons.service.js';
import { requestApi } from '../../services/api.service.js';
import {
  MODULE_SOURCE_LABELS,
  loadModuleContent,
} from '../../services/integrations.service.js';
import {
  ACTIVE_USERS_MODULE_IDS,
  APP_SOURCE_LABEL,
  DYNAMIC_EXTERNAL_MODULE_IDS,
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
import { isAdminUser } from '../../services/access.service.js';
import { isNaviSector } from '../../services/navi.service.js';
import { EVALUATION_UI_DEFAULTS } from '../modules/evaluation-module.js';
import { FEEDBACK_UI_DEFAULTS } from '../modules/feedback-module.js';
import { QUALITY_UI_DEFAULTS } from '../modules/quality-module.js';
import { TI_REQUESTS_UI_DEFAULTS } from '../modules/ti-requests-module.js';
import { QUIZ_UI_DEFAULTS } from '../modules/questionarios-module.js';
import { DENUNCIAS_UI_DEFAULTS } from '../modules/denuncias-module.js';
import {
  VITRINE_CATEGORY_MODULE_IDS,
  VITRINE_UI_DEFAULTS,
} from '../modules/vitrine-module.js';

const MODULE_REQUEST_TOKENS = new Map();

// Cards que requerem progresso validado antes de permitir acesso em setores Navi.
const NAVI_PROGRESS_GATED_IDS = new Set([
  MODULE_IDS.writtenInstructions,
  MODULE_IDS.videoInstructions,
  MODULE_IDS.evaluation,
  MODULE_IDS.tiRequest,
]);

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
  { renderModuleStage, tiRequestsModuleHandlers, vitrineModuleHandlers, denunciasModuleHandlers },
) {
  const { forceRefresh = false } = options;
  const currentState = getModuleState(sector.id);

  if (!canUserAccessModule(authenticatedUser, moduleId)) {
    return;
  }

  // ── ANTI-BYPASS #2: Validação de lock Navi via estado em memória ─────────
  // Impede a janela de bypass onde o atributo DOM data-navi-locked ainda não
  // foi aplicado durante o carregamento assíncrono dos dados de progresso.
  // A validação ocorre no estado JavaScript (fonte da verdade), não no DOM.
  if (isNaviSector(sector.id) && NAVI_PROGRESS_GATED_IDS.has(moduleId)) {
    const naviLock = (currentState.cardLocks || {})[moduleId];

    if (naviLock?.locked) {
      // Lock confirmado em memória: aborta silenciosamente.
      // O toast com o motivo já foi exibido pelo handler de clique no DOM.
      return;
    }

    // Guarda pessimista: se os dados de alerta/lock ainda estão sendo carregados
    // do servidor, bloqueia o acesso até que a resposta seja processada.
    // Evita o bypass por clique rápido antes do fetch retornar.
    if (currentState.isAlertsLoading) {
      return;
    }
  }

  if (!forceRefresh && currentState.selectedModuleId === moduleId && currentState.status === MODULE_STATUS.success) {
    return;
  }

  // naviSequentialActive: false para Admin → sem lock sequencial de itens.
  // Declarado antes de _set para ser reafirmado em TODA transição de estado.
  const naviSequentialActive = !isAdminUser(authenticatedUser);

  // Helper: preserva cardAlerts, cardLocks, authenticatedUser e naviSequentialActive
  // em toda transição de estado.
  // cardAlerts → pílulas de status visíveis ao retornar para o grid de cards.
  // cardLocks  → bloqueios Navi; sem esta preservação, entrar num módulo apagava os locks,
  //              permitindo que o usuário visse cards desbloqueados ao clicar Voltar (bypass).
  // authenticatedUser    → garante filtro correto de cards por nível de acesso.
  // naviSequentialActive → sem esta reafirmação, os ramos que recriam `ui` a partir de
  //              MODULE_UI_DEFAULTS (sucesso/erro do carregamento) descartavam a flag e
  //              reativavam a trava sequencial de itens para o Administrador.
  const _set = (state) => setModuleState(sector.id, {
    ...state,
    ui: { ...(state.ui || MODULE_UI_DEFAULTS), naviSequentialActive },
    cardAlerts:        getModuleState(sector.id).cardAlerts        || currentState.cardAlerts        || {},
    cardLocks:         getModuleState(sector.id).cardLocks         || currentState.cardLocks         || {},
    authenticatedUser: authenticatedUser || currentState.authenticatedUser || null,
  });

  // Busca consumos do usuário (refIds) para cards de conteúdo (docs/vídeos)
  // e popula moduleData.consumedRefIds, permitindo pílulas por item corretas.
  const _fetchAndInjectConsumedRefs = (requestToken) => {
    if (!DYNAMIC_EXTERNAL_MODULE_IDS.has(moduleId)) return;
    requestApi('buscar-meus-consumos', { sectorId: sector.id })
      .then((r) => {
        if (MODULE_REQUEST_TOKENS.get(sector.id) !== requestToken) return;
        const cs = getModuleState(sector.id);
        if (!cs.moduleData) return;

        // FIX: mescla em vez de substituir.
        // Se o usuário concluiu um item entre o início do fetch e sua resolução,
        // o refId já teria sido adicionado localmente pelo handler de bc:content-completed.
        // Substituir com r?.refIds apagaria esse progresso local — merge preserva ambos.
        const existing = Array.isArray(cs.moduleData.consumedRefIds)
          ? cs.moduleData.consumedRefIds : [];
        const merged = [...new Set([...existing, ...(r?.refIds || [])])];

        _set({ ...cs, moduleData: { ...cs.moduleData, consumedRefIds: merged } });
        renderModuleStage(rootElement, sector);
      })
      .catch(() => { /* silencioso */ });
  };

  _set({
    selectedModuleId: moduleId,
    status: MODULE_STATUS.loading,
    moduleData: null,
    errorMessage: '',
    ui: { ...MODULE_UI_DEFAULTS },
  });
  renderModuleStage(rootElement, sector);

  // Modules that load their own data via handlers (e.g. TI Requests, Motorista)
  if (SELF_LOADING_MODULE_IDS.has(moduleId)) {
    if (moduleId === MODULE_IDS.questionarios) {
      _set({
        selectedModuleId: moduleId,
        status: MODULE_STATUS.success,
        moduleData: { respondent: authenticatedUser },
        errorMessage: '',
        ui: { ...MODULE_UI_DEFAULTS, questionarios: { ...QUIZ_UI_DEFAULTS } },
      });
      renderModuleStage(rootElement, sector);
      return;
    }

    if (moduleId === MODULE_IDS.centralDenuncias) {
      _set({
        selectedModuleId: moduleId,
        status: MODULE_STATUS.success,
        moduleData: { respondent: authenticatedUser },
        errorMessage: '',
        ui: { ...MODULE_UI_DEFAULTS, denuncias: { ...DENUNCIAS_UI_DEFAULTS } },
      });
      renderModuleStage(rootElement, sector);
      denunciasModuleHandlers.loadDenuncias(rootElement, sector);
      return;
    }

    // TI Requests (retaguarda) ou Motorista Requests
    _set({
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
        _set({
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

      _set({
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
            _set({
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
      _set({
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
    _set({
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
    _set({
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
      _set({
        selectedModuleId: moduleId,
        status: MODULE_STATUS.success,
        moduleData: response,
        errorMessage: '',
        ui: currentState.selectedModuleId === moduleId ? currentState.ui || { ...MODULE_UI_DEFAULTS } : { ...MODULE_UI_DEFAULTS },
      });

      // Busca assíncrona dos refIds consumidos pelo usuário neste setor/módulo.
      // Popula moduleData.consumedRefIds → pílulas de status corretas por item
      // (Concluído / Em andamento / Não iniciado) em docs, instruções e vídeos.
      _fetchAndInjectConsumedRefs(requestToken);
    } else {
      _set({
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

    _set({
      selectedModuleId: moduleId,
      status: MODULE_STATUS.error,
      moduleData: null,
      errorMessage: error?.message || 'Não foi possível carregar o conteúdo deste módulo.',
      ui: currentState.selectedModuleId === moduleId ? currentState.ui || { ...MODULE_UI_DEFAULTS } : { ...MODULE_UI_DEFAULTS },
    });
  }

  renderModuleStage(rootElement, sector);
}
