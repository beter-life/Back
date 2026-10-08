import { createHash } from 'node:crypto';
import { and, eq, asc, inArray, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { creditCards as cards, cardBillingRules as rules, cardPurchases as purchases, cardInstallments as installments } from '../../db/schema/cards.js';
import { financialAccounts as accounts, financialCategories as categories, financialTransactions as transactions } from '../../db/schema/finance.js';
import { AppError } from '../../shared/errors/index.js';
import { anchorMonth, billingCycle, splitInstallments, cardView, asOfCutoff, type CardSnapshot } from './card-domain.js';
import type * as C from './card-contracts.js';
import { delta } from './repository.js';
import type { Account } from './contracts.js';
type DB = Database['db'];
type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];
// Batch adapter for consumers of the official Card engine. One query per relation,
// not per card; no new invoice/allocation rules and no additional ledger writes.
export async function readCardSnapshots(tx: Tx, owner: string, currency: C.Card['currency'], zone: string, now: Date, balances: Account[]): Promise<CardSnapshot[]> {
  const cs = await tx.select().from(cards).where(and(eq(cards.authUserId,owner),eq(cards.currency,currency))).orderBy(cards.id).limit(501);
  if (cs.length>500) throw new AppError('CONFLICT');
  if (!cs.length) return [];
  const rs = await tx.select().from(rules).where(and(eq(rules.authUserId,owner),inArray(rules.cardId,cs.map(c=>c.id)))).orderBy(rules.effectiveFrom).limit(50001);
  const ps = await tx.select().from(purchases).where(and(eq(purchases.authUserId,owner),inArray(purchases.cardId,cs.map(c=>c.id)))).orderBy(purchases.id).limit(10001);
  const ins = await tx.select().from(installments).where(and(eq(installments.authUserId,owner),inArray(installments.cardId,cs.map(c=>c.id)))).orderBy(installments.installmentNumber).limit(60001);
  if (rs.length>50000 || ps.length>10000 || ins.length>60000) throw new AppError('CONFLICT');
  const totals=await tx.execute<{id:string;legacy:string;payments:string}>(sql`
    select c.id,(a.initial_balance_minor+${delta(owner,sql`a.id`,sql`c.tracking_start_date::timestamp at time zone ${zone}`)})::text legacy,
      coalesce((select sum(t.amount_minor::numeric) from app.financial_transfers t where t.auth_user_id=${owner}::uuid and t.destination_account_id=c.account_id and not t.is_cancelled and t.occurred_at>=c.tracking_start_date::timestamp at time zone ${zone} and t.occurred_at<${now}),0)::text payments
    from app.financial_credit_cards c join app.financial_accounts a on a.id=c.account_id and a.auth_user_id=c.auth_user_id where c.auth_user_id=${owner}::uuid and c.currency=${currency}`);
  const group = <T,>(rows: T[], key: (row: T) => string) => {
    const result = new Map<string,T[]>();
    for (const row of rows) {const id=key(row), bucket=result.get(id)??[];bucket.push(row);result.set(id,bucket);}
    return result;
  };
  const rulesByCard=group(rs,r=>r.cardId),purchasesByCard=group(ps,p=>p.cardId),installmentsByPurchase=group(ins,i=>i.purchaseId);
  const totalsByCard=new Map(totals.rows.map(t=>[t.id,t])),balancesByAccount=new Map(balances.map(a=>[a.id,a.balanceMinor]));
  return cs.map(row=>{
    const billing=(rulesByCard.get(row.id)??[]).map(ruleRow), total=totalsByCard.get(row.id)!;
    const mapped: C.Purchase[]=(purchasesByCard.get(row.id)??[]).map(p=>({id:p.id,cardId:p.cardId,categoryId:p.categoryId,currency:p.currency,description:p.description,merchantName:p.merchantName,purchaseDate:p.purchaseDate,totalAmountMinor:String(p.totalAmountMinor),installmentCount:p.installmentCount,idempotencyKey:p.idempotencyKey,status:p.status,createdAt:p.createdAt.toISOString(),cancelledAt:p.cancelledAt?.toISOString()??null,installments:(installmentsByPurchase.get(p.id)??[]).map(i=>({id:i.id,transactionId:i.transactionId,installmentNumber:i.installmentNumber,amountMinor:String(i.amountMinor),scheduledDate:i.scheduledDate,...billingCycle(i.scheduledDate,billing)}))}));
    return {card:cardRow(row),rules:billing,purchases:mapped,realBalanceMinor:balancesByAccount.get(row.accountId)!,legacyBalanceMinor:total.legacy,inboundPaymentsMinor:total.payments};
  });
}
const cardRow = (r: typeof cards.$inferSelect): C.Card => ({ id: r.id, accountId: r.accountId, currency: r.currency, displayName: r.displayName, issuerName: r.issuerName, brand: r.brand, last4: r.last4, creditLimitMinor: r.creditLimitMinor === null ? null : String(r.creditLimitMinor), trackingStartDate: r.trackingStartDate, status: r.status, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(), archivedAt: r.archivedAt?.toISOString() ?? null });
const ruleRow = (r: typeof rules.$inferSelect): C.BillingRule => ({ id: r.id, cardId: r.cardId, effectiveFrom: r.effectiveFrom, effectiveTo: r.effectiveTo, closingDay: r.closingDay, dueDay: r.dueDay, createdAt: r.createdAt.toISOString() });
const own = (owner: string, id: string) => and(eq(cards.authUserId, owner), eq(cards.id, id));
const fingerprint = (cardId: string, i: C.PurchaseInput) => createHash('sha256').update(JSON.stringify([cardId.toLowerCase(), i.categoryId, i.description, i.merchantName ?? null, i.purchaseDate, i.totalAmountMinor, i.installmentCount])).digest('hex');
async function lockedCard(tx: Tx, owner: string, id: string) {
  const [current] = await tx.select().from(cards).where(own(owner, id));
  if (!current) throw new AppError('NOT_FOUND');
  // The account lock is shared with Finance Core transfers, preventing payment/cancel races.
  const [account] = await tx.select().from(accounts).where(and(eq(accounts.id, current.accountId), eq(accounts.authUserId, owner))).for('update');
  if (!account) throw new AppError('NOT_FOUND');
  const [card] = await tx.select().from(cards).where(own(owner, id)).for('update');
  return { card: card!, account };
}
async function snapshot(tx: Tx, owner: string, id: string, asOf: string, zone: string, now: Date): Promise<CardSnapshot> {
  const [row] = await tx.select().from(cards).where(own(owner, id));
  if (!row) throw new AppError('NOT_FOUND');
  const card = cardRow(row), billing = (await tx.select().from(rules).where(and(eq(rules.authUserId, owner), eq(rules.cardId, id))).orderBy(asc(rules.effectiveFrom))).map(ruleRow);
  const ps = await tx.select().from(purchases).where(and(eq(purchases.authUserId, owner), eq(purchases.cardId, id))).orderBy(asc(purchases.createdAt), asc(purchases.id));
  const ins = await tx.select().from(installments).where(and(eq(installments.authUserId, owner), eq(installments.cardId, id))).orderBy(asc(installments.installmentNumber));
  const mapped: C.Purchase[] = ps.map(p => ({ id: p.id, cardId: p.cardId, categoryId: p.categoryId, currency: p.currency, description: p.description, merchantName: p.merchantName, purchaseDate: p.purchaseDate, totalAmountMinor: String(p.totalAmountMinor), installmentCount: p.installmentCount, idempotencyKey: p.idempotencyKey, status: p.status, createdAt: p.createdAt.toISOString(), cancelledAt: p.cancelledAt?.toISOString() ?? null, installments: ins.filter(i => i.purchaseId === p.id).map(i => ({ id: i.id, transactionId: i.transactionId, installmentNumber: i.installmentNumber, amountMinor: String(i.amountMinor), scheduledDate: i.scheduledDate, ...billingCycle(i.scheduledDate, billing) })) }));
  const cutoff = sql`least(${asOfCutoff(asOf)}::date::timestamp at time zone ${zone}, ${now.toISOString()}::timestamptz)`;
  const start = sql`${card.trackingStartDate}::date::timestamp at time zone ${zone}`;
  const result = await tx.execute<{ real: string; legacy: string; payments: string }>(sql`
    with movement as (
      select occurred_at, case when type='INCOME' then amount_minor else -amount_minor end::numeric delta from app.financial_transactions where auth_user_id=${owner} and account_id=${card.accountId} and not is_cancelled
      union all select occurred_at, case when destination_account_id=${card.accountId} then amount_minor else -amount_minor end::numeric from app.financial_transfers where auth_user_id=${owner} and (source_account_id=${card.accountId} or destination_account_id=${card.accountId}) and not is_cancelled
    ) select
      (a.initial_balance_minor + coalesce((select sum(delta) from movement where occurred_at < ${cutoff}),0))::text real,
      (a.initial_balance_minor + coalesce((select sum(delta) from movement where occurred_at < ${start}),0))::text legacy,
      coalesce((select sum(amount_minor::numeric) from app.financial_transfers where auth_user_id=${owner} and destination_account_id=${card.accountId} and not is_cancelled and occurred_at>=${start} and occurred_at<${cutoff}),0)::text payments
    from app.financial_accounts a where a.id=${card.accountId} and a.auth_user_id=${owner}`);
  const totals = result.rows[0]!;
  return { card, rules: billing, purchases: mapped, realBalanceMinor: totals.real, legacyBalanceMinor: totals.legacy, inboundPaymentsMinor: totals.payments };
}
export function createCardRepository({ db }: Database) {
  const read = (owner: string, id: string, asOf: string, zone: string, now: Date) => db.transaction(tx => snapshot(tx, owner, id, asOf, zone, now), { isolationLevel: 'repeatable read', accessMode: 'read only' });
  return {
    async list(owner: string) { return (await db.select().from(cards).where(eq(cards.authUserId, owner)).orderBy(asc(cards.createdAt), asc(cards.id))).map(cardRow); },
    read,
    async create(owner: string, input: C.CardInput, zone: string) {
      return db.transaction(async tx => {
        let accountId = input.accountId;
        if (accountId) {
          const [a] = await tx.select().from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.authUserId, owner))).for('update');
          if (!a) throw new AppError('NOT_FOUND');
          if (!a.isActive || a.type !== 'credit' || a.currency !== input.currency) throw new AppError('CONFLICT');
          const existing = await tx.select({ id: cards.id }).from(cards).where(eq(cards.accountId, accountId));
          if (existing.length) throw new AppError('CONFLICT');
          // A tracking boundary must not relabel existing unmanaged charges as invoices.
          const later = await tx.execute(sql`
            select 1 from app.financial_transactions where auth_user_id=${owner} and account_id=${accountId} and occurred_at >= (${input.trackingStartDate}::date::timestamp at time zone ${zone})
            union all
            select 1 from app.financial_transfers where auth_user_id=${owner} and source_account_id=${accountId} and occurred_at >= (${input.trackingStartDate}::date::timestamp at time zone ${zone})
            limit 1`);
          if (later.rows.length) throw new AppError('CARD_TRACKING_CONFLICT');
        } else {
          const [a] = await tx.insert(accounts).values({ authUserId: owner, name: input.displayName, type: 'credit', currency: input.currency, initialBalanceMinor: -BigInt(input.initialDebtMinor ?? '0') }).returning();
          accountId = a!.id;
        }
        const [card] = await tx.insert(cards).values({ authUserId: owner, accountId, currency: input.currency, displayName: input.displayName, issuerName: input.issuerName, brand: input.brand, last4: input.last4, creditLimitMinor: input.creditLimitMinor ? BigInt(input.creditLimitMinor) : null, trackingStartDate: input.trackingStartDate }).returning();
        await tx.insert(rules).values({ authUserId: owner, cardId: card!.id, effectiveFrom: input.trackingStartDate, closingDay: input.closingDay, dueDay: input.dueDay });
        return cardRow(card!);
      });
    },
    async patch(owner: string, id: string, input: C.CardPatch) {
      return db.transaction(async tx => {
        const { card } = await lockedCard(tx, owner, id);
        if (card.status !== 'ACTIVE') throw new AppError('CONFLICT');
        const [updated] = await tx.update(cards).set({ ...input, creditLimitMinor: input.creditLimitMinor === undefined ? undefined : input.creditLimitMinor === null ? null : BigInt(input.creditLimitMinor), updatedAt: new Date() }).where(own(owner, id)).returning();
        return cardRow(updated!);
      });
    },
    async archive(owner: string, id: string) {
      return db.transaction(async tx => { const { card } = await lockedCard(tx, owner, id); if (card.status === 'ARCHIVED') return cardRow(card); const [updated] = await tx.update(cards).set({ status: 'ARCHIVED', archivedAt: new Date(), updatedAt: new Date() }).where(own(owner, id)).returning(); return cardRow(updated!); });
    },
    async addRule(owner: string, id: string, input: C.BillingRuleInput, asOf: string, zone: string, now: Date) {
      return db.transaction(async tx => {
        const { card } = await lockedCard(tx, owner, id);
        if (card.status !== 'ACTIVE') throw new AppError('CONFLICT');
        const old = await snapshot(tx, owner, id, asOf, zone, now), last = old.rules.at(-1)!;
        if (input.effectiveFrom < asOf || input.effectiveFrom <= last.effectiveFrom) throw new AppError('CONFLICT');
        if (old.purchases.some(p => p.status === 'ACTIVE' && p.installments.some(i => i.scheduledDate >= input.effectiveFrom && i.closingDate <= asOf))) throw new AppError('CONFLICT');
        const candidate = [...old.rules.slice(0, -1), { ...last, effectiveTo: input.effectiveFrom }, { ...last, ...input, id: 'pending', effectiveTo: null }];
        // Validate that a shared invoice identity never gets two different due dates.
        cardView({ ...old, rules: candidate }, asOf, zone);
        await tx.update(rules).set({ effectiveTo: input.effectiveFrom }).where(eq(rules.id, last.id));
        const [inserted] = await tx.insert(rules).values({ authUserId: owner, cardId: id, ...input }).returning();
        return ruleRow(inserted!);
      });
    },
    async createPurchase(owner: string, id: string, input: C.PurchaseInput, asOf: string, zone: string, now: Date) {
      return db.transaction(async tx => {
        const { card, account } = await lockedCard(tx, owner, id), hash = fingerprint(id, input);
        const [previous] = await tx.select().from(purchases).where(and(eq(purchases.authUserId, owner), eq(purchases.idempotencyKey, input.idempotencyKey)));
        if (previous) { if (previous.cardId !== id || previous.requestFingerprint !== hash) throw new AppError('CONFLICT'); return (await snapshot(tx, owner, id, asOf, zone, now)).purchases.find(p => p.id === previous.id)!; }
        if (card.status !== 'ACTIVE' || !account.isActive) throw new AppError('CONFLICT');
        const [category] = await tx.select().from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.authUserId, owner))).for('share');
        if (!category) throw new AppError('NOT_FOUND');
        if (!category.isActive || category.kind !== 'EXPENSE') throw new AppError('CONFLICT');
        const [purchase] = await tx.insert(purchases).values({ ...input, authUserId: owner, cardId: id, currency: card.currency, totalAmountMinor: BigInt(input.totalAmountMinor), requestFingerprint: hash }).onConflictDoNothing({ target: [purchases.authUserId, purchases.idempotencyKey] }).returning();
        if (!purchase) throw new AppError('CONFLICT');
        const amounts = splitInstallments(input.totalAmountMinor, input.installmentCount);
        for (let i = 0; i < amounts.length; i++) {
          const date = anchorMonth(input.purchaseDate, i);
          const result = await tx.execute<{ instant: string; local: string }>(sql`select (${date}::date::timestamp at time zone ${zone})::text instant, ((${date}::date::timestamp at time zone ${zone}) at time zone ${zone})::date::text local`);
          if (result.rows[0]!.local !== date) throw new AppError('VALIDATION_ERROR');
          const [transaction] = await tx.insert(transactions).values({ authUserId: owner, accountId: card.accountId, categoryId: input.categoryId, type: 'EXPENSE', amountMinor: BigInt(amounts[i]!), currency: card.currency, description: `${input.description} (${i + 1}/${amounts.length})`, occurredAt: new Date(result.rows[0]!.instant) }).returning();
          await tx.insert(installments).values({ authUserId: owner, cardId: id, purchaseId: purchase.id, transactionId: transaction!.id, installmentNumber: i + 1, amountMinor: BigInt(amounts[i]!), scheduledDate: date });
        }
        return (await snapshot(tx, owner, id, asOf, zone, now)).purchases.find(p => p.id === purchase.id)!;
      });
    },
    async patchPurchase(owner: string, id: string, purchaseId: string, input: C.PurchasePatch, asOf: string, zone: string, now: Date) {
      return db.transaction(async tx => {
        await lockedCard(tx, owner, id);
        const [p] = await tx.select().from(purchases).where(and(eq(purchases.id, purchaseId), eq(purchases.cardId, id), eq(purchases.authUserId, owner))).for('update');
        if (!p) throw new AppError('NOT_FOUND');
        if (p.status !== 'ACTIVE') throw new AppError('CONFLICT');
        await tx.update(purchases).set(input).where(eq(purchases.id, purchaseId));
        if (input.description !== undefined) {
          const linked = await tx.select().from(installments).where(and(eq(installments.purchaseId, purchaseId), eq(installments.authUserId, owner)));
          for (const i of linked) await tx.update(transactions).set({ description: `${input.description} (${i.installmentNumber}/${p.installmentCount})`, updatedAt: new Date() }).where(and(eq(transactions.id, i.transactionId), eq(transactions.authUserId, owner)));
        }
        return (await snapshot(tx, owner, id, asOf, zone, now)).purchases.find(p => p.id === purchaseId)!;
      });
    },
    async cancelPurchase(owner: string, id: string, purchaseId: string, asOf: string, zone: string, now: Date) {
      return db.transaction(async tx => {
        await lockedCard(tx, owner, id);
        const state = await snapshot(tx, owner, id, asOf, zone, now), p = state.purchases.find(p => p.id === purchaseId);
        if (!p) throw new AppError('NOT_FOUND');
        if (p.status === 'CANCELLED') return p;
        const view = cardView(state, asOf, zone), affected = new Set(p.installments.map(i => i.closingDate));
        if (view.invoices.some(i => affected.has(i.closingDate) && (i.status === 'PAID' || BigInt(i.paymentsAppliedMinor) > 0n))) throw new AppError('CARD_CANCEL_UNSAFE');
        await tx.update(purchases).set({ status: 'CANCELLED', cancelledAt: new Date() }).where(and(eq(purchases.id, purchaseId), eq(purchases.authUserId, owner)));
        await tx.update(transactions).set({ isCancelled: true, updatedAt: new Date() }).where(and(eq(transactions.authUserId, owner), inArray(transactions.id, p.installments.map(i => i.transactionId))));
        return (await snapshot(tx, owner, id, asOf, zone, now)).purchases.find(p => p.id === purchaseId)!;
      });
    },
    async purchasePage(owner: string, id: string, q: C.PurchaseQuery, asOf: string, zone: string, now: Date): Promise<C.PurchasePage> {
      const state = await read(owner, id, asOf, zone, now), limit = Number(q.limit ?? 25);
      const sorted = state.purchases.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)).filter(p => !q.cursorAt || p.createdAt < q.cursorAt || (p.createdAt === q.cursorAt && p.id < q.cursorId!));
      const items = sorted.slice(0, limit), last = items.at(-1);
      return { items, nextCursor: sorted.length > limit && last ? { createdAt: last.createdAt, id: last.id } : null };
    },
  };
}
export type CardRepository = ReturnType<typeof createCardRepository>;
