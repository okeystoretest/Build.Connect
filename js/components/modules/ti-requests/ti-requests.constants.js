export const TI_REQUEST_STATUS = Object.freeze({
  pending:    'Pendente',
  assigned:   'Atribuído',
  inProgress: 'Em andamento',
  done:       'Concluído',
});

export const TI_DASHBOARD_PERIODS = Object.freeze([
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes',    label: 'Este mês' },
  { id: 'tudo',   label: 'Todo o período' },
]);

export const TI_REQUESTS_UI_DEFAULTS = Object.freeze({
  tickets:                [],
  completedTickets:       [],
  dashboard:              null,
  expandedTicketId:       null,
  expandedCompletedId:    null,
  dashboardPeriod:        'mes',
  // Filtro exclusivo por motorista no dashboard (id do responsável; '' = todos)
  dashboardMotorista:     '',
  loadStatus:             'idle',
  errorMessage:           '',
  isUpdating:             false,
  updatingTicketId:       null,
  confirmingConclusionId: null,
  dashboardFullOpen:      false,
  fullDashboardFilter:    'Pendente',
  fullDashboardPeriod:    'mes',
  doneExpanded:           false,
  // null = mês vigente (resolvido em runtime no renderKanban)
  completedFilterMonth:   null,
  // Paginação por coluna (5 itens por padrão)
  colsExpanded: { 'Pendente': false, 'Atribuído': false, 'Em andamento': false, 'Concluído': false },
  // IDs de chamados novos detectados pelo polling (animação de entrada)
  newTicketIds: [],
  // F2: ID do chamado aguardando input de KM inicial (Atribuído → Em andamento)
  startingKmTicketId: null,
  // Filtro por motorista aplicado ao KANBAN (Gestor/Admin). '' = todos.
  // Independente de dashboardMotorista, que filtra apenas os gráficos.
  kanbanMotorista: '',
  // ID do chamado Pendente com o painel de atribuição direta aberto
  assigningTicketId: null,
  // Lista de motoristas elegíveis (setor exclusivo) para atribuição direta
  motoristasDisponiveis: [],
  // Usuário autenticado, usado pela opção de autoatribuição no painel
  currentUser: null,
});

/**
 * Intervalo de polling em ms para o Kanban de Motoristas.
 * Atualiza automaticamente sem necessidade de recarregar a página.
 */
export const KANBAN_POLL_INTERVAL_MS = 30_000;
