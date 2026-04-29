import {
  DEFAULT_SECTOR_CARDS,
  getCardsForSector,
  getSectorBreadcrumb,
  isDhoSector,
} from '../services/navigation.service.js';
import { refreshLucideIcons } from '../services/icons.service.js';
import {
  MODULE_SOURCE_LABELS,
  loadModuleContent,
} from '../services/integrations.service.js';
import { clearActiveUsersCache, loadActiveUsers } from '../services/users.service.js';
import {
  createManagedUser,
  resetManagedUserPassword,
  searchManagedUsers,
  updateManagedUser,
} from '../services/admin-users.service.js';

const VIEW_EXIT_DURATION_MS = 180;
const MODULE_CARD_IDS = new Set([...DEFAULT_SECTOR_CARDS, ...getCardsForSector('dho')].map((card) => card.id));
const MODULE_STATE_BY_SECTOR = new Map();
const MODULE_REQUEST_TOKENS = new Map();
const MODULE_UI_DEFAULTS = Object.freeze({
  query: '',
  sort: 'az',
  view: 'grid',
});
const EVALUATION_PERIODS = Object.freeze([
  { id: '7', label: '7 dias' },
  { id: '14', label: '14 dias' },
  { id: '21', label: '21 dias' },
]);
const EVALUATION_CRITERIA = Object.freeze([
  { id: 'disciplina', title: 'Disciplina', description: 'Obediência às normas da empresa e ordens recebidas.' },
  { id: 'iniciativa', title: 'Iniciativa', description: 'Fazer o que tem de ser feito sem esperar ordens.' },
  { id: 'assiduidade', title: 'Assiduidade', description: 'Não faltar ao trabalho.' },
  { id: 'pontualidade', title: 'Pontualidade', description: 'Não chegar atrasado e cumprir o horário da empresa.' },
  { id: 'apresentacao', title: 'Apresentação pessoal', description: 'Asseio pessoal, roupa e organização do local de trabalho.' },
  { id: 'sociabilidade', title: 'Sociabilidade', description: 'Facilidade para trabalhar em grupo.' },
  { id: 'cooperacao', title: 'Cooperação', description: 'Contribuição com os outros visando objetivos comuns.' },
  { id: 'dinamismo', title: 'Dinamismo', description: 'Capacidade de agilizar o processo produtivo.' },
  { id: 'lideranca', title: 'Liderança', description: 'Capacidade de conduzir os outros a objetivos comuns.' },
  { id: 'responsabilidade', title: 'Responsabilidade', description: 'Comprometer-se a realizar tudo aquilo que é de sua atribuição.' },
  { id: 'eficiencia', title: 'Eficiência', description: 'Realização de atribuições dentro dos prazos e critérios estabelecidos.' },
  { id: 'eficacia', title: 'Eficácia / Produtividade', description: 'Qualidade do trabalho apresentado dentro dos critérios de qualidade.' },
  { id: 'potencialidade', title: 'Potencialidade', description: 'Aptidão para exercício de outras atribuições ou funções.' },
  { id: 'criatividade', title: 'Criatividade', description: 'Capacidade de encontrar soluções diferentes para os mesmos acontecimentos.' },
  { id: 'simpatia', title: 'Simpatia', description: 'Habilidade de expressar alegria e felicidade.' },
  { id: 'resultado', title: 'Foco no resultado', description: 'Capacidade de olhar para os processos como um todo, focando não na tarefa, mas no resultado.' },
]);
const MATRIX_TECHNICAL_CRITERIA = Object.freeze([
  { id: 'engajamento-metas', title: 'Engajamento com metas', description: 'Engaja-se ativamente com as metas da empresa e trabalha focado em entregar os resultados esperados.' },
  { id: 'cumprimento-objetivos', title: 'Cumprimento de objetivos', description: 'Cumpre os objetivos e garante a qualidade dos resultados.' },
  { id: 'foco-precisao', title: 'Foco e precisão', description: 'Atua com foco e precisão em todas as suas atividades.' },
  { id: 'qualidade-constante', title: 'Qualidade constante', description: 'Atua com qualidade constante, garantindo resultados de alto nível na sua função.' },
  { id: 'resolucao-problemas', title: 'Resolução de problemas', description: 'Demonstra bom senso e agilidade ao resolver problemas e definir caminhos.' },
  { id: 'melhoria-continua', title: 'Melhoria contínua', description: 'Sugere melhorias e compartilha ideias para otimizar suas tarefas.' },
  { id: 'abertura-feedback', title: 'Abertura a feedbacks', description: 'Ouve feedbacks com atenção e busca evoluir constantemente.' },
  { id: 'priorizacao', title: 'Priorização', description: 'Define as prioridades corretas de acordo com a urgência de cada momento.' },
  { id: 'metodos-processos', title: 'Métodos e processos', description: 'Utiliza métodos e processos que tornam seu trabalho individual mais ágil.' },
  { id: 'compartilhamento-informacoes', title: 'Compartilhamento de informações', description: 'Compartilha informações importantes com a equipe de forma clara e rápida.' },
  { id: 'prazos-compromissos', title: 'Prazos e compromissos', description: 'Cumpre rigorosamente todos os prazos e compromissos assumidos.' },
  { id: 'sinalizacao-prazos', title: 'Sinalização de prazos', description: 'Avisa com antecedência quando percebe que não conseguirá cumprir um prazo.' },
  { id: 'troca-feedbacks', title: 'Troca de feedbacks', description: 'Dá e recebe feedbacks sobre desempenho com habilidade e clareza.' },
  { id: 'foco-cliente', title: 'Foco no cliente', description: 'Busca superar as expectativas dos clientes sempre que há oportunidade.' },
  { id: 'aprendizado', title: 'Aprendizado contínuo', description: 'Demonstra entusiasmo e iniciativa ao buscar novos aprendizados.' },
  { id: 'dominio-tecnologico', title: 'Atualização tecnológica', description: 'Domina as tecnologias atuais e se mantém atualizado sobre as novas ferramentas.' },
  { id: 'autodesenvolvimento', title: 'Autodesenvolvimento', description: 'Gerencia o próprio crescimento e se responsabiliza por sua evolução profissional.' },
]);
const MATRIX_EMOTIONAL_CRITERIA = Object.freeze([
  { id: 'autoconfianca', title: 'Autoconfiança', description: 'Confia em seu próprio valor e demonstra segurança em suas capacidades e potencial.' },
  { id: 'equilibrio-emocional', title: 'Equilíbrio emocional', description: 'Mantém o equilíbrio emocional e controla impulsos mesmo em situações de pressão.' },
  { id: 'superacao-limites', title: 'Superação de limites', description: 'Busca superar seus próprios limites para atingir padrões de excelência cada vez maiores.' },
  { id: 'proatividade-oportunidades', title: 'Proatividade', description: 'Age com rapidez e proatividade para aproveitar as oportunidades que surgem.' },
  { id: 'integridade', title: 'Integridade', description: 'Age com honestidade e integridade, construindo relações baseadas na confiança.' },
  { id: 'adaptabilidade', title: 'Adaptabilidade', description: 'Adapta-se facilmente a diferentes perfis de pessoas, mudanças e situações imprevistas.' },
  { id: 'atitude-positiva', title: 'Atitude positiva', description: 'Mantém uma atitude positiva e foca no aprendizado, independentemente da situação.' },
  { id: 'empatia', title: 'Empatia', description: 'Compreende as emoções e o ponto de vista dos outros, demonstrando interesse real pelas pessoas.' },
  { id: 'antecipacao-necessidades', title: 'Antecipação de necessidades', description: 'Antecipa as necessidades de clientes e liderados, ajudando-os a evoluir e atingir metas.' },
  { id: 'motivacao-equipe', title: 'Motivação da equipe', description: 'Motiva a equipe com uma visão clara, inspirando todos a buscarem objetivos comuns.' },
  { id: 'influencia-positiva', title: 'Influência positiva', description: 'Consegue persuadir e influenciar pessoas de forma positiva e convincente.' },
  { id: 'resolucao-divergencias', title: 'Resolução de divergências', description: 'Resolve divergências com habilidade, promovendo o entendimento e a união entre as partes.' },
  { id: 'colaboracao-time', title: 'Colaboração', description: 'Estimula a colaboração e une esforços para garantir que o time entregue resultados de alto nível.' },
]);
const EVALUATION_TOOL_IDS = Object.freeze({
  PRE_EFFECTIVE: 'acompanhamento-funcional-pre-efetivo',
  BEHAVIORAL: 'analise-desempenho-comportamental',
  MATRIX: 'matriz-de-decisao',
});
const EVALUATION_TOOLS = Object.freeze([
  {
    id: EVALUATION_TOOL_IDS.PRE_EFFECTIVE,
    title: 'Acompanhamento Funcional Pré-Efetivo',
    icon: 'clipboard-check',
    hint: 'Pré-efetivação',
    description: 'Acompanhe o desenvolvimento funcional do colaborador durante o período pré-efetivo, com marcos de 7, 14 e 21 dias.',
  },
  {
    id: EVALUATION_TOOL_IDS.BEHAVIORAL,
    title: 'Análise de Desempenho Comportamental',
    icon: 'brain-circuit',
    hint: 'Comportamental',
    description: 'Avalie critérios comportamentais como disciplina, iniciativa, assiduidade, cooperação, liderança e foco no resultado.',
  },
  {
    id: EVALUATION_TOOL_IDS.MATRIX,
    title: 'Matriz de Decisão',
    icon: 'chart-column',
    hint: 'Performance',
    description: 'Preencha as competências técnicas e emocionais, calcule as médias e visualize o posicionamento do colaborador na matriz de decisão.',
  },
]);
const BEHAVIORAL_EVALUATION_OPTIONS = Object.freeze([
  { id: 'E', label: 'E', title: 'Excelente' },
  { id: 'S', label: 'S', title: 'Satisfatório' },
  { id: 'R', label: 'R', title: 'Regular' },
  { id: 'I', label: 'I', title: 'Insatisfatório' },
]);
const BEHAVIORAL_FORM_DEFAULTS = Object.freeze({
  evaluationDate: '',
});
const EVALUATION_UI_DEFAULTS = Object.freeze({
  selectedEvaluationToolId: '',
  selectedEvaluateeId: '',
  evaluateeQuery: '',
  isEvaluateeListOpen: false,
  evaluationScores: {},
  evaluationNotes: '',
  evaluationNotesByTool: {},
  evaluationFormFieldsByTool: {},
  evaluationComputedResultsByTool: {},
});
const FEEDBACK_UI_DEFAULTS = Object.freeze({
  selectedTargetUserId: '',
  targetUserQuery: '',
  isTargetUserListOpen: false,
  feedbackMessage: '',
});
const USER_ADMIN_SECTOR_OPTIONS = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'gestao', label: 'Gestão' },
  { id: 'vendas', label: 'Vendas' },
  { id: 'producao', label: 'Produção' },
  { id: 'criacao', label: 'Criação' },
  { id: 'pcp', label: 'PCP' },
  { id: 'almoxarifado', label: 'Almoxarifado' },
  { id: 'corte', label: 'Corte' },
  { id: 'acabamento', label: 'Acabamento' },
  { id: 'revisao', label: 'Demissão' },
  { id: 'externo', label: 'Externo' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'compras', label: 'Compras' },
  { id: 'logistica', label: 'Logística' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'retaguarda', label: 'Retaguarda' },
  { id: 'dho', label: 'DHO' },
]);
const USER_ADMIN_UI_DEFAULTS = Object.freeze({
  mode: 'create',
  originalId: '',
  form: {
    id: '',
    nome: '',
    setores: ['dho'],
  },
  searchQuery: '',
  searchStatus: 'idle',
  searchResults: [],
  searchMessage: 'Pesquise por ID ou nome para localizar usuários cadastrados.',
  isSubmitting: false,
  passwordResult: null,
  feedbackType: '',
  feedbackMessage: '',
});

const WELCOME_VIDEO = Object.freeze({
  title: 'Vídeo institucional Build.Connect',
  embedUrl: 'https://www.youtube.com/embed/kvxXe6evgDM',
});

let currentRenderToken = 0;
let revealObserver = null;
let activeOverlayModal = null;
let activeEscapeHandler = null;

export function renderContentView(rootElement, viewState, options = {}) {
  const { animate = true } = options;
  const nextToken = ++currentRenderToken;
  const currentPanel = rootElement.querySelector('.content-panel');

  closeActiveOverlayModal();

  if (animate && currentPanel) {
    currentPanel.classList.add('is-view-exit');

    window.setTimeout(() => {
      if (nextToken !== currentRenderToken) {
        return;
      }

      mountView(rootElement, viewState);
    }, VIEW_EXIT_DURATION_MS);

    return;
  }

  mountView(rootElement, viewState);
}

function mountView(rootElement, viewState) {
  disconnectRevealObserver();
  rootElement.innerHTML = getViewMarkup(viewState);
  refreshLucideIcons(rootElement);
  activateViewTransition(rootElement);
  activateRevealAnimations(rootElement);
  bindContentInteractions(rootElement, viewState);
}

