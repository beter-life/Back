import type { CardRepository } from './card-repository.js';
import type { FinanceRepository } from './repository.js';
import type { ProfileRepository } from '../profile/repository.js';
import type * as C from './card-contracts.js';
import { cardView, invoiceRange, validateCard, validatePurchase } from './card-domain.js';
import { civilDate, recurrenceToday } from './recurrence-domain.js';
import { timeZone } from './budget-domain.js';
import { money } from './domain.js';
import { financeService } from './application.js';
import { AppError } from '../../shared/errors/index.js';
export function cardService(repo: CardRepository, finance: FinanceRepository, profiles: ProfileRepository, clock = () => new Date()) {
  const context = async (owner: string, asOf?: string) => {
    const zone = timeZone((await profiles.findByAuthUser(owner))?.timezone ?? 'UTC'), now = clock(), today = recurrenceToday(zone, now);
    if (asOf) { civilDate(asOf); if (asOf > today) throw new AppError('VALIDATION_ERROR'); }
    return { zone, now, today, asOf: asOf ?? today };
  };
  const view = async (owner: string, id: string, asOf?: string) => { const c = await context(owner, asOf); return cardView(await repo.read(owner, id, c.asOf, c.zone, c.now), c.asOf, c.zone); };
  return {
    list: repo.list, view,
    async create(owner: string, input: C.CardInput) { const c = await context(owner); return repo.create(owner, validateCard(input, c.today), c.zone); },
    async patch(owner: string, id: string, input: C.CardPatch) { const card = (await view(owner, id)).card; if (input.creditLimitMinor) money(input.creditLimitMinor, card.currency); if (input.displayName !== undefined && !input.displayName.trim()) throw new AppError('VALIDATION_ERROR'); return repo.patch(owner, id, { ...input, ...(input.displayName !== undefined ? { displayName: input.displayName.trim() } : {}) }); },
    archive: repo.archive,
    async rules(owner: string, id: string) { return (await view(owner, id)).rules; },
    async addRule(owner: string, id: string, input: C.BillingRuleInput) { const c = await context(owner); civilDate(input.effectiveFrom); return repo.addRule(owner, id, input, c.today, c.zone, c.now); },
    async createPurchase(owner: string, id: string, input: C.PurchaseInput) { const c = await context(owner), state = await repo.read(owner, id, c.today, c.zone, c.now); return repo.createPurchase(owner, id, validatePurchase(input, state.card, c.today), c.today, c.zone, c.now); },
    async purchases(owner: string, id: string, query: C.PurchaseQuery) { const c = await context(owner); if (!!query.cursorAt !== !!query.cursorId) throw new AppError('VALIDATION_ERROR'); return repo.purchasePage(owner, id, query, c.today, c.zone, c.now); },
    async purchase(owner: string, id: string, purchaseId: string) { const c = await context(owner), state = await repo.read(owner, id, c.today, c.zone, c.now), p = state.purchases.find(p => p.id === purchaseId); if (!p) throw new AppError('NOT_FOUND'); return p; },
    async patchPurchase(owner: string, id: string, purchaseId: string, input: C.PurchasePatch) { const c = await context(owner); if (input.description !== undefined && !input.description.trim()) throw new AppError('VALIDATION_ERROR'); return repo.patchPurchase(owner, id, purchaseId, { ...input, ...(input.description !== undefined ? { description: input.description.trim() } : {}) }, c.today, c.zone, c.now); },
    async cancel(owner: string, id: string, purchaseId: string) { const c = await context(owner); return repo.cancelPurchase(owner, id, purchaseId, c.today, c.zone, c.now); },
    async invoices(owner: string, id: string, q: C.InvoiceQuery) { invoiceRange(q.from, q.to); const state = await view(owner, id, q.asOf); return state.invoices.filter(i => !q.from || (i.closingDate >= q.from && i.closingDate < q.to!)); },
    async invoice(owner: string, id: string, closingDate: string, asOf?: string) { civilDate(closingDate); const found = (await view(owner, id, asOf)).invoices.find(i => i.closingDate === closingDate); if (!found) throw new AppError('NOT_FOUND'); return found; },
    async payment(owner: string, id: string, input: C.PaymentInput) {
      const v = await view(owner, id);
      if (recurrenceToday(v.timeZone, new Date(input.occurredAt)) < v.card.trackingStartDate) throw new AppError('VALIDATION_ERROR');
      return financeService(finance).createTransfer(owner, { ...input, destinationAccountId: v.card.accountId, currency: v.card.currency, description: `Card invoice payment ${id}` });
    },
    async summary(owner: string, asOf?: string): Promise<C.CardsSummary> {
      const c = await context(owner, asOf), cards = await repo.list(owner), totals = new Map<C.Card['currency'], C.CardsSummary['currencies'][number]>();
      for (const card of cards) { const v = await view(owner, card.id, c.asOf), t = totals.get(card.currency) ?? { currency: card.currency, cards: 0, recognizedLiabilityMinor: '0', futureInstallmentsMinor: '0', totalCommittedMinor: '0' }; t.cards++; for (const field of ['recognizedLiabilityMinor', 'futureInstallmentsMinor', 'totalCommittedMinor'] as const) t[field] = String(BigInt(t[field]) + BigInt(v[field])); totals.set(card.currency, t); }
      return { asOf: c.asOf, currencies: [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency)) };
    },
  };
}
