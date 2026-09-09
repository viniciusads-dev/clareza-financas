# Refatoração do FinanceApp

## Análise e plano apresentados antes da implementação

O arquivo original tinha 3.812 linhas e concentrava sete telas: Visão geral,
Lançamentos, Agenda financeira, Contas e cartões, Orçamentos, Minhas metas e
Categorias e tags. Também continha o layout, a navegação, oito modalidades de
editor, a confirmação de exclusão e o onboarding.

A navegação já usava `view === ... && ...`: as sete telas **não** permaneciam
montadas simultaneamente. Não havia roteador entre elas. Essa navegação foi
preservada, sem introduzir URLs, histórico de navegador ou dependências novas.

### Diagnóstico de performance

| Causa encontrada | Impacto provável | Prioridade | Correção aplicada |
| --- | --- | --- | --- |
| Busca, registro rápido, campos, erros e progresso dos formulários no pai | Cada tecla executava FinanceApp e reconciliava a tela atual | Alta | Estado e handlers nos componentes responsáveis |
| Saldos, categorias, agenda, insights e dados dos gráficos calculados no pai | Trabalho de telas inativas; cálculo do fluxo percorria transações por dia do mês | Alta | Cálculos somente nas páginas consumidoras; modelo do dashboard memoizado |
| Arrays recriados eram dependências de `useMemo` de alertas e insights | A memoização era invalidada em cada render do pai | Alta | Modelo calculado em função de dados e mês |
| Import direto de Recharts e de todas as telas | Gráficos e telas financeiras também entravam no carregamento da autenticação | Alta | FinanceApp, sete páginas e três diálogos carregados por `lazy` |
| Tabela de lançamentos sem limite | DOM proporcional ao histórico filtrado do mês | Média | Paginação local de 50 linhas; CSV continua usando todos os resultados |
| `.focus-mode .secondary { display: none }` | Resumos de orçamento e metas permaneciam no DOM | Média | Renderização condicional desses dois painéis |
| Raízes de três diálogos sempre presentes no JSX do pai | Definição de formulários e lógica no caminho de renderização e bundle inicial | Média | Montagem e carregamento condicionais; estado de cada operação local |

Os portais Radix já desmontavam o conteúdo fechado. Portanto, não havia centenas
de campos de modais ocultos permanentemente no DOM. O ganho dos diálogos é também
arquitetural e de carregamento, sem atribuir a eles uma redução fictícia de DOM.

Não havia consultas individuais por tela nem contexto financeiro amplo. A API
retorna um snapshot compartilhado necessário a saldos, cartões e outras telas.
Dividir a API não fazia parte desta refatoração. O snapshot permanece em memória
durante a sessão e é atualizado depois das mutações, sem refetch ao navegar.

As listas da agenda, recorrências, categorias, contas e metas também são
potencialmente ilimitadas, mas não havia evidência de volume que justificasse
alterar todas. Resumos do dashboard já limitavam lançamentos a 5, compromissos a
4, orçamentos a 3 e metas a 2. Nenhuma biblioteca de virtualização foi instalada.

### Sequência de migração

1. Mapear telas, dependências, estados, funções, portais e CSS de visibilidade.
2. Guardar a implementação original e executar um build de referência.
3. Apresentar o plano de páginas, componentes, estado e carregamento.
4. Extrair JSX e regras existentes, mantendo classes e componentes Radix.
5. Localizar estados e handlers; preservar filtros e rascunho entre navegações.
6. Aplicar lazy loading, desmontagem no modo foco e paginação.
7. Comparar renderização, executar TypeScript, lint, testes e build.
8. Inspecionar os manifests e remover imports e declarações sem uso.

## Arquitetura resultante

