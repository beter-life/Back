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

## Orçamento mensal — MDL 3

- Um período por owner + YYYY-MM + moeda. Na criação, guardar timezone canônico
  do perfil (UTC se não houver perfil). Mudanças posteriores no perfil não
  deslocam meses existentes; períodos novos usam o timezone atual.
- Calendário `[início do mês, início do seguinte)` convertido por PostgreSQL;
  dias transcorridos incluem hoje no timezone do período. Mês futuro: 0 dias;
  mês encerrado: todos os dias, incluindo fevereiro bissexto.
- Somar EXPENSE não canceladas da mesma moeda no intervalo. Receitas e
  transferências não participam. Considerar os registros do mês, incluindo
  datas futuras já lançadas, sem gerar previsão ou recorrência.
- Base por categoria: 0..9223372036854775807 minor units; disponível = base +
  sobra positiva. Gasto, somas e sobra derivados com inteiros exatos;
  restante = disponível − gasto e pode ser negativo.
- Utilização = gasto/disponível × 100, string decimal com duas casas truncadas;
  disponível zero retorna null, nunca Infinity/NaN.
- Policy no **destino**: NONE não carrega; POSITIVE_ONLY acrescenta
  max(disponível anterior − gasto anterior, 0), somente se o mês imediatamente
  anterior estiver encerrado e houver limite ativo da categoria na mesma moeda.
  Mês ausente/limite removido interrompe a cadeia. Sobra acumulada positiva pode
  continuar mês a mês. Nenhum overspending negativo é carregado. Recalcular após
  alterações/cancelamentos históricos; não há snapshot de fechamento.
- Só EXPENSE recebe limite. Categoria inativa mantém histórico e permite editar
  limite já ativo, mas não criar/reativar/copiar novos limites. Remover limite é
  desativar allocation; preserva registros e move os gastos para sem orçamento.
- Copy previous copia categoria/base/policy de limites ativos e categorias
  atualmente ativas; nunca gastos/transações. Preservar limites existentes no
  destino, inclusive os removidos. Repetição/concorrência não duplica. Sem
  período anterior: 404. Não exigir que o anterior esteja encerrado para copiar.
- Despesas sem allocation ativa, inclusive sem categoria, compõem unbudgeted.
  Summary: budgeted_total = disponível; spent_budgeted e remaining_budgeted
  consideram só categorias planejadas; expense_total = planejadas + unbudgeted.
  Utilização e ritmo geral incluem todas as despesas, para não ocultar gastos.
- Referência até hoje = floor(disponível × dias transcorridos / dias no mês).
  Gasto > disponível: OVER_BUDGET; senão gasto > referência: ATTENTION;
  senão ON_TRACK. Mesma regra por categoria e no resumo. Sem previsão/conselho.
- Nenhuma conversão: BRL, USD, JPY e demais moedas têm períodos separados.

## MDL 4 — Metas e eventos de planejamento

- Uma meta não é conta bancária. Eventos apenas declaram valores destinados;
  nunca lançam transaction/transfer nem mudam account/budget. Moeda é fixa,
  valores alvo/eventos > 0, plano nullable ou >= 0, BIGINT e JSON strings.
- CURRENT = soma de CONTRIBUTION menos WITHDRAWAL, de todos os eventos registrados
  (occurredAt é data declarada do histórico, não corte temporal de saldo).
  Saldo/progresso não são colunas mutáveis. Withdrawal > current é 409, com lock
  transacional por meta. Correção usa novo evento compensatório, sem edição/delete.
- Persistir ACTIVE/PAUSED/ARCHIVED. PAUSED bloqueia novos eventos e pode retomar;
  ARCHIVED é terminal, preserva histórico e bloqueia eventos e edições. Mesmo
  conteúdo/chave já confirmado permite replay em qualquer status.
- Idempotência é owner+UUID key, global às metas do owner. Comparar goal, tipo,
  amount, instante ISO normalizado e nota trim/null. Mesmo conteúdo retorna evento
  original; mudança de conteúdo ou reutilização em outra meta retorna 409.
- Remaining = max(target-current,0). Percentual = floor(current*10000/target)/100,
  com duas casas (16,66% no gate). Não limitar texto acima de 100%; só barra visual.
- Meses válidos YYYY-MM, anos 1000–9998. Slots = max(targetOrdinal-currentOrdinal+1,0)
  no timezone atual do perfil (fallback UTC). Inclui o mês corrente.
- Required = ceil(remaining/slots), em unidades menores. Atingida: 0; sem prazo
  ou prazo vencido ainda não atingido: null (não dividir por zero).
- Previsão sem rendimento: ceil(remaining/planned) contribuições, primeira no mês
  atual; mês previsto = atual + quantidade - 1. Plano 0/null: null; atingida: atual.
  Resultado além de 9998-12 é null, sem inventar data fora do calendário suportado.
- Status derivado tem precedência: current>=target → ACHIEVED; prazo passado →
  OVERDUE; prazo vigente + plano presente (inclusive zero) → ON_TRACK se planned
  >= required, senão ATTENTION; informação insuficiente → NO_PLAN. Status persistido
  permanece separado desse diagnóstico, inclusive em metas pausadas/arquivadas.
