export const STORAGE_KEYS = {
  activeItem: 'build.connect.active-item',
  sidebarCollapsed: 'build.connect.sidebar-collapsed',
  productionExpanded: 'build.connect.production-expanded',
  commercialExpanded: 'build.connect.commercial-expanded',
};

export const PRODUCTION_CHILD_IDS = ['criacao', 'pcp', 'almoxarifado', 'corte', 'acabamento', 'revisao', 'externo'];
export const COMMERCIAL_CHILD_IDS = ['vitrine', 'vendas'];
export const COMMERCIAL_SECTOR_IDS = new Set(COMMERCIAL_CHILD_IDS);

export const NAVIGATION_ITEMS = [
  {
    id: 'inicio',
    label: 'Início',
    icon: 'house',
    description: 'Volte para a visão principal do Build.Connect e retome sua navegação pelos setores.',
  },
  {
    id: 'comercial',
    label: 'Comercial',
    icon: 'tag',
    metaLabel: 'Accordion de subsetores',
    description: 'Acesse os subsetores do Comercial e encontre materiais de campanha, instruções e conteúdos de apoio.',
    children: [
      {
        id: 'vitrine',
        label: 'OKEY · Showcase',
        icon: 'cherry',
        description: 'Explore coleções, catálogos e materiais de capacitação do subsetor Vitrine para apoiar campanhas e equipes comerciais.',
      },
      {
        id: 'vendas',
        label: 'Vendas',
        icon: 'dollar-sign',
        description: 'Acesse os materiais e instruções do subsetor Vendas para apoiar a rotina comercial e as campanhas ativas.',
      },
    ],
  },
  {
    id: 'producao',
    label: 'Produção',
    icon: 'settings-2',
    metaLabel: 'Accordion de setores',
    description: 'Acesse os subsetores da Produção e encontre orientações para cada etapa do fluxo operacional.',
    children: [
      {
        id: 'criacao',
        label: 'Criação',
        icon: 'palette',
        description: 'Conheça o setor de Criação e veja onde ficam as referências, padrões visuais e orientações para desenvolver materiais.',
      },
      {
        id: 'pcp',
        label: 'PCP',
        icon: 'clipboard-list',
        description: 'Aqui você acompanha como o PCP organiza o planejamento da produção e direciona o andamento das atividades.',
      },
      {
        id: 'almoxarifado',
        label: 'Almoxarifado',
        icon: 'package',
        description: 'Encontre as instruções do Almoxarifado para entender recebimento, armazenamento e controle dos insumos.',
      },
      {
        id: 'corte',
        label: 'Corte',
        icon: 'scissors',
        description: 'Veja como o setor de Corte prepara materiais e segue os padrões necessários para iniciar a produção com segurança.',
      },
      {
        id: 'acabamento',
        label: 'Acabamento',
        icon: 'wand-sparkles',
        description: 'Aprenda como o Acabamento organiza os processos finais e garante o padrão esperado antes da entrega.',
      },
      {
        id: 'revisao',
        label: 'Revisão',
        icon: 'search-check',
        description: 'Acompanhe as orientações do setor de Revisão para conferir padrões, identificar ajustes e validar o que segue para a próxima etapa.',
      },
      {
        id: 'externo',
        label: 'Externo',
        icon: 'globe',
        description: 'Encontre os materiais do setor Externo para entender demandas enviadas a parceiros e o acompanhamento dessas etapas fora da operação interna.',
      },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: 'megaphone',
    description: 'Veja os materiais e orientações do setor de Marketing para campanhas, comunicação e apoio às ações da marca.',
  },
  {
    id: 'compras',
    label: 'Compras',
    icon: 'shopping-cart',
    description: 'Entenda como o setor de Compras solicita, aprova e acompanha aquisições importantes para a operação.',
  },
  {
    id: 'logistica',
    label: 'Logística',
    icon: 'truck',
    description: 'Conheça os fluxos da Logística para recebimento, movimentação, expedição e entrega de materiais.',
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: 'wallet',
    description: 'Aqui você encontra o que precisa para entender controles, processos e materiais de apoio do Financeiro.',
  },
  {
    id: 'retaguarda',
    label: 'Retaguarda',
    icon: 'monitor-cog',
    description: 'Acesse os conteúdos do setor de Retaguarda para suporte interno, sistemas e rotinas de TI.',
  },
  {
    id: 'dho',
    label: 'DHO',
    icon: 'users-round',
    description: 'Acompanhe os processos de desenvolvimento humano e organizacional, com materiais de apoio ao colaborador e à gestão.',
  },
];
