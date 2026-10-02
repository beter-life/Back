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
