# Requisitos implementados — MDL 2

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

Fora de escopo: orçamento, metas, recorrência, cartão avançado, investimento
avançado, importação, banco/OpenFinance, IA, analytics/forecast e MDL 3.

## Gate real manual

Após os gates automáticos e migration hospedada, usar uma sessão Auth real pela
UI/API: criar duas contas BRL, categoria, receita/despesa, verificar saldo,
transferir, recarregar e conferir persistência/ownership. Nenhum dado financeiro
de gate deve ser inserido por SQL. O módulo só fica COMPLETE depois da aprovação
real manual; os testes com fronteiras interceptadas não substituem esse gate.
