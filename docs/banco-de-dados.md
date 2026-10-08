# Banco Finance — MDL 2

Migration incremental `drizzle/0003_finance_core.sql`, no journal Drizzle já
existente. `0001_profiles` e `0002_profiles_rls` são preservadas; nenhum reset,
reprovisionamento ou alteração Auth/PostgreSQL/TLS.

| Tabela em app | Conteúdo | Integridade |
| --- | --- | --- |
| financial_accounts | owner, nome, tipo, moeda, abertura BIGINT, estado | PK UUID; CHECK nome/tipo/moeda; UNIQUE id+owner+currency |
| financial_categories | owner, nome, INCOME/EXPENSE, estado | PK UUID; CHECK nome/kind; UNIQUE id+owner+kind |
| financial_transactions | receita/despesa, conta, categoria opcional, valor, instante, cancelamento | amount > 0; FKs compostas conta+owner+currency e categoria+owner+type |
| financial_transfers | origem/destino, valor/moeda, instante, cancelamento, chave idempotente | amount > 0; origem != destino; duas FKs conta+owner+currency; UNIQUE owner+key |

`TRANSFER` é um tipo do read model HTTP: a entidade transferência é projetada
junto a receitas/despesas na listagem, sem duplicar dados. Todos os timestamps
são TIMESTAMPTZ e valores monetários persistidos são BIGINT.

Índices: owner nas contas/categorias; owner+ocorrência+id para paginação;
owner+conta+ocorrência e owner+categoria+ocorrência para filtros; origem/destino
de transferências para saldos/histórico. Sem índices especulativos.

As quatro tabelas têm RLS habilitado e policies SELECT/INSERT/UPDATE para
`authenticated` com `(select auth.uid()) = auth_user_id`, USING e WITH CHECK
no UPDATE. Não há policy DELETE: Finance não oferece exclusão física.
Não são concedidos novos privilégios Data API. O backend valida ownership
mesmo com conexão administrativa. Grants usados pelos testes A/B existem
somente no PostgreSQL descartável/CI.

Drizzle gera o schema/snapshot. A migration foi revisada para não recriar as
policies de profiles que já existiam na migration manual 0002. A repetição do
migrator é no-op. Falhas de transferência são testadas com trigger sintético
AFTER INSERT exclusivamente no banco descartável e rollback comprovado.

## MDL 3 — Migration 0004_monthly_budgeting

Incremental pelo mesmo journal/migrator Drizzle, sem alterar migrations antigas,
Auth, dados MDL 2, grants Data API ou configuração PostgreSQL/TLS.

| Tabela em app | Conteúdo | Integridade |
| --- | --- | --- |
| financial_budget_periods | owner, mês YYYY-MM, currency, time_zone, timestamps | UNIQUE owner+month+currency; UNIQUE id+owner+currency; CHECK mês/moeda/timezone válido |
| financial_budget_allocations | owner, período, categoria EXPENSE, currency, base BIGINT, policy, is_active, timestamps | UNIQUE period+category; CHECK base >= 0, kind EXPENSE, policy NONE/POSITIVE_ONLY; FKs compostas owner/currency e owner/kind |

Índice owner+period em allocations serve consulta mensal/RLS; UNIQUE do período
serve lookup/histórico por owner. Índices existentes de transações atendem a
agregação por owner/intervalo. Sem índices especulativos ou dinheiro float.
As duas tabelas têm SELECT/INSERT/UPDATE authenticated por `(select auth.uid())`;
UPDATE também usa WITH CHECK. Nenhuma policy DELETE: remoção é soft-deactivate.
Backend deriva owner mesmo usando conexão administrativa. Schema `app` privado.

Spent, remaining, percentuais, pace e rollover não são colunas persistidas.
Snapshot Drizzle é `meta/0003_snapshot.json` (índice sequencial do journal);
SQL público é `0004_monthly_budgeting.sql` para manter nomenclatura de migrations
anteriores. Reexecutar migrator é no-op. Testes A/B usam grants somente no banco
descartável; não criar dados financeiros hospedados por SQL para gate humano.

## MDL 4 — Migration 0005_financial_goals

Adiciona somente financial_goals e financial_goal_events no schema privado app;
não altera migrations/tabelas anteriores. Snapshot gerado meta/0004_snapshot.json
é o índice 4 do journal; SQL renomeado para 0005_financial_goals conserva a
sequência pública existente. Instalação DEV após revisão e PostgreSQL/RLS PASS,
com TLS verify-full e hashes inalterados de profiles e seis tabelas Finance.

Goals: UUID/owner, nome/descrição, moeda, alvo BIGINT >0, mês opcional válido,
plano BIGINT nullable/>=0, prioridade/status limitados, timestamps/archive coerente.
Events: UUID/owner/goal, CONTRIBUTION/WITHDRAWAL, BIGINT >0, occurred_at, note,
UUID idempotency key e created_at. UNIQUE owner+key e FK goal+owner impedem
relação cross-owner. Índices owner+status, owner+currency, goal+occurred_at+id
servem filtros, agregação e histórico paginado. Não persistir current_amount.

RLS goals: SELECT/INSERT/UPDATE authenticated por (select auth.uid())=owner;
UPDATE tem USING e WITH CHECK, sem DELETE. Events: somente SELECT own, sem
INSERT/UPDATE/DELETE direto para clientes; append requer backend privado e seu
controle transacional de status, retirada e idempotência. Nenhum grant Data API
novo. Testes descartáveis dão grants apenas para verificar allow/deny A/B/anon.
Backend administrativo sempre filtra owner. Não inserir dados remotos de gate.

