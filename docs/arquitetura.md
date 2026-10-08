# Finance — Financial Core e Monthly Budgeting

Finance é o primeiro bounded context funcional do monólito modular. Identity/Auth
continua sendo o módulo já validado; nenhum fluxo Auth foi reconstruído.

```text
JWT verificado → routes/TypeBox → application/domain → repository/Drizzle → PostgreSQL app + RLS
                                      ↑
                           adaptadores futuros, sem SQL direto
```

- `src/modules/finance/domain.ts`: Money e invariantes sem Fastify.
- `application.ts`: casos de uso e proprietário fornecido por um adaptador confiável.
- `repository.ts`: relações owner/currency, bloqueios, transação e consultas.
- `contracts.ts`/`routes.ts`: contrato HTTP explícito, autenticação existente.
- `src/db/schema/finance.ts`: modelo Drizzle e constraints reais.

A conexão existente permanece Shared Pooler Session com TLS `verify-full` e CA
local. O schema `app` continua privado; não expor Finance no Data API. RLS é
defesa adicional às consultas e FKs compostas owner/currency no backend.
Não há `SECURITY DEFINER`, views, saldo cacheado, broker ou infraestrutura de IA.

## Contratos

`openapi/openapi.json` é gerado pelo Fastify/TypeBox. O gerador offline
`node --import tsx scripts/finance-contract.ts` produz
`openapi/finance-client.ts` com Zod e tipos inferidos. Front versiona o artefato,
sem importar arquivos do Back em runtime. A reprodução entre checkouts usa
`--output=../Front/src/features/finance/contracts.generated.ts`; `--check`
detecta drift. O cabeçalho registra SHA-256 do contrato e mapa monetário.

Erros: 400 entrada/moeda incompatível, 401 JWT ausente/inválido, 404 registro ou
relação não pertencente ao usuário (sem revelar existência), 409 inatividade ou
chave idempotente reutilizada com outro conteúdo. Erros SQL/provider não são
enviados ao cliente nem logados com payloads.

## MDL 3 — Orçamento mensal

Budget estende Finance, não cria outro domínio. `budget-contracts.ts` e
`budget-routes.ts` adicionam seis operações ao contrato TypeBox/OpenAPI;
`budget-application.ts` obtém owner autenticado e timezone do perfil.
`budget-domain.ts` calcula somas BigInt, rollover, percentuais e ritmo;
`budget-repository.ts` aplica ownership, locks e consultas Drizzle/PostgreSQL.
`src/db/schema/budgets.ts` define duas tabelas incrementais.

O read model usa uma transação repeatable-read/read-only para manter coerência
entre períodos, limites e despesas. PostgreSQL resolve os intervalos mensais no
timezone persistido do período. Não há cache de saldo/gasto, cron de fechamento,
previsão, serviço de IA ou nova dependência de produção.

PUT de período é idempotente. Alterações/cópia serializam pelo período destino;
cópia é transacional e preserva limites já existentes, mesmo desativados. RLS e
FKs compostas complementam filtros owner do backend. Auth e as quatro tabelas
do MDL 2 não são alterados.

## MDL 4 — Financial Goals

JWT sub → goal-routes (TypeBox) → goal-application (validação/timezone do perfil)
→ goal-repository (ownership/transações) → app.financial_goals/financial_goal_events.
goal-domain calcula o read model com BigInt, sem persistir saldo/progresso.
Listagem e detalhe agregam goal+eventos em uma única instrução SQL; prioridade
HIGH/MEDIUM/LOW ordena a listagem. Histórico usa cursor occurred_at+id, até 100
eventos por página. O mês atual é obtido do timezone atual do perfil, com UTC
quando não há perfil. Contratos TypeBox/OpenAPI/Zod são gerados offline.

