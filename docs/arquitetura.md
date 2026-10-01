# MDL 2 — Financial Core

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
