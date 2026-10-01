# Regras Finance — MDL 2

## Dinheiro e saldo

Cada valor é `Money { amountMinor: bigint, currency }`. PostgreSQL usa BIGINT;
request/response JSON usa **string decimal inteira**, nunca número monetário
JavaScript. Valores individuais ficam no intervalo BIGINT assinado, limitado
simetricamente a ±9223372036854775807. Movimentos exigem `amountMinor > 0`.
Somas PostgreSQL usam NUMERIC inteiro exato e podem exceder um BIGINT; continuam
sendo strings na API. Nenhuma regra usa float/REAL/DOUBLE para dinheiro.

Catálogo inicial explicitamente suportado: BRL/USD/EUR/GBP/CAD/AUD/CHF (2 casas),
JPY/CLP/KRW (0), KWD/BHD (3). Outros códigos são rejeitados neste módulo. O
catálogo central pode ser ampliado sem mudar o modelo. Referência ISO 4217:
[agência mantenedora SIX](https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html).
Testes também conferem os expoentes com o catálogo ICU do runtime.

Saldo = abertura + receitas − despesas − transferências originadas +
transferências recebidas, ignorando registros cancelados. Não existe coluna
`current_balance` nem operação pública para substituir saldo arbitrariamente.
Abertura/moeda são imutáveis após criação; contas inativas permanecem no saldo
e histórico. Movimentos futuros só entram quando `occurredAt` chega ao corte.

## Transferência e idempotência

Uma entidade `financial_transfers` contém origem/destino/owner/moeda/valor.
As duas variações de saldo são derivadas do **mesmo registro**: não há metade
independente ou par despesa/receita. O repositório valida e bloqueia as duas
contas em ordem de UUID, depois insere dentro de uma transação PostgreSQL.
Qualquer falha faz rollback. FKs compostas impedem outro owner ou outra moeda.

`idempotencyKey` UUID é obrigatório e UNIQUE por owner. Repetir a mesma
operação retorna o registro existente, sem novo efeito; reutilizar a chave
com valores diferentes retorna 409. Uma repetição continua válida após
desativação/cancelamento. Transferências entre moedas diferentes são rejeitadas,
sem conversão implícita ou lançamento parcial.

## História

Contas/categorias: nome/estado podem mudar; inativação preserva relações.
Categoria mantém seu tipo original. Conta permite mudar classificação, sem
introduzir lógica de cartão/investimento.

Receitas/despesas: valores, moeda, conta, categoria e ocorrência são imutáveis.
PATCH permite corrigir descrição ou cancelar (`isCancelled: true`).
Transferência só admite cancelamento integral. Cancelamento é irreversível na
API e preserva o registro/timestamps; uma correção econômica é novo movimento.
Não há DELETE público, ledger bancário completo ou trilha de revisões textuais.

## Datas e consultas

`occurredAt`: instante financeiro, fornecido como RFC3339 com offset explícito,
armazenado como TIMESTAMPTZ. `createdAt`/`updatedAt`: gravação/alteração técnica.
Front converte a data/hora do perfil para UTC e exibe no timezone do perfil,
nunca no fuso do servidor. Na ausência de perfil, o fallback explícito é UTC.
Horários inexistentes em transição DST são rejeitados; horários ambíguos usam
o offset encontrado pela conversão determinística, sem regras bancárias extras.

Listagem: 25 registros por padrão, máximo 50, `(occurredAt DESC, id DESC)`;
cursor contém ambos. Filtros owner, conta (origem ou destino), categoria,
tipo e intervalo `[from,to)`. Cancelados aparecem sinalizados no histórico.
Summary exige período explícito: receitas/despesas/net no intervalo; saldo
até `to` exclusivo, separado por moeda. Nunca somar moedas diferentes.
