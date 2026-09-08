# Clareza — finanças pessoais

Aplicação web em português, orientada a registros rápidos e à construção gradual de um hábito financeiro. Acesso privado, dados persistentes e separação de frontend e backend por uma API JSON.

## Começar

Ao acessar sem registros, a aplicação mostra uma **prévia identificada com dados fictícios**. Clique em **Começar minhas finanças**, cadastre uma conta com o saldo atual e registre o próximo gasto. Os exemplos nunca são gravados no banco.

O registro rápido aceita `Café 12,50` e abre uma conferência com descrição e valor preenchidos. O modo foco reduz o painel a saldo, receitas, despesas, registros e compromissos. Visibilidade dos valores e modo foco são as únicas preferências armazenadas no navegador; registros financeiros ficam no backend.

## Arquitetura

| Diretório | Responsabilidade |
| --- | --- |
| `frontend/` | Aplicação React, formulários acessíveis e cliente HTTP. Não importa banco ou código do backend. |
| `backend/src/index.ts` | API TypeScript independente do React/Vinext, com `fetch(Request, Env)`. Autorização, validação Zod e acesso D1. |
| `shared/finance.ts` | Contratos e funções financeiras puras, sem acesso a dados. |
| `db/schema.ts`, `drizzle/` | Esquema Drizzle e migrações SQL versionadas. |
| `app/` | Entrada e metadados do frontend. |
| `worker/index.ts` | Adaptador da hospedagem: encaminha `/api/*` ao backend e o restante ao frontend. |

**Nesta entrega, frontend e backend são módulos separados que se comunicam por HTTP, publicados no mesmo Worker e domínio. Não são dois serviços implantados independentemente.** O backend não depende do framework de apresentação e pode ser extraído, mas essa mudança exige configurar um gateway de identidade confiável e a política de origens para o novo ambiente. A separação de pastas, por si só, não assegura o sistema.

## Funcionalidades

- Cadastro, edição e exclusão de contas, cartões, lançamentos, orçamentos e metas.
- Receitas/despesas pagas e previstas, busca, filtros por mês e exportação CSV.
- Transferências entre contas e registro de pagamento de fatura sem duplicar despesas.
- Compras no cartão com até 48 parcelas, fechamento, vencimento e divisão exata dos centavos.
- Orçamentos por categoria/mês, gráficos de despesas e fluxo acumulado mensal.
- Metas com valor desejado, valor informado como guardado e data de objetivo.
- Modo foco, ocultação de valores e interface responsiva.

## Regras financeiras

Os valores transitam na API como **centavos inteiros**. Uma compra de R$ 100,00 em três parcelas gera R$ 33,34 + R$ 33,33 + R$ 33,33. Datas que caem fora do mês são ajustadas ao último dia. Compras no dia do fechamento já entram no próximo ciclo.

- O saldo de contas considera o saldo inicial e lançamentos concluídos até hoje, no calendário de São Paulo.
- Despesas no cartão compõem a dívida total, incluindo parcelas futuras. Não debitam a conta bancária antes do pagamento.
- Disponível após compromissos = saldo de contas − dívida total dos cartões − todas as despesas pendentes fora dos cartões. É uma projeção conservadora baseada nos registros, sem incluir receitas futuras ou descontar metas.
- Receitas/despesas mensais incluem lançamentos previstos. Parcelas do cartão entram no mês de vencimento. Transferências ficam fora do total de receitas e despesas.
- Um pagamento de cartão é uma transferência associada explicitamente ao mês da fatura, mesmo quando pago em outro mês.
- Saldo inicial negativo de cartão aparece na dívida total; não cria automaticamente lançamentos de uma fatura histórica.
- Atualizar uma meta não movimenta contas. O valor guardado é informado manualmente.
- Excluir uma parcela exclui apenas aquela parcela. Parcelas existentes não são editadas em lote.

## Segurança implementada