function bindContentInteractions(rootElement, viewState) {
  const sector = viewState.selectedItem;

  if (rootElement.__buildConnectContentClickHandler) {
    rootElement.removeEventListener('click', rootElement.__buildConnectContentClickHandler);
    delete rootElement.__buildConnectContentClickHandler;
  }

  if (rootElement.__buildConnectContentInputHandler) {
    rootElement.removeEventListener('input', rootElement.__buildConnectContentInputHandler);
    delete rootElement.__buildConnectContentInputHandler;
  }

  if (rootElement.__buildConnectContentChangeHandler) {
    rootElement.removeEventListener('change', rootElement.__buildConnectContentChangeHandler);
    delete rootElement.__buildConnectContentChangeHandler;
  }

  if (!viewState.shouldRenderCards || !sector?.id) {
    return;
  }

  const clickHandler = (event) => {
    const cardButton = event.target.closest('[data-module-card]');

    if (cardButton) {
      event.preventDefault();
      const moduleId = cardButton.dataset.moduleId;

      if (!moduleId || !MODULE_CARD_IDS.has(moduleId)) {
        return;
      }

      handleModuleSelection(rootElement, sector, moduleId, viewState.authenticatedUser);
      return;
    }

    const retryButton = event.target.closest('[data-module-retry]');

    if (retryButton) {
      event.preventDefault();
      const moduleId = retryButton.dataset.moduleId;

      if (moduleId) {
        handleModuleSelection(rootElement, sector, moduleId, viewState.authenticatedUser, { forceRefresh: true });
      }

      return;
    }

    const backButton = event.target.closest('[data-module-back]');

    if (backButton) {
      event.preventDefault();
      clearSelectedModule(rootElement, sector);
      return;
    }

    const sortButton = event.target.closest('[data-module-sort]');

    if (sortButton) {
      event.preventDefault();
      toggleModuleSort(rootElement, sector);
      return;
    }

    const viewButton = event.target.closest('[data-module-view]');

    if (viewButton) {
      event.preventDefault();
      setModuleView(rootElement, sector, viewButton.dataset.moduleView || 'grid');
      return;
    }

    const videoButton = event.target.closest('[data-video-embed-url]');

    if (videoButton) {
      event.preventDefault();
      openVideoModal({
        title: videoButton.dataset.videoTitle || 'Vídeo de treinamento',
        embedUrl: videoButton.dataset.videoEmbedUrl || '',
      });
      return;
    }

    const documentButton = event.target.closest('[data-document-preview-url]');

    if (documentButton) {
      event.preventDefault();
      openDocumentModal({
        title: documentButton.dataset.documentTitle || 'Documento',
        previewUrl: documentButton.dataset.documentPreviewUrl || '',
      });
      return;
    }

    const userAdminSearchButton = event.target.closest('[data-user-admin-search]');

    if (userAdminSearchButton) {
      event.preventDefault();
      searchUserAdminRecords(rootElement, sector);
      return;
    }

    const userAdminEditButton = event.target.closest('[data-user-admin-edit]');

    if (userAdminEditButton) {
      event.preventDefault();
      editUserAdminRecord(rootElement, sector, userAdminEditButton.dataset.userId || '');
      return;
    }

    const userAdminClearButton = event.target.closest('[data-user-admin-clear]');

    if (userAdminClearButton) {
      event.preventDefault();
      clearUserAdminForm(rootElement, sector);
      return;
    }

    const userAdminSaveButton = event.target.closest('[data-user-admin-save]');

    if (userAdminSaveButton) {
      event.preventDefault();
      saveUserAdminRecord(rootElement, sector);
      return;
    }

    const userAdminResetPasswordButton = event.target.closest('[data-user-admin-reset-password]');

    if (userAdminResetPasswordButton) {
      event.preventDefault();
      resetUserAdminPassword(rootElement, sector);
      return;
    }

    const userAdminCopyPasswordButton = event.target.closest('[data-user-admin-copy-password]');

    if (userAdminCopyPasswordButton) {
      event.preventDefault();
      copyUserAdminPassword(rootElement, sector);
      return;
    }

    const evaluationToolButton = event.target.closest('[data-evaluation-tool]');

    if (evaluationToolButton) {
      event.preventDefault();
      selectEvaluationTool(rootElement, sector, evaluationToolButton.dataset.evaluationTool || '');
      return;
    }

    const evaluationToolsBackButton = event.target.closest('[data-evaluation-tools-back]');

    if (evaluationToolsBackButton) {
      event.preventDefault();
      clearSelectedEvaluationTool(rootElement, sector);
      return;
    }

    const evaluateeToggle = event.target.closest('[data-evaluatee-toggle]');

    if (evaluateeToggle) {
      event.preventDefault();
      toggleEvaluationDropdown(rootElement, sector);
      return;
    }

    const evaluateeOption = event.target.closest('[data-evaluatee-option]');

    if (evaluateeOption) {
      event.preventDefault();
      selectEvaluationUser(rootElement, sector, evaluateeOption.dataset.userId || '');
      return;
    }

    const evaluationSaveButton = event.target.closest('[data-evaluation-save]');

    if (evaluationSaveButton) {
      event.preventDefault();
      saveEvaluationResult(rootElement, sector);
      return;
    }

    const evaluationDownloadGraphButton = event.target.closest('[data-evaluation-download-graph]');

    if (evaluationDownloadGraphButton) {
      event.preventDefault();
      downloadEvaluationGraph(rootElement, sector);
      return;
    }

    const feedbackTargetToggle = event.target.closest('[data-feedback-target-toggle]');

    if (feedbackTargetToggle) {
      event.preventDefault();
      toggleFeedbackDropdown(rootElement, sector);
      return;
    }

    const feedbackTargetOption = event.target.closest('[data-feedback-target-option]');

    if (feedbackTargetOption) {
      event.preventDefault();
      selectFeedbackUser(rootElement, sector, feedbackTargetOption.dataset.userId || '');
      return;
    }

    if (!event.target.closest('[data-evaluation-picker]')) {
      closeEvaluationDropdown(rootElement, sector);
    }

    if (!event.target.closest('[data-feedback-picker]')) {
      closeFeedbackDropdown(rootElement, sector);
    }
  };

  const inputHandler = (event) => {
    const searchInput = event.target.closest('[data-module-search]');

    if (searchInput) {
      updateModuleQuery(rootElement, sector, searchInput.value || '');
      return;
    }

    const evaluateeSearchInput = event.target.closest('[data-evaluatee-search]');

    if (evaluateeSearchInput) {
      updateEvaluationSearch(rootElement, sector, evaluateeSearchInput.value || '');
      return;
    }

    const feedbackSearchInput = event.target.closest('[data-feedback-target-search]');

    if (feedbackSearchInput) {
      updateFeedbackSearch(rootElement, sector, feedbackSearchInput.value || '');
      return;
    }

    const notesInput = event.target.closest('[data-evaluation-notes]');

    if (notesInput) {
      updateEvaluationNotes(rootElement, sector, notesInput.value || '');
      return;
    }

    const evaluationFieldInput = event.target.closest('[data-evaluation-field]');

    if (evaluationFieldInput) {
      updateEvaluationField(
        rootElement,
        sector,
        evaluationFieldInput.dataset.evaluationField || '',
        evaluationFieldInput.value || '',
      );
      return;
    }

    const feedbackMessageInput = event.target.closest('[data-feedback-message]');

    if (feedbackMessageInput) {
      updateFeedbackField(rootElement, sector, 'feedbackMessage', feedbackMessageInput.value || '');
    }
  };

  const changeHandler = (event) => {
    const scoreInput = event.target.closest('[data-evaluation-score]');

    if (scoreInput) {
      updateEvaluationScore(
        rootElement,
        sector,
        scoreInput.dataset.criterionId || '',
        scoreInput.dataset.period || '',
        scoreInput.value || '',
      );
      return;
    }

    const feedbackCategorySelect = event.target.closest('[data-feedback-category]');

    if (feedbackCategorySelect) {
      updateFeedbackField(rootElement, sector, 'feedbackCategory', feedbackCategorySelect.value || '');
    }
  };

  rootElement.__buildConnectContentClickHandler = clickHandler;
  rootElement.__buildConnectContentInputHandler = inputHandler;
  rootElement.__buildConnectContentChangeHandler = changeHandler;
  rootElement.addEventListener('click', clickHandler);
  rootElement.addEventListener('input', inputHandler);
  rootElement.addEventListener('change', changeHandler);
}

function getViewMarkup(viewState) {
  if (viewState.isWelcome) {
    return getWelcomeViewMarkup(viewState.authenticatedUser);
  }

  if (viewState.shouldRenderCards) {
    return getSectorCardsViewMarkup(viewState.selectedItem);
  }

  return getWelcomeViewMarkup(viewState.authenticatedUser);
}

function getWelcomeViewMarkup(authenticatedUser) {
  const greeting = getWelcomeGreeting(authenticatedUser);

  return `
    <section class="content-panel" aria-labelledby="content-title" data-view-panel>
      <div class="welcome-header reveal-item" data-reveal>
        <p class="eyebrow">Mensagem de boas-vindas</p>
        <h1 id="content-title">${sanitizeText(greeting.title)}</h1>
        <p class="content-description">${sanitizeText(greeting.description)}</p>
      </div>

      <section class="welcome-showcase reveal-item" data-reveal aria-label="Painel principal de boas-vindas">
        <article class="welcome-video-card">
          <div class="welcome-video-frame">
            <iframe
              src="${sanitizeAttribute(WELCOME_VIDEO.embedUrl)}"
              title="${sanitizeAttribute(WELCOME_VIDEO.title)}"
              loading="lazy"
              referrerpolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
            ></iframe>
          </div>
        </article>

        <article class="welcome-copy-card">
          <p class="eyebrow">Hub de integração</p>
          <h2 class="welcome-section-title">Seja bem-vindo(a) ao Build.Connect</h2>
          <div class="welcome-copy-flow">
            <p>Este ambiente foi preparado para centralizar os conteúdos essenciais de integração, padronizar o acesso às informações e apoiar sua jornada em cada setor da empresa.</p>
            <p>Aqui você encontrará documentos, instruções escritas, vídeos e materiais de acompanhamento que ajudam a entender processos, rotinas e responsabilidades com mais clareza.</p>
            <p>Use a navegação lateral para acessar os setores e consulte este painel inicial sempre que precisar retomar a visão geral do projeto.</p>
          </div>
        </article>
      </section>
    </section>
  `;
}

function getWelcomeGreeting(authenticatedUser) {
  const normalizedName = String(authenticatedUser?.nome || '').trim();

  if (!normalizedName) {
    return {
      title: 'Bem-vindo ao Build.Connect',
      description: 'Acompanhe os conteúdos de integração e acesse as informações principais de cada setor em um único lugar.',
    };
  }

  const firstName = normalizedName.split(/\s+/)[0];
  const hour = new Date().getHours();
  const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return {
    title: `${period}, ${firstName}.`,
    description: 'Sua central de integração está pronta para apoiar sua navegação pelos setores e conteúdos institucionais.',
  };
}

function getSectorCardsViewMarkup(sector) {
  const stageState = getModuleState(sector.id);

  if (stageState.selectedModuleId) {
    return getModulePageViewMarkup(sector, stageState);
  }

  const breadcrumb = getSectorBreadcrumb(sector);
  const cards = getCardsForSector(sector.id);
  const cardsLabel = isDhoSector(sector.id) ? 'Cards do setor DHO' : 'Cards padrão do setor';

  return `
    <section class="content-panel" aria-labelledby="content-title" data-view-panel>
      <div class="content-header">
        <div>
          <p class="eyebrow reveal-item" data-reveal>Setor selecionado</p>
          <h1 id="content-title" class="reveal-item" data-reveal>${breadcrumb}</h1>
          <p class="content-description reveal-item" data-reveal>${sector.description}</p>
        </div>
      </div>

      <div class="cards-grid" aria-label="${cardsLabel}">
        ${cards.map((card) => renderFeatureCard(card, breadcrumb, stageState.selectedModuleId)).join('')}
      </div>
    </section>
  `;
}

function getModulePageViewMarkup(sector, stageState) {
  const breadcrumb = getSectorBreadcrumb(sector);
  const selectedCard = getCardsForSector(sector.id).find((card) => card.id === stageState.selectedModuleId);
  const moduleTitle = selectedCard?.title || 'Módulo';
  const moduleDescription = selectedCard
    ? selectedCard.getDescription(breadcrumb)
    : `Conteúdo do setor ${breadcrumb}.`;

  return `
    <section class="content-panel module-page-panel" aria-labelledby="content-title" data-view-panel>
      <div class="module-page-header reveal-item" data-reveal>
        <button type="button" class="module-back-button" data-module-back aria-label="Voltar para os cards do setor ${sanitizeAttribute(breadcrumb)}">
          <i data-lucide="arrow-left"></i>
          <span>Voltar</span>
        </button>

        <div class="module-page-copy">
          <p class="eyebrow">Conteúdo do módulo</p>
          <h1 id="content-title">${sanitizeText(moduleTitle)}</h1>
          <p class="content-description">${sanitizeText(moduleDescription)}</p>
          <span class="module-page-breadcrumb">${sanitizeText(breadcrumb)}</span>
        </div>
      </div>

      <section class="module-page-body module-stage reveal-item" data-reveal aria-live="polite" data-module-stage data-sector-id="${sector.id}">
        ${getModuleStageMarkup(sector, stageState)}
      </section>
    </section>
  `;
}

function renderFeatureCard(card, sectorName, selectedModuleId) {
  const isSelected = selectedModuleId === card.id;

  return `
    <button
      type="button"
      class="feature-card feature-card-button reveal-item ${isSelected ? 'is-selected' : ''}"
      data-reveal
      data-module-card
      data-module-id="${card.id}"
      aria-pressed="${String(isSelected)}"
      aria-label="Abrir módulo ${card.title} do setor ${sectorName}"
    >
      <span class="card-icon" aria-hidden="true">
        <i data-lucide="${card.icon}"></i>
      </span>
      <h2 class="card-title">${card.title}</h2>
      <p class="card-description">${card.getDescription(sectorName)}</p>
      <div class="feature-card-footer">
        <span class="feature-card-status">Padrão</span>
        <span class="feature-card-hint">${card.hint}</span>
      </div>
    </button>
  `;
}

