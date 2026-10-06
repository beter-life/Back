# MDL9 — Debt Management & Payoff Simulator

Estado: MDL9 COMPLETE; REAL_GATE=PASS, aprovado pelo usuário em 2026-10-06. MDL0–MDL8 preservados. Integração em main condicionada aos gates de branch/PR/merge/main registrados em PROJECT_STATE. MDL10 não iniciado.

## Contabilidade real

Cada dívida gerenciada tem uma única conta `type=debt`, na mesma moeda e do mesmo proprietário. O principal informado na criação é positivo; a abertura da conta é seu negativo. Zero cria uma dívida `PAID_OFF`. O saldo devedor atual é o negativo do saldo reconhecido da conta: abertura + receitas/despesas + transferências não canceladas, até agora. Não existe coluna mutável de saldo atual nem setter de saldo.

O tipo da dívida é informativo: empréstimo pessoal, hipoteca, financiamento de veículo/consumo, estudantil, médica, tributária ou outra. Não altera a fórmula. Nome, credor e tipo são os únicos metadados editáveis. Conta, moeda, proprietário, abertura e início do acompanhamento são imutáveis.

Um pagamento real usa o split confirmado pelo usuário, sem estimar juros:

| Parte | Lançamento | Efeito |
| --- | --- | --- |
| Principal > 0 | TRANSFER da origem para a conta debt | Reduz caixa e passivo pelo mesmo valor; não é despesa |
| Juros > 0 | EXPENSE na origem | Reduz caixa e patrimônio; entra no orçamento |
| Tarifa > 0 | EXPENSE na origem | Reduz caixa e patrimônio; entra no orçamento |

Exemplo em unidades mínimas: banco `500000`, dívida `-100000`; principal `80000`, juros `18000`, tarifa `2000` → banco `400000`, dívida `-20000`, despesas `20000`. O principal nunca entra no orçamento como despesa. Finance Summary, Budget e Net Worth continuam lendo seus ledgers existentes; não recebem registros duplicados.

Todas as partes e o pagamento são materializados em uma transação SQL. A origem deve ser própria, ativa, da mesma moeda, com saldo reconhecido suficiente para o total, e tipo checking/savings/cash/other. Contas credit, investment e debt não são origens de pagamento neste módulo. Categorias opcionais devem ser próprias, ativas e EXPENSE; categoria para parte zero é inválida. Partes não negativas, soma positiva, até BIGINT; principal não pode exceder o saldo devedor. Juros/tarifas podem exceder esse saldo. Pagamentos só de juros/tarifas são permitidos.

`paidAt` é instante explícito, até agora, cuja data no fuso do perfil é igual ou posterior ao início do acompanhamento. Novos pagamentos não podem anteceder o último pagamento ativo; evita principal positivo em um corte histórico. As contas são bloqueadas em ordem UUID, antes da dívida. A chave UUID é única por proprietário; lock transacional por proprietário+chave serializa inclusive tentativas em dívidas diferentes. O fingerprint inclui dívida, origem, partes, categorias e instante normalizado. Retry idêntico devolve o registro original, inclusive após payoff/cancelamento/arquivo; payload diferente retorna 409. Nenhum lançamento é repetido.

Ao atingir zero, a mesma transação muda a dívida para `PAID_OFF`, com `paidOffAt` igual ao instante do pagamento. Novos pagamentos são recusados. Arquivamento só é permitido após payoff com principal zero; `ARCHIVED` é terminal. Histórico não é apagado. Correção cancela somente o último pagamento ativo, revertendo transferência e despesas atomicamente. Se o principal reaparece, a dívida quitada volta a ACTIVE. Pagamento mais antigo ou dívida arquivada retorna conflito; cancelamento repetido é idempotente.

Paginação por `createdAt,id`, com limite padrão25/máximo50. A criação dos pagamentos usa timestamps com resolução de milissegundos, estritamente crescentes por dívida sob lock, para preservar o cursor e a ordem de correção em concorrência. `remainingPrincipalMinor` no pagamento é um snapshot do registro, não a fonte do saldo atual. Registros cancelados continuam visíveis.

Novas receitas/despesas/transferências genéricas em contas de dívidas gerenciadas são bloqueadas, inclusive backdating. Patches genéricos dos lançamentos vinculados também são bloqueados. Dados anteriores de contas não gerenciadas são preservados. As constraints diferidas conferem o split, origem, destino, moeda, proprietário, instante e cancelamento contra o ledger.