```text
frontend/
  AppEntry.tsx
  FinanceApp.tsx
  pages/
    OverviewPage.tsx       overview-model.ts
    TransactionsPage.tsx   AgendaPage.tsx
    AccountsPage.tsx       BudgetsPage.tsx
    GoalsPage.tsx          CategoriesPage.tsx
  dialogs/
    EditorDialog.tsx       OnboardingDialog.tsx       DeleteDialog.tsx
  components/finance/
    FinanceLayout.tsx      Navigation.tsx             PageLoading.tsx
    TransactionTable.tsx   GoalCard.tsx               AgendaRow.tsx
    QuickEntry.tsx         CategoryIcon.tsx           Empty.tsx
    Picker.tsx             TagPicker.tsx
    transaction-pagination.css
  finance/
    types.ts               navigation.ts             presentation.ts
    editor.ts              transactions.ts           ui-session.ts
  hooks/
    useFinanceData.ts
tests/
  run-frontend.mjs          frontend.test.mjs
docs/
  finance-refactor.md
```

### Responsabilidade de cada arquivo criado

Nas páginas, os contratos usam `Pick<PageProps, ...>` para declarar os dados e as
ações efetivamente utilizados. A composição passa props diretamente à página;
não foi criado um contexto global nem uma cadeia de providers.