function getModuleStageMarkup(sector, stageState) {
  if (!stageState.selectedModuleId) {
    return `
      <div class="module-shell is-empty" data-module-shell>
        <div class="module-shell-header">
          <div>
            <p class="module-eyebrow">Conteúdo do módulo</p>
            <h2 class="module-title">Selecione um card para continuar</h2>
            <p class="module-description">
              Escolha um dos módulos acima para abrir documentos, instruções ou vídeos relacionados ao setor ${sector.label}.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  const selectedCard = getCardsForSector(sector.id).find((card) => card.id === stageState.selectedModuleId);

  if (!selectedCard) {
    return '';
  }

  if (stageState.status === 'loading') {
    return getModuleLoadingMarkup(selectedCard);
  }

  if (stageState.status === 'error') {
    return getModuleErrorMarkup(selectedCard, stageState.errorMessage);
  }

  if (stageState.selectedModuleId === 'instrucoes-video') {
    return getVideoModuleMarkup(selectedCard, stageState.moduleData, stageState.ui);
  }

  if (stageState.selectedModuleId === 'documentos' || stageState.selectedModuleId === 'instrucoes-escritas') {
    return getDocumentModuleMarkup(selectedCard, stageState.moduleData, stageState.ui);
  }

  if (stageState.selectedModuleId === 'cadastro-usuarios') {
    return getUserManagementModuleMarkup(selectedCard, stageState.moduleData, stageState.ui);
  }

  if (stageState.selectedModuleId === 'avaliacao') {
    return getEvaluationModuleMarkup(selectedCard, stageState.moduleData, stageState.ui);
  }

  if (stageState.selectedModuleId === 'feedback') {
    return getFeedbackModuleMarkup(selectedCard, stageState.moduleData, stageState.ui);
  }

  return getInternalModuleMarkup(selectedCard);
}

function getModuleLoadingMarkup(card) {
  return `
    <div class="module-shell" data-module-shell>
      <div class="module-shell-header">
        <div>
          <p class="module-eyebrow">Carregando conteúdo</p>
          <h2 class="module-title">${card.title}</h2>
          <p class="module-description">Estamos buscando os itens deste módulo.</p>
        </div>
      </div>

      <div class="module-items-grid" aria-hidden="true">
        ${Array.from({ length: card.id === 'instrucoes-video' ? 4 : 6 }, (_, index) => getSkeletonCardMarkup(index)).join('')}
      </div>
    </div>
  `;
}

function getModuleErrorMarkup(card, message) {
  return `
    <div class="module-shell" data-module-shell>
      <div class="module-shell-header">
        <div>
          <p class="module-eyebrow">Falha ao carregar</p>
          <h2 class="module-title">${card.title}</h2>
          <p class="module-description">${message}</p>
        </div>
      </div>

      <div class="empty-state is-compact">
        <span class="empty-state-icon" aria-hidden="true">
          <i data-lucide="wifi-off"></i>
        </span>
        <div>
          <h3 class="card-title">Não foi possível concluir a consulta</h3>
          <p class="card-description">Verifique a configuração da integração e tente novamente.</p>
        </div>
        <button type="button" class="module-action-button" data-module-retry data-module-id="${card.id}">
          <i data-lucide="refresh-cw"></i>
          <span>Tentar novamente</span>
        </button>
      </div>
    </div>
  `;
}

function getDocumentModuleMarkup(card, moduleData, moduleUi) {
  const items = Array.isArray(moduleData?.items) ? moduleData.items : [];

  if (!items.length) {
    return getModuleEmptyMarkup(card, moduleData?.emptyMessage || 'Nenhum arquivo foi encontrado para este módulo.');
  }

  const preparedItems = prepareModuleItems(items, moduleUi, 'document');

  return `
    <div class="module-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked">
        <div>
          <p class="module-eyebrow">Conteúdo carregado</p>
          <h2 class="module-title">${card.title}</h2>
          <p class="module-description">Arquivos listados automaticamente a partir do Google Drive.</p>
        </div>

        ${getModuleToolbarMarkup(card.id, moduleUi, items.length, preparedItems.length, 'Busque por nome do arquivo')}
      </div>

      <div class="module-items-grid module-items-grid-docs ${moduleUi.view === 'list' ? 'is-list-view' : 'is-grid-view'}" data-module-items-container>
        ${preparedItems.length ? preparedItems.map(renderDocumentItemCard).join('') : getModuleSearchEmptyMarkup()}
      </div>
    </div>
  `;
}

function renderDocumentItemCard(item) {
  const extension = sanitizeText(item.extension || 'Arquivo').toUpperCase();
  const modifiedLabel = formatDateLabel(item.modifiedAt);
  const sizeLabel = sanitizeText(item.sizeLabel || '');
  const metadata = [extension, modifiedLabel, sizeLabel].filter(Boolean);
  const previewUrl = resolveDocumentPreviewUrl(item);
  const canPreview = Boolean(previewUrl);

  return `
    <article class="module-item-card" data-module-entry>
      <div class="module-item-header">
        <span class="card-icon module-item-icon" aria-hidden="true">
          <i data-lucide="file-text"></i>
        </span>
        <div class="module-item-copy">
          <h3 class="module-item-title">${sanitizeText(item.name || 'Arquivo sem nome')}</h3>
          <p class="module-item-meta">${metadata.join(' • ')}</p>
        </div>
      </div>

      <div class="module-item-actions">
        <button
          type="button"
          class="module-link-button"
          data-document-preview-url="${sanitizeAttribute(previewUrl)}"
          data-document-title="${sanitizeAttribute(item.name || 'Documento')}"
          ${canPreview ? '' : 'disabled'}
        >
          <i data-lucide="external-link"></i>
          <span>Abrir</span>
        </button>
      </div>
    </article>
  `;
}

function getVideoModuleMarkup(card, moduleData, moduleUi) {
  const items = Array.isArray(moduleData?.items) ? moduleData.items : [];

  if (!items.length) {
    return getModuleEmptyMarkup(card, moduleData?.emptyMessage || 'Nenhum vídeo foi encontrado para este módulo.');
  }

  const preparedItems = prepareModuleItems(items, moduleUi, 'video');

  return `
    <div class="module-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked">
        <div>
          <p class="module-eyebrow">Conteúdo carregado</p>
          <h2 class="module-title">${card.title}</h2>
          <p class="module-description">Vídeos carregados automaticamente a partir da playlist configurada no YouTube.</p>
        </div>

        ${getModuleToolbarMarkup(card.id, moduleUi, items.length, preparedItems.length, 'Busque por título do vídeo')}
      </div>

      <div class="module-items-grid module-items-grid-video ${moduleUi.view === 'list' ? 'is-list-view' : 'is-grid-view'}" data-module-items-container>
        ${preparedItems.length ? preparedItems.map(renderVideoItemCard).join('') : getModuleSearchEmptyMarkup()}
      </div>
    </div>
  `;
}

function renderVideoItemCard(item) {
  const thumbnail = sanitizeAttribute(item.thumbnailUrl || '');
  const title = sanitizeText(item.title || 'Vídeo sem título');
  const embedUrl = sanitizeAttribute(item.embedUrl || '');

  return `
    <article class="module-item-card is-video" data-module-entry>
      <div class="video-thumb-wrap">
        <img class="video-thumb" src="${thumbnail}" alt="Thumbnail do vídeo ${title}" loading="lazy" />
        <span class="video-duration-badge">${sanitizeText(item.durationLabel || '00:00')}</span>
      </div>

      <div class="module-item-copy">
        <h3 class="module-item-title">${title}</h3>
      </div>

      <div class="module-item-actions">
        <button
          type="button"
          class="module-link-button"
          data-video-embed-url="${embedUrl}"
          data-video-title="${sanitizeAttribute(item.title || 'Vídeo de treinamento')}"
        >
          <i data-lucide="play"></i>
          <span>Assistir</span>
        </button>
      </div>
    </article>
  `;
}

function getInternalModuleMarkup(card) {
  return `
    <div class="module-shell" data-module-shell>
      <div class="module-shell-header">
        <div>
          <p class="module-eyebrow">Fluxo interno</p>
          <h2 class="module-title">${card.title}</h2>
          <p class="module-description">Este módulo está pronto para receber a lógica interna do Build.Connect em uma próxima etapa.</p>
        </div>
      </div>

      <div class="empty-state is-compact">
        <span class="empty-state-icon" aria-hidden="true">
          <i data-lucide="sparkles"></i>
        </span>
        <div>
          <h3 class="card-title">Módulo preparado</h3>
          <p class="card-description">A estrutura deste card já foi criada e pode receber a implementação específica quando você solicitar.</p>
        </div>
      </div>
    </div>
  `;
}

function getModuleEmptyMarkup(card, message) {
  return `
    <div class="module-shell" data-module-shell>
      <div class="module-shell-header">
        <div>
          <p class="module-eyebrow">Sem itens disponíveis</p>
          <h2 class="module-title">${card.title}</h2>
          <p class="module-description">${message}</p>
        </div>
      </div>

      <div class="empty-state is-compact">
        <span class="empty-state-icon" aria-hidden="true">
          <i data-lucide="folder-search"></i>
        </span>
        <div>
          <h3 class="card-title">Nenhum conteúdo encontrado</h3>
          <p class="card-description">Assim que houver itens configurados para este setor, eles aparecerão aqui automaticamente.</p>
        </div>
      </div>
    </div>
  `;
}

function getModuleToolbarMarkup(moduleId, moduleUi, totalCount, filteredCount, searchPlaceholder) {
  const sortLabel = moduleUi.sort === 'az' ? 'A-Z' : 'Z-A';

  return `
    <div class="module-toolbar" aria-label="Controles de visualização do módulo">
      <button type="button" class="module-control-button" data-module-sort data-module-id="${moduleId}" aria-label="Alternar ordenação alfabética">
        <i data-lucide="arrow-up-down"></i>
        <span>${sortLabel}</span>
      </button>

      <div class="module-view-toggle" role="group" aria-label="Alternar visualização do conteúdo">
        <button type="button" class="module-view-button ${moduleUi.view === 'grid' ? 'is-active' : ''}" data-module-view="grid" aria-pressed="${String(moduleUi.view === 'grid')}">
          <i data-lucide="layout-grid"></i>
          <span class="visually-hidden">Visualização em grade</span>
        </button>
        <button type="button" class="module-view-button ${moduleUi.view === 'list' ? 'is-active' : ''}" data-module-view="list" aria-pressed="${String(moduleUi.view === 'list')}">
          <i data-lucide="list"></i>
          <span class="visually-hidden">Visualização em lista</span>
        </button>
      </div>

      <label class="module-search-shell" aria-label="Pesquisar itens do módulo">
        <i data-lucide="search"></i>
        <input type="search" value="${sanitizeAttribute(moduleUi.query)}" placeholder="${sanitizeAttribute(searchPlaceholder)}" data-module-search autocomplete="off" />
      </label>

      <span class="module-results-count">${filteredCount}/${totalCount}</span>
    </div>
  `;
}

function getModuleSearchEmptyMarkup() {
  return `
    <div class="empty-state is-compact is-search-empty">
      <span class="empty-state-icon" aria-hidden="true">
        <i data-lucide="search-x"></i>
      </span>
      <div>
        <h3 class="card-title">Nenhum item encontrado</h3>
        <p class="card-description">Ajuste a pesquisa ou altere a ordenação para localizar o conteúdo desejado.</p>
      </div>
    </div>
  `;
}

function getSkeletonCardMarkup(index) {
  return `
    <article class="module-item-card is-skeleton" data-skeleton-index="${index}">
      <div class="skeleton-line skeleton-line-thumb"></div>
      <div class="skeleton-line skeleton-line-title"></div>
      <div class="skeleton-line skeleton-line-meta"></div>
      <div class="skeleton-actions">
        <div class="skeleton-line skeleton-line-action"></div>
        <div class="skeleton-line skeleton-line-action"></div>
      </div>
    </article>
  `;
}

function isInternalModule(sectorId, moduleId) {
  if (isDhoSector(sectorId)) {
    return true;
  }

  return moduleId === 'avaliacao' || moduleId === 'feedback';
}

function requiresActiveUsers(moduleId) {
  return moduleId === 'avaliacao' || moduleId === 'feedback';
}

async function handleModuleSelection(rootElement, sector, moduleId, authenticatedUser, options = {}) {
  const { forceRefresh = false } = options;
  const currentState = getModuleState(sector.id);

  if (!forceRefresh && currentState.selectedModuleId === moduleId && currentState.status === 'success') {
    return;
  }

  setModuleState(sector.id, {
    selectedModuleId: moduleId,
    status: 'loading',
    moduleData: null,
    errorMessage: '',
    ui: { ...MODULE_UI_DEFAULTS },
  });
  renderModuleStage(rootElement, sector);

  if (requiresActiveUsers(moduleId)) {
    const defaultUi = moduleId === 'avaliacao'
      ? { ...MODULE_UI_DEFAULTS, ...EVALUATION_UI_DEFAULTS }
      : { ...MODULE_UI_DEFAULTS, ...FEEDBACK_UI_DEFAULTS };

    try {
      const usersResponse = await loadActiveUsers({ forceRefresh });

      if (!usersResponse.success) {
        setModuleState(sector.id, {
          selectedModuleId: moduleId,
          status: 'error',
          moduleData: null,
          errorMessage: usersResponse.message || 'Não foi possível carregar os usuários ativos.',
          ui: defaultUi,
        });
        renderModuleStage(rootElement, sector);
        return;
      }

      setModuleState(sector.id, {
        selectedModuleId: moduleId,
        status: 'success',
        moduleData: {
          module: { id: moduleId, source: MODULE_SOURCE_LABELS[moduleId] || 'Build.Connect' },
          respondent: authenticatedUser || null,
          evaluationSector: {
            id: sector.id,
            label: getSectorBreadcrumb(sector),
          },
          users: Array.isArray(usersResponse.users) ? usersResponse.users : [],
        },
        errorMessage: '',
        ui: defaultUi,
      });
      renderModuleStage(rootElement, sector);
      return;
    } catch (error) {
      setModuleState(sector.id, {
        selectedModuleId: moduleId,
        status: 'error',
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
      status: 'success',
      moduleData: {
        module: { id: moduleId, source: MODULE_SOURCE_LABELS[moduleId] || 'Build.Connect' },
        items: [],
      },
      errorMessage: '',
      ui: { ...MODULE_UI_DEFAULTS },
    });
    renderModuleStage(rootElement, sector);
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
        status: 'success',
        moduleData: response,
        errorMessage: '',
        ui: currentState.selectedModuleId === moduleId ? currentState.ui || { ...MODULE_UI_DEFAULTS } : { ...MODULE_UI_DEFAULTS },
      });
    } else {
      setModuleState(sector.id, {
        selectedModuleId: moduleId,
        status: 'error',
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
      status: 'error',
      moduleData: null,
      errorMessage: error?.message || 'Não foi possível carregar o conteúdo deste módulo.',
      ui: currentState.selectedModuleId === moduleId ? currentState.ui || { ...MODULE_UI_DEFAULTS } : { ...MODULE_UI_DEFAULTS },
    });
  }

  renderModuleStage(rootElement, sector);
}

function toggleModuleSort(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (!state.selectedModuleId) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...MODULE_UI_DEFAULTS,
      ...(state.ui || {}),
      sort: state.ui?.sort === 'az' ? 'za' : 'az',
    },
  });

  renderModuleStage(rootElement, sector);
}

function setModuleView(rootElement, sector, view) {
  if (view !== 'grid' && view !== 'list') {
    return;
  }

  const state = getModuleState(sector.id);

  if (!state.selectedModuleId) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...MODULE_UI_DEFAULTS,
      ...(state.ui || {}),
      view,
    },
  });

  renderModuleStage(rootElement, sector);
}

function updateModuleQuery(rootElement, sector, query) {
  const state = getModuleState(sector.id);

  if (!state.selectedModuleId) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...MODULE_UI_DEFAULTS,
      ...(state.ui || {}),
      query,
    },
  });

  renderModuleStage(rootElement, sector);

  const searchInput = rootElement.querySelector('[data-module-search]');

  if (searchInput) {
    const caretPosition = query.length;
    searchInput.focus();
    searchInput.setSelectionRange(caretPosition, caretPosition);
  }
}

function clearSelectedModule(rootElement, sector) {
  setModuleState(sector.id, {
    selectedModuleId: '',
    status: 'idle',
    moduleData: null,
    errorMessage: '',
    ui: { ...MODULE_UI_DEFAULTS },
  });

  mountView(rootElement, {
    selectedItem: sector,
    isWelcome: false,
    shouldRenderCards: true,
    authenticatedUser: null,
  });
}

export function resetModuleSelectionForSector(sectorId) {
  if (!sectorId) {
    return;
  }

  MODULE_STATE_BY_SECTOR.set(sectorId, {
    selectedModuleId: '',
    status: 'idle',
    moduleData: null,
    errorMessage: '',
    ui: { ...MODULE_UI_DEFAULTS },
  });
}

function renderModuleStage(rootElement, sector) {
  const cards = rootElement.querySelectorAll('[data-module-card]');
  const stageElement = rootElement.querySelector('[data-module-stage]');
  const stageState = getModuleState(sector.id);

  cards.forEach((cardElement) => {
    const isSelected = cardElement.dataset.moduleId === stageState.selectedModuleId;
    cardElement.classList.toggle('is-selected', isSelected);
    cardElement.setAttribute('aria-pressed', String(isSelected));
  });

  if (!stageElement) {
    mountView(rootElement, {
      selectedItem: sector,
      isWelcome: false,
      shouldRenderCards: true,
      authenticatedUser: null,
    });
    return;
  }

  stageElement.innerHTML = getModuleStageMarkup(sector, stageState);
  stageElement.classList.remove('is-module-stage-visible');

  refreshLucideIcons(stageElement);

  requestAnimationFrame(() => {
    stageElement.classList.add('is-module-stage-visible');
  });
}

function getModuleState(sectorId) {
  return MODULE_STATE_BY_SECTOR.get(sectorId) || {
    selectedModuleId: '',
    status: 'idle',
    moduleData: null,
    errorMessage: '',
    ui: { ...MODULE_UI_DEFAULTS },
  };
}

function setModuleState(sectorId, state) {
  MODULE_STATE_BY_SECTOR.set(sectorId, state);
}

function prepareModuleItems(items, moduleUi, itemType) {
  const query = String(moduleUi?.query || '').trim().toLowerCase();
  const prepared = [...items]
    .filter((item) => {
      if (!query) {
        return true;
      }

      const haystack = itemType === 'video'
        ? `${item.title || ''} ${item.durationLabel || ''}`
        : `${item.name || ''} ${item.extension || ''} ${item.sizeLabel || ''}`;

      return haystack.toLowerCase().includes(query);
    })
    .sort((itemA, itemB) => {
      const valueA = String(itemType === 'video' ? itemA.title || '' : itemA.name || '').toLocaleLowerCase('pt-BR');
      const valueB = String(itemType === 'video' ? itemB.title || '' : itemB.name || '').toLocaleLowerCase('pt-BR');
      return moduleUi?.sort === 'za' ? valueB.localeCompare(valueA, 'pt-BR') : valueA.localeCompare(valueB, 'pt-BR');
    });

  return prepared;
}


function getUserManagementModuleMarkup(card, moduleData, moduleUi) {
  const adminUi = getUserAdminUiState(moduleUi);
  const isEditMode = adminUi.mode === 'edit';
  const saveLabel = isEditMode ? 'Salvar edição' : 'Cadastrar usuário';
  const saveIcon = isEditMode ? 'save' : 'user-plus';
  const panelTitle = isEditMode ? 'Editar cadastro' : 'Novo cadastro';
  const panelSubtitle = isEditMode
    ? `Atualize os dados de ${sanitizeText(adminUi.originalId)} mantendo o acesso sincronizado com a planilha.`
    : 'Preencha os dados essenciais para criar um novo acesso com senha temporária.';

  return `
    <div class="module-shell user-admin-shell" data-module-shell>
      <div class="module-shell-header user-admin-hero">
        <div class="user-admin-hero-copy">
          <p class="module-eyebrow">DHO · Gestão de acessos</p>
          <h2 class="module-title">${card.title}</h2>
          <p class="module-description">Cadastre, localize e edite acessos de colaboradores em uma área segura e integrada à planilha de credenciais.</p>
        </div>

        <div class="module-source-pill user-admin-hero-pill" aria-label="Cadastro integrado ao Google Sheets">
          <i data-lucide="shield-check"></i>
          <span>Planilha sincronizada</span>
        </div>
      </div>

      <div class="user-admin-grid">
        <section class="user-admin-card user-admin-card--form" aria-label="Formulário de cadastro de usuários">
          <div class="user-admin-card-head">
            <span class="card-icon user-admin-card-icon" aria-hidden="true"><i data-lucide="${isEditMode ? 'user-cog' : 'badge-plus'}"></i></span>
            <div class="user-admin-card-copy">
              <span class="evaluation-meta-label">${isEditMode ? 'Modo edição' : 'Cadastro de colaborador'}</span>
              <h3 class="user-admin-title">${panelTitle}</h3>
              <p class="user-admin-subtitle">${panelSubtitle}</p>
            </div>
            <span class="user-admin-mode-pill">${isEditMode ? 'Edição' : 'Cadastro'}</span>
          </div>

          <div class="user-admin-form-grid">
            <label class="form-field user-admin-field">
              <span class="form-label">ID do colaborador</span>
              <input class="user-admin-input" type="text" value="${sanitizeAttribute(adminUi.form.id)}" data-user-admin-field="id" autocomplete="off" placeholder="Ex.: 1024" aria-label="ID do colaborador" />
            </label>

            <label class="form-field user-admin-field">
              <span class="form-label">Nome completo</span>
              <input class="user-admin-input" type="text" value="${sanitizeAttribute(adminUi.form.nome)}" data-user-admin-field="nome" autocomplete="off" placeholder="Nome do colaborador" aria-label="Nome completo do colaborador" />
            </label>
          </div>

          <div class="user-admin-sector-block">
            <div class="user-admin-section-label">
              <span class="form-label">Setores de acesso</span>
              <small>Selecione um ou mais setores permitidos.</small>
            </div>
            <div class="user-admin-sector-grid" aria-label="Selecionar setores do usuário">
              ${USER_ADMIN_SECTOR_OPTIONS.map((option) => renderUserAdminSectorOption(option, adminUi.form.setores)).join('')}
            </div>
          </div>

          ${adminUi.feedbackMessage ? renderUserAdminFeedback(adminUi.feedbackMessage, adminUi.feedbackType) : ''}
          ${adminUi.passwordResult ? renderUserAdminPasswordResult(adminUi.passwordResult) : ''}

          <div class="user-admin-actions">
            <button type="button" class="module-action-button" data-user-admin-save ${adminUi.isSubmitting ? 'disabled' : ''}>
              <i data-lucide="${saveIcon}"></i>
              <span>${adminUi.isSubmitting ? 'Processando...' : saveLabel}</span>
            </button>
            ${isEditMode ? `
              <button type="button" class="module-link-button is-secondary" data-user-admin-reset-password ${adminUi.isSubmitting ? 'disabled' : ''}>
                <i data-lucide="key-round"></i>
                <span>Gerar nova senha</span>
              </button>
            ` : ''}
            <button type="button" class="module-link-button is-secondary" data-user-admin-clear ${adminUi.isSubmitting ? 'disabled' : ''}>
              <i data-lucide="rotate-ccw"></i>
              <span>Limpar</span>
            </button>
          </div>
        </section>

        <section class="user-admin-card user-admin-card--search" aria-label="Pesquisa de usuários cadastrados">
          <div class="user-admin-card-head">
            <span class="card-icon user-admin-card-icon" aria-hidden="true"><i data-lucide="users-round"></i></span>
            <div class="user-admin-card-copy">
              <span class="evaluation-meta-label">Consulta sob demanda</span>
              <h3 class="user-admin-title">Pesquisar usuário</h3>
              <p class="user-admin-subtitle">Localize um cadastro existente sem carregar todos os usuários ativos.</p>
            </div>
          </div>

          <div class="user-admin-search-row">
            <label class="module-search-shell user-admin-search-shell" aria-label="Pesquisar usuário por ID ou nome">
              <i data-lucide="search"></i>
              <input type="search" value="${sanitizeAttribute(adminUi.searchQuery)}" placeholder="Digite ID ou nome" data-user-admin-search-query autocomplete="off" aria-label="Pesquisar por ID ou nome" />
            </label>
            <button type="button" class="module-control-button" data-user-admin-search ${adminUi.isSubmitting || adminUi.searchStatus === 'loading' ? 'disabled' : ''}>
              <i data-lucide="search-check"></i>
              <span>${adminUi.searchStatus === 'loading' ? 'Buscando...' : 'Buscar'}</span>
            </button>
          </div>

          <div class="user-admin-results" aria-live="polite">
            ${renderUserAdminResults(adminUi)}
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderUserAdminSectorOption(option, selectedSectors) {
  const checked = selectedSectors.includes(option.id);

  return `
    <label class="user-admin-sector-option">
      <input type="checkbox" value="${sanitizeAttribute(option.id)}" data-user-admin-sector ${checked ? 'checked' : ''} />
      <span class="user-admin-sector-check" aria-hidden="true"><i data-lucide="check"></i></span>
      <span class="user-admin-sector-name">${sanitizeText(option.label)}</span>
    </label>
  `;
}

function renderUserAdminFeedback(message, type) {
  return `
    <div class="user-admin-feedback ${type === 'error' ? 'is-error' : 'is-success'}">
      <i data-lucide="${type === 'error' ? 'circle-alert' : 'circle-check'}"></i>
      <span>${sanitizeText(message)}</span>
    </div>
  `;
}

function renderUserAdminPasswordResult(password) {
  return `
    <div class="user-admin-password-box">
      <div>
        <span class="evaluation-meta-label">Senha temporária</span>
        <strong class="user-admin-password-value">${sanitizeText(password)}</strong>
      </div>
      <button type="button" class="module-link-button is-secondary" data-user-admin-copy-password data-password="${sanitizeAttribute(password)}">
        <i data-lucide="copy"></i>
        <span>Copiar</span>
      </button>
    </div>
  `;
}

function renderUserAdminResults(adminUi) {
  if (adminUi.searchStatus === 'loading') {
    return `
      <div class="empty-state is-compact user-admin-empty-state">
        <span class="empty-state-icon" aria-hidden="true"><i data-lucide="loader-circle"></i></span>
        <div>
          <h3 class="card-title">Buscando usuários</h3>
          <p class="card-description">Aguarde enquanto consultamos a planilha Usuarios.</p>
        </div>
      </div>
    `;
  }

  if (!adminUi.searchResults.length && adminUi.searchStatus === 'idle') {
    return '';
  }

  if (!adminUi.searchResults.length) {
    return `
      <div class="empty-state is-compact user-admin-empty-state">
        <span class="empty-state-icon" aria-hidden="true"><i data-lucide="user-search"></i></span>
        <div>
          <h3 class="card-title">${adminUi.searchStatus === 'success' ? 'Nenhum usuário encontrado' : 'Erro na busca'}</h3>
          <p class="card-description">${sanitizeText(adminUi.searchMessage)}</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="user-admin-result-list">
      ${adminUi.searchResults.map(renderUserAdminResultItem).join('')}
    </div>
  `;
}

function renderUserAdminResultItem(user) {
  return `
    <article class="user-admin-result-card">
      <span class="user-admin-result-icon" aria-hidden="true"><i data-lucide="user-round"></i></span>
      <div class="user-admin-result-copy">
        <strong class="user-admin-result-id">${sanitizeText(user.id)}</strong>
        <p class="user-admin-result-name">${sanitizeText(user.nome)}</p>
      </div>
      <span class="user-admin-status ${user.status ? 'is-active' : 'is-inactive'}">${user.status ? 'Ativo' : 'Inativo'}</span>
      <button type="button" class="module-link-button is-secondary" data-user-admin-edit data-user-id="${sanitizeAttribute(user.id)}">
        <i data-lucide="pencil"></i>
        <span>Editar</span>
      </button>
    </article>
  `;
}

function getUserAdminUiState(moduleUi) {
  const mergedUi = {
    ...MODULE_UI_DEFAULTS,
    ...USER_ADMIN_UI_DEFAULTS,
    ...(moduleUi || {}),
  };

  const form = {
    ...USER_ADMIN_UI_DEFAULTS.form,
    ...(mergedUi.form || {}),
  };

  return {
    ...mergedUi,
    form: {
      ...form,
      setores: normalizeUserAdminSectors(form.setores),
    },
    searchResults: Array.isArray(mergedUi.searchResults) ? mergedUi.searchResults : [],
  };
}

function normalizeUserAdminSectors(sectors) {
  const values = Array.isArray(sectors) ? sectors : String(sectors || '').split(/[,;|]+/);
  const allowedIds = new Set(USER_ADMIN_SECTOR_OPTIONS.map((option) => option.id));
  const normalized = values
    .map((value) => String(value || '').trim())
    .filter((value) => allowedIds.has(value));

  if (normalized.includes('all')) {
    return ['all'];
  }

  return [...new Set(normalized.length ? normalized : ['dho'])];
}

function readUserAdminFormData(rootElement) {
  const id = rootElement.querySelector('[data-user-admin-field="id"]')?.value || '';
  const nome = rootElement.querySelector('[data-user-admin-field="nome"]')?.value || '';
  const setores = [...rootElement.querySelectorAll('[data-user-admin-sector]:checked')].map((input) => input.value);

  return {
    id: id.trim(),
    nome: nome.trim(),
    setores: normalizeUserAdminSectors(setores),
  };
}

function readUserAdminSearchQuery(rootElement) {
  return String(rootElement.querySelector('[data-user-admin-search-query]')?.value || '').trim();
}

async function searchUserAdminRecords(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'cadastro-usuarios') {
    return;
  }

  const query = readUserAdminSearchQuery(rootElement);
  const currentUi = getUserAdminUiState(state.ui);

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...currentUi,
      searchQuery: query,
      searchStatus: 'loading',
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
        searchStatus: response.success ? 'success' : 'error',
        searchResults: response.success ? response.users : [],
        searchMessage: response.message,
        feedbackMessage: response.success ? '' : response.message,
        feedbackType: response.success ? '' : 'error',
      },
    });
  } catch (error) {
    const nextState = getModuleState(sector.id);
    const nextUi = getUserAdminUiState(nextState.ui);

    setModuleState(sector.id, {
      ...nextState,
      ui: {
        ...nextUi,
        searchStatus: 'error',
        searchResults: [],
        searchMessage: error?.message || 'Não foi possível pesquisar usuários.',
        feedbackMessage: error?.message || 'Não foi possível pesquisar usuários.',
        feedbackType: 'error',
      },
    });
  }

  renderModuleStage(rootElement, sector);
}