## Termos e taxas

Versões usam datas civis e intervalos `[effectiveFrom,effectiveTo)`. A primeira começa no início do acompanhamento. Nova versão precisa de data futura, posterior à última; fecha a anterior e insere a próxima atomicamente. Um lock na dívida, trigger de não sobreposição e trigger de imutabilidade protegem o histórico. Máximo500 versões por dívida.

Taxa é string decimal exata de fração: `0.12=12%`. Intervalo aceito `0..1`, até10 casas; `12`, valores negativos e notação científica são inválidos. O Front recebe percentual explícito `12` e desloca exatamente duas casas sem float. Períodos: EFFECTIVE_ANNUAL e EFFECTIVE_MONTHLY. Taxa mensal efetiva:

`monthly = (1 + annual)^(1/12) - 1`

Nunca `annual/12`. Taxa mensal permanece igual. Zero é válido. O contexto Decimal independente tem256 dígitos e HALF_UP; não muda o contexto do Yield. Conversões de taxas são cacheadas na chamada. Juros de cada dívida/mês são arredondados HALF_UP para inteiro em unidades mínimas; todas as demais operações monetárias usam BigInt. Não há rounding de float nem suposição global de duas casas.

`minimumPaymentMinor>0` é mínimo contratual declarado, não calculado pelo banco. Dia1..31 usa o último dia em meses curtos e volta ao dia original nos meses seguintes. Fuso vem do perfil, fallback UTC. As versões são escolhidas pela data prevista de vencimento; no primeiro mês de uma dívida cadastrada após o dia de vencimento, usa-se o termo inicial para a projeção mensal completa. Esse modelo mensal não calcula juros proporcionais por dia.

Sem CDI/IPCA/SELIC ou taxa variável, CET, seguros futuros, impostos estimados, multas projetadas, rotativo, FX, processamento bancário ou serviços pagos. Juros efetivamente pagos são sempre informados pelo usuário. Dívida não pode receber perfil Yield; cartões credit, compras parceladas e faturas continuam isolados.

## Simulação somente leitura

POST `/api/v1/finance/debts/simulate`: de1 a20 dívidas distintas, ACTIVE, de uma moeda; extra não negativo; mês inicial atual ou futuro no fuso do perfil. O saldo inicial é sempre o principal reconhecido atual. Um início futuro não inventa pagamentos/juros dos meses anteriores. Máximo600 meses; início até9948-12 para respeitar datas de quatro dígitos no horizonte. Schedule é opt-in, até600 ×20 linhas por estratégia, nunca consultas SQL por mês.

Em cada mês: juros sobre abertura; paga juros primeiro, depois principal; pagamento é limitado ao saldo+juros. Principal pago e saldo final nunca são negativos. Juros não cobertos aparecem em `unpaidInterestMinor` e são capitalizados somente dentro da projeção. O ledger e o Budget real não são alterados.

| Estratégia | Distribuição |
| --- | --- |
| MINIMUM_ONLY | Somente o mínimo individual, limitado ao devido; ignora extra; não redistribui mínimos liberados |
| AVALANCHE | Mínimos de todas; extra para maior taxa efetiva mensal, depois maior principal, depois UUID crescente |
| SNOWBALL | Mínimos de todas; extra para menor principal, depois maior taxa mensal, depois UUID crescente |

Sobras do mês passam para a próxima prioridade. Avalanche/snowball mantêm os mínimos liberados no orçamento projetado dos meses seguintes. Enquanto uma dívida está ativa, mudanças futuras de mínimo alteram seu compromisso; depois de quitada, fica alocado seu último mínimo ativo, sem aplicar novas versões a uma dívida encerrada. Isto é hipótese de reinvestimento dos pagamentos, não autorização de débito.

Sem redução de principal possível e sem mudança futura de termos que possa modificar a situação, retorna NOT_AMORTIZING. Uma dívida que ainda amortiza pode liberar pagamentos para as outras; não há encerramento prematuro só porque os juros totais excedem o total mensal. Sem quitação até600 meses: HORIZON_EXCEEDED. Nesses estados, data/meses de quitação e comparações impossíveis são null; totais representam apenas o período calculado, não juros de toda a vida da dívida. Se ambos os planos quitam, economia=baseline−estratégia; valores negativos indicam aumento, sem escondê-lo.

