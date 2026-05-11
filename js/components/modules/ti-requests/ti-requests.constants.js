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
});