function editUserAdminRecord(rootElement, sector, userId) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'cadastro-usuarios') {
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
        setores: normalizeUserAdminSectors(selectedUser.setorList || selectedUser.setor),
      },
      passwordResult: null,
      feedbackMessage: `Cadastro de ${selectedUser.nome} carregado para edição.`,
      feedbackType: 'success',
    },
  });

  renderModuleStage(rootElement, sector);
}

function clearUserAdminForm(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'cadastro-usuarios') {
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

  if (state.selectedModuleId !== 'cadastro-usuarios') {
    return;
  }

  const form = readUserAdminFormData(rootElement);
  const currentUi = getUserAdminUiState(state.ui);

  if (!form.id || !form.nome || !form.setores.length) {
    setModuleState(sector.id, {
      ...state,
      ui: {
        ...currentUi,
        form,
        feedbackMessage: 'Informe ID, nome e pelo menos um setor.',
        feedbackType: 'error',
        passwordResult: null,
      },
    });
    renderModuleStage(rootElement, sector);
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...currentUi,
      form,
      isSubmitting: true,
      feedbackMessage: '',
      feedbackType: '',
      passwordResult: null,
    },
  });
  renderModuleStage(rootElement, sector);

  try {
    const response = currentUi.mode === 'edit'
      ? await updateManagedUser({ originalId: currentUi.originalId, ...form })
      : await createManagedUser(form);
    const nextState = getModuleState(sector.id);
    const nextUi = getUserAdminUiState(nextState.ui);

    clearActiveUsersCache();

    setModuleState(sector.id, {
      ...nextState,
      ui: {
        ...nextUi,
        mode: response.success ? 'edit' : currentUi.mode,
        originalId: response.success ? (response.user?.id || form.id) : currentUi.originalId,
        form: response.success ? {
          id: response.user?.id || form.id,
          nome: response.user?.nome || form.nome,
          setores: normalizeUserAdminSectors(response.user?.setorList || form.setores),
        } : form,
        isSubmitting: false,
        passwordResult: response.generatedPassword || null,
        feedbackMessage: response.message,
        feedbackType: response.success ? 'success' : 'error',
      },
    });
  } catch (error) {
    const nextState = getModuleState(sector.id);
    const nextUi = getUserAdminUiState(nextState.ui);

    setModuleState(sector.id, {
      ...nextState,
      ui: {
        ...nextUi,
        form,
        isSubmitting: false,
        feedbackMessage: error?.message || 'Não foi possível salvar o cadastro.',
        feedbackType: 'error',
      },
    });
  }

  renderModuleStage(rootElement, sector);
}