## MDL 5 — Migration 0006_financial_recurrences

One private app.financial_recurrences table: UUID id/owner; name/description;
INCOME/EXPENSE, STANDARD/SUBSCRIPTION; amount_minor BIGINT >0 and explicit
currency; nullable account/category; WEEKLY/MONTHLY/YEARLY and bounded interval;
start_date/end_date DATE; ACTIVE/PAUSED/ARCHIVED and lifecycle timestamps.
Checks enforce name, enums, positive money, EXPENSE subscription, interval per
frequency, supported civil dates/inclusive end and archive timestamp coherence.
Indexes owner+status, owner+kind, owner+currency support bounded projection/filtering.
Compound FKs reference account(id,owner,currency) and category(id,owner,kind).
Projected occurrences, next date and totals are derived, never persisted.

RLS SELECT/INSERT/UPDATE for authenticated uses (select auth.uid())=auth_user_id;
UPDATE has USING and WITH CHECK. No DELETE policy, new hosted grants or app Data
API exposure. Direct SQL grants in disposable integration are test-only to prove
allow/deny for A/B/anon, owner reassignment, FK integrity and no DELETE.

Only new 0006 SQL and generated meta/0005_snapshot.json/journal entry were added;
0001–0005 are unchanged. Reviewed DDL and PostgreSQL17 migrations/RLS regression
passed before application to existing Supabase DEV, with TLS verify-full.
Exact SHA256 snapshots of all rows in profiles and eight previous financial
tables (accounts, categories, transactions, transfers, budget periods/allocations,
goals/events) were unchanged. No resets, destructive migrations, secrets or
remote fixture records. Local environment files remain ignored and preserved.

## MDL 6 — Net Worth / Patrimônio

MDL6 COMPLETE, integrado em `main`: patrimônio por moeda,
saldos assinados de contas somente leitura, itens externos, avaliações append-only,
posição histórica e arquivamento terminal. Sem FX, projeções ou alteração do ledger.
O gate humano foi aprovado em 2026-10-05. Regras, API, schema, limites e roteiro estão em
[Net Worth](./net-worth.md).

## MDL 7 — Yield Engine / Rendimentos

Migration incremental gerada/revisada `0008_financial_yield_engine` acrescenta:
`app.financial_yield_profiles`, `financial_yield_rules` e `financial_market_rates`.
Profile único por conta; FK composta account+owner+currency. Rule pertence ao
profile+owner; datas sem sobreposição, shape/tax/cap/carência validados.
Trigger SECURITY INVOKER com search_path fixo e row lock impede edição histórica
e concorrência sobreposta; apenas primeiro fechamento de effectiveTo permitido.

RLS: profile SELECT/INSERT/UPDATE próprios; regras SELECT/INSERT próprios somente
em profile ativo, sem policies UPDATE/DELETE. Cache global backend-only com RLS
sem policies públicas, chave benchmark+series+date e taxa numeric(38,18).
Sem grants novos ao Data API, sem extensão ou alteração de0001–0007.
Antes de DEV: disposable PostgreSQL17/RLS PASS e comparação de hashes exatos das
12 tabelas anteriores antes/depois. Sem fixtures remotas. TLS verify-full intacto.
O estado efetivo da aplicação remota é registrado em PROJECT_STATE.

## MDL 8 — 0009_financial_cards

Quatro tabelas privadas: financial_credit_cards, financial_card_billing_rules,
financial_card_purchases e financial_card_installments. DATE para ciclos/datas;
BIGINT para minor units. Conta credit de owner/currency iguais, única por cartão.
FKs compostas também ligam categoria EXPENSE, purchase e transaction ao owner.
Novo UNIQUE transaction(id,owner) e guards aditivos, sem modificar0001–0008.
Rules sem overlap e immutable; installments immutable. Constraints deferred
exigem N parcelas, soma total e transações EXPENSE consistentes, inclusive cancel.
RLS: cartão own SELECT/INSERT/UPDATE; filhos own SELECT, escrita só pelo backend
controlado. Sem DELETE público ou grants novos. Nenhum total/saldo de fatura
duplicado. DEV recebeu estruturas vazias depois de PG17/RLS PASS; as15 tabelas
anteriores foram preservadas na migration. Após o gate humano, a closure validou
por leitura counts/hashes e estrutura das19 tabelas, preservando também os dados
reais de Cards. Sem reset, fixtures extras, mudança de Auth/JWT/JWKS ou downgrade TLS.

## MDL9 — Migration0010

0010_financial_debts: financial_debts/terms/payments, compound owner/currency/type FKs, RLS own SELECT com escrita controlada pelo backend, versões imutáveis/não sobrepostas, constraints diferidas do ledger. Tipo debt acrescentado ao CHECK existente; uniques de conta e transferência suportam FKs novas. Migrations0001–0009 e dados existentes preservados; sem reset, Auth/TLS ou grants Data API. [Integridade e rollout](./DEBT_PAYOFF.md).

## MDL10 — Safe to Spend

0011_financial_safe_to_spend adiciona somente financial_safe_spend_profiles e financial_safe_spend_accounts privadas, RLS own SELECT e escritas backend-controlled. FKs compostas preservam owner/moeda/tipo; identidade imutável. Migrations0001–0010 permanecem intactas; não há tabela de saldo, resultado ou snapshot financeiro. [Modelo e limites](./SAFE_TO_SPEND.md).
