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
});

/**
 * Intervalo de polling em ms para o Kanban de Motoristas.
 * Atualiza automaticamente sem necessidade de recarregar a página.
 */
export const KANBAN_POLL_INTERVAL_MS = 30_000;