async function resetUserAdminPassword(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'cadastro-usuarios') {
    return;
  }

  const currentUi = getUserAdminUiState(state.ui);
  const userId = currentUi.originalId || currentUi.form.id;

  if (!userId) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...currentUi,
      isSubmitting: true,
      feedbackMessage: '',
      feedbackType: '',
      passwordResult: null,
    },
  });
  renderModuleStage(rootElement, sector);

  try {
    const response = await resetManagedUserPassword(userId);
    const nextState = getModuleState(sector.id);
    const nextUi = getUserAdminUiState(nextState.ui);

    clearActiveUsersCache();

    setModuleState(sector.id, {
      ...nextState,
      ui: {
        ...nextUi,
        isSubmitting: false,
        passwordResult: response.generatedPassword || null,
        feedbackMessage: response.message,
        feedbackType: response.success ? 'success' : 'error',
      },
    });
  } catch (error) {
    const nextState = getModuleState(sector.id);
    const nextUi = getUserAdminUiState(nextState.ui);

    setModuleState(sector.id, {
      ...nextState,
      ui: {
        ...nextUi,
        isSubmitting: false,
        feedbackMessage: error?.message || 'Não foi possível redefinir a senha.',
        feedbackType: 'error',
      },
    });
  }

  renderModuleStage(rootElement, sector);
}

async function copyUserAdminPassword(rootElement, sector) {
  const password = rootElement.querySelector('[data-user-admin-copy-password]')?.dataset.password || '';
  const state = getModuleState(sector.id);

  if (!password || state.selectedModuleId !== 'cadastro-usuarios') {
    return;
  }

  const currentUi = getUserAdminUiState(state.ui);

  try {
    await navigator.clipboard.writeText(password);
    setModuleState(sector.id, {
      ...state,
      ui: {
        ...currentUi,
        feedbackMessage: 'Senha copiada para a área de transferência.',
        feedbackType: 'success',
      },
    });
  } catch {
    setModuleState(sector.id, {
      ...state,
      ui: {
        ...currentUi,
        feedbackMessage: 'Não foi possível copiar automaticamente. Copie a senha manualmente.',
        feedbackType: 'error',
      },
    });
  }

  renderModuleStage(rootElement, sector);
}



function getEvaluationModuleMarkup(card, moduleData, moduleUi) {
  const evaluationUi = getEvaluationUiState(moduleUi);
  const selectedTool = EVALUATION_TOOLS.find((tool) => tool.id === evaluationUi.selectedEvaluationToolId) || null;

  if (!selectedTool) {
    return getEvaluationToolsCatalogMarkup(card);
  }

  return getEvaluationToolFormMarkup(card, moduleData, evaluationUi, selectedTool);
}

