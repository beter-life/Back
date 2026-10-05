# Requisitos implementados — Finance MDL 2/3

- Contas próprias: criar, listar, consultar, editar nome/tipo, desativar/reativar.
- Categorias próprias INCOME/EXPENSE: criar, listar, editar nome, desativar/reativar.
- Receitas/despesas: criar/listar/consultar, categoria opcional compatível;
  corrigir descrição e cancelar sem apagar o histórico.
- Transferência explícita entre contas ativas do mesmo usuário e moeda;
  atomicidade, idempotência e cancelamento integral.
- Saldos calculados exatos e summary por moeda/período.
- Filtros e paginação bounded, JWT/ownership e RLS.

## HTTP

Todos os endpoints Finance usam Bearer e o prefixo `/api/v1/finance`.

| Recurso | Métodos |
| --- | --- |
| accounts | GET, POST |
| accounts/:id | GET, PATCH |
| categories | GET, POST |
| categories/:id | PATCH |
| transactions | GET, POST |
| transactions/:id | GET, PATCH |
| transfers | POST |
| transfers/:id | PATCH (cancelamento) |
| summary | GET com from/to |

GET retorna 200, criação/replay de transferência 201. Contratos completos no
OpenAPI gerado. `authUserId`/`auth_user_id` não são campos de entrada.

Fora de escopo: metas, recorrência, cartão avançado, investimento avançado,
importação, banco/OpenFinance, IA, analytics/forecast e MDL 4+.

## MDL 3 — Monthly Budgeting

- Criar/consultar período mensal por moeda e timezone do perfil.
- Criar/editar/desativar limites EXPENSE não negativos, preservando histórico.
- Resumo e progresso: planejado, sobra, disponível, gasto, restante e utilização.
- Sobra positiva opcional de mês anterior encerrado; nenhuma dívida carregada.
- Cópia idempotente dos limites/policies do mês imediatamente anterior.
- Despesas sem limite ou categoria sempre visíveis; ritmo linear determinístico.
- Ownership, RLS, constraints e isolamento de moeda; sem conversão.

Prefixo `/api/v1/finance/budgets`; todos exigem Bearer:

| Rota | Método / entrada |
| --- | --- |
| /:month | GET `?currency=BRL`; PUT `{ currency }` |
| /:month/categories/:categoryId | PATCH `{ currency, amountMinor, rolloverPolicy }` |
| /:month/categories/:categoryId | DELETE `?currency=BRL` (desativação) |
| /:month/copy-previous | POST `{ currency }` |
| /:month/summary | GET `?currency=BRL` |

Respostas 200; 400 entrada incompatível, 401 sem identidade, 404 relação/período
ausente ou alheio, 409 tentativa de novo limite em categoria inativa. Não aceitar
owner, timezone, gastos ou saldos calculados do cliente. `month` é YYYY-MM,
anos 1000–9998. Contratos completos e tipos Zod são gerados offline.

Gate real MDL 3 aprovado pelo usuário em 2026-10-02: orçamento, despesa,
cálculos, reload, edição, copy previous e ownership PASS.

## Gate real manual — aprovado

O usuário aprovou o fluxo com sessão Auth real: contas, categorias,
receita/despesa, transferência, saldos e persistência após reload passaram no
Supabase hospedado. O ownership foi validado pelos gates de API e RLS. Nenhum
dado do gate foi inserido por SQL; os testes automatizados continuam sendo
evidência complementar, não substituto do fluxo real.

## MDL 4 — Financial Goals (gate real aprovado)

Criar/listar/consultar/editar metas, pausar/retomar/arquivar, registrar contribuição
e retirada manual, consultar histórico e read model de planejamento. Moeda fixa
por meta; descrição/prazo mensal/plano mensal opcionais; prioridade LOW/MEDIUM/HIGH.

| Caminho /api/v1/finance/goals | Operação |
| --- | --- |
| / | GET com status/currency opcionais; POST cria (201) |
| /:goalId | GET detalhe; PATCH campos explícitos |
| /:goalId/events | GET histórico (limit 1–100, cursorAt+cursorId); POST evento idempotente (201, inclusive replay) |