| Arquivo | Responsabilidade, entradas e estado | Efeito sobre renderização/DOM |
| --- | --- | --- |
| `pages/OverviewPage.tsx` | JSX do dashboard; snapshot, mês, privacidade, foco, ações e cache de rascunho | Só monta na Visão geral; `memo` evita recalcular/reconciliar gráficos ao abrir um diálogo com props estáveis |
| `pages/overview-model.ts` | Saldos, categorias, orçamento, agenda, alertas, insights e séries do dashboard; recebe estado e mês | Cálculos saem do pai e rodam em `useMemo` da página |
| `pages/TransactionsPage.tsx` | Busca, tipo de filtro, página atual, ordenação, exportação e controles; recebe snapshot, mês, privacidade, demo e ações | Digitação local; 50 linhas; filtro e página preservados entre montagens |
| `pages/AgendaPage.tsx` | Compromissos, rendas automáticas e recorrências; snapshot, privacidade e ações | Derivação da agenda apenas enquanto a página está ativa ou no resumo do dashboard |
| `pages/AccountsPage.tsx` | Contas, cartões, faturas e preenchimento do pagamento; snapshot, mês, privacidade e ações | Cálculo memoizado de saldos na página; sem estado de formulário no pai |
| `pages/BudgetsPage.tsx` | Limites e consumo por categoria; snapshot, mês, privacidade e ações | Agregações locais memoizadas |
| `pages/GoalsPage.tsx` | Lista de metas e criação/edição/exclusão; snapshot, privacidade e ações | Reutiliza GoalCard; só monta quando ativa |
| `pages/CategoriesPage.tsx` | Categorias padrão, personalizadas e tags; snapshot e ações | Mantém regras e apresentação, com chunk independente |
| `dialogs/EditorDialog.tsx` | Oito modalidades do formulário, categorias/subcategorias e salvamento; recebe editor inicial, dados e callbacks | Campos, erro e saving locais; carregado e montado ao abrir |
| `dialogs/OnboardingDialog.tsx` | Três passos, rascunho, validação e mutações iniciais; callbacks de fechamento, conclusão e atualização | Estado local; novo rascunho a cada abertura, como antes |
| `dialogs/DeleteDialog.tsx` | Confirmação e exclusão; registro selecionado e callbacks | Saving local; só monta quando há exclusão selecionada |
| `components/finance/FinanceLayout.tsx` | Estrutura, cabeçalho, mês, ação contextual, banner e rodapé; children e diálogos | Mantém a estrutura comum sem JSX de páginas |
| `components/finance/Navigation.tsx` | Sidebar, foco, perfil e logout; tela ativa e callbacks | Reutiliza sidebar existente e fecha o menu móvel ao navegar |
| `components/finance/PageLoading.tsx` | Skeleton existente usado no carregamento de dados e módulos | Fallback acessível enquanto a página carrega |
| `components/finance/TransactionTable.tsx` | Uma implementação da tabela completa/compacta; linhas, dados, privacidade e ações | Evita duplicação entre dashboard e lançamentos; recebe apenas as linhas exibidas |
| `components/finance/GoalCard.tsx` | Progresso, sugestão mensal e ações da meta; meta, privacidade e callbacks | Reutilizado no dashboard e em Metas; exclusão controlada explicitamente |
| `components/finance/AgendaRow.tsx` | Linha de compromisso; item e privacidade | Reutilizado no resumo e agenda completa |
| `components/finance/QuickEntry.tsx` | Texto e interpretação do registro rápido; ação de edição e cache | Cada tecla atualiza somente o registro rápido |
| `components/finance/CategoryIcon.tsx` | Mapeamento de categoria para ícone e cor | Mesmo JSX, compartilhado pelas páginas e tabela |
| `components/finance/Empty.tsx` | Estado vazio existente, com título, texto e ação opcional | Reutilização sem alteração visual |
| `components/finance/Picker.tsx` | Select existente; opções, valor e callback | Reutilizado pelos diálogos; sem estado financeiro |
| `components/finance/TagPicker.tsx` | Seleção de tags; lista, valor serializado e callback | Fica no caminho de carregamento do editor |
| `components/finance/transaction-pagination.css` | Estilo apenas dos controles de paginação | A única adição visual funcional; reutiliza Pagination existente |
| `finance/types.ts` | Tipos de telas, editor, entidades, contratos e estado de navegação | Dependências de tipos, sem contexto reativo |
| `finance/navigation.ts` | Itens e ícones do menu original | Metadados compartilhados entre layout e navegação |
| `finance/presentation.ts` | Datas, cores, categorias, pendência e construção da agenda | Reutiliza regras existentes sem importar gráficos |
| `finance/editor.ts` | Valores iniciais e conversão de um registro para campos de edição | Preserva preenchimento, centavos, tags e extras de pagamentos |
| `finance/transactions.ts` | Busca, filtro de pendência/tipo e ordenação | Função testável; não limita os resultados usados no CSV |
| `finance/ui-session.ts` | Cache não reativo de filtros/página e registro rápido | Preserva estado ao desmontar, sem fazer FinanceApp renderizar a cada tecla; descartado no logout |
| `hooks/useFinanceData.ts` | Snapshot real/demo, carregamento, erro e refresh | Uma leitura inicial; reutilização dos dados nas trocas de tela |
| `tests/run-frontend.mjs` | Empacotamento da suíte com esbuild já disponível | Sem nova dependência de testes |
| `tests/frontend.test.mjs` | Seis regressões de DOM, paginação, cache, filtros, fatura paga e preenchimento do editor | Protege os pontos de risco da extração |

Arquivos existentes modificados: `frontend/FinanceApp.tsx`,
`frontend/AppEntry.tsx` e `package.json` (apenas o script `test:frontend`).
APIs, backend, regras financeiras, lockfile e estilos globais foram preservados.

### Estado local e compartilhado

- Local: busca/filtro/paginação em Lançamentos; texto em QuickEntry; campos,
  erro e saving no editor; passos/rascunho/erro/saving no onboarding; saving na
  confirmação de exclusão.
- Compartilhado: snapshot real/demo, carregamento e erro da leitura; mês;
  preferências de foco e privacidade; tela ativa; seleção do editor/exclusão e
  abertura do onboarding. A versão do registro rápido coordena sua limpeza após
  salvar, preservando o comportamento anterior.
- O cache da sessão guarda valores de interface, sem manter componentes montados
  nem emitir atualizações globais. “Ver todos” limpa busca/filtro como antes.
- Os dados continuam sendo atualizados depois de salvar/excluir/concluir
  onboarding. Não foi introduzido cache persistente de dados financeiros.