function getEvaluationToolsCatalogMarkup(card) {
  return `
    <div class="module-shell evaluation-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked">
        <div>
          <p class="module-eyebrow">Avaliações</p>
          <h2 class="module-title">${card.title}</h2>
          <p class="module-description">Selecione uma das ferramentas disponíveis para abrir o preenchimento correspondente.</p>
        </div>
      </div>

      <div class="evaluation-tools-grid" aria-label="Ferramentas de avaliação disponíveis">
        ${EVALUATION_TOOLS.map((tool) => `
          <button type="button" class="evaluation-tool-card" data-evaluation-tool="${sanitizeAttribute(tool.id)}" aria-label="Abrir avaliação ${sanitizeAttribute(tool.title)}">
            <span class="card-icon evaluation-tool-icon" aria-hidden="true">
              <i data-lucide="${sanitizeAttribute(tool.icon)}"></i>
            </span>
            <span class="evaluation-tool-copy">
              <span class="evaluation-tool-hint">${sanitizeText(tool.hint)}</span>
              <strong class="evaluation-tool-title">${sanitizeText(tool.title)}</strong>
              <span class="evaluation-tool-description">${sanitizeText(tool.description)}</span>
            </span>
            <span class="evaluation-tool-arrow" aria-hidden="true">
              <i data-lucide="arrow-right"></i>
            </span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function getEvaluationToolFormMarkup(card, moduleData, evaluationUi, selectedTool) {
  const users = Array.isArray(moduleData?.users) ? moduleData.users : [];
  const respondent = moduleData?.respondent || null;
  const filteredUsers = getFilteredEvaluationUsers(users, evaluationUi.evaluateeQuery, evaluationUi.selectedEvaluateeId);
  const selectedUser = users.find((user) => user.id === evaluationUi.selectedEvaluateeId) || null;

  return `
    <div class="module-shell evaluation-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked evaluation-tool-header">
        <div>
          <button type="button" class="module-link-button is-secondary evaluation-tools-back" data-evaluation-tools-back>
            <i data-lucide="arrow-left"></i>
            <span>Ver avaliações</span>
          </button>
          <p class="module-eyebrow">Avaliações · ${sanitizeText(selectedTool.hint)}</p>
          <h2 class="module-title">${sanitizeText(selectedTool.title)}</h2>
          <p class="module-description">${sanitizeText(selectedTool.description)} Antes de responder, confirme quem está preenchendo e selecione o colaborador ativo que será avaliado.</p>
        </div>
      </div>

      <div class="evaluation-meta-grid">
        <div class="evaluation-meta-card">
          <span class="evaluation-meta-label">Respondente</span>
          <strong class="evaluation-meta-value">${sanitizeText(respondent?.id || 'Não identificado')}</strong>
          <span class="evaluation-meta-subvalue">${sanitizeText(respondent?.nome || 'Faça login novamente para identificar o usuário.')}</span>
        </div>

        <div class="evaluation-picker-block">
          <span class="evaluation-meta-label">Colaborador avaliado</span>
          <div class="evaluation-picker" data-evaluation-picker>
            <label class="module-search-shell evaluation-search-shell" aria-label="Pesquisar colaborador ativo">
              <i data-lucide="search"></i>
              <input
                type="search"
                value="${sanitizeAttribute(evaluationUi.evaluateeQuery)}"
                placeholder="Pesquise por ID ou nome do colaborador"
                data-evaluatee-search
                autocomplete="off"
              />
            </label>
            <button type="button" class="module-control-button" data-evaluatee-toggle aria-label="Abrir lista de colaboradores ativos" aria-expanded="${String(evaluationUi.isEvaluateeListOpen)}">
              <i data-lucide="chevrons-up-down"></i>
            </button>
            ${evaluationUi.isEvaluateeListOpen ? getEvaluationUsersDropdownMarkup(filteredUsers) : ''}
          </div>
          <span class="evaluation-picker-feedback">${selectedUser ? `Avaliação direcionada para ${sanitizeText(selectedUser.nome)}.` : 'Selecione um colaborador ativo para liberar o questionário.'}</span>
        </div>
      </div>

      ${selectedUser ? getEvaluationSelectedToolMarkup(selectedTool, selectedUser, evaluationUi, moduleData) : `
        <div class="empty-state is-compact">
          <span class="empty-state-icon" aria-hidden="true">
            <i data-lucide="users"></i>
          </span>
          <div>
            <h3 class="card-title">Selecione o colaborador avaliado</h3>
            <p class="card-description">O questionário é liberado depois que você escolher um usuário ativo na busca acima.</p>
          </div>
        </div>
      `}
    </div>
  `;
}

function getEvaluationSelectedToolMarkup(selectedTool, selectedUser, evaluationUi, moduleData) {
  if (selectedTool.id === EVALUATION_TOOL_IDS.BEHAVIORAL) {
    return getBehavioralEvaluationMarkup(selectedTool, selectedUser, evaluationUi, moduleData);
  }

  if (selectedTool.id === EVALUATION_TOOL_IDS.MATRIX) {
    return getMatrixEvaluationMarkup(selectedTool, selectedUser, evaluationUi, moduleData);
  }

  return getPreEffectiveEvaluationMarkup(selectedTool, evaluationUi);
}

function getPreEffectiveEvaluationMarkup(selectedTool, evaluationUi) {
  const totals = getEvaluationTotals(evaluationUi.evaluationScores, selectedTool.id);
  const notes = getEvaluationToolNotes(evaluationUi, selectedTool.id);

  return `
    <div class="evaluation-table-wrap">
      <table class="evaluation-table">
        <thead>
          <tr>
            <th>Critérios de avaliação</th>
            ${EVALUATION_PERIODS.map((period) => `<th>${period.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${EVALUATION_CRITERIA.map((criterion, index) => getEvaluationCriterionRowMarkup(selectedTool.id, criterion, index, evaluationUi.evaluationScores)).join('')}
          <tr>
            <th>Total</th>
            ${EVALUATION_PERIODS.map((period) => `<td class="evaluation-total-cell">${totals[period.id] || 0}</td>`).join('')}
          </tr>
        </tbody>
      </table>
    </div>

    <label class="form-field evaluation-notes-field">
      <span class="form-label">Observações</span>
      <textarea class="evaluation-notes-textarea" rows="4" data-evaluation-notes placeholder="Registre observações importantes sobre a avaliação.">${sanitizeText(notes)}</textarea>
    </label>
  `;
}

function getBehavioralEvaluationMarkup(selectedTool, selectedUser, evaluationUi, moduleData) {
  const fields = getEvaluationToolFields(evaluationUi, selectedTool.id);
  const respondent = moduleData?.respondent || null;
  const respondentName = String(respondent?.nome || '').trim();
  const evaluationSectorName = String(moduleData?.evaluationSector?.label || '').trim();

  return `
    <div class="evaluation-form-grid">
      <label class="form-field evaluation-form-field">
        <span class="form-label">Funcionário</span>
        <input class="evaluation-form-input" type="text" value="${sanitizeAttribute(selectedUser.nome || '')}" readonly aria-label="Funcionário avaliado" />
      </label>

      <label class="form-field evaluation-form-field">
        <span class="form-label">Data da avaliação</span>
        <input class="evaluation-form-input" type="date" value="${sanitizeAttribute(fields.evaluationDate)}" data-evaluation-field="evaluationDate" aria-label="Data da avaliação" />
      </label>

      <label class="form-field evaluation-form-field">
        <span class="form-label">Chefia imediata</span>
        <input class="evaluation-form-input" type="text" value="${sanitizeAttribute(respondentName || 'Respondente não identificado')}" readonly aria-label="Chefia imediata" />
      </label>

      <label class="form-field evaluation-form-field">
        <span class="form-label">Setor</span>
        <input class="evaluation-form-input" type="text" value="${sanitizeAttribute(evaluationSectorName || 'Setor não identificado')}" readonly aria-label="Setor da avaliação" />
      </label>
    </div>

    <div class="evaluation-table-wrap">
      <table class="evaluation-table evaluation-table--behavioral">
        <thead>
          <tr>
            <th>Critérios de avaliação</th>
            ${BEHAVIORAL_EVALUATION_OPTIONS.map((option) => `<th title="${sanitizeAttribute(option.title)}">${sanitizeText(option.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${EVALUATION_CRITERIA.map((criterion, index) => getBehavioralEvaluationCriterionRowMarkup(selectedTool.id, criterion, index, evaluationUi.evaluationScores)).join('')}
        </tbody>
      </table>
    </div>

    <div class="evaluation-legend" aria-label="Legenda da avaliação comportamental">
      ${BEHAVIORAL_EVALUATION_OPTIONS.map((option) => `
        <span><strong>${sanitizeText(option.label)}</strong> - ${sanitizeText(option.title)}</span>
      `).join('')}
    </div>

    <label class="form-field evaluation-notes-field">
      <span class="form-label">Observações</span>
      <textarea class="evaluation-notes-textarea" rows="4" data-evaluation-notes placeholder="Registre observações importantes sobre a avaliação comportamental.">${sanitizeText(getEvaluationToolNotes(evaluationUi, selectedTool.id))}</textarea>
    </label>
  `;
}

function getMatrixEvaluationMarkup(selectedTool, selectedUser, evaluationUi, moduleData) {
  const fields = getEvaluationToolFields(evaluationUi, selectedTool.id);
  const respondent = moduleData?.respondent || null;
  const respondentName = String(respondent?.nome || '').trim();
  const evaluationSectorName = String(moduleData?.evaluationSector?.label || '').trim();
  const computedResult = getMatrixComputedResult(evaluationUi, selectedTool.id, selectedUser.id);
  const canDownloadGraph = computedResult.isSaved;

  return `
    <section class="matrix-evaluation-page" aria-label="Matriz de decisão">
      <div class="matrix-context-grid">
        <label class="form-field evaluation-form-field matrix-context-card">
          <span class="form-label">Funcionário</span>
          <input class="evaluation-form-input" type="text" value="${sanitizeAttribute(selectedUser.nome || '')}" readonly aria-label="Funcionário avaliado" />
        </label>

        <label class="form-field evaluation-form-field matrix-context-card">
          <span class="form-label">Data da avaliação</span>
          <input class="evaluation-form-input" type="date" value="${sanitizeAttribute(fields.evaluationDate)}" data-evaluation-field="evaluationDate" aria-label="Data da avaliação" />
        </label>

        <label class="form-field evaluation-form-field matrix-context-card">
          <span class="form-label">Respondente</span>
          <input class="evaluation-form-input" type="text" value="${sanitizeAttribute(respondentName || 'Respondente não identificado')}" readonly aria-label="Nome do respondente" />
        </label>

        <label class="form-field evaluation-form-field matrix-context-card">
          <span class="form-label">Setor</span>
          <input class="evaluation-form-input" type="text" value="${sanitizeAttribute(evaluationSectorName || 'Setor não identificado')}" readonly aria-label="Setor da avaliação" />
        </label>
      </div>

      <div class="matrix-workspace">
        <div class="matrix-score-column">
          <article class="matrix-competency-card">
            <header class="matrix-competency-header">
              <div>
                <span class="evaluation-section-eyebrow">Competências técnicas</span>
                <h3 class="card-title">Habilidade e conhecimento</h3>
              </div>
              <span class="matrix-scale-badge">0 a 10</span>
            </header>
            <div class="matrix-criteria-list">
              ${MATRIX_TECHNICAL_CRITERIA.map((criterion, index) => getMatrixCriterionRowMarkup(selectedTool.id, criterion, 'technical', index, evaluationUi.evaluationScores)).join('')}
            </div>
          </article>

          <article class="matrix-competency-card">
            <header class="matrix-competency-header">
              <div>
                <span class="evaluation-section-eyebrow">Competências emocionais</span>
                <h3 class="card-title">Atitude e caráter</h3>
              </div>
              <span class="matrix-scale-badge">0 a 10</span>
            </header>
            <div class="matrix-criteria-list">
              ${MATRIX_EMOTIONAL_CRITERIA.map((criterion, index) => getMatrixCriterionRowMarkup(selectedTool.id, criterion, 'emotional', index, evaluationUi.evaluationScores)).join('')}
            </div>
          </article>
        </div>

        <aside class="matrix-result-panel" aria-label="Resultado da matriz de decisão">
          <div class="matrix-result-summary">
            <span class="evaluation-result-label">Resultado</span>
            <strong class="matrix-decision-title">${sanitizeText(computedResult.decisionLabel)}</strong>
            <span class="evaluation-result-caption">${computedResult.isSaved ? `Calculado em ${formatEvaluationTimestamp(computedResult.savedAt)}.` : 'Clique em salvar para calcular a matriz.'}</span>
          </div>

          <div class="matrix-metrics-grid">
            <article class="matrix-metric-card">
              <span>Técnico</span>
              <strong>${formatEvaluationNumber(computedResult.technicalAverage)}</strong>
              <small>Total ${formatEvaluationNumber(computedResult.technicalTotal)}</small>
            </article>
            <article class="matrix-metric-card">
              <span>Emocional</span>
              <strong>${formatEvaluationNumber(computedResult.emotionalAverage)}</strong>
              <small>Total ${formatEvaluationNumber(computedResult.emotionalTotal)}</small>
            </article>
          </div>

          <div class="matrix-actions-row">
            <button type="button" class="module-action-button" data-evaluation-save>
              <i data-lucide="save"></i>
              <span>Salvar e calcular</span>
            </button>
            <button type="button" class="module-link-button is-secondary" data-evaluation-download-graph ${canDownloadGraph ? '' : 'disabled'}>
              <i data-lucide="download"></i>
              <span>Baixar gráfico</span>
            </button>
          </div>
        </aside>
      </div>

      <div class="matrix-chart-card matrix-chart-card--bottom">
        ${getMatrixDecisionGraphMarkup(computedResult)}
      </div>
    </section>
  `;
}

function getMatrixCriterionRowMarkup(toolId, criterion, categoryId, index, scores) {
  const scoreKey = getEvaluationScoreKey(toolId, criterion.id, categoryId);
  const currentValue = String(scores[scoreKey] || '0');

  return `
    <article class="matrix-criterion-item">
      <div class="matrix-criterion-copy">
        <span class="evaluation-criterion-index">${String(index + 1).padStart(2, '0')}</span>
        <div>
          <strong>${sanitizeText(criterion.title)}</strong>
          <span class="evaluation-criterion-description">${sanitizeText(criterion.description)}</span>
        </div>
      </div>
      <div class="matrix-score-scale" role="radiogroup" aria-label="Nota para ${sanitizeAttribute(criterion.title)}">
        ${Array.from({ length: 11 }, (_, score) => {
          const isChecked = currentValue === String(score);
          return `
            <label class="matrix-score-button">
              <input
                type="radio"
                name="matrix-${sanitizeAttribute(toolId)}-${sanitizeAttribute(categoryId)}-${sanitizeAttribute(criterion.id)}"
                value="${score}"
                data-evaluation-score
                data-criterion-id="${sanitizeAttribute(criterion.id)}"
                data-period="${sanitizeAttribute(categoryId)}"
                ${isChecked ? 'checked' : ''}
              />
              <span>${score}</span>
            </label>
          `;
        }).join('')}
      </div>
    </article>
  `;
}

function getMatrixDecisionGraphMarkup(result) {
  const graphPoint = getMatrixGraphPointPosition(result.technicalAverage, result.emotionalAverage);
  const pointColor = getMatrixDecisionColor(result.decisionId);
  const pointMarkup = result.isSaved
    ? `
      <circle cx="${graphPoint.x}" cy="${graphPoint.y}" r="7" fill="${pointColor}"></circle>
      <circle cx="${graphPoint.x}" cy="${graphPoint.y}" r="15" fill="none" stroke="${pointColor}" stroke-width="2" opacity="0.8"></circle>
    `
    : `<circle cx="${graphPoint.x}" cy="${graphPoint.y}" r="6" fill="#687083"></circle>`;

  return `
    <div class="matrix-chart-header">
      <span class="evaluation-section-eyebrow">Matriz</span>
      <strong>${sanitizeText(result.isSaved ? result.decisionLabel : 'Aguardando')}</strong>
    </div>
    <div class="evaluation-graph-stage matrix-chart-stage">
      <svg class="evaluation-graph-svg matrix-chart-svg" viewBox="0 0 520 420" role="img" aria-label="Gráfico da matriz de decisão">
        <defs>
          <linearGradient id="matrixZoneWarm" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#d4a257" stop-opacity="0.18"></stop>
            <stop offset="1" stop-color="#d4a257" stop-opacity="0.05"></stop>
          </linearGradient>
          <linearGradient id="matrixZoneCool" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#5f7fbf" stop-opacity="0.14"></stop>
            <stop offset="1" stop-color="#5f7fbf" stop-opacity="0.04"></stop>
          </linearGradient>
          <linearGradient id="matrixZoneRisk" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#df5b5b" stop-opacity="0.13"></stop>
            <stop offset="1" stop-color="#df5b5b" stop-opacity="0.04"></stop>
          </linearGradient>
          <linearGradient id="matrixZoneGrowth" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#55b87a" stop-opacity="0.15"></stop>
            <stop offset="1" stop-color="#55b87a" stop-opacity="0.04"></stop>
          </linearGradient>
        </defs>

        <rect x="54" y="38" width="400" height="300" rx="18" fill="rgba(255,255,255,0.025)" stroke="var(--border)"></rect>
        <rect x="54" y="188" width="200" height="150" fill="url(#matrixZoneRisk)"></rect>
        <rect x="54" y="38" width="200" height="150" fill="url(#matrixZoneCool)"></rect>
        <rect x="254" y="188" width="200" height="150" fill="url(#matrixZoneGrowth)"></rect>
        <rect x="254" y="38" width="200" height="150" fill="url(#matrixZoneWarm)"></rect>

        ${getMatrixGraphGridLinesMarkup()}
        <line x1="254" y1="38" x2="254" y2="338" stroke="var(--primary)" stroke-width="2.4"></line>
        <line x1="54" y1="188" x2="454" y2="188" stroke="var(--primary)" stroke-width="2.4"></line>

        <path d="M334 128 L334 98 L374 98 L374 68 L414 68 L414 38" fill="none" stroke="var(--primary)" stroke-width="2" opacity="0.85"></path>
        <text x="104" y="112" class="evaluation-graph-region">TÉCNICO</text>
        <text x="104" y="268" class="evaluation-graph-region">DEMISSÃO</text>
        <text x="310" y="268" class="evaluation-graph-region">EMOCIONAL</text>
        <text x="326" y="126" class="evaluation-graph-region">RECONHECER</text>
        <text x="372" y="88" class="evaluation-graph-region">INVESTIR</text>
        <text x="407" y="58" class="evaluation-graph-region">PROMOVER</text>

        ${pointMarkup}

        <text x="254" y="392" text-anchor="middle" class="evaluation-graph-axis">Competências técnicas</text>
        <text x="18" y="188" text-anchor="middle" class="evaluation-graph-axis" transform="rotate(-90 18 188)">Competências emocionais</text>
      </svg>
    </div>
  `;
}

function getMatrixGraphGridLinesMarkup() {
  const verticalLines = Array.from({ length: 11 }, (_, index) => {
    const x = 54 + (40 * index);
    return `
      <line x1="${x}" y1="38" x2="${x}" y2="338" stroke="rgba(255,255,255,0.06)" stroke-width="1"></line>
      <text x="${x}" y="360" text-anchor="middle" class="evaluation-graph-scale">${index}</text>
    `;
  }).join('');

  const horizontalLines = Array.from({ length: 11 }, (_, index) => {
    const y = 338 - (30 * index);
    return `
      <line x1="54" y1="${y}" x2="454" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1"></line>
      <text x="42" y="${y + 4}" text-anchor="end" class="evaluation-graph-scale">${index}</text>
    `;
  }).join('');

  return `${verticalLines}${horizontalLines}`;
}

function getMatrixDecisionColor(decisionId) {
  const colorMap = {
    pending: '#687083',
    acompanhamento: '#8a92a6',
    demissao: '#df5b5b',
    'treinamento-tecnico': '#5f7fbf',
    'treinamento-emocional': '#55b87a',
    reconhecimento: '#c7a66a',
    investimento: '#d4a257',
    promocao: '#f4be61',
  };

  return colorMap[decisionId] || '#d4a257';
}

function getEvaluationUsersDropdownMarkup(users) {
  if (!users.length) {
    return `
      <div class="evaluation-users-dropdown">
        <div class="evaluation-users-empty">Nenhum usuário ativo encontrado para esta pesquisa.</div>
      </div>
    `;
  }

  return `
    <div class="evaluation-users-dropdown">
      ${users.map((user) => `
        <button type="button" class="evaluation-user-option" data-evaluatee-option data-user-id="${sanitizeAttribute(user.id)}">
          <span class="evaluation-user-option-id">${sanitizeText(user.id)}</span>
          <span class="evaluation-user-option-name">${sanitizeText(user.nome)}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function getEvaluationCriterionRowMarkup(toolId, criterion, index, scores) {
  return `
    <tr>
      <th>
        <span class="evaluation-criterion-index">${String(index + 1).padStart(2, '0')}.</span>
        <strong>${sanitizeText(criterion.title)}</strong>
        <span class="evaluation-criterion-description">${sanitizeText(criterion.description)}</span>
      </th>
      ${EVALUATION_PERIODS.map((period) => `
        <td>
          <div class="evaluation-score-group" role="radiogroup" aria-label="${sanitizeAttribute(criterion.title)} em ${period.label}">
            ${[1, 2, 3, 4, 5].map((score) => {
              const scoreKey = getEvaluationScoreKey(toolId, criterion.id, period.id);
              const isChecked = String(scores[scoreKey] || '') === String(score);
              return `
                <label class="evaluation-score-option">
                  <input
                    type="radio"
                    name="evaluation-${sanitizeAttribute(toolId)}-${sanitizeAttribute(criterion.id)}-${sanitizeAttribute(period.id)}"
                    value="${score}"
                    data-evaluation-score
                    data-criterion-id="${sanitizeAttribute(criterion.id)}"
                    data-period="${sanitizeAttribute(period.id)}"
                    ${isChecked ? 'checked' : ''}
                  />
                  <span>${score}</span>
                </label>
              `;
            }).join('')}
          </div>
        </td>
      `).join('')}
    </tr>
  `;
}

function getBehavioralEvaluationCriterionRowMarkup(toolId, criterion, index, scores) {
  return `
    <tr>
      <th>
        <span class="evaluation-criterion-index">${String(index + 1).padStart(2, '0')}.</span>
        <strong>${sanitizeText(criterion.title)}</strong>
        <span class="evaluation-criterion-description">${sanitizeText(criterion.description)}</span>
      </th>
      ${BEHAVIORAL_EVALUATION_OPTIONS.map((option) => {
        const scoreKey = getEvaluationScoreKey(toolId, criterion.id, option.id);
        const isChecked = String(scores[scoreKey] || '') === option.id;

        return `
          <td>
            <label class="evaluation-behavior-option" title="${sanitizeAttribute(option.title)}">
              <input
                type="radio"
                name="evaluation-${sanitizeAttribute(toolId)}-${sanitizeAttribute(criterion.id)}"
                value="${sanitizeAttribute(option.id)}"
                data-evaluation-score
                data-criterion-id="${sanitizeAttribute(criterion.id)}"
                data-period="${sanitizeAttribute(option.id)}"
                ${isChecked ? 'checked' : ''}
              />
              <span>${sanitizeText(option.label)}</span>
            </label>
          </td>
        `;
      }).join('')}
    </tr>
  `;
}

function getEvaluationUiState(moduleUi) {
  const mergedUi = {
    ...MODULE_UI_DEFAULTS,
    ...EVALUATION_UI_DEFAULTS,
    ...(moduleUi || {}),
  };

  return {
    ...mergedUi,
    evaluationScores: { ...(mergedUi.evaluationScores || {}) },
    evaluationNotesByTool: { ...(mergedUi.evaluationNotesByTool || {}) },
    evaluationFormFieldsByTool: { ...(mergedUi.evaluationFormFieldsByTool || {}) },
    evaluationComputedResultsByTool: { ...(mergedUi.evaluationComputedResultsByTool || {}) },
  };
}

function getFilteredEvaluationUsers(users, query, selectedEvaluateeId) {
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase('pt-BR');

  if (!normalizedQuery) {
    return users;
  }

  return users.filter((user) => {
    const haystack = `${user.id || ''} ${user.nome || ''}`.toLocaleLowerCase('pt-BR');
    if (user.id === selectedEvaluateeId) {
      return true;
    }
    return haystack.includes(normalizedQuery);
  });
}

function getEvaluationTotals(scores, toolId) {
  return EVALUATION_PERIODS.reduce((accumulator, period) => {
    accumulator[period.id] = EVALUATION_CRITERIA.reduce((total, criterion) => {
      const value = Number(scores[getEvaluationScoreKey(toolId, criterion.id, period.id)] || 0);
      return total + value;
    }, 0);
    return accumulator;
  }, {});
}

function getEvaluationScoreKey(toolId, criterionId, periodId) {
  return `${toolId || EVALUATION_TOOL_IDS.PRE_EFFECTIVE}:${criterionId}:${periodId}`;
}

function getEvaluationToolNotes(evaluationUi, toolId) {
  const notesByTool = evaluationUi?.evaluationNotesByTool || {};

  if (Object.prototype.hasOwnProperty.call(notesByTool, toolId)) {
    return notesByTool[toolId] || '';
  }

  if (toolId === EVALUATION_TOOL_IDS.PRE_EFFECTIVE && typeof evaluationUi?.evaluationNotes === 'string') {
    return evaluationUi.evaluationNotes;
  }

  return '';
}

function getEvaluationToolFields(evaluationUi, toolId) {
  const toolFields = evaluationUi?.evaluationFormFieldsByTool?.[toolId] || {};

  return {
    ...BEHAVIORAL_FORM_DEFAULTS,
    ...toolFields,
  };
}

function getDefaultMatrixComputedResult() {
  return {
    evaluateeId: '',
    evaluateeName: '',
    respondentName: '',
    technicalTotal: 0,
    technicalAverage: 0,
    emotionalTotal: 0,
    emotionalAverage: 0,
    decisionId: 'pending',
    decisionLabel: 'Aguardando cálculo',
    savedAt: '',
    isSaved: false,
  };
}

function getMatrixComputedResult(evaluationUi, toolId, selectedEvaluateeId) {
  const storedResult = evaluationUi?.evaluationComputedResultsByTool?.[toolId] || null;

  if (!storedResult || storedResult.evaluateeId !== selectedEvaluateeId) {
    return getDefaultMatrixComputedResult();
  }

  return {
    ...getDefaultMatrixComputedResult(),
    ...storedResult,
    isSaved: Boolean(storedResult.isSaved),
  };
}

function getEvaluationNumericScore(scores, toolId, criterionId, periodId) {
  const numericValue = Number.parseFloat(scores[getEvaluationScoreKey(toolId, criterionId, periodId)] || '0');

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  if (numericValue < 0) {
    return 0;
  }

  if (numericValue > 10) {
    return 10;
  }

  return numericValue;
}

function getMatrixDecision(toolTechnicalAverage, toolEmotionalAverage) {
  if (toolTechnicalAverage >= 9 && toolEmotionalAverage >= 9) {
    return { id: 'promocao', label: 'Promoção' };
  }

  if (toolTechnicalAverage >= 8 && toolEmotionalAverage >= 8) {
    return { id: 'investimento', label: 'Investimento' };
  }

  if (toolTechnicalAverage >= 7 && toolEmotionalAverage >= 7) {
    return { id: 'reconhecimento', label: 'Reconhecimento' };
  }

  if (toolTechnicalAverage < 5 && toolEmotionalAverage < 5) {
    return { id: 'demissao', label: 'Demissão' };
  }

  if (toolTechnicalAverage < 5 && toolEmotionalAverage >= 5) {
    return { id: 'treinamento-tecnico', label: 'Treinamento técnico' };
  }

  if (toolTechnicalAverage >= 5 && toolEmotionalAverage < 5) {
    return { id: 'treinamento-emocional', label: 'Treinamento emocional' };
  }

  return { id: 'acompanhamento', label: 'Acompanhamento' };
}

function buildMatrixComputedResult(moduleData, evaluationUi, selectedUser) {
  const selectedToolId = EVALUATION_TOOL_IDS.MATRIX;
  const fields = getEvaluationToolFields(evaluationUi, selectedToolId);
  const technicalTotal = MATRIX_TECHNICAL_CRITERIA.reduce((total, criterion) => total + getEvaluationNumericScore(evaluationUi.evaluationScores, selectedToolId, criterion.id, 'technical'), 0);
  const emotionalTotal = MATRIX_EMOTIONAL_CRITERIA.reduce((total, criterion) => total + getEvaluationNumericScore(evaluationUi.evaluationScores, selectedToolId, criterion.id, 'emotional'), 0);
  const technicalAverage = MATRIX_TECHNICAL_CRITERIA.length ? technicalTotal / MATRIX_TECHNICAL_CRITERIA.length : 0;
  const emotionalAverage = MATRIX_EMOTIONAL_CRITERIA.length ? emotionalTotal / MATRIX_EMOTIONAL_CRITERIA.length : 0;
  const decision = getMatrixDecision(technicalAverage, emotionalAverage);

  return {
    evaluateeId: selectedUser?.id || '',
    evaluateeName: selectedUser?.nome || '',
    respondentName: moduleData?.respondent?.nome || '',
    evaluationDate: fields.evaluationDate || '',
    sectorName: moduleData?.evaluationSector?.label || '',
    technicalTotal,
    technicalAverage,
    emotionalTotal,
    emotionalAverage,
    decisionId: decision.id,
    decisionLabel: decision.label,
    savedAt: new Date().toISOString(),
    isSaved: true,
  };
}

function getMatrixGraphPointPosition(technicalAverage, emotionalAverage) {
  const safeX = Math.max(0, Math.min(10, Number(technicalAverage || 0)));
  const safeY = Math.max(0, Math.min(10, Number(emotionalAverage || 0)));

  return {
    x: 54 + (safeX * 40),
    y: 338 - (safeY * 30),
  };
}

function formatEvaluationNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatEvaluationTimestamp(value) {
  if (!value) {
    return 'agora';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'agora';
  }

  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function clearComputedResultForTool(evaluationUi, toolId) {
  const nextResults = { ...(evaluationUi?.evaluationComputedResultsByTool || {}) };
  delete nextResults[toolId];
  return nextResults;
}

function getUserSectorSummary(user) {
  const sectors = Array.isArray(user?.setorList)
    ? user.setorList
    : String(user?.setor || '').split(/[,;|]+/);

  return sectors
    .map((sector) => String(sector || '').trim())
    .filter(Boolean)
    .join(', ');
}

function selectEvaluationTool(rootElement, sector, toolId) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao' || !EVALUATION_TOOLS.some((tool) => tool.id === toolId)) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...getEvaluationUiState(state.ui),
      selectedEvaluationToolId: toolId,
      isEvaluateeListOpen: false,
    },
  });

  renderModuleStage(rootElement, sector);
}

function clearSelectedEvaluationTool(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao') {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...getEvaluationUiState(state.ui),
      selectedEvaluationToolId: '',
      isEvaluateeListOpen: false,
    },
  });

  renderModuleStage(rootElement, sector);
}