COMPARE calcula MINIMUM_ONLY, AVALANCHE e SNOWBALL com o mesmo conjunto inicial. Respostas monetárias são strings; incluem `startingPrincipalMinor`, `minimumMonthlyCommitmentMinor`, `extraMonthlyMinor`, datas/meses, juros/pagamentos, status, resultado por dívida e, se solicitado, schedule mensal com detalhes por dívida. Não há persistência da projeção como verdade financeira.

## API, integridade e migração

JWT.sub é o único owner. Foreign IDs retornam404, inclusive conta/categoria/passivo manual. TypeBox estrito → OpenAPI → DTO/Zod gerado; owner no payload é inválido. Rotas GET/POST debts, GET/PATCH debt, GET/POST terms, GET/POST payments, POST payment/cancel, POST archive, POST simulate, GET summary. Sem DELETE. Resumo calcula em uma consulta snapshot: dívidas ativas, `principalOutstandingMinor`, `minimumMonthlyCommitmentMinor` e próximo vencimento por moeda. Não soma percentuais ou moedas; taxa ponderada opcional foi omitida.

Migration incremental `0010_financial_debts` cria financial_debts/terms/payments em app, compound owner/currency/type FKs, índices, RLS e triggers invoker com search_path vazio. Acrescenta uniques necessários às contas/transferências e substitui apenas o CHECK de tipo para aceitar debt. Não muda migrations0001–0009, dados, colunas existentes, Auth, JWT, JWKS, TLS ou grants Data API.

RLS permite own SELECT nas novas tabelas. INSERT, closure de versão, metadata/lifecycle e cancelamento são comandos do backend autenticado, sem policies de escrita direta que permitiriam burlar o ledger. Backend sempre filtra owner; histórico privado e ausência de DELETE permanecem. Novos grants públicos não são criados.

Conversão manual é opt-in com `manualNetWorthItemId`: item próprio, ACTIVE, LIABILITY, mesma moeda, última avaliação não futura e exatamente igual ao principal inicial. Lock do item serializa avaliação/arquivo; cria dívida+conta e arquiva somente o item escolhido em uma transação. Valor divergente, moeda/tipo/status errado ou futuro retorna conflito; foreign404. Não detecta, reconcilia ou mescla automaticamente. O patrimônio atual não muda; histórico do item permanece.

Aplicação DEV somente após PostgreSQL17 vazio e regressão/RLS PASS, verificando hashes das migrations existentes e snapshots das19 tabelas antes/depois, com TLS verify-full. Nenhum dado fictício é inserido no hosted DEV. Schema da infraestrutura anterior é preservado, exceto extensões explicitamente necessárias do CHECK/uniques/triggers acima.

## Gate humano aprovado

DEBT=PASS; PAYMENT=PASS; PRINCIPAL_TRANSFER=PASS; INTEREST_FEE_EXPENSE=PASS; NO_DOUBLE_COUNTING_DEBT=PASS; BUDGET_INTEGRATION=PASS; NET_WORTH_INTEGRATION=PASS; RELOAD=PASS; SIMULATOR=PASS; MINIMUM_ONLY=PASS; AVALANCHE=PASS; SNOWBALL=PASS; TERM_VERSIONING=PASS; PAYOFF=PASS; MANUAL_LIABILITY_CONVERSION=PASS; CARD_ISOLATION=PASS; YIELD_ISOLATION=PASS; RECURRENCE_ISOLATION=PASS; OWNERSHIP=PASS

Fechamento: regressão completa preservada; comparação somente leitura das22 tabelas atuais inclui dados humanos MDL9 e verifica schema/indexes/constraints/policies/grants. A0010 permanece intacta, sem reaplicação. Smoke descartável revalidou cash1000/debt-1000/net0 → principal500/net0 → juros100/net-100. Nenhuma fixture foi criada no hosted DEV.

Cenário de referência para revalidação:

Back3001, Front3101, `/finance/debts`. Criar dívida10000BRL, taxa12% anual, mínimo500, dia10. Conta=-10000; um único passivo no patrimônio. Pagar400principal+90juros+10tarifa: origem−500, principal9600, Budget100. Recarregar. Comparar extra500 com segunda dívida de taxa maior/menor principal. Validar nova versão futura, payoff zero, ownership, Cards/Yield e conversão manual sem duplicação.

Documentação técnica: [decimal.js](https://mikemcl.github.io/decimal.js/), [PostgreSQL17 constraints](https://www.postgresql.org/docs/17/ddl-constraints.html), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). As premissas financeiras acima são o modelo explícito deste módulo, não cálculo bancário contratual.
