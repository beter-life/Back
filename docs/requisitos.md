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

## Gate real manual — aprovado

O usuário aprovou o fluxo com sessão Auth real: contas, categorias,
receita/despesa, transferência, saldos e persistência após reload passaram no
Supabase hospedado. O ownership foi validado pelos gates de API e RLS. Nenhum
dado do gate foi inserido por SQL; os testes automatizados continuam sendo
evidência complementar, não substituto do fluxo real.
