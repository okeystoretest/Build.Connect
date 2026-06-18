export const ACCESS_KEYS = Object.freeze({
  all: 'all',
  todos: 'todos',
});

export const USER_LEVELS = Object.freeze({
  admin: 'admin',
  gestor: 'gestor',
  colaborador: 'colaborador',
});

export const SECTOR_IDS = Object.freeze({
  home: 'inicio',
  commercial: 'comercial',
  vitrine: 'vitrine',
  lovclub: 'lovclub',
  sales: 'vendas',
  production: 'producao',
  creation: 'criacao',
  pcp: 'pcp',
  warehouse: 'almoxarifado',
  cutting: 'corte',
  finishing: 'acabamento',
  review: 'revisao',
  external: 'externo',
  marketing: 'marketing',
  purchasing: 'compras',
  logistics: 'logistica',
  estoque: 'estoque',
  finance: 'financeiro',
  backoffice: 'retaguarda',
  dho: 'dho',
  motorista: 'motorista',
});

export const USER_LEVEL_OPTIONS = Object.freeze([
  { id: USER_LEVELS.colaborador, label: 'Colaborador' },
  { id: USER_LEVELS.gestor, label: 'Gestor' },
  { id: USER_LEVELS.admin, label: 'Administrador' },
]);

export const USER_ADMIN_SECTOR_OPTIONS = Object.freeze([
  { id: ACCESS_KEYS.all,         label: 'Todos' },
  { id: SECTOR_IDS.commercial,   label: 'Comercial' },
  { id: SECTOR_IDS.vitrine,      label: 'Vitrine' },
  { id: SECTOR_IDS.lovclub,      label: 'Lov Club' },
  { id: SECTOR_IDS.sales,        label: 'Vendas' },
  { id: SECTOR_IDS.production,   label: 'Produção' },
  { id: SECTOR_IDS.creation,     label: 'Criação' },
  { id: SECTOR_IDS.pcp,          label: 'PCP' },
  { id: SECTOR_IDS.warehouse,    label: 'Almoxarifado' },
  { id: SECTOR_IDS.cutting,      label: 'Corte' },
  { id: SECTOR_IDS.finishing,    label: 'Acabamento' },
  { id: SECTOR_IDS.review,       label: 'Revisão' },
  { id: SECTOR_IDS.external,     label: 'Externo' },
  { id: SECTOR_IDS.marketing,    label: 'Marketing' },
  { id: SECTOR_IDS.purchasing,   label: 'Compras' },
  // Logística → chave legada mantida para compat. com usuários existentes no banco
  { id: SECTOR_IDS.logistics,    label: 'Logística' },
  { id: SECTOR_IDS.estoque,      label: 'Estoque' },
  { id: SECTOR_IDS.finance,      label: 'Financeiro' },
  { id: SECTOR_IDS.backoffice,   label: 'Retaguarda' },
  { id: SECTOR_IDS.dho,          label: 'DHO' },
  { id: SECTOR_IDS.motorista,    label: 'Motorista' },
]);

// Mapa id → label para uso em views (centralizado para evitar duplicação)
export const SETOR_LABELS = Object.freeze(
  USER_ADMIN_SECTOR_OPTIONS.reduce((acc, s) => ({ ...acc, [s.id]: s.label }), {})
);