function toggleEvaluationDropdown(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao') {
    return;
  }

  const nextUi = getEvaluationUiState(state.ui);
  nextUi.isEvaluateeListOpen = !nextUi.isEvaluateeListOpen;

  setModuleState(sector.id, {
    ...state,
    ui: nextUi,
  });

  renderModuleStage(rootElement, sector);
}

function closeEvaluationDropdown(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao' || !state.ui?.isEvaluateeListOpen) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...getEvaluationUiState(state.ui),
      isEvaluateeListOpen: false,
    },
  });

  renderModuleStage(rootElement, sector);
}

function updateEvaluationSearch(rootElement, sector, query) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao') {
    return;
  }

  const currentUi = getEvaluationUiState(state.ui);
  const selectedUser = (state.moduleData?.users || []).find((user) => user.id === currentUi.selectedEvaluateeId) || null;
  const shouldKeepSelection = selectedUser && `${selectedUser.id} — ${selectedUser.nome}` === query;

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...currentUi,
      evaluateeQuery: query,
      selectedEvaluateeId: shouldKeepSelection ? currentUi.selectedEvaluateeId : '',
      isEvaluateeListOpen: true,
    },
  });

  renderModuleStage(rootElement, sector);

  const input = rootElement.querySelector('[data-evaluatee-search]');

  if (input) {
    const caret = query.length;
    input.focus();
    input.setSelectionRange(caret, caret);
  }
}

function selectEvaluationUser(rootElement, sector, userId) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao') {
    return;
  }

  const user = (state.moduleData?.users || []).find((item) => item.id === userId);

  if (!user) {
    return;
  }

  const nextUi = getEvaluationUiState(state.ui);

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...nextUi,
      selectedEvaluateeId: user.id,
      evaluateeQuery: `${user.id} — ${user.nome}`,
      isEvaluateeListOpen: false,
      evaluationComputedResultsByTool: clearComputedResultForTool(nextUi, nextUi.selectedEvaluationToolId),
    },
  });

  renderModuleStage(rootElement, sector);
}

function updateEvaluationScore(rootElement, sector, criterionId, periodId, value) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao' || !criterionId || !periodId) {
    return;
  }

  const nextUi = getEvaluationUiState(state.ui);
  const selectedToolId = nextUi.selectedEvaluationToolId || EVALUATION_TOOL_IDS.PRE_EFFECTIVE;
  nextUi.evaluationScores[getEvaluationScoreKey(selectedToolId, criterionId, periodId)] = String(value || '');

  if (selectedToolId === EVALUATION_TOOL_IDS.MATRIX) {
    nextUi.evaluationComputedResultsByTool = clearComputedResultForTool(nextUi, selectedToolId);
  }

  setModuleState(sector.id, {
    ...state,
    ui: nextUi,
  });

  renderModuleStage(rootElement, sector);
}

function updateEvaluationNotes(rootElement, sector, notes) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao') {
    return;
  }

  const nextUi = getEvaluationUiState(state.ui);
  const selectedToolId = nextUi.selectedEvaluationToolId || EVALUATION_TOOL_IDS.PRE_EFFECTIVE;

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...nextUi,
      evaluationNotes: notes,
      evaluationNotesByTool: {
        ...nextUi.evaluationNotesByTool,
        [selectedToolId]: notes,
      },
    },
  });
}

function updateEvaluationField(rootElement, sector, fieldName, value) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao' || !fieldName) {
    return;
  }

  const nextUi = getEvaluationUiState(state.ui);
  const selectedToolId = nextUi.selectedEvaluationToolId || EVALUATION_TOOL_IDS.BEHAVIORAL;
  const currentFields = getEvaluationToolFields(nextUi, selectedToolId);

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...nextUi,
      evaluationFormFieldsByTool: {
        ...nextUi.evaluationFormFieldsByTool,
        [selectedToolId]: {
          ...currentFields,
          [fieldName]: value,
        },
      },
      evaluationComputedResultsByTool: selectedToolId === EVALUATION_TOOL_IDS.MATRIX
        ? clearComputedResultForTool(nextUi, selectedToolId)
        : nextUi.evaluationComputedResultsByTool,
    },
  });
}

function saveEvaluationResult(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao') {
    return;
  }

  const nextUi = getEvaluationUiState(state.ui);
  const selectedToolId = nextUi.selectedEvaluationToolId || '';

  if (selectedToolId !== EVALUATION_TOOL_IDS.MATRIX) {
    return;
  }

  const selectedUser = (state.moduleData?.users || []).find((user) => user.id === nextUi.selectedEvaluateeId) || null;

  if (!selectedUser) {
    return;
  }

  const computedResult = buildMatrixComputedResult(state.moduleData, nextUi, selectedUser);

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...nextUi,
      evaluationComputedResultsByTool: {
        ...nextUi.evaluationComputedResultsByTool,
        [selectedToolId]: computedResult,
      },
    },
  });

  renderModuleStage(rootElement, sector);
}