Owner vem exclusivamente do JWT. Não aceitar saldo, progresso, required monthly,
estimated completion ou currency no PATCH. 400 para entrada inválida; 401 para
identidade ausente/inválida; 404 uniforme para meta alheia/inexistente; 409 para
conteúdo idempotente divergente, saldo insuficiente ou novos eventos inativos.
Preservar MDL 2/3 e Auth. Não implementar rendimento, recorrência, simulação,
integração conta/meta, Conflict Detector, Safe to Spend, IA, Open Finance ou MDL6+.

Exemplo do fluxo de gate: criar Reserva teste BRL 10.000, plano 1.000/mês e prazo
futuro; contribuir 2.500 (25%/7.500 restantes), reload, retirar 500 (20%/8.000),
editar alvo para 12.000 (16,66%/10.000), pausar/retomar, conferir projeção,
ownership e ausência de efeitos em contas/movimentos/budgets. META/CONTRIBUIÇÃO/RETIRADA/CÁLCULOS/RELOAD/EDIÇÃO/PAUSE_RESUME/PROJEÇÃO/
ISOLAMENTO_FINANCEIRO/OWNERSHIP=PASS. STATUS=COMPLETE; REAL_GATE=PASS;
READY_FOR_MDL5=true registra o pré-requisito aprovado. MDL5 está na branch dedicada, aguardando gate; MDL6 não iniciado.

## MDL 5 — Recurrences, Subscriptions & Financial Calendar

Implementation on `codex/mdl5-recurring-calendar`; MDL0–4 remain approved on the
verified main baseline `7f8dd4c632b8192d485aa12c173e998f37a2d9ea`.
STATUS=AWAITING_REAL_GATE; REAL_GATE=PENDING; READY_FOR_MDL6=false.

| Endpoint under /api/v1/finance | Behavior |
| --- | --- |
| GET /recurrences | Own rules; filters status, transactionType, recurrenceKind, currency, accountId, categoryId |
| POST /recurrences | Validate and create ACTIVE rule; 201 |
| GET /recurrences/:recurrenceId | Own rule and next occurrence |
| PATCH /recurrences/:recurrenceId | Edit planning fields; type/currency fixed; no status field |
| POST /recurrences/:recurrenceId/pause | Stop active projections |
| POST /recurrences/:recurrenceId/resume | Restore active projections |
| POST /recurrences/:recurrenceId/archive | Terminal, preserve rule |
| GET /calendar | Required from/to DATE; [from,to), 1–366 days; optional type/kind/currency/account/category |
| GET /subscriptions/radar | ACTIVE subscriptions; [profile today,today+30); optional currency |

All routes require JWT; owner derives only from sub. Bodies/queries are strict
TypeBox, OpenAPI and generated Front Zod. Status bodies are empty JSON objects.
Foreign rule/account/category IDs return 404. Subscriptions require EXPENSE.
List default 50, maximum 100, descending createdAt/id; nextCursor carries both
createdAt and id. Calendar/radar return explicit 409 above 500 eligible rules,
requiring narrower filters; no silently incomplete totals. Calendar loads rules
once and projects in memory; no occurrence writes or database N+1. Radar counts
all ACTIVE subscriptions, including future/ended rules whose window total may
be zero and nextOccurrenceDate null after their end. There is no monthly-cost
normalization or merchant detection.

Human gate via Front localhost:3101 and Back localhost:3001: create a 100 BRL
monthly subscription starting 2026-10-31; verify calendar dates 31 Oct, 30 Nov,
31 Dec, 31 Jan; radar actual occurrences in its displayed 30-day window; edit
and reload; pause removes projections, resume restores them; archive is terminal.
Create an income rule and optionally USD; inspect separate income/expense/net
and currencies. Verify account balances, transactions, transfers, budgets and
goals unchanged. Use another user to check ownership when available. Do not
insert fixtures by SQL. Await user PASS; no COMPLETE checkpoint, PR/merge or MDL6.

## MDL 6 — Net Worth / Patrimônio

Implementado em `codex/mdl6-net-worth`, sem merge: patrimônio por moeda,
saldos assinados de contas somente leitura, itens externos, avaliações append-only,
posição histórica e arquivamento terminal. Sem FX, projeções ou alteração do ledger.
O gate humano ainda está pendente. Regras, API, schema, limites e roteiro estão em
[Net Worth](./net-worth.md).
