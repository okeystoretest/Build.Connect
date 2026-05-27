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

export const COMMERCIAL_SECTOR_CARDS = [
  {
    id: 'documentos',
    title: 'Material',
    icon: 'folder-open',
    hint: 'Campanhas',
    getDescription: (sectorName) =>
      `Acesse os catálogos, materiais e arquivos das campanhas ligados ao subsetor ${sectorName}.`,
  },
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
];