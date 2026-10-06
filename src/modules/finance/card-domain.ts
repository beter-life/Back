import { AppError } from '../../shared/errors/index.js';
import { civilDate, civilOrdinal, addCivilDays } from './recurrence-domain.js';
import { money } from './domain.js';
import type * as C from './card-contracts.js';
export function anchorMonth(date: string, offset: number, anchor?: number) {
  const a = civilDate(date), index = a.y * 12 + a.m - 1 + offset;
  const y = Math.floor(index / 12), m = index % 12 + 1;
  if (y > 9998 || y < 1000) throw new AppError('VALIDATION_ERROR');
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(anchor ?? a.d, days)).padStart(2, '0')}`;
}
export function billingCycle(date: string, rules: C.BillingRule[]) {
  civilDate(date);
  const rule = rules.find(r => r.effectiveFrom <= date && (!r.effectiveTo || date < r.effectiveTo));
  if (!rule) throw new AppError('CONFLICT');
  let closingDate = anchorMonth(date, 0, rule.closingDay);
  if (date > closingDate) closingDate = anchorMonth(date, 1, rule.closingDay);
  let dueDate = anchorMonth(closingDate, 0, rule.dueDay);
  if (dueDate <= closingDate) dueDate = anchorMonth(closingDate, 1, rule.dueDay);
  return { closingDate, dueDate, billingRuleId: rule.id };
}
export function splitInstallments(total: string, count: number) {
  if (!/^[1-9][0-9]*$/.test(total) || !Number.isInteger(count) || count < 1 || count > 60) throw new AppError('VALIDATION_ERROR');
  const amount = BigInt(total), n = BigInt(count);
  if (amount < n || amount > 9223372036854775807n) throw new AppError('VALIDATION_ERROR');
  return Array.from({ length: count }, (_, i) => String(amount / n + (i === count - 1 ? amount % n : 0n)));
}
export function validateCard(input: C.CardInput, today: string) {
  civilDate(input.trackingStartDate);
  if (input.trackingStartDate > today) throw new AppError('VALIDATION_ERROR');
  if (input.accountId && input.initialDebtMinor !== undefined) throw new AppError('VALIDATION_ERROR');
  if (input.creditLimitMinor) money(input.creditLimitMinor, input.currency);
  if (input.initialDebtMinor !== undefined) money(input.initialDebtMinor, input.currency, false);
  if (!input.displayName.trim() || (input.last4 !== undefined && input.last4 !== null && !/^\d{4}$/.test(input.last4))) throw new AppError('VALIDATION_ERROR');
  return { ...input, displayName: input.displayName.trim(), issuerName: input.issuerName?.trim() || null, brand: input.brand?.trim() || null, last4: input.last4 ?? null, creditLimitMinor: input.creditLimitMinor ?? null };
}
export function validatePurchase(input: C.PurchaseInput, card: C.Card, today: string) {
  civilDate(input.purchaseDate); money(input.totalAmountMinor, card.currency); splitInstallments(input.totalAmountMinor, input.installmentCount);
  if (!input.description.trim() || input.purchaseDate > today || input.purchaseDate < card.trackingStartDate) throw new AppError('VALIDATION_ERROR');
  return { ...input, description: input.description.trim(), merchantName: input.merchantName?.trim() || null, categoryId: input.categoryId.toLowerCase(), idempotencyKey: input.idempotencyKey.toLowerCase() };
}
export function invoiceRange(from?: string, to?: string) {
  if (!!from !== !!to) throw new AppError('VALIDATION_ERROR');
  if (from && to && (civilOrdinal(to) - civilOrdinal(from) <= 0 || civilOrdinal(to) - civilOrdinal(from) > 2192)) throw new AppError('VALIDATION_ERROR');
}
export interface CardSnapshot {
  card: C.Card; rules: C.BillingRule[]; purchases: C.Purchase[];
  realBalanceMinor: string; legacyBalanceMinor: string; inboundPaymentsMinor: string;
}
const positive = (v: bigint) => v > 0n ? v : 0n;
export function cardView(snapshot: CardSnapshot, asOf: string, timeZone: string): C.CardView {
  civilDate(asOf);
  const { card, rules } = snapshot, grouped = new Map<string, C.Invoice>();
  let future = 0n;
  for (const p of snapshot.purchases.filter(p => p.status === 'ACTIVE')) for (const i of p.installments) {
    const cycle = billingCycle(i.scheduledDate, rules);
    const invoice: C.Invoice = grouped.get(cycle.closingDate) ?? { ...cycle, cardId: card.id, currency: card.currency, status: 'UPCOMING', postedChargesMinor: '0', scheduledChargesMinor: '0', committedTotalMinor: '0', paymentsAppliedMinor: '0', outstandingMinor: '0', installments: [] };
    // Different rule versions may share a closing date only when they agree on due.
    if (invoice.dueDate !== cycle.dueDate) throw new AppError('CONFLICT');
    const posted = i.scheduledDate <= asOf, field = posted ? 'postedChargesMinor' : 'scheduledChargesMinor';
    invoice[field] = String(BigInt(invoice[field]) + BigInt(i.amountMinor));
    invoice.installments.push({ ...i, ...cycle, purchaseId: p.id, description: p.description, installmentCount: p.installmentCount });
    grouped.set(cycle.closingDate, invoice);
    if (!posted) future += BigInt(i.amountMinor);
  }
  const legacy = BigInt(snapshot.legacyBalanceMinor), liability = positive(-legacy), legacyCredit = positive(legacy);
  let credit = BigInt(snapshot.inboundPaymentsMinor) + legacyCredit;
  const legacyPaid = credit < liability ? credit : liability;
  credit -= legacyPaid;
  const invoices = [...grouped.values()].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.closingDate.localeCompare(b.closingDate));
  for (const invoice of invoices) {
    const posted = BigInt(invoice.postedChargesMinor), paid = posted < credit ? posted : credit;
    credit -= paid;
    const outstanding = posted - paid;
    invoice.committedTotalMinor = String(posted + BigInt(invoice.scheduledChargesMinor));
    invoice.paymentsAppliedMinor = String(paid); invoice.outstandingMinor = String(outstanding);
    invoice.status = posted === 0n ? 'UPCOMING' : outstanding === 0n ? 'PAID' : asOf > invoice.dueDate ? 'OVERDUE' : asOf >= invoice.closingDate ? 'CLOSED' : 'OPEN';
    invoice.installments.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.id.localeCompare(b.id));
  }
  const real = BigInt(snapshot.realBalanceMinor), used = positive(-real + future), recognized = positive(-real);
  return { card, rules, asOf, timeZone, realBalanceMinor: String(real), recognizedLiabilityMinor: String(recognized), futureInstallmentsMinor: String(future), totalCommittedMinor: String(recognized + future), estimatedUsedLimitMinor: String(used), estimatedAvailableLimitMinor: card.creditLimitMinor === null ? null : String(BigInt(card.creditLimitMinor) - used), legacyBalanceAtTrackingStartMinor: String(legacy), legacyLiabilityMinor: String(liability), legacyOutstandingMinor: String(liability - legacyPaid), legacyCreditMinor: String(legacyCredit), unallocatedCreditMinor: String(credit), invoices };
}
export function asOfCutoff(date: string) { return addCivilDays(date, 1)!; }
