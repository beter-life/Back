# Safe to Spend — MDL10

Estimativa conservadora de planejamento, não garantia nem autorização de gasto.
Cada configuração possui uma moeda e contas escolhidas explicitamente pelo usuário.
Não há FX, IA, serviço pago, scheduler ou novo movimento financeiro.

## Modelo

Valores monetários são BigInt em minor units, serializados como strings. Não há /100 global.

- Liquidez: soma signed dos saldos atuais das contas selecionadas, ativas e próprias, dos tipos checking/cash/savings/other. Investment/credit/debt são inelegíveis; poupança não é selecionada automaticamente.
- Obrigações: faturas com vencimento em [hoje, primeiro dia do próximo mês), mínimo declarado de dívidas ativas neste intervalo menos pagamentos reais aplicáveis no mês, e despesas futuras confirmadas. Não são lançados juros estimados.
- Cartões: reutilizam engine/FIFO do MDL8, incluindo cartões arquivados. Pagamentos reais e crédito excedente reduzem o compromisso uma vez. Parcelas vinculadas por transaction_id não entram novamente como despesas genéricas. Custos vinculados a debt payments também são excluídos estruturalmente.
- Recorrências: projeção MDL5 de despesas no horizonte, opcional. Possível coincidência por data/valor/categoria produz POTENTIAL_RECURRENCE_OVERLAP, mas nunca remove nenhuma fonte por heurística. Despesas anteriores no mesmo dia podem gerar aviso, sem nova subtração de caixa.
- Metas: max(plano mensal - max(contribuições reais do mês - retiradas, 0), 0). ACTIVE apenas; ACHIEVED, PAUSED e ARCHIVED não reservam. Saldo declarativo da meta não é dinheiro líquido.
- Buffer: reserva não negativa declarada pelo usuário; não movimenta dinheiro.

cashCapacity = liquidFunds - hardCommitments - recurrenceReserve - goalReserve - buffer

Se houver orçamento existente e respectBudget=true, o read model oficial MDL3 fornece
headroom = total orçado - total de despesas, incluindo despesas não alocadas.
Orçamento é **teto**, nunca uma segunda subtração:

rawSafe = min(cashCapacity, max(headroom, 0)); sem orçamento: rawSafe = cashCapacity

safe = max(rawSafe, 0); shortfall = max(-rawSafe, 0)

dailySafe = floor(safe / dias civis restantes, incluindo hoje)

Receitas futuras registradas ou recorrentes são PROJECTED e só compõem o cenário secundário,
para contas selecionadas ou planos sem conta definida. Receitas já recebidas não são somadas
novamente como transactions futuras. O cenário também respeita o teto do orçamento.
Sem período de Budget, não há criação automática: retorna aviso e usa capacidade de caixa.

## Horizonte, transparência e limites

Hoje/mês são datas civis no fuso do perfil, com fallback UTC e utilities existentes para DST.
O snapshot usa um único instante e repeatable-read/read-only, sem locks pesados durante cálculo.
Nenhum valor é persistido como fonte de verdade. Cada fonte retorna valor, data, certeza,
inclusão e justificativa. A UI separa Confirmado/Planejado/Projetado e mostra shortfall,
limitações e receitas previstas sem substituir a headline.

LIMITED_DATA_COVERAGE explicita que dados não cadastrados são desconhecidos. Obrigações
vencidas antes de hoje ou legado sem vencimento no horizonte devem ser revisados separadamente;
não se inventa fatura nem se promete cobertura universal.

Leituras batch: até 100 contas selecionadas, 1.500 contas próprias, 500 cartões, 500 dívidas,
500 metas e 500 recorrências; limites existentes de projeção permanecem. Histórico de cartões
limitado a 50.000 regras, 10.000 compras e 60.000 parcelas; 10.000 transactions no horizonte.
Excesso retorna conflito explícito, não estimativa parcial. O teste de volume cobre
100 contas/100 cartões/100 dívidas/500 recorrências/500 metas e no máximo 30 consultas.

## API e segurança

- GET /api/v1/finance/safe-to-spend/settings?currency=BRL: configuração ou null.
- PUT /api/v1/finance/safe-to-spend/settings: seleção/buffer/toggles atômicos; valida todas as contas antes de substituir. accountIds vazio é rejeitado.
- GET /api/v1/finance/safe-to-spend?currency=BRL: read model; 409 SAFE_SPEND_NOT_CONFIGURED quando não configurado ou seleção deixou de ser válida.
- GET /api/v1/finance/safe-to-spend/summary: item por moeda configurada; nunca total misturando moedas.

JWT.sub é o único owner; payload estrito não aceita ownerId/userId/auth_user_id. Conta alheia
retorna 404. TypeBox/OpenAPI geram contratos Zod do Front; nenhuma regra monetária duplicada na UI.
0011_financial_safe_to_spend adiciona somente financial_safe_spend_profiles e financial_safe_spend_accounts
no schema app privado. RLS own SELECT, escritas apenas pelo backend, FKs compostas de owner/moeda/tipo,
identidade imutável e nenhum DELETE/grant público. A FK de seleção preserva tipo/moeda da conta;
remova-a da seleção antes de uma mudança incompatível. Não se alteram migrations0001–0010, Auth,
TLS, JWT, JWKS ou estruturas financeiras anteriores.

## Interface e validação

Rota protegida /finance/safe-to-spend; onboarding não inventa valor nem seleciona contas sozinho.
Formulário estável com seleção por teclado, buffer exato e envio único. Loading/empty/error/retry
não exibem estimativa parcial. Escrita de configuração invalida caches privados da sessão;
o restante é leitura. Não há logs de dados financeiros, tokens ou secrets.

Gate automatizado: unit, integration, PostgreSQL17/RLS/ownership, isolamento before/after,
OpenAPI/contract drift, lint/typecheck/build, browser desktop/mobile/tablet/teclado, secret scan e harness.
A migration só vai ao DEV após PostgreSQL17 PASS, comparando snapshot privado das 22 tabelas
existentes; novas tabelas devem nascer vazias. Não são criados fixtures financeiros remotos.

Gate humano ainda PENDING: login existente; abrir /finance/safe-to-spend; selecionar contas e
buffer explicitamente; conferir liquidez, compromissos reais, toggles, teto do Budget, metas,
cenário de receita, shortfall quando aplicável e persistência após reload. Cada moeda separada.
Estado de entrega: AWAITING_REAL_GATE; READY_FOR_MDL11=false. Sem PR final, merge ou MDL11.

Advisors pós-DDL: nenhuma falha de segurança nas tabelas novas. O INFO de RLS sem policy
em financial_market_rates é o cache privado/backend-only preexistente; o WARN de
[leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
permanece fora do escopo, sem mudança de Auth. Os INFOs de
[FKs sem índice cobrindo a lista completa](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)
nas seleções foram revisados: PK com prefixo profile_id e índice owner/account suportam
os predicados de igualdade; no máximo100 seleções por profile e identidade dos pais
imutável. O teste de volume passou. Índice ainda não usado é esperado nas tabelas vazias;
nenhum índice foi removido nem migration aplicada reescrita por conveniência.