Evento é append-only e representa destinação declarada, não movimentação de conta.
Nenhuma escrita alcança accounts, transactions, transfers ou budgets. A transação
adquire advisory lock por owner+idempotency key e row lock da meta: mudanças de
status e retiradas concorrentes não podem furar o saldo nem duplicar progresso.
Replay verifica todos os campos normalizados e pode ocorrer após pausa/archive;
um novo evento exige ACTIVE. Schema app permanece privado e sem novos grants
Data API. RLS e FK composta reforçam isolamento; eventos não têm policies de
escrita direta, para impedir contorno das invariantes do serviço.

## MDL 5 — Recurrence boundary

recurrence-contracts (TypeBox) → recurrence-routes (JWT) → recurrence-application
(profile today/window orchestration) → recurrence-repository (owner filters,
locks/associations) → app.financial_recurrences. recurrence-domain is a pure civil
calendar engine and exact-money aggregation. Generated OpenAPI and Zod remain
byte-identical between repos, without runtime filesystem coupling.

Projection does one eligible-rule SELECT with account/category owner joins;
optional filter-reference validation and profile context are constant queries,
never one query per occurrence. A 501-row probe detects the 500-rule limit.
Each rule seeks directly from its original anchor and probes at most 54 dates
in a 366-day window. No scheduler, jobs, materialized occurrence table or writes
on reads. Service derives next date, calendar and radar from the same engine.

Writes affect only recurrence rows: patch/status acquire FOR UPDATE, while
association validation uses FOR SHARE on existing account/category rows. Owner
filters, compound FKs and RLS enforce isolation. No Auth transport/config changes,
new dependencies or writes to earlier module tables. Pause/archive serialization
preserves terminal status; hosted app remains outside the Data API.

## MDL 6 — Net Worth / Patrimônio

MDL6 COMPLETE, integrado em `main`: patrimônio por moeda,
saldos assinados de contas somente leitura, itens externos, avaliações append-only,
posição histórica e arquivamento terminal. Sem FX, projeções ou alteração do ledger.
O gate humano foi aprovado em 2026-10-05. Regras, API, schema, limites e roteiro estão em
[Net Worth](./net-worth.md).

## MDL 7 — Yield Engine / Rendimentos

Yield permanece no contexto Finance: yield-routes/contracts → yield-application →
yield-repository + yield-domain. O serviço lê contas/ledger real, nunca os escreve.
MarketRateService usa somente BCB público via adaptador bounded, cache privado
PostgreSQL e deduplicação de requests; não há scheduler nem serviço pago.
TypeBox gera OpenAPI/Zod; decimal.js 10.6.0 é a única dependência nova, para
composição com precisão50 e arredondamento monetário somente na saída.
Veja [modelo e fontes](./YIELD_ENGINE.md).

## MDL 8 — Cards, Invoices & Installments

card-routes/contracts → card-application → card-repository + pure card-domain.
One backing credit account; purchase/installments/EXPENSE transactions in one SQL
transaction. Payments use Finance Core transfers; invoices/limits are read models.
Shared account locks serialize purchase, payments and corrective cancellation.
Compound FKs, private RLS, immutable rules and deferred ledger constraints enforce
ownership and completeness. No writes to Budget/Goals/Recurrences/Net Worth/Yield.
Calendar extension deferred; Cards supplies due dates without changing MDL5.
[Decisions](./CARDS_INVOICES.md). No new dependency or external cost.

## MDL9 — Debt & payoff

Finance: debt-routes/contracts → debt-application → debt-repository + debt-domain puro. Pagamento materializa transferência e custos em uma transação, com locks das contas ordenados e chave por owner. RLS privada e constraints diferidas conferem ledger; simulador lê principal e termos, sem consultas por mês nem escrita. Resumo por moeda em uma consulta. [Decisões](./DEBT_PAYOFF.md). Nenhuma nova dependência de produção.

## MDL10 — Safe to Spend

Snapshot financeiro único repeatable-read/read-only, leituras batch e cálculo puro. Reutiliza Cards, Debt terms, Budget, Goals e Recurrences; apenas configurações próprias são escritas. Contratos TypeBox → OpenAPI/Zod gerado, sem cálculo monetário paralelo no Front. [Modelo e limites](./SAFE_TO_SPEND.md).