## Validação e medidas

### Renderização

Comparação temporária com o código original, usando o mesmo React, as mesmas
fixtures e renderização estática. Os atributos de IDs gerados pelo React/Radix e
espaçamento de marcação foram normalizados. **28/28 comparações equivalentes**:
sete telas × dados de exemplo/vazios × valores visíveis/ocultos.

| Cenário | Antes | Depois | Resultado |
| --- | ---: | ---: | --- |
| Conteúdo da Visão geral normal | 385 elementos | 385 elementos | Preservado |
| Conteúdo da Visão geral em modo foco | 385 | 295 | 90 elementos a menos, cerca de 23% |
| Lançamentos com 1.000 registros no mês | 26.029 | 1.333 | Cerca de 95% a menos; 50 linhas montadas |

São contagens de elementos HTML da página renderizada no servidor, excluindo o
layout comum. **Não** são contagens de DOM medido em navegador: ResponsiveContainer
não desenha os SVGs completos nesse ambiente. Tempos de navegação, commits e
renders do React DevTools Profiler não foram medidos nesta execução.

### Bundle

Builds de produção antes/depois, mesma configuração e dependências. Soma dos
arquivos JavaScript de AppEntry e seu grafo de **imports estáticos** no manifest:

| Medida | Antes | Depois |
| --- | ---: | ---: |
| JavaScript minificado do grafo estático de AppEntry | 946.046 bytes | 296.646 bytes |
| Soma gzip desses arquivos | 276.923 bytes | 94.083 bytes |
| Chunk AppEntry isolado | 663.548 bytes | 10.154 bytes |

Redução aproximada de **69% no grafo estático minificado** e **66% em gzip**.
Isso caracteriza o carregamento da entrada/autenticação, não o total baixado por
um usuário que abre todas as telas. Após autenticar, o shell e a Visão geral são
carregados. Recharts continua necessário nessa tela, em um chunk de cerca de
369 kB, e não foi eliminado do tamanho total da aplicação.

O manifest confirmou chunks próprios para as sete páginas e os três diálogos.
Páginas secundárias e formulários deixaram de fazer parte do grafo estático da
entrada. Nenhum chunk ultrapassou o aviso padrão de 500 kB no build final.

### Verificações executadas

- `tsc --noEmit`: passou, sem erros de tipos, imports ou props.
- ESLint do projeto: zero erros; três warnings em arquivos não modificados
  (`backend/src/index.ts` e duas diretivas em `worker-configuration.d.ts`).
- Suíte financeira existente: **19/19** testes passaram.
- `npm run test:frontend`: **6/6** testes passaram.
- Comparação temporária com a versão original: **28/28** cenários passaram.
- `scripts/build-verified.sh`: build de produção concluído com sucesso.
- `git diff --check`: sem erros de whitespace nos arquivos rastreados.

Os testes de renderização cobrem remontagem com filtros, paginação/última página,
modo foco e preenchimento do editor; não equivalem a uma suíte de interação no
navegador. Diálogos, APIs e lógica de salvamento foram movidos preservando os
handlers. Não se atribuem ganhos de latência ou de duração de commits sem medição.

## Resultado

FinanceApp passou de **3.812 para 88 linhas**, aproximadamente **98% menos
linhas**, e contém composição, navegação e coordenação das ações compartilhadas.
A redução não depende apenas da contagem: não há grandes blocos de JSX de telas,
cálculos do dashboard ou estado de campos de formulário no componente.

O DOM diminuiu diretamente com o modo foco e a paginação. O custo de renderização
foi localizado ao mover inputs/formulários e cálculos. O carregamento inicial
diminuiu com imports dinâmicos; navegação reutiliza dados já carregados e monta
apenas a página ativa. A arquitetura mantém os componentes e regras existentes,
com pontos explícitos para acrescentar novas telas sem voltar ao monólito.
