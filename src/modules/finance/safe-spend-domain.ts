import type { Account } from './contracts.js';
import type { CardView } from './card-contracts.js';
import type { BudgetSummary } from './budget-contracts.js';
import { occurrenceDates, civilOrdinal } from './recurrence-domain.js';
import type { RecurrenceRecord } from './recurrence-domain.js';
import type * as C from './safe-spend-contracts.js';
export interface SafeSpendSnapshot {
  settings: C.SafeSpendSettings; accounts: Account[]; cards: CardView[];
  debts: { id: string; name: string; due: string; minimum: string; paid: string }[];
  goals: { id: string; name: string; planned: string; contributed: string; achieved: boolean }[];
  recurrences: RecurrenceRecord[];
  future: { id: string; type: 'INCOME'|'EXPENSE'; amount: string; date: string; description: string; categoryId: string|null; accountId: string; linked: boolean }[];
  knownExpenses?: { amount: string; date: string; categoryId: string|null }[];
  budget: BudgetSummary; today: string; end: string; zone: string; now: Date;
}
const positive = (v: bigint) => v > 0n ? v : 0n;
const min = (a: bigint,b: bigint) => a < b ? a : b;
export function calculateSafeSpend(s: SafeSpendSnapshot): C.SafeSpendView {
  const items: C.SafeSpendSource[] = [], warnings = new Set<C.SafeSpendWarning>(['LIMITED_DATA_COVERAGE']);
  const add = (sourceType: C.SafeSpendSource['sourceType'], sourceId: string, label: string, date: string|null, amount: bigint, certainty: C.SafeSpendSource['certainty'], included: boolean, reason: string) => items.push({ sourceType,sourceId,label,date,amountMinor:String(amount),certainty,included,reason });
  let cards = 0n, debts = 0n, expenses = 0n, recurrence = 0n, goals = 0n, income = 0n;
  const liquid = s.accounts.reduce((v,a) => v + BigInt(a.balanceMinor),0n);
  if (s.accounts.some(a => BigInt(a.balanceMinor)<0n)) warnings.add('NEGATIVE_LIQUID_ACCOUNT');
  for (const view of s.cards) {
    let credit = BigInt(view.unallocatedCreditMinor);
    for (const invoice of view.invoices) {
      const scheduled = BigInt(invoice.scheduledChargesMinor), applied = min(credit,scheduled);
      credit -= applied;
      const amount = positive(BigInt(invoice.committedTotalMinor)-BigInt(invoice.paymentsAppliedMinor)-applied);
      const included = invoice.dueDate>=s.today && invoice.dueDate<s.end;
      if (included) cards += amount;
      // Restrict output to this month's obligations; no historical invented invoice.
      if (included) add('CARD_INVOICE',`${view.card.id}:${invoice.closingDate}`,view.card.displayName,invoice.dueDate,amount,scheduled>0n?'PLANNED':'CONFIRMED',true,'Fatura comprometida menos pagamentos reais e crédito disponível; inclui cartões arquivados.');
    }
  }
  for (const d of s.debts) {
    const amount = positive(BigInt(d.minimum)-BigInt(d.paid)); debts += amount;
    add('DEBT_MINIMUM',d.id,d.name,d.due,amount,'PLANNED',true,'Mínimo declarado menos pagamentos reais ativos neste mês local; juros futuros não são lançados.');
  }
  for (const t of s.future) {
    if (t.type==='EXPENSE') {
      if (!t.linked) expenses += BigInt(t.amount);
      add('FUTURE_EXPENSE',t.id,t.description,t.date,BigInt(t.amount),'CONFIRMED',!t.linked,t.linked?'Parcela de cartão ou custo de dívida com vínculo estrutural; não contado novamente.':'Despesa futura registrada nesta moeda.');
    } else if (s.settings.accountIds.includes(t.accountId)) {
      income += BigInt(t.amount); add('EXPECTED_INCOME',t.id,t.description,t.date,BigInt(t.amount),'PROJECTED',false,'Excluída da base; utilizada apenas no cenário de receitas previstas.');
    }
  }
  for (const r of s.recurrences) for (const date of occurrenceDates(r,s.today,s.end)) {
    const amount = BigInt(r.amountMinor);
    if (r.transactionType==='EXPENSE') {
      recurrence += amount;
      add('RECURRENCE',`${r.id}:${date}`,r.name,date,amount,'PLANNED',s.settings.reserveRecurrences,s.settings.reserveRecurrences?'Reserva conservadora planejada; sem conciliação automática.':'Excluída pela configuração.');
      if ((s.knownExpenses??s.future.filter(t=>t.type==='EXPENSE')).some(t => t.date===date && t.amount===r.amountMinor && (!r.categoryId || t.categoryId===r.categoryId))) warnings.add('POTENTIAL_RECURRENCE_OVERLAP');
    } else if (!r.accountId || s.settings.accountIds.includes(r.accountId)) {
      income += amount; add('EXPECTED_INCOME',`${r.id}:${date}`,r.name,date,amount,'PROJECTED',false,'Projeção de recorrência, não dinheiro recebido; apenas cenário.');
    }
  }
  if (!s.settings.reserveRecurrences) warnings.add('NO_RECURRENCE_RESERVE');
  for (const g of s.goals) {
    const amount = g.achieved ? 0n : positive(BigInt(g.planned)-positive(BigInt(g.contributed)));
    if (s.settings.reserveGoalPlans) goals += amount;
    add('GOAL_PLAN',g.id,g.name,null,amount,'PLANNED',s.settings.reserveGoalPlans,'Somente plano mensal restante, após contribuições menos retiradas; saldo da meta não é caixa.');
  }
  if (s.goals.length) warnings.add('GOALS_ARE_PLANNING_ONLY');
  const buffer=BigInt(s.settings.safetyBufferMinor), planned=s.settings.reserveRecurrences?recurrence:0n, hard=cards+debts+expenses;
  add('SAFETY_BUFFER',s.settings.id,'Reserva de segurança',null,buffer,'PLANNED',true,'Reserva declarada pelo usuário; não movimenta dinheiro.');
  const capacity=liquid-hard-planned-goals-buffer, hasBudget=s.settings.respectBudget && s.budget.periodId!==null;
  const headroom=hasBudget?BigInt(s.budget.budgetedTotalMinor)-BigInt(s.budget.expenseTotalMinor):null;
  if (s.settings.respectBudget && !hasBudget) warnings.add('NO_BUDGET_FOR_CURRENT_MONTH');
  if (income>0n) warnings.add('EXPECTED_INCOME_EXCLUDED_FROM_BASE');
  const raw=headroom===null?capacity:min(capacity,positive(headroom)), safe=positive(raw), shortfall=positive(-raw);
  const days=civilOrdinal(s.end,true)-civilOrdinal(s.today);
  return {
    currency:s.settings.currency,today:s.today,periodEndExclusive:s.end,timeZone:s.zone,asOf:s.now.toISOString(),status:shortfall>0n?'OVERCOMMITTED':'AVAILABLE',
    liquidFundsMinor:String(liquid),hardCommitmentsMinor:String(hard),cardCommitmentsMinor:String(cards),debtCommitmentsMinor:String(debts),futureConfirmedExpensesMinor:String(expenses),
    projectedRecurrenceExpensesMinor:String(recurrence),plannedRecurrenceReserveMinor:String(planned),goalReserveMinor:String(goals),safetyBufferMinor:String(buffer),cashCapacityMinor:String(capacity),
    budgetHeadroomMinor:headroom===null?null:String(headroom),budgetOverrunMinor:String(headroom===null?0n:positive(-headroom)),budgetCapApplied:hasBudget,
    rawSafeToSpendMinor:String(raw),safeToSpendMinor:String(safe),shortfallMinor:String(shortfall),projectedIncomeMinor:String(income),
    safeToSpendWithExpectedIncomeMinor:String(positive(headroom===null?capacity+income:min(capacity+income,positive(headroom)))),remainingDaysInclusive:days,dailySafeToSpendMinor:String(safe/BigInt(days)),
    accounts:s.accounts.map(a=>({id:a.id,name:a.name,balanceMinor:a.balanceMinor})),items,warnings:[...warnings],
    assumptions:['Estimativa de planejamento baseada apenas nos dados cadastrados; não é garantia.','Horizonte do mês atual no fuso do perfil; receita futura nunca entra na base.','Orçamento é teto, nunca outra subtração; inclui despesas sem alocação.','Recorrências e metas são planos; possíveis coincidências mantêm a reserva conservadora.','Obrigações vencidas ou legadas sem vencimento neste horizonte estão fora desta leitura; revise-as separadamente.'],
  };
}
