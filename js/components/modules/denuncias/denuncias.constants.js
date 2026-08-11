export const DENUNCIAS_UI_DEFAULTS = Object.freeze({
  loadStatus: 'idle',      // idle | loading | success | error
  statusFilter: '',        // '' | 'aberta' | 'em_analise' | 'encerrada'
  selectedId: '',          // denúncia aberta no detalhe
  detailStatus: 'idle',    // idle | loading | success | error
});

export const DENUNCIA_STATUS_META = Object.freeze({
  aberta:     { label: 'Aberta',     icon: 'circle-dot',     className: 'is-aberta' },
  em_analise: { label: 'Em análise', icon: 'loader',         className: 'is-analise' },
  encerrada:  { label: 'Encerrada',  icon: 'circle-check',   className: 'is-encerrada' },
});

export const DENUNCIA_STATUS_ORDER = Object.freeze(['aberta', 'em_analise', 'encerrada']);