- Prioridade somente ordena/informa. Nunca converte moedas nem soma BRL e USD
  num total único. Não promete recomendação, retorno financeiro ou recorrência.

## MDL 5 — Recurrence rules

- Recurrence != transaction: a declaration projects expectations only. No action
  changes profiles, accounts, categories, transactions, transfers, budgets or goals.
- Money >0, at most PostgreSQL BIGINT, currency explicit, existing exponents,
  integer JSON strings. Aggregate with BigInt; separate currencies and no FX.
- startDate/endDate and projected dates are DATE / YYYY-MM-DD, years 1000–9998;
  calendar may use 9999-01-01 only as exclusive upper bound. No UTC-midnight
  serialization. Profile timezone discovers today; missing profile uses UTC.
- WEEKLY uses anchor + n*interval*7 civil days (1–52). MONTHLY uses original
  anchor day in each target month (1–24). YEARLY uses original month/day (1–10).
  Clamp to the last valid day only for that occurrence: Jan31 → Feb28 → Mar31;
  leap Jan31 → Feb29 → Mar31. Feb29 yearly → Feb28 in ordinary years, then
  Feb29 again in leap years. Direct seeking avoids replaying centuries of history.
- End is optional and inclusive, >= start. nextOccurrenceDate is first date >=
  profile today, within end; paused/archived/ended return null. [from,to) excludes
  to. Keys recurrenceId:date and ordering date/id are deterministic.
- ACTIVE projects; PAUSED projects nothing until resume. ARCHIVED is terminal,
  remains readable and cannot be edited/resumed. Same-status action is idempotent.
  Edits replace the planning rule and recompute queried projections; they do not
  create a historical occurrence ledger or alter confirmed financial records.
- Type and currency are immutable after creation; mutable fields are name,
  description, amount, kind (SUBSCRIPTION requires EXPENSE), associations,
  frequency, interval and dates. PATCH validates the entire merged rule under lock.
- New account/category association requires own active record, account currency
  equal to the rule and category kind equal to income/expense. Later inactive
  references stay visible and unchanged links survive unrelated edits; detaching
  is allowed. Normalized UUID case cannot turn an unchanged link into a new one.
- Calendar totals are incomeMinor, expenseMinor, projectedNetMinor per currency;
  net is a forecast difference, never available balance. Radar sums actual
  occurrences in [today,today+30), e.g. five weekly dates count five charges.
  Subscription classification is user-entered; no transaction matching, posting,
  reconciliation, confidence, notifications or financial ingestion.

## MDL 6 — Net Worth / Patrimônio

MDL6 COMPLETE, integrado em `main`: patrimônio por moeda,
saldos assinados de contas somente leitura, itens externos, avaliações append-only,
posição histórica e arquivamento terminal. Sem FX, projeções ou alteração do ledger.
O gate humano foi aprovado em 2026-10-05. Regras, API, schema, limites e roteiro estão em
[Net Worth](./net-worth.md).

## MDL 7 — Yield Engine / Rendimentos

Rates em strings normalizadas (10%=0.10;115% CDI=1.15). Money continua em
minor units; composição Decimal, sem juros simples sobre taxa anual e sem
arredondamento diário. CDI/Selic histórico usa somente observações diárias
BCB; futuro CURRENT_RATE usa última taxa e weekdays, explicitamente sem
calendário completo de feriados. ZERO/saldo não positivo rende zero.
Carência e teto limitam principal elegível; nova versão fecha intervalo anterior
sem editar sua regra. Perfil arquivado/conta inativa conserva história, não futuro.

Poupança exige mês completo/aniversário e menor saldo real do período; dias29–31
ancoram no dia1 do próximo mês. TR e adicional da Meta Selic são compostos;
regra e arredondamento seguem Circular3595. Não há crédito diário fictício.
IR 22,5/20/17,5/15% e IOF regressivo até29 dias incidem somente sobre ganhos;
IR após IOF. São estimativas sem lotes/come-cotas, não imposto exato a pagar.

Histórico diário é contrafactual composto sobre saldos reais elegíveis; não
reconcilia rendimentos pagos pela instituição. Futuro mantém principal real e
reinveste somente no cenário em memória. Nenhuma transação/saldo/patrimônio,
meta, budget ou recorrência é alterada. Falta de taxa retorna UNAVAILABLE,
nunca taxa inventada; fallback cacheado é STALE. [Detalhes](./YIELD_ENGINE.md).

## MDL 8 — Cartões

Compra é despesa na conta credit; pagamento é transferência recebida. Cada parcela
tem uma transação, soma exata e data mensal com anchor preservado. Futuras não
afetam saldo real/Net Worth atual; somente o compromisso estimado na área Cards.
Faturas derivadas, regras versionadas, vencimento estritamente após fechamento.
Pagamento FIFO compensa legado e depois faturas reconhecidas; excedente vira
crédito. Limite informativo pode ficar negativo, sem rejeição automática da compra.
Cancelamento é correção com rows preservadas, bloqueado com pagamento aplicado;
não é refund. Arquivo terminal preserva parcelas/faturas e permite pagamentos.
Sem FX, juros/rotativo, integrações de cartão ou PAN/CVV. [Detalhes](./CARDS_INVOICES.md).
