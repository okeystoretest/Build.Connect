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
      `Aqui você encontra orientações claras para entender como as rotinas do setor ${sectorName} funcionam no dia a dia.`,
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
      `Nesta área ficam as ferramentas e registros de avaliação para apoiar seu desenvolvimento no setor ${sectorName}.`,
  },
  {
    id: 'feedback',
    title: 'Feedback',
    icon: 'message-square',
    hint: 'Canal de retorno',
    getDescription: (sectorName) =>
      `Use este espaço para compartilhar dúvidas, sugestões e melhorias relacionadas ao setor ${sectorName}.`,
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
      `Aqui você encontra orientações claras para entender como as rotinas do subsetor ${sectorName} funcionam no dia a dia.`,
  },
  {
    id: 'instrucoes-video',
    title: 'Instruções em Vídeo',
    icon: 'video',
    hint: 'Treinamento visual',
    getDescription: (sectorName) =>
      `Assista aos conteúdos em vídeo do subsetor ${sectorName} para aprender as atividades de forma prática e rápida.`,
  },
  {
    id: 'avaliacao',
    title: 'Avaliações',
    icon: 'clipboard-list',
    hint: 'Acompanhamento',
    getDescription: (sectorName) =>
      `Nesta área ficam as ferramentas e registros de avaliação para apoiar seu desenvolvimento no subsetor ${sectorName}.`,
  },
  {
    id: 'feedback',
    title: 'Feedback',
    icon: 'message-square',
    hint: 'Canal de retorno',
    getDescription: (sectorName) =>
      `Use este espaço para compartilhar dúvidas, sugestões e melhorias relacionadas ao subsetor ${sectorName}.`,
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
      'Auditar e processar as ordens de serviço pendentes, garantindo o atendimento de requisições.',
  },
];

export const DHO_SECTOR_CARDS = [
  {
    id: 'cadastro-usuarios',
    title: 'Cadastro de Usuários',
    icon: 'user-plus',
    hint: 'Acesso inicial',
    getDescription: () =>
      'Cadastre novos utilizadores, organize acessos e mantenha a base de perfis atualizada para uso no Build.Connect.',
  },
  {
    id: 'historico-colaborador',
    title: 'Histórico do Colaborador',
    icon: 'folder-clock',
    hint: 'Acompanhamento',
    getDescription: () =>
      'Consulte o percurso do colaborador, com registros importantes para acompanhar evolução, mudanças e ocorrências.',
  },
  {
    id: 'questionarios',
    title: 'Questionários',
    icon: 'clipboard-check',
    hint: 'Coleta guiada',
    getDescription: () =>
      'Acesse formulários e questionários usados para recolher informações, apoiar avaliações e orientar etapas do processo.',
  },
  {
    id: 'qualidade',
    title: 'Qualidade',
    icon: 'badge-check',
    hint: 'Padrão interno',
    getDescription: () =>
      'Reúna verificações, critérios e registros ligados à qualidade para apoiar decisões e manter o padrão esperado.',
  },
];