export const EVALUATION_PERIODS = Object.freeze([
  { id: '7', label: '7 dias' },
  { id: '14', label: '14 dias' },
  { id: '21', label: '21 dias' },
]);
export const EVALUATION_CRITERIA = Object.freeze([
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
export const MATRIX_TECHNICAL_CRITERIA = Object.freeze([
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
export const MATRIX_EMOTIONAL_CRITERIA = Object.freeze([
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
export const EVALUATION_TOOL_IDS = Object.freeze({
  PRE_EFFECTIVE: 'acompanhamento-funcional-pre-efetivo',
  BEHAVIORAL: 'analise-desempenho-comportamental',
  MATRIX: 'matriz-de-decisao',
});
export const EVALUATION_TOOLS = Object.freeze([
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
export const BEHAVIORAL_EVALUATION_OPTIONS = Object.freeze([
  { id: 'E', label: 'E', title: 'Excelente' },
  { id: 'S', label: 'S', title: 'Satisfatório' },
  { id: 'R', label: 'R', title: 'Regular' },
  { id: 'I', label: 'I', title: 'Insatisfatório' },
]);
export const BEHAVIORAL_FORM_DEFAULTS = Object.freeze({
  evaluationDate: '',
});
export const EVALUATION_UI_DEFAULTS = Object.freeze({
  activeTab: 'avaliacoes',
  selectedEvaluationToolId: '',
  selectedEvaluateeId: '',
  evaluateeQuery: '',
  isEvaluateeListOpen: false,
  evaluationScores: {},
  evaluationNotes: '',
  evaluationNotesByTool: {},
  evaluationFormFieldsByTool: {},
  evaluationComputedResultsByTool: {},
  evaluationSaveStatus: '',
  evaluationSaveMessage: '',
  savedEvaluationRecordsByTool: {},
});