- Identidade obtida no servidor pelo cabeçalho `oai-authenticated-user-id`, injetado pelo gateway autenticado da hospedagem privada.
- A API também aceita **Personal Access Tokens** pelo cabeçalho `Authorization: Bearer clrz_...`. Cada token pertence a um único usuário, tem escopos `finance:read` e/ou `finance:write`, pode expirar em até 365 dias e pode ser revogado imediatamente.
- Tokens são criados ou revogados apenas por uma sessão autenticada em `POST`/`DELETE /api/auth/tokens`; o valor completo é devolvido só na criação. O banco guarda somente SHA-256 do token, seu prefixo e metadados — nunca o segredo recuperável.
- Não exponha diretamente este Worker em outra infraestrutura confiando em cabeçalhos enviados pelo navegador. Fora desse gateway, é necessário substituir a integração por autenticação verificada no servidor.
- Leituras e mutações sempre usam o proprietário autenticado, inclusive verificações de referências entre contas e lançamentos.
- API rejeita acessos sem identidade, escrita de outra origem, tipos inválidos, centavos fracionários, datas impossíveis e payloads maiores que 16 KB.
- SQL parametrizado, operações de múltiplas parcelas em lote transacional, chaves de idempotência por operação e respostas privadas com `Cache-Control: no-store`.
- Limitação de 90 operações concluídas por usuário/minuto. É um controle básico, não uma proteção dedicada contra DDoS.
- CSV neutraliza prefixos de fórmulas em campos exportados; conteúdo textual no app é renderizado pelo React.
- Sem credenciais bancárias ou segredos no frontend.

Os testes automatizados cobrem cálculos e regras de API, não constituem uma auditoria de segurança completa. Contas/cartões são cadastros manuais: não há Open Finance, conciliação bancária automática, notificações externas, geração recorrente de contas ou cálculo de juros/rendimentos nesta versão.

## Acesso à aplicação e API

A entrada pelo navegador continua sendo feita pelo login privado da plataforma, que identifica o usuário e mantém suas finanças isoladas. O Bearer token é voltado a integrações, automações ou um cliente externo; ele não deve ser colocado em código do frontend, planilhas compartilhadas ou repositórios.

| Operação | Autenticação | Escopo necessário |
| --- | --- | --- |
| `GET /api/state` | Sessão ou Bearer | `finance:read` |
| `POST`, `PUT`, `DELETE /api/{accounts,transactions,budgets,goals}` | Sessão ou Bearer | `finance:write` |
| `GET /api/auth/tokens` | Sessão do navegador | — |
| `POST /api/auth/tokens` | Sessão do navegador | — |
| `DELETE /api/auth/tokens/{id}` | Sessão do navegador | — |

Exemplo de chamada feita por um processo seguro no seu computador/servidor:

```bash
curl https://clareza-financas.vinidedeco1.chatgpt.site/api/state \
  -H 'Authorization: Bearer clrz_SEU_TOKEN_AQUI'
```

Não há CORS liberado para origens externas. Chamadas Bearer feitas por servidor funcionam sem `Origin`; uma escrita enviada por um navegador de outra origem é bloqueada. A emissão de tokens já está disponível pela API para a sessão autenticada; uma tela visual de gestão de tokens entra como primeira melhoria de produto no planejamento abaixo.

## Próximas melhorias

O plano priorizado, incluindo o bloqueio visual de investimentos enquanto houver dívidas, está em [docs/roadmap.md](docs/roadmap.md).

## Desenvolvimento e verificação

Requer Node.js 24 para os testes com SQLite nativo. O runtime da aplicação usa React, TypeScript, Vinext/Vite e Cloudflare D1. As versões estão fixadas no lockfile.

```bash
npm run install:ci
npm run dev
npm test
npx tsc --noEmit
npm run build
```

O acesso aos dados requer a identidade fornecida pela hospedagem. A execução local comum não inventa um usuário e retorna 401 na API. Os testes executam a API diretamente contra SQLite em memória e fornecem identidades apenas no ambiente de teste. As migrações D1 são aplicadas pela hospedagem antes da publicação.

## Referências de produto

- [Mobills: organização, planejamento e cartões](https://www.mobills.com.br/blog/mobills/como-utilizar-o-mobills/)
- [Organizze: gestão simples de finanças pessoais](https://www.organizze.com.br/)
- [Minhas Economias](https://minhaseconomias.com.br/)

A identidade visual e o código são próprios. As referências servem de inspiração funcional, sem replicar marcas ou telas.
