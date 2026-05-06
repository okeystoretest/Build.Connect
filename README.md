# Build.Connect

Build.Connect é uma plataforma web desenvolvida para centralizar conteúdos de integração, treinamento e consulta interna por setor.

O sistema foi projetado para facilitar o onboarding de colaboradores, padronizar o acesso à informação e organizar documentos, instruções, vídeos, avaliações, feedbacks e recursos internos em uma única interface.

---

## Visão geral

A proposta do Build.Connect é oferecer um ambiente interno moderno e organizado, onde cada colaborador pode acessar conteúdos relevantes para sua rotina, com navegação simples, autenticação e suporte a materiais de apoio.

A plataforma reúne:

- documentos operacionais;
- instruções escritas;
- vídeos de treinamento;
- avaliações;
- feedbacks;
- cadastro/administração de usuários;
- histórico e recursos de acompanhamento.

---

## Objetivos do projeto

- Centralizar materiais de integração e treinamento.
- Facilitar o onboarding de novos colaboradores.
- Organizar conteúdos por setor de forma estruturada.
- Padronizar o acesso à informação interna.
- Reduzir dependência de orientação manual repetitiva.
- Melhorar comunicação, capacitação e suporte aos setores.
- Apoiar o setor de TI com uma base organizada e mais fácil de manter.

---

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript ES Modules
- Google Apps Script
- Lucide Icons via CDN

---

## Estrutura atual

```text
index.html
favicon.png
README.md
css/
js/
docs/
```

A aplicação está organizada em camadas, com submódulos dedicados para Avaliações, Administração de Usuários e interações da área de conteúdo:

- `js/app/`: bootstrap, controllers globais e renderização principal.
- `js/components/`: componentes, views e módulos de interface.
- `js/config/`: configurações estáticas da aplicação.
- `js/constants/`: identificadores e constantes de domínio.
- `js/services/`: integrações, autenticação, navegação e regras de acesso.
- `js/state/`: estado compartilhado dos módulos.
- `js/utils/`: funções utilitárias.
- `css/modules/`: CSS separado por responsabilidade.
- `docs/`: documentação técnica e checklist de validação.

---

## Documentação técnica

Consulte os documentos abaixo antes de executar alterações estruturais ou funcionais:

- `docs/ARCHITECTURE.md`: visão técnica da arquitetura atual.
- `docs/MAINTENANCE_GUIDE.md`: padrões de manutenção e evolução segura.
- `docs/REGRESSION_CHECKLIST.md`: checklist de testes manuais após alterações.

---

## Setores contemplados

A plataforma suporta navegação por setores como:

- Comercial
  - Gestão
  - Vendas
- Produção
  - Criação
  - PCP
  - Almoxarifado
  - Corte
  - Acabamento
  - Revisão
  - Externo
- Marketing
- Compras
- Logística
- Financeiro
- Retaguarda
- DHO

---

## Principais funcionalidades

- Autenticação de usuários.
- Controle de visualização por setor e nível de acesso.
- Sidebar com navegação por áreas da empresa.
- Conteúdos organizados por módulos.
- Tela inicial com mensagem de boas-vindas.
- Documentos e instruções escritas.
- Instruções em vídeo.
- Feedbacks.
- Avaliações com regras de visibilidade por nível.
- Cadastro e administração de usuários.
- Persistência de sessão durante o recarregamento da página.
- Integração com Google Apps Script.
- Interface modularizada para manutenção e evolução.

---

## Integração

A comunicação com Google Apps Script é centralizada em:

```text
js/services/gas-bridge.service.js
```

Configurações globais da bridge e endpoints ficam em:

```text
js/config/app.config.js
```

---

## Validação recomendada

Após alterações, execute validação manual usando:

```text
docs/REGRESSION_CHECKLIST.md
```

Também é recomendado validar sintaxe dos arquivos JavaScript com:

```bash
find js -name "*.js" -print0 | xargs -0 -n1 node --check
```

---

## Créditos

Desenvolvido por **Marcos Lucas**.

---

## Licença

Projeto de uso interno/privado, salvo definição diferente pelo responsável.


## Qualidade do DHO

O card Qualidade centraliza resultados, notas, gráficos e formulários preenchidos nas avaliações. O gráfico da Matriz de Decisão fica restrito a este card dentro do setor DHO.

## Avaliações e Qualidade

As avaliações preenchidas agora são persistidas na planilha do Build.Connect por meio do Apps Script. A função `prepararPlanilhaAvaliacoesBuildConnect()` cria/prepara a aba `Avaliações` com os cabeçalhos necessários para armazenamento dos formulários.

A aba `Avaliações` também é criada automaticamente no primeiro salvamento, caso ainda não exista.

Fluxo implementado:

- o usuário preenche uma avaliação/formulário;
- ao clicar em salvar, os dados são enviados ao Apps Script;
- o Apps Script registra o formulário na aba `Avaliações`;
- o card `DHO > Qualidade` consulta os registros salvos por tipo de avaliação e colaborador;
- nenhuma resposta é exibida em lista aberta: é obrigatório selecionar o formulário e buscar o colaborador.

O gráfico da Matriz de Decisão permanece restrito ao card `DHO > Qualidade`.
