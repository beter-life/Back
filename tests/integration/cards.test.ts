import { randomUUID } from 'node:crypto';
import { afterAll, describe, it, expect } from 'vitest';
import { createDatabase } from '../../src/db/client.js';
import { loadConfig } from '../../src/config/env.js';
import { buildApp } from '../../src/app.js';
import { createProfileRepository } from '../../src/modules/profile/repository.js';
import { createFinanceRepository } from '../../src/modules/finance/repository.js';
import { createCardRepository } from '../../src/modules/finance/card-repository.js';
import { createBudgetRepository } from '../../src/modules/finance/budget-repository.js';
import { createNetWorthRepository } from '../../src/modules/finance/net-worth-repository.js';
import { signingFixture, testEnv } from '../helpers.js';
import type { Card, CardView, Purchase, BillingRule, CardsSummary } from '../../src/modules/finance/card-contracts.js';
import type { Transfer, Summary } from '../../src/modules/finance/contracts.js';
import type { BudgetSummary } from '../../src/modules/finance/budget-contracts.js';
const config = loadConfig({ ...testEnv, RATE_LIMIT_MAX: '10000', TEST_DATABASE_URL: process.env.TEST_DATABASE_URL }), database = createDatabase(config), profiles = createProfileRepository(database), finance = createFinanceRepository(database), cards = createCardRepository(database), fixture = await signingFixture();
const clock = () => new Date('2026-10-05T12:00:00Z');
const app = await buildApp(config, { jwks: fixture.resolver, cardClock: clock, budgetClock: clock, netWorthClock: clock, dependencies: { profiles, finance, cards, budgets: createBudgetRepository(database), netWorth: createNetWorthRepository(database), ping: database.ping, close: database.close } });
type Context = { owner: string; headers: { authorization: string }; categoryId: string; sourceId: string };
async function context(zone = 'America/Sao_Paulo'): Promise<Context> { const owner = randomUUID(); await profiles.upsertForAuthUser(owner, { displayName: 'Fixture', locale: 'pt-BR', timezone: zone }); const cat = await finance.createCategory(owner, { name: 'Expense', kind: 'EXPENSE' }), source = await finance.createAccount(owner, { name: 'Bank', type: 'checking', currency: 'BRL', initialBalanceMinor: '1000000' }); return { owner, categoryId: cat.id, sourceId: source.id, headers: { authorization: 'Bearer ' + await fixture.token({ sub: owner }) } }; }
async function req<T>(c: Context, path: string, method: 'GET' | 'POST' | 'PATCH' = 'GET', payload?: unknown, status = method === 'POST' ? 201 : 200): Promise<T> { const r = await app.inject({ method, url: '/api/v1/finance' + path, headers: c.headers, ...(payload ? { payload: payload as Record<string, unknown> } : {}) }); expect(r.statusCode, r.body).toBe(status); return r.json<T>(); }
const base = (id: string) => '/cards/' + id;
const cardInput = { displayName: 'Card fixture', currency: 'BRL', trackingStartDate: '2026-08-01', closingDay: 10, dueDay: 17, creditLimitMinor: '500000' };
const create = (c: Context, extra = {}, status = 201) => req<Card>(c, '/cards', 'POST', { ...cardInput, ...extra }, status);
const buy = (c: Context, card: Card, extra = {}, status = 201) => req<Purchase>(c, base(card.id) + '/purchases', 'POST', { categoryId: c.categoryId, description: 'Purchase', purchaseDate: '2026-10-05', totalAmountMinor: '10000', installmentCount: 1, idempotencyKey: randomUUID(), ...extra }, status);
const pay = (c: Context, card: Card, amountMinor: string, extra = {}, status = 201) => req<Transfer>(c, base(card.id) + '/payments', 'POST', { sourceAccountId: c.sourceId, amountMinor, occurredAt: '2026-10-05T10:00:00Z', idempotencyKey: randomUUID(), ...extra }, status);
const view = (c: Context, card: Card, query = '') => req<CardView>(c, base(card.id) + query);
afterAll(() => app.close());
describe('MDL8 PostgreSQL17 accounting, atomicity and ownership', () => {
  it('partial materialization failure rolls back purchase, installments and every expense', async () => {
    const c = await context('Pacific/Apia'), card = await create(c, { trackingStartDate: '2011-11-01' });
    // Apia skipped 2011-12-30. The first November installment is inserted,
    // the second cannot preserve its local date, so the entire SQL command rolls back.
    await buy(c, card, { purchaseDate: '2011-11-30', installmentCount: 2 }, 400);
    for (const table of ['financial_card_purchases', 'financial_card_installments', 'financial_transactions']) {
      expect((await database.pool.query('select count(*)::int n from app.' + table + ' where auth_user_id=$1', [c.owner])).rows[0].n).toBe(0);
    }
  });
  it('compound transaction FK rejects a foreign-owner installment ledger row', async () => {
    const a = await context(), b = await context(), card = await create(a), p = await buy(a, card);
    const transaction = await finance.createTransaction(b.owner, { accountId: b.sourceId, categoryId: b.categoryId, type: 'EXPENSE', amountMinor: '100', currency: 'BRL', description: 'Foreign fixture', occurredAt: '2026-10-05T10:00:00Z' });
    await expect(database.pool.query('insert into app.financial_card_installments(auth_user_id,card_id,purchase_id,transaction_id,installment_number,amount_minor,scheduled_date) values($1,$2,$3,$4,2,100,$5)', [a.owner, card.id, p.id, transaction.id, '2026-11-05'])).rejects.toMatchObject({ code: '23503' });
  });
  it('purchase EXPENSE once, payment TRANSFER once; balance 0 → -100 → 0, summary and budget unchanged', async () => {
    const c = await context(), card = await create(c), p = await buy(c, card);
    expect(p.installments).toHaveLength(1);
    expect((await finance.getAccount(c.owner, card.accountId))?.balanceMinor).toBe('-10000');
    const query = '/summary?from=2026-10-01T03:00:00Z&to=2026-11-01T03:00:00Z', budgetQuery = '/budgets/2026-10/summary?currency=BRL';
    const before = await req<Summary>(c, query), budgetBefore = await req<BudgetSummary>(c, budgetQuery);
    await pay(c, card, '10000');
    const after = await req<Summary>(c, query), budgetAfter = await req<BudgetSummary>(c, budgetQuery);
    expect(after.currencies[0]?.expenseMinor).toBe(before.currencies[0]?.expenseMinor);
    expect(after.currencies[0]?.expenseMinor).toBe('10000');
    expect(budgetBefore.expenseTotalMinor).toBe('10000');
    expect(budgetAfter.expenseTotalMinor).toBe(budgetBefore.expenseTotalMinor);
    expect((await finance.getAccount(c.owner, card.accountId))?.balanceMinor).toBe('0');
    expect((await view(c, card)).invoices[0]).toMatchObject({ status: 'PAID', outstandingMinor: '0', paymentsAppliedMinor: '10000' });
  });
  it('link rejects unmanaged outgoing transfers after tracking, preserving the old movement', async () => {
    const c = await context(), account = await finance.createAccount(c.owner, { name: 'Unmanaged credit', type: 'credit', currency: 'BRL', initialBalanceMinor: '0' });
    const transfer = await finance.createTransfer(c.owner, { sourceAccountId: account.id, destinationAccountId: c.sourceId, currency: 'BRL', amountMinor: '1000', description: 'Pre-existing unmanaged movement', occurredAt: '2026-09-01T12:00:00Z', idempotencyKey: randomUUID() });
    await create(c, { accountId: account.id }, 409);
    expect((await database.pool.query('select is_cancelled from app.financial_transfers where id=$1', [transfer.id])).rows[0].is_cancelled).toBe(false);
    expect(await cards.list(c.owner)).toEqual([]);
    expect((await finance.getAccount(c.owner, account.id))?.balanceMinor).toBe('-1000');
  });
  it('exact 3 installments, future cutoff, month anchor and no Net Worth double counting', async () => {
    const c = await context(), card = await create(c), p = await buy(c, card, { totalAmountMinor: '100000', installmentCount: 3 });
    // The historical query must not depend on the disposable database's wall clock.
    await database.pool.query('update app.financial_accounts set created_at=$1 where id=$2 and auth_user_id=$3', ['2026-08-01T03:00:00Z', card.accountId, c.owner]);
    expect(p.installments.map(i => i.amountMinor)).toEqual(['33333', '33333', '33334']);
    const v = await view(c, card);
    expect(v).toMatchObject({ realBalanceMinor: '-33333', futureInstallmentsMinor: '66667', estimatedUsedLimitMinor: '100000' });
    expect(v.invoices.map(i => i.status)).toEqual(['OPEN', 'UPCOMING', 'UPCOMING']);
    const nw = await req<{ components: { id: string; signedValueMinor: string }[] }>(c, '/net-worth?asOf=2026-10-05');
    expect(nw.components.filter(i => i.id === card.accountId)).toEqual([expect.objectContaining({ signedValueMinor: '-33333' })]);
    const old = await create(c, { trackingStartDate: '2026-01-01' }), anchor = await buy(c, old, { purchaseDate: '2026-01-31', installmentCount: 5 });
    expect(anchor.installments.map(i => i.scheduledDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
  });
  it('purchase retry/double click materializes once; changed payload conflicts; metadata does not break replay', async () => { const c = await context(), card = await create(c), key = randomUUID(); const results = await Promise.all([buy(c, card, { idempotencyKey: key, installmentCount: 3 }), buy(c, card, { idempotencyKey: key, installmentCount: 3 })]); expect(results[0]?.id).toBe(results[1]?.id); const p = results[0]!; await buy(c, card, { idempotencyKey: key, totalAmountMinor: '20000', installmentCount: 3 }, 409); await req(c, base(card.id) + '/purchases/' + p.id, 'PATCH', { description: 'Changed' }); expect((await buy(c, card, { idempotencyKey: key, installmentCount: 3 })).id).toBe(p.id); expect((await database.pool.query('select count(*)::int n from app.financial_transactions where auth_user_id=$1', [c.owner])).rows[0].n).toBe(3); });
  it('60 positive installments, zero/61 rejected, rollback invalid category and payloads', async () => { const c = await context(), card = await create(c); const p = await buy(c, card, { installmentCount: 60 }); expect(p.installments).toHaveLength(60); for (const extra of [{ installmentCount: 0 }, { installmentCount: 61 }, { installmentCount: 3, totalAmountMinor: '2' }, { purchaseDate: '2026-10-06' }, { ownerId: c.owner }, { totalAmountMinor: '9223372036854775808' }]) await buy(c, card, extra, 400); const other = await context(); await buy(c, card, { categoryId: other.categoryId }, 404); const income = await finance.createCategory(c.owner, { name: 'Income', kind: 'INCOME' }); await buy(c, card, { categoryId: income.id }, 409); expect((await cards.read(c.owner, card.id, '2026-10-05', 'America/Sao_Paulo', clock())).purchases).toHaveLength(1); });
  it('billing versions are atomic, historical cycle preserved, no overlap or mutable old rule', async () => { const c = await context(), card = await create(c), p = await buy(c, card, { installmentCount: 3 }); const rule = await req<BillingRule>(c, base(card.id) + '/billing-rules', 'POST', { effectiveFrom: '2026-11-01', closingDay: 12, dueDay: 20 }); const v = await view(c, card); expect(v.rules[0]?.effectiveTo).toBe('2026-11-01'); expect(v.invoices.map(i => i.dueDate)).toEqual(['2026-10-17', '2026-11-20', '2026-12-20']); expect(p.installments[0]?.dueDate).toBe('2026-10-17'); await req(c, base(card.id) + '/billing-rules', 'POST', { effectiveFrom: '2026-10-01', closingDay: 20, dueDay: 25 }, 409); await expect(database.pool.query('update app.financial_card_billing_rules set closing_day=25 where id=$1', [rule.id])).rejects.toMatchObject({ code: '23514' }); await expect(database.pool.query('insert into app.financial_card_billing_rules(auth_user_id,card_id,effective_from,closing_day,due_day) values($1,$2,$3,10,17)', [c.owner, card.id, '2026-11-02'])).rejects.toMatchObject({ code: '23514' }); });
  it('partial/multiple/cancelled transfers, FIFO, historical asOf and overpayment', async () => { const c = await context(), card = await create(c); await buy(c, card, { purchaseDate: '2026-09-05' }); await buy(c, card); await pay(c, card, '15000'); const v = await view(c, card); expect(v.invoices.map(i => [i.status, i.paymentsAppliedMinor, i.outstandingMinor])).toEqual([['PAID', '10000', '0'], ['OPEN', '5000', '5000']]); const last = await pay(c, card, '10000'); expect((await view(c, card)).unallocatedCreditMinor).toBe('5000'); await finance.patchTransfer(c.owner, last.id, { isCancelled: true }); expect((await view(c, card)).invoices[1]?.outstandingMinor).toBe('5000'); const historic = await view(c, card, '?asOf=2026-09-18'); expect(historic.invoices[0]?.status).toBe('OVERDUE'); expect(historic.invoices[1]?.status).toBe('UPCOMING'); });
  it('payment idempotency, foreign source404, currency reject; no new expense', async () => { const c = await context(), card = await create(c), other = await context(), key = randomUUID(); const a = await pay(c, card, '10000', { idempotencyKey: key }), b = await pay(c, card, '10000', { idempotencyKey: key }); expect(a.id).toBe(b.id); await pay(c, card, '20000', { idempotencyKey: key }, 409); await pay(c, card, '10000', { sourceAccountId: other.sourceId }, 404); const usd = await finance.createAccount(c.owner, { name: 'USD', type: 'checking', currency: 'USD', initialBalanceMinor: '0' }); await pay(c, card, '10000', { sourceAccountId: usd.id }, 400); expect((await database.pool.query('select count(*)::int n from app.financial_transactions where auth_user_id=$1', [c.owner])).rows[0].n).toBe(0); });
  it('legacy debt/credit linked explicitly; no invented invoices or automatic cards', async () => { const c = await context(), a = await finance.createAccount(c.owner, { name: 'Old card', type: 'credit', currency: 'BRL', initialBalanceMinor: '-50000' }); expect(await cards.list(c.owner)).toEqual([]); await finance.createTransaction(c.owner, { accountId: a.id, type: 'EXPENSE', amountMinor: '10000', currency: 'BRL', description: 'Legacy', occurredAt: '2026-07-01T12:00:00Z' }); const card = await create(c, { accountId: a.id }); let v = await view(c, card); expect(v).toMatchObject({ legacyBalanceAtTrackingStartMinor: '-60000', legacyLiabilityMinor: '60000', invoices: [] }); await buy(c, card); await pay(c, card, '65000'); v = await view(c, card); expect(v.legacyOutstandingMinor).toBe('0'); expect(v.invoices[0]?.outstandingMinor).toBe('5000'); await create(c, { accountId: a.id }, 409); const debt = await create(c, { initialDebtMinor: '50000' }); expect((await finance.getAccount(c.owner, debt.accountId))?.initialBalanceMinor).toBe('-50000'); });
  it('generic managed writes/outbound transfer reject, inbound and pre-tracking remain valid', async () => { const c = await context(), card = await create(c), p = await buy(c, card); await req(c, '/transactions', 'POST', { accountId: card.accountId, categoryId: c.categoryId, type: 'EXPENSE', amountMinor: '100', currency: 'BRL', description: 'Bypass', occurredAt: '2026-10-05T10:00:00Z' }, 409); await req(c, '/transactions/' + p.installments[0]!.transactionId, 'PATCH', { isCancelled: true }, 409); await req(c, '/transfers', 'POST', { sourceAccountId: card.accountId, destinationAccountId: c.sourceId, currency: 'BRL', amountMinor: '100', description: 'Bypass', occurredAt: '2026-10-05T10:00:00Z', idempotencyKey: randomUUID() }, 409); await req(c, '/accounts/' + card.accountId, 'PATCH', { type: 'checking' }, 409); await pay(c, card, '100'); await finance.createTransaction(c.owner, { accountId: card.accountId, type: 'EXPENSE', amountMinor: '100', currency: 'BRL', description: 'Legacy correction', occurredAt: '2026-07-01T12:00:00Z' }); });
  it('safe cancellation preserves rows and recalculates; payment makes correction unsafe', async () => { const c = await context(), card = await create(c), p = await buy(c, card, { installmentCount: 3 }); await req(c, base(card.id) + '/purchases/' + p.id + '/cancel', 'POST', {}, 200); expect((await view(c, card)).invoices).toEqual([]); expect((await finance.getAccount(c.owner, card.accountId))?.balanceMinor).toBe('0'); expect((await database.pool.query('select count(*)::int n from app.financial_transactions where auth_user_id=$1 and is_cancelled', [c.owner])).rows[0].n).toBe(3); const paid = await buy(c, card); await pay(c, card, '100'); await req(c, base(card.id) + '/purchases/' + paid.id + '/cancel', 'POST', {}, 409); });
  it('archive terminal, retains future installments/invoices/account and permits payments', async () => {
    const c = await context(), card = await create(c);
    await buy(c, card, { installmentCount: 3 });
    await req(c, base(card.id) + '/archive', 'POST', {}, 200);
    await buy(c, card, {}, 409);
    await req(c, base(card.id) + '/billing-rules', 'POST', { effectiveFrom: '2026-11-01', closingDay: 12, dueDay: 20 }, 409);
    expect((await view(c, card)).futureInstallmentsMinor).toBe('6667');
    expect((await finance.getAccount(c.owner, card.accountId))?.isActive).toBe(true);
    await pay(c, card, '3333');
    expect((await view(c, card)).invoices[0]?.status).toBe('PAID');
  });
  it('multi-currency, last4 security, metadata patch and stable page cursor', async () => { const c = await context(), brl = await create(c), usd = await create(c, { currency: 'USD' }); await buy(c, brl); await buy(c, brl); await buy(c, usd); const summary = await req<CardsSummary>(c, '/cards/summary'); expect(summary.currencies.map(t => t.currency)).toEqual(['BRL', 'USD']); for (const extra of [{ last4: '123' }, { pan: 'invalid' }, { cvv: '123' }, { ownerId: c.owner }]) await create(c, extra, 400); await req(c, base(brl.id), 'PATCH', { creditLimitMinor: '100' }); expect((await view(c, brl)).estimatedAvailableLimitMinor).toBe('-19900'); const first = await req<{ items: Purchase[]; nextCursor: { createdAt: string; id: string } }>(c, base(brl.id) + '/purchases?limit=1'); const second = await req<{ items: Purchase[] }>(c, base(brl.id) + '/purchases?limit=1&cursorAt=' + encodeURIComponent(first.nextCursor.createdAt) + '&cursorId=' + first.nextCursor.id); expect(first.items[0]?.id).not.toBe(second.items[0]?.id); });
  it('timezone materialization preserves local scheduled day across DST', async () => { const c = await context('America/New_York'), card = await create(c, { trackingStartDate: '2026-01-01' }), p = await buy(c, card, { purchaseDate: '2026-02-08', installmentCount: 3 }); const rows = (await database.pool.query("select (occurred_at at time zone 'America/New_York')::date::text date from app.financial_transactions where id=any($1::uuid[]) order by occurred_at", [p.installments.map(i => i.transactionId)])).rows; expect(rows.map(r => r.date)).toEqual(['2026-02-08', '2026-03-08', '2026-04-08']); });
  it('foreign owner404 across every resource and mutation', async () => { const a = await context(), b = await context(), card = await create(a), p = await buy(a, card); for (const [path, method, payload] of [[base(card.id), 'GET', undefined], [base(card.id) + '/billing-rules', 'GET', undefined], [base(card.id) + '/purchases', 'GET', undefined], [base(card.id) + '/invoices', 'GET', undefined], [base(card.id) + '/purchases/' + p.id, 'GET', undefined], [base(card.id) + '/archive', 'POST', {}], [base(card.id) + '/purchases/' + p.id + '/cancel', 'POST', {}]] as const) await req(b, path, method, payload, 404); expect(await req(b, '/cards')).toEqual([]); await create(b, { accountId: card.accountId }, 404); });
  it('RLS protects all four tables, no DELETE, controlled child writes and anonymous denial', async () => {
    const a = await context(), b = await context(), card = await create(a);
    await buy(a, card);
    const client = await database.pool.connect();
    try {
      for (const role of ['authenticated', 'anon']) {
        await client.query('begin'); await client.query('set local role ' + role);
        await client.query("select set_config('request.jwt.claim.sub',$1,true)", [role === 'anon' ? '' : b.owner]);
        for (const table of ['financial_credit_cards', 'financial_card_billing_rules', 'financial_card_purchases', 'financial_card_installments']) expect((await client.query('select id from app.' + table + ' where auth_user_id=$1', [a.owner])).rows).toHaveLength(0);
        await client.query('rollback');
      }
      await client.query('begin'); await client.query('set local role authenticated');
      await client.query("select set_config('request.jwt.claim.sub',$1,true)", [a.owner]);
      for (const table of ['financial_credit_cards', 'financial_card_billing_rules', 'financial_card_purchases', 'financial_card_installments']) {
        expect((await client.query('select id from app.' + table + ' where auth_user_id=$1', [a.owner])).rows.length).toBeGreaterThan(0);
        expect((await client.query('delete from app.' + table + ' where auth_user_id=$1 returning id', [a.owner])).rows).toHaveLength(0);
      }
      expect((await client.query('update app.financial_card_billing_rules set closing_day=20 where card_id=$1 returning id', [card.id])).rows).toHaveLength(0);
      // Non-overlapping dates isolate the RLS rejection from the BEFORE overlap trigger.
      await expect(client.query('insert into app.financial_card_billing_rules(auth_user_id,card_id,effective_from,effective_to,closing_day,due_day) values($1,$2,$3,$4,10,17)', [a.owner, card.id, '2026-07-01', '2026-07-02'])).rejects.toMatchObject({ code: '42501' });
    } finally { await client.query('rollback'); client.release(); }
  });
  it('unrelated financial modules untouched before/after card writes', async () => { const c = await context(), names = ['financial_budget_periods', 'financial_budget_allocations', 'financial_goals', 'financial_goal_events', 'financial_recurrences', 'financial_net_worth_items', 'financial_net_worth_valuations', 'financial_yield_profiles', 'financial_yield_rules', 'financial_market_rates']; const hashes = async () => Promise.all(names.map(async name => (await database.pool.query("select count(*)::text n,md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'[]')) h from app." + name + ' t')).rows[0])); const before = await hashes(); const card = await create(c); await buy(c, card); await pay(c, card, '100'); expect(await hashes()).toEqual(before); });
});
