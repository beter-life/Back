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

Gate real MDL 3 pendente: criar limite 500, despesa 100, restante 400,
utilização 20%; reload, edição, cópia e ownership com sessão real. Não inserir
dados por SQL para simular aprovação humana.

## Gate real manual — aprovado

O usuário aprovou o fluxo com sessão Auth real: contas, categorias,
receita/despesa, transferência, saldos e persistência após reload passaram no
Supabase hospedado. O ownership foi validado pelos gates de API e RLS. Nenhum
dado do gate foi inserido por SQL; os testes automatizados continuam sendo
evidência complementar, não substituto do fluxo real.