function downloadEvaluationGraph(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'avaliacao') {
    return;
  }

  const nextUi = getEvaluationUiState(state.ui);
  const selectedToolId = nextUi.selectedEvaluationToolId || '';

  if (selectedToolId !== EVALUATION_TOOL_IDS.MATRIX) {
    return;
  }

  const selectedUser = (state.moduleData?.users || []).find((user) => user.id === nextUi.selectedEvaluateeId) || null;

  if (!selectedUser) {
    return;
  }

  const computedResult = getMatrixComputedResult(nextUi, selectedToolId, selectedUser.id);
  const exportPayload = computedResult.isSaved ? computedResult : buildMatrixComputedResult(state.moduleData, nextUi, selectedUser);
  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 920;
  const plotLeft = 120;
  const plotTop = 210;
  const plotWidth = 860;
  const plotHeight = 600;
  const axisX = plotLeft + (plotWidth / 2);
  const axisY = plotTop + (plotHeight / 2);
  const context = canvas.getContext('2d');

  if (!context) {
    return;
  }

  canvas.width = width;
  canvas.height = height;

  context.fillStyle = '#071229';
  context.fillRect(0, 0, width, height);

  context.fillStyle = '#f7f9fc';
  context.font = '700 44px Arial';
  context.textAlign = 'left';
  context.fillText('Matriz de Decisão', 70, 74);

  context.fillStyle = '#b7c2d1';
  context.font = '500 23px Arial';
  context.fillText(`Respondente: ${exportPayload.respondentName || 'Não identificado'}`, 70, 124);
  context.fillText(`Avaliado: ${exportPayload.evaluateeName || 'Não identificado'}`, 70, 158);
  context.fillText(`Resultado: ${exportPayload.decisionLabel}`, 690, 124);
  context.fillText(`Técnico ${formatEvaluationNumber(exportPayload.technicalAverage)} · Emocional ${formatEvaluationNumber(exportPayload.emotionalAverage)}`, 690, 158);

  context.fillStyle = '#0d1a38';
  context.strokeStyle = '#223454';
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(plotLeft, plotTop, plotWidth, plotHeight, 26);
  context.fill();
  context.stroke();

  const zones = [
    { x: plotLeft, y: axisY, w: plotWidth / 2, h: plotHeight / 2, color: 'rgba(223, 91, 91, 0.12)' },
    { x: plotLeft, y: plotTop, w: plotWidth / 2, h: plotHeight / 2, color: 'rgba(95, 127, 191, 0.13)' },
    { x: axisX, y: axisY, w: plotWidth / 2, h: plotHeight / 2, color: 'rgba(85, 184, 122, 0.13)' },
    { x: axisX, y: plotTop, w: plotWidth / 2, h: plotHeight / 2, color: 'rgba(212, 162, 87, 0.14)' },
  ];

  zones.forEach((zone) => {
    context.fillStyle = zone.color;
    context.fillRect(zone.x, zone.y, zone.w, zone.h);
  });

  context.strokeStyle = 'rgba(255,255,255,0.08)';
  context.lineWidth = 1;
  context.fillStyle = '#8f9ab0';
  context.font = '600 17px Arial';
  for (let index = 0; index <= 10; index += 1) {
    const x = plotLeft + ((plotWidth / 10) * index);
    const y = plotTop + plotHeight - ((plotHeight / 10) * index);
    context.beginPath();
    context.moveTo(x, plotTop);
    context.lineTo(x, plotTop + plotHeight);
    context.stroke();
    context.beginPath();
    context.moveTo(plotLeft, y);
    context.lineTo(plotLeft + plotWidth, y);
    context.stroke();
    context.fillText(String(index), x - 5, plotTop + plotHeight + 28);
    context.fillText(String(index), plotLeft - 32, y + 5);
  }

  context.strokeStyle = '#d4a257';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(axisX, plotTop);
  context.lineTo(axisX, plotTop + plotHeight);
  context.stroke();
  context.beginPath();
  context.moveTo(plotLeft, axisY);
  context.lineTo(plotLeft + plotWidth, axisY);
  context.stroke();

  context.strokeStyle = '#d4a257';
  context.lineWidth = 2;
  const stepX = plotWidth / 10;
  const stepY = plotHeight / 10;
  context.beginPath();
  context.moveTo(plotLeft + (stepX * 7), plotTop + (stepY * 3));
  context.lineTo(plotLeft + (stepX * 7), plotTop + (stepY * 2));
  context.lineTo(plotLeft + (stepX * 8), plotTop + (stepY * 2));
  context.lineTo(plotLeft + (stepX * 8), plotTop + stepY);
  context.lineTo(plotLeft + (stepX * 9), plotTop + stepY);
  context.lineTo(plotLeft + (stepX * 9), plotTop);
  context.stroke();

  context.fillStyle = '#dbe2ee';
  context.font = '700 23px Arial';
  context.fillText('Treinamento técnico', plotLeft + 90, plotTop + 165);
  context.fillText('Demissão', plotLeft + 115, plotTop + 438);
  context.fillText('Treinamento emocional', axisX + 90, plotTop + 438);
  context.fillText('Reconhecer', axisX + 125, plotTop + 165);
  context.fillText('Investir', axisX + 235, plotTop + 102);
  context.fillText('Promover', axisX + 318, plotTop + 52);

  const pointColor = getMatrixDecisionColor(exportPayload.decisionId);
  const pointX = plotLeft + ((plotWidth / 10) * Math.max(0, Math.min(10, exportPayload.technicalAverage)));
  const pointY = plotTop + plotHeight - ((plotHeight / 10) * Math.max(0, Math.min(10, exportPayload.emotionalAverage)));

  context.strokeStyle = pointColor;
  context.lineWidth = 4;
  context.beginPath();
  context.arc(pointX, pointY, 17, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = pointColor;
  context.beginPath();
  context.arc(pointX, pointY, 8, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#f7f9fc';
  context.font = '700 22px Arial';
  context.textAlign = 'center';
  context.fillText('Competências técnicas', plotLeft + (plotWidth / 2), height - 46);

  context.save();
  context.translate(44, plotTop + (plotHeight / 2));
  context.rotate(-Math.PI / 2);
  context.textAlign = 'center';
  context.fillText('Competências emocionais', 0, 0);
  context.restore();

  canvas.toBlob((blob) => {
    if (!blob) {
      return;
    }

    const downloadLink = document.createElement('a');
    const safeRespondent = sanitizeFileName(exportPayload.respondentName || 'respondente');
    const safeEvaluatee = sanitizeFileName(exportPayload.evaluateeName || 'avaliado');
    const objectUrl = URL.createObjectURL(blob);
    downloadLink.href = objectUrl;
    downloadLink.download = `matriz-decisao-${safeEvaluatee}-${safeRespondent}.png`;
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }, 'image/png');
}

function sanitizeFileName(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'arquivo';
}

function getFeedbackModuleMarkup(card, moduleData, moduleUi) {
  const users = Array.isArray(moduleData?.users) ? moduleData.users : [];
  const respondent = moduleData?.respondent || null;
  const feedbackUi = getFeedbackUiState(moduleUi);
  const filteredUsers = getFilteredFeedbackUsers(users, feedbackUi.targetUserQuery, feedbackUi.selectedTargetUserId);
  const selectedUser = users.find((user) => user.id === feedbackUi.selectedTargetUserId) || null;
  const isReadyToWrite = Boolean(selectedUser);

  return `
    <div class="module-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked">
        <div>
          <p class="module-eyebrow">Feedback</p>
          <h2 class="module-title">${card.title}</h2>
          <p class="module-description">Antes de registrar o feedback, confirme quem está preenchendo e selecione o colaborador relacionado.</p>
        </div>
      </div>

      <div class="evaluation-meta-grid">
        <div class="evaluation-meta-card">
          <span class="evaluation-meta-label">Respondente</span>
          <strong class="evaluation-meta-value">${sanitizeText(respondent?.id || 'Não identificado')}</strong>
          <span class="evaluation-meta-subvalue">${sanitizeText(respondent?.nome || 'Faça login novamente para identificar o usuário.')}</span>
        </div>

        <div class="evaluation-picker-block">
          <span class="evaluation-meta-label">Colaborador relacionado</span>
          <div class="evaluation-picker" data-feedback-picker>
            <label class="module-search-shell evaluation-search-shell" aria-label="Pesquisar colaborador ativo para o feedback">
              <i data-lucide="search"></i>
              <input
                type="search"
                value="${sanitizeAttribute(feedbackUi.targetUserQuery)}"
                placeholder="Pesquise por ID ou nome do colaborador"
                data-feedback-target-search
                autocomplete="off"
              />
            </label>
            <button type="button" class="module-control-button" data-feedback-target-toggle aria-label="Abrir lista de colaboradores ativos" aria-expanded="${String(feedbackUi.isTargetUserListOpen)}">
              <i data-lucide="chevrons-up-down"></i>
            </button>
            ${feedbackUi.isTargetUserListOpen ? getFeedbackUsersDropdownMarkup(filteredUsers) : ''}
          </div>
          <span class="evaluation-picker-feedback">${selectedUser ? `Feedback vinculado a ${sanitizeText(selectedUser.nome)}.` : 'Selecione um colaborador ativo para continuar.'}</span>
        </div>
      </div>

      ${isReadyToWrite ? `
        <label class="form-field evaluation-notes-field">
          <span class="form-label">Feedback</span>
          <textarea class="evaluation-notes-textarea" rows="5" data-feedback-message placeholder="Escreva aqui o feedback com os detalhes necessários.">${sanitizeText(feedbackUi.feedbackMessage)}</textarea>
        </label>
      ` : `
        <div class="empty-state is-compact feedback-empty-state">
          <span class="empty-state-icon" aria-hidden="true">
            <i data-lucide="messages-square"></i>
          </span>
          <div>
            <h3 class="card-title">Selecione o colaborador relacionado</h3>
            <p class="card-description">Escolha um usuário ativo na busca acima para liberar o campo de escrita do feedback.</p>
          </div>
        </div>
      `}
    </div>
  `;
}

function getFeedbackUsersDropdownMarkup(users) {
  if (!users.length) {
    return `
      <div class="evaluation-users-dropdown">
        <div class="evaluation-users-empty">Nenhum usuário ativo encontrado para esta pesquisa.</div>
      </div>
    `;
  }

  return `
    <div class="evaluation-users-dropdown">
      ${users.map((user) => `
        <button type="button" class="evaluation-user-option" data-feedback-target-option data-user-id="${sanitizeAttribute(user.id)}">
          <span class="evaluation-user-option-id">${sanitizeText(user.id)}</span>
          <span class="evaluation-user-option-name">${sanitizeText(user.nome)}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function getFeedbackUiState(moduleUi) {
  return {
    ...MODULE_UI_DEFAULTS,
    ...FEEDBACK_UI_DEFAULTS,
    ...(moduleUi || {}),
  };
}

function getFilteredFeedbackUsers(users, query, selectedTargetUserId) {
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase('pt-BR');

  if (!normalizedQuery) {
    return users;
  }

  return users.filter((user) => {
    const haystack = `${user.id || ''} ${user.nome || ''}`.toLocaleLowerCase('pt-BR');
    if (user.id === selectedTargetUserId) {
      return true;
    }
    return haystack.includes(normalizedQuery);
  });
}

function toggleFeedbackDropdown(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'feedback') {
    return;
  }

  const nextUi = getFeedbackUiState(state.ui);
  nextUi.isTargetUserListOpen = !nextUi.isTargetUserListOpen;

  setModuleState(sector.id, {
    ...state,
    ui: nextUi,
  });

  renderModuleStage(rootElement, sector);
}

function closeFeedbackDropdown(rootElement, sector) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'feedback' || !state.ui?.isTargetUserListOpen) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...getFeedbackUiState(state.ui),
      isTargetUserListOpen: false,
    },
  });

  renderModuleStage(rootElement, sector);
}

function updateFeedbackSearch(rootElement, sector, query) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'feedback') {
    return;
  }

  const currentUi = getFeedbackUiState(state.ui);
  const selectedUser = (state.moduleData?.users || []).find((user) => user.id === currentUi.selectedTargetUserId) || null;
  const shouldKeepSelection = selectedUser && `${selectedUser.id} — ${selectedUser.nome}` === query;

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...currentUi,
      targetUserQuery: query,
      selectedTargetUserId: shouldKeepSelection ? currentUi.selectedTargetUserId : '',
      isTargetUserListOpen: true,
    },
  });

  renderModuleStage(rootElement, sector);
}

function selectFeedbackUser(rootElement, sector, userId) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'feedback') {
    return;
  }

  const selectedUser = (state.moduleData?.users || []).find((user) => user.id === userId);

  if (!selectedUser) {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...getFeedbackUiState(state.ui),
      selectedTargetUserId: selectedUser.id,
      targetUserQuery: `${selectedUser.id} — ${selectedUser.nome}`,
      isTargetUserListOpen: false,
    },
  });

  renderModuleStage(rootElement, sector);
}

function updateFeedbackField(rootElement, sector, field, value) {
  const state = getModuleState(sector.id);

  if (state.selectedModuleId !== 'feedback') {
    return;
  }

  setModuleState(sector.id, {
    ...state,
    ui: {
      ...getFeedbackUiState(state.ui),
      [field]: value,
    },
  });

  renderModuleStage(rootElement, sector);
}

function openVideoModal(video) {
  if (!video.embedUrl) {
    return;
  }

  openOverlayModal({
    title: video.title,
    frameUrl: `${video.embedUrl}?autoplay=1&rel=0`,
    closeLabel: 'Fechar vídeo',
    modalClassName: 'video-modal',
    frameWrapClassName: 'video-modal-frame-wrap',
    frameClassName: 'video-modal-frame',
  });
}

function openDocumentModal(documentItem) {
  if (!documentItem.previewUrl) {
    return;
  }

  openOverlayModal({
    title: resolveDocumentTitle(documentItem),
    frameUrl: documentItem.previewUrl,
    closeLabel: 'Fechar documento',
    modalClassName: 'video-modal document-modal',
    frameWrapClassName: 'video-modal-frame-wrap document-modal-frame-wrap',
    frameClassName: 'video-modal-frame document-modal-frame',
  });
}

function openOverlayModal({ title, frameUrl, closeLabel, modalClassName, frameWrapClassName, frameClassName }) {
  closeActiveOverlayModal();

  const overlay = document.createElement('div');
  overlay.className = 'video-modal-backdrop';
  overlay.innerHTML = `
    <div class="${sanitizeAttribute(modalClassName)}" role="dialog" aria-modal="true" aria-label="${sanitizeText(title)}">
      <div class="video-modal-head">
        <strong class="video-modal-title">${sanitizeText(title)}</strong>
        <button type="button" class="video-modal-close" aria-label="${sanitizeAttribute(closeLabel)}">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="${sanitizeAttribute(frameWrapClassName)}">
        <iframe
          class="${sanitizeAttribute(frameClassName)}"
          src="${sanitizeAttribute(frameUrl)}"
          title="${sanitizeAttribute(title)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  `;

  const closeButton = overlay.querySelector('.video-modal-close');
  const dialog = overlay.querySelector('[role="dialog"]');

  function handleBackdropClick(event) {
    if (!dialog.contains(event.target)) {
      closeActiveOverlayModal();
    }
  }

  activeEscapeHandler = (event) => {
    if (event.key === 'Escape') {
      closeActiveOverlayModal();
    }
  };

  closeButton?.addEventListener('click', closeActiveOverlayModal);
  overlay.addEventListener('click', handleBackdropClick);
  document.addEventListener('keydown', activeEscapeHandler);
  document.body.appendChild(overlay);
  document.body.classList.add('has-video-modal');
  refreshLucideIcons(overlay);
  activeOverlayModal = overlay;
}

function closeActiveOverlayModal() {
  if (activeEscapeHandler) {
    document.removeEventListener('keydown', activeEscapeHandler);
    activeEscapeHandler = null;
  }

  if (!activeOverlayModal) {
    document.body.classList.remove('has-video-modal');
    return;
  }

  activeOverlayModal.remove();
  activeOverlayModal = null;
  document.body.classList.remove('has-video-modal');
}

function resolveDocumentTitle(item) {
  const documentName = String(item?.name || item?.title || item?.fileName || '').trim();
  return documentName || 'Arquivo sem nome';
}

function resolveDocumentPreviewUrl(item) {
  const directPreviewUrl = String(item?.previewUrl || '').trim();

  if (directPreviewUrl) {
    return directPreviewUrl;
  }

  const openUrl = String(item?.openUrl || '').trim();

  if (!openUrl) {
    return '';
  }

  const driveFileMatch = openUrl.match(/https:\/\/drive\.google\.com\/file\/d\/([^/]+)\//i);
  if (driveFileMatch) {
    return `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`;
  }

  const docMatch = openUrl.match(/https:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([^/]+)/i);
  if (docMatch) {
    return `https://docs.google.com/${docMatch[1]}/d/${docMatch[2]}/preview`;
  }

  return openUrl;
}

function activateViewTransition(rootElement) {
  const panel = rootElement.querySelector('[data-view-panel]');

  if (!panel) {
    return;
  }

  if (prefersReducedMotion()) {
    panel.classList.add('is-view-active');
    return;
  }

  panel.classList.add('is-view-entering');

  requestAnimationFrame(() => {
    panel.classList.add('is-view-active');
    panel.classList.remove('is-view-entering');
  });
}

function activateRevealAnimations(rootElement) {
  const revealItems = [...rootElement.querySelectorAll('[data-reveal]')];

  revealItems.forEach((item, index) => {
    item.style.setProperty('--reveal-index', String(index));
  });

  if (!revealItems.length) {
    return;
  }

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('is-visible');
        revealObserver?.unobserve(entry.target);
      });
    },
    {
      threshold: 0.14,
      rootMargin: '0px 0px -10% 0px',
    },
  );

  revealItems.forEach((item) => revealObserver?.observe(item));
}

function disconnectRevealObserver() {
  if (!revealObserver) {
    return;
  }

  revealObserver.disconnect();
  revealObserver = null;
}

function formatDateLabel(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function sanitizeText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeAttribute(value) {
  return sanitizeText(value);
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
