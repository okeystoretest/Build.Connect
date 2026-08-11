export const DEFAULT_SECTOR_CARDS = [
  {
    id: 'documentos',
    title: 'Documentos',
    icon: 'folder-open',
    hint: 'Leitura inicial',
    getDescription: (sectorName) =>
      `Comece por aqui para conhecer os arquivos, regras e registros mais importantes do setor ${sectorName}.`,
  },
  {
    id: 'instrucoes-escritas',
    title: 'Instruções Escritas',
    icon: 'file-text',
    hint: 'Passo a passo',
    getDescription: (sectorName) =>
      `Aqui você encontra orientações claras para entender como as rotinas do setor ${sectorName} funcionam.`,
  },
  {
    id: 'instrucoes-video',
    title: 'Instruções em Vídeo',
    icon: 'video',
    hint: 'Treinamento visual',
    getDescription: (sectorName) =>
      `Assista aos conteúdos em vídeo do setor ${sectorName} para aprender as atividades de forma prática e rápida.`,
  },
  {
    id: 'avaliacao',
    title: 'Avaliações',
    icon: 'clipboard-list',
    hint: 'Acompanhamento',
    getDescription: (sectorName) =>
      `Avalie o comportamento e os resultados de um colaborador do setor ${sectorName}.`,
  },

];

// ── Comercial > Vendas ─────────────────────────────────────────────────────
export const COMMERCIAL_SECTOR_CARDS = [
  {
    id: 'instrucoes-escritas',
    title: 'Instruções Escritas',
    icon: 'file-text',
    hint: 'Passo a passo',
    getDescription: (sectorName) =>
      `Aqui você encontra orientações claras para entender como as rotinas do subsetor ${sectorName} funcionam.`,
  },
  {
    id: 'instrucoes-video',
    title: 'Instruções em Vídeo',
    icon: 'video',
    hint: 'Treinamento visual',
    getDescription: (sectorName) =>
      `Assista aos vídeos do subsetor ${sectorName} para aprender as atividades.`,
  },
  {
    id: 'avaliacao',
    title: 'Avaliações',
    icon: 'clipboard-list',
    hint: 'Acompanhamento',
    getDescription: (sectorName) =>
      `Avalie o comportamento e os resultados de um colaborador do subsetor ${sectorName}.`,
  },

];

// ── Vitrine - Vendas Externas ───────────────────────────────────
export const VITRINE_SECTOR_CARDS = [
  {
    id: 'vitrine-colecoes',
    title: 'Coleções',
    icon: 'cherry',
    hint: 'Campanhas e styling',
    getDescription: () =>
      'Editoriais, materiais da marca e composições visuais das coleções.',
  },
  {
    id: 'vitrine-catalogo',
    title: 'Catálogo',
    icon: 'book-search',
    hint: 'Produto e matéria-prima',
    getDescription: () =>
      'Consulte o catálogo da coleção atual e os conteúdos visuais das variantes de cores.',
  },
  {
    id: 'vitrine-workshop',
    title: 'Workshop',
    icon: 'presentation',
    hint: 'Treinamento e apoio',
    getDescription: () =>
      'Instruções, documentos de apoio e conteúdos de capacitação.',
  },
];

// ── Lov Club - Vitrine ─────────────────────────────────────────
export const LOV_CLUB_SECTOR_CARDS = [
  {
    id: 'lovclub-colecoes',
    title: 'Coleções',
    icon: 'heart',
    hint: 'Campanhas e styling',
    getDescription: () =>
      'Editoriais, materiais da marca e composições visuais das coleções Lov Club.',
  },
  {
    id: 'lovclub-catalogo',
    title: 'Catálogo',
    icon: 'book-search',
    hint: 'Produto e matéria-prima',
    getDescription: () =>
      'Consulte o catálogo da coleção atual e os conteúdos visuais das variantes de cores Lov Club.',
  },
  {
    id: 'lovclub-workshop',
    title: 'Workshop',
    icon: 'presentation',
    hint: 'Treinamento e apoio',
    getDescription: () =>
      'Instruções, documentos de apoio e conteúdos de capacitação Lov Club.',
  },
];

export const RETAGUARDA_SECTOR_CARDS = [
  ...DEFAULT_SECTOR_CARDS,
  {
    id: 'requisicoes-ti',
    title: 'Requisições',
    icon: 'headset',
    hint: 'Suporte técnico',
    getDescription: () =>
      'Acompanhe e resolva as ordens de serviço pendentes para garantir o atendimento.',
  },
];

export const DHO_SECTOR_CARDS = [
  {
    id: 'cadastro-usuarios',
    title: 'Cadastro de Usuários',
    icon: 'user-plus',
    hint: 'Acesso inicial',
    getDescription: () =>
      'Cadastre novos utilizadores, organize acessos e mantenha a base de perfis atualizada.',
  },
  {
    id: 'historico-colaborador',
    title: 'Histórico do Colaborador',
    icon: 'folder-clock',
    hint: 'Acompanhamento',
    getDescription: () =>
      'Consulte registros importantes para acompanhar evolução do colaborador.',
  },
  {
    id: 'mapas-integracao',
    title: 'Mapas de Integração',
    icon: 'map',
    hint: 'Integração',
    getDescription: () =>
      'Acesse e gerencie os mapas de integração dos colaboradores.',
  },
  {
    id: 'documentos-dho',
    title: 'Documentos',
    icon: 'file-text',
    hint: 'Arquivos',
    getDescription: () =>
      'Centralize documentos e materiais de referência do DHO.',
  },
  {
    id: 'questionarios',
    title: 'Questionários',
    icon: 'clipboard-check',
    hint: 'Coleta guiada',
    getDescription: () =>
      'Configure perguntas, opções de resposta e organize os resultados de forma prática.',
  },
  {
    id: 'qualidade',
    title: 'Resultados de Avaliações',
    icon: 'badge-check',
    hint: 'Padrão interno',
    getDescription: () =>
      'Acompanhe os resultados dos colaboradores para decidir os próximos passos.',
  },
  {
    id: 'central-denuncias',
    title: 'Central de Denúncias',
    icon: 'shield-alert',
    hint: 'Confidencial · NR-1',
    // Card restrito a Gestor/Admin do DHO (filtrado em getCardsForUserAccess).
    requiredPrivileged: true,
    getDescription: () =>
      'Gerencie as denúncias anônimas recebidas: leia os relatos, veja anexos e acompanhe o status.',
  },
];

// ── Motorista ──────────────────────────────────────────────────────────────
export const MOTORISTA_SECTOR_CARDS = [
  {
    id: 'requisicoes-motorista',
    title: 'Central de Motoristas',
    icon: 'clipboard-list',
    hint: 'Serviços e entregas',
    getDescription: () =>
      'Acompanhe as requisições de serviço, entregas, coletas e outras demandas operacionais.',
  },
];
