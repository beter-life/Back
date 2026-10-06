import { Decimal } from 'decimal.js';
import { AppError } from '../../shared/errors/index.js';
import { civilDate } from './recurrence-domain.js';
import { anchorMonth } from './card-domain.js';
import { money, name, type Currency } from './domain.js';
import type * as C from './debt-contracts.js';

// This independent context must never change MDL7's precision or rounding.
const D = Decimal.clone({ precision: 256, rounding: Decimal.ROUND_HALF_UP });
export function monthlyRate(rate: string, period: C.TermInput['ratePeriod']) {
  if (!/^(0|1)(\.[0-9]{1,10})?$/.test(rate)) throw new AppError('VALIDATION_ERROR');
  const r = new D(rate);
  if (r.gt(1)) throw new AppError('VALIDATION_ERROR');
  return period === 'EFFECTIVE_ANNUAL' ? r.plus(1).pow(new D(1).div(12)).minus(1) : r;
}
export function validateTerm(input: C.TermInput, currency: Currency) {
  civilDate(input.effectiveFrom); monthlyRate(input.rate, input.ratePeriod); money(input.minimumPaymentMinor, currency);
  if (!Number.isInteger(input.dueDay) || input.dueDay < 1 || input.dueDay > 31) throw new AppError('VALIDATION_ERROR');
  return { effectiveFrom: input.effectiveFrom, rate: new D(input.rate).toFixed(), ratePeriod: input.ratePeriod, minimumPaymentMinor: input.minimumPaymentMinor, dueDay: input.dueDay };
}
export function validateDebt(input: C.DebtInput, today: string) {
  civilDate(input.trackingStartDate);
  if (input.trackingStartDate > today) throw new AppError('VALIDATION_ERROR');
  if (money(input.initialPrincipalMinor, input.currency, false).amountMinor < 0n) throw new AppError('VALIDATION_ERROR');
  return { ...input, name: name(input.name), lender: input.lender?.trim() || null, ...validateTerm({ ...input, effectiveFrom: input.trackingStartDate }, input.currency) };
}
export function termAt(terms: C.Term[], date: string) {
  const found = terms.find(t => t.effectiveFrom <= date && (!t.effectiveTo || date < t.effectiveTo));
  if (!found) throw new AppError('CONFLICT');
  return found;
}
export function nextDue(terms: C.Term[], today: string) {
  let month = today.slice(0, 7) + '-01';
  for (let n = 0; n < 3; n++) {
    // A version can start in the middle of a month; determine the due date from
    // the version effective on that due date, not from UTC or today's version.
    for (const term of [...terms].reverse()) {
      const due = anchorMonth(month, 0, term.dueDay);
      if (due >= today && due >= term.effectiveFrom && (!term.effectiveTo || due < term.effectiveTo)) return due;
    }
    month = anchorMonth(month, 1, 1);
  }
  throw new AppError('CONFLICT');
}
export type SimulationDebt = { debt: C.Debt; terms: C.Term[]; principal: string };
function simulationTerm(debt: SimulationDebt, month: string) {
  for (const term of [...debt.terms].reverse()) {
    const due = anchorMonth(month + '-01', 0, term.dueDay);
    if (due >= term.effectiveFrom && (!term.effectiveTo || due < term.effectiveTo)) return term;
  }
  return termAt(debt.terms, month + '-01' < debt.debt.trackingStartDate ? debt.debt.trackingStartDate : month + '-01');
}
const sum = (values: bigint[]) => values.reduce((a, b) => a + b, 0n);
const min = (a: bigint, b: bigint) => a < b ? a : b;
export function simulate(input: C.SimulationInput, debts: SimulationDebt[], today: string): { results: C.Simulation[] } {
  if (!debts.length || debts.length > 20 || new Set(debts.map(d => d.debt.id)).size !== debts.length || debts.some(d => d.debt.currency !== debts[0]!.debt.currency || d.debt.status !== 'ACTIVE')) throw new AppError('VALIDATION_ERROR');
  const currency = debts[0]!.debt.currency, extra = money(input.extraMonthlyMinor, currency, false).amountMinor, start = input.startMonth ?? today.slice(0, 7);
  if (extra < 0n || debts.some(d => !/^[1-9][0-9]*$/.test(d.principal))) throw new AppError('VALIDATION_ERROR');
  civilDate(start + '-01');
  if (start < today.slice(0, 7) || start > '9948-12') throw new AppError('VALIDATION_ERROR');
  const rates = new Map<string, Decimal>();
  const cachedRate = (term: C.Term) => { const key = term.ratePeriod+':'+term.rate; let value = rates.get(key); if (!value) { value = monthlyRate(term.rate,term.ratePeriod); rates.set(key,value); } return value; };
  const run = (strategy: C.Simulation['strategy']): C.Simulation => {
    const states = debts.map(d => ({ ...d, remaining: BigInt(d.principal), starting: d.principal, interest: 0n, payments: 0n, allocatedMinimum: BigInt(simulationTerm(d,start).minimumPaymentMinor), payoff: null as string | null }));
    const initialMinimum = sum(states.map(s => BigInt(simulationTerm(s, start).minimumPaymentMinor)));
    const result: C.Simulation = { strategy, currency, startMonth: start, startingPrincipalMinor: String(sum(states.map(s => s.remaining))), minimumMonthlyCommitmentMinor: String(initialMinimum), extraMonthlyMinor: strategy === 'MINIMUM_ONLY' ? '0' : String(extra), estimatedPayoffMonth: null, monthsToPayoff: null, totalPaymentsMinor: '0', totalInterestMinor: '0', status: 'HORIZON_EXCEEDED', interestSavedMinor: null, monthsSaved: null, debts: [] , ...(input.includeSchedule ? { schedule: [] } : {}) };
    for (let n = 0; n < 600; n++) {
      const month = anchorMonth(start + '-01', n, 1).slice(0, 7);
      const entries = states.map(s => {
        const term = simulationTerm(s, month), rate = cachedRate(term), opening = s.remaining;
        if (opening > 0n) s.allocatedMinimum = BigInt(term.minimumPaymentMinor);
        const interest = BigInt(new D(opening.toString()).mul(rate).toFixed(0)), due = opening + interest;
        return { s, term, rate, opening, interest, due, required: min(due, BigInt(term.minimumPaymentMinor)), extra: 0n };
      });
      let pool = strategy === 'MINIMUM_ONLY' ? 0n : extra + sum(entries.map(e => e.s.allocatedMinimum - e.required));
      const order = entries.filter(e => e.due > e.required).sort((a, b) => {
        const rateOrder = b.rate.comparedTo(a.rate), principalOrder = a.opening < b.opening ? -1 : a.opening > b.opening ? 1 : 0;
        return (strategy === 'SNOWBALL' ? principalOrder || rateOrder : rateOrder || -principalOrder) || a.s.debt.id.localeCompare(b.s.debt.id);
      });
      for (const e of order) { e.extra = min(pool, e.due - e.required); pool -= e.extra; }
      const rows: C.ScheduleDebt[] = entries.map(e => {
        const paid = e.required + e.extra, principalPaid = paid > e.interest ? paid - e.interest : 0n, unpaid = e.interest > paid ? e.interest - paid : 0n;
        // Capitalization exists only inside this projection, never in the ledger.
        e.s.remaining = e.due - paid; e.s.interest += e.interest; e.s.payments += paid;
        if (e.opening > 0n && e.s.remaining === 0n) e.s.payoff = month;
        return { debtId: e.s.debt.id, termId: e.term.id, dueDate: anchorMonth(month + '-01', 0, e.term.dueDay), openingPrincipalMinor: String(e.opening), interestMinor: String(e.interest), requiredPaymentsMinor: String(e.required), extraPaymentsMinor: String(e.extra), principalPaidMinor: String(principalPaid), unpaidInterestMinor: String(unpaid), closingPrincipalMinor: String(e.s.remaining) };
      });
      if (result.schedule) {
        const fields = ['openingPrincipalMinor', 'interestMinor', 'requiredPaymentsMinor', 'extraPaymentsMinor', 'principalPaidMinor', 'unpaidInterestMinor', 'closingPrincipalMinor'] as const;
        const totals = Object.fromEntries(fields.map(f => [f, String(sum(rows.map(r => BigInt(r[f]))))])) as Omit<C.Simulation['schedule'] extends (infer T)[] | undefined ? T : never, 'month' | 'debts'>;
        result.schedule.push({ month, ...totals, debts: rows });
      }
      if (states.every(s => s.remaining === 0n)) { result.status = 'PAID_OFF'; result.estimatedPayoffMonth = month; result.monthsToPayoff = n + 1; break; }
      const futureChange = states.some(s => s.remaining > 0n && s.terms.some(t => t.effectiveFrom > month + '-01'));
      const cannotAmortize = strategy === 'MINIMUM_ONLY' ? entries.some(e => e.opening > 0n && e.required <= e.interest) : !entries.some(e => e.opening > 0n && e.required + e.extra > e.interest);
      if (cannotAmortize && !futureChange) { result.status = 'NOT_AMORTIZING'; break; }
    }
    result.totalInterestMinor = String(sum(states.map(s => s.interest))); result.totalPaymentsMinor = String(sum(states.map(s => s.payments)));
    result.debts = states.map(s => ({ debtId: s.debt.id, startingPrincipalMinor: s.starting, estimatedPayoffMonth: s.payoff, totalInterestMinor: String(s.interest), totalPaymentsMinor: String(s.payments), remainingPrincipalMinor: String(s.remaining) }));
    return result;
  };
  const baseline = run('MINIMUM_ONLY'), strategies: C.Simulation['strategy'][] = input.strategy === 'COMPARE' ? ['MINIMUM_ONLY', 'AVALANCHE', 'SNOWBALL'] : [input.strategy];
  return { results: strategies.map(strategy => {
    const result = strategy === 'MINIMUM_ONLY' ? baseline : run(strategy);
    if (result.status === 'PAID_OFF' && baseline.status === 'PAID_OFF') { result.interestSavedMinor = String(BigInt(baseline.totalInterestMinor) - BigInt(result.totalInterestMinor)); result.monthsSaved = baseline.monthsToPayoff! - result.monthsToPayoff!; }
    return result;
  }) };
}
