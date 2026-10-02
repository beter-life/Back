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
