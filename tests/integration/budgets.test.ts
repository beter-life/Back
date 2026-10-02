import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { createDatabase } from '../../src/db/client.js';
import { loadConfig } from '../../src/config/env.js';
import { buildApp } from '../../src/app.js';
import { createProfileRepository } from '../../src/modules/profile/repository.js';
import { createFinanceRepository } from '../../src/modules/finance/repository.js';
import { createBudgetRepository } from '../../src/modules/finance/budget-repository.js';
import { testEnv, signingFixture } from '../helpers.js';
import type { Account, Category } from '../../src/modules/finance/contracts.js';
import type {
  BudgetSummary,
  BudgetPeriod,
  BudgetAllocation,
  BudgetCopyResult,
} from '../../src/modules/finance/budget-contracts.js';

const database = createDatabase(
  loadConfig({ ...testEnv, TEST_DATABASE_URL: process.env.TEST_DATABASE_URL }),
);
const fixture = await signingFixture();
const app = await buildApp(
  loadConfig({
    ...testEnv,
    RATE_LIMIT_MAX: '2000',
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
  }),
  {
    jwks: fixture.resolver,
    budgetClock: () => new Date('2026-10-15T12:00:00Z'),
    dependencies: {
      profiles: createProfileRepository(database),
      finance: createFinanceRepository(database),
      budgets: createBudgetRepository(database),
      ping: database.ping,
      close: database.close,
    },
  },
);
type Headers = { authorization: string };
const path = (s: string) => '/api/v1/finance/' + s;
async function request<T>(
  headers: Headers,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  suffix: string,
  payload?: Record<string, unknown>,
  expected = method === 'POST' && !suffix.includes('copy-previous') ? 201 : 200,
): Promise<T> {
  const r = await app.inject({
    method,
    url: path(suffix),
    headers,
    ...(payload ? { payload } : {}),
  });
  expect(r.statusCode, r.body).toBe(expected);
  return r.json<T>();
}
async function context(zone = 'America/Sao_Paulo') {
  const owner = randomUUID();
  const headers = { authorization: `Bearer ${await fixture.token({ sub: owner })}` };
  const p = await app.inject({
    method: 'PUT',
    url: '/api/v1/me/profile',
    headers,
    payload: { displayName: 'Budget test', locale: 'pt-BR', timezone: zone },
  });
  expect(p.statusCode).toBe(200);
  const account = await request<Account>(headers, 'POST', 'accounts', {
    name: 'Budget account',
    type: 'checking',
    currency: 'BRL',
    initialBalanceMinor: '0',
  });
  const category = await request<Category>(headers, 'POST', 'categories', {
    name: 'Food',
    kind: 'EXPENSE',
  });
  return { owner, headers, account, category };
}
type Context = Awaited<ReturnType<typeof context>>;
const ensure = (c: Context, month: string, currency = 'BRL') =>
  request<BudgetPeriod>(c.headers, 'PUT', 'budgets/' + month, { currency });
const limit = (
  c: Context,
  month: string,
  amountMinor = '50000',
  rolloverPolicy = 'NONE',
  categoryId = c.category.id,
  currency = 'BRL',
  expected = 200,
) =>
  request<BudgetAllocation>(
    c.headers,
    'PATCH',
    `budgets/${month}/categories/${categoryId}`,
    { currency, amountMinor, rolloverPolicy },
    expected,
  );
const summary = (c: Context, month = '2026-10', currency = 'BRL') =>
  request<BudgetSummary>(c.headers, 'GET', `budgets/${month}/summary?currency=${currency}`);
const expense = (
  c: Context,
  amountMinor: string,
  occurredAt = '2026-10-10T12:00:00Z',
  categoryId: string | null = c.category.id,
  type = 'EXPENSE',
  accountId = c.account.id,
  currency = 'BRL',
) =>
  request<{ id: string }>(c.headers, 'POST', 'transactions', {
    accountId,
    ...(categoryId ? { categoryId } : {}),
    type,
    currency,
    amountMinor,
    description: 'Budget fixture',
    occurredAt,
  });
beforeAll(async () => {
  await database.ping();
});
afterAll(async () => {
  await app.close();
});

describe('monthly budgets HTTP + real PostgreSQL', () => {
  it('creates periods idempotently, separates currency and snapshots the profile timezone', async () => {
    const c = await context();
    const periods = await Promise.all(Array.from({ length: 4 }, () => ensure(c, '2026-10')));
    expect(new Set(periods.map((p) => p.id)).size).toBe(1);
    expect(periods[0]?.timeZone).toBe('America/Sao_Paulo');
    const usd = await ensure(c, '2026-10', 'USD');
    expect(usd.id).not.toBe(periods[0]?.id);
    const snapshot = await createBudgetRepository(database).snapshot(
      c.owner,
      '2026-10',
      'BRL',
      'UTC',
    );
    expect(snapshot.calendars[0]?.from).toBeInstanceOf(Date);
    await app.inject({
      method: 'PUT',
      url: '/api/v1/me/profile',
      headers: c.headers,
      payload: { displayName: 'Budget test', locale: 'pt-BR', timezone: 'Asia/Tokyo' },
    });
    expect((await summary(c)).from).toBe('2026-10-01T03:00:00.000Z');
    expect((await ensure(c, '2026-11')).timeZone).toBe('Asia/Tokyo');
    for (const m of ['2026-13', '2026-1', '9999-01'])
      await request(c.headers, 'PUT', 'budgets/' + m, { currency: 'BRL' }, 400);
    await request(
      c.headers,
      'PUT',
      'budgets/2026-10',
      { currency: 'BRL', authUserId: randomUUID() },
      400,
    );
    expect(
      (await app.inject({ url: path('budgets/2026-10/summary?currency=BRL') })).statusCode,
    ).toBe(401);
  });
  it('creates/updates/removes allocations without deleting history and validates category/amount', async () => {
    const c = await context();
    await ensure(c, '2026-10');
    const a = await limit(c, '2026-10');
    const b = await limit(c, '2026-10', '0', 'POSITIVE_ONLY');
    expect(a.id).toBe(b.id);
    expect(b.amountMinor).toBe('0');
    const income = await request<Category>(c.headers, 'POST', 'categories', {
      name: 'Salary',
      kind: 'INCOME',
    });
    await limit(c, '2026-10', '1', 'NONE', income.id, 'BRL', 400);
    for (const invalid of ['-1', '1.5', '9223372036854775808'])
      await limit(c, '2026-10', invalid, 'NONE', c.category.id, 'BRL', 400);
    await expense(c, '1000');
    const zero = await summary(c);
    expect(zero.utilizationPercent).toBeNull();
    expect(zero.paceStatus).toBe('OVER_BUDGET');
    const removed = await request<BudgetAllocation>(
      c.headers,
      'DELETE',
      `budgets/2026-10/categories/${c.category.id}?currency=BRL`,
    );
    expect(removed.isActive).toBe(false);
    const after = await summary(c);
    expect(after.categories).toHaveLength(0);
    expect(after.unbudgetedSpendingMinor).toBe('1000');
    expect(
      (
        await database.pool.query(
          'select count(*)::int n from app.financial_budget_allocations where id=$1',
          [a.id],
        )
      ).rows[0].n,
    ).toBe(1);
    expect((await limit(c, '2026-10')).id).toBe(a.id);
  });
  it('calculates the real 500/100/400/20% case and ignores income, transfers and cancellations', async () => {
    const c = await context();
    await ensure(c, '2026-10');
    await limit(c, '2026-10');
    await expense(c, '10000');
    const cancelled = await expense(c, '3000');
    await request(c.headers, 'PATCH', 'transactions/' + cancelled.id, { isCancelled: true });
    await expense(c, '9999', '2026-10-01T02:59:59Z');
    await expense(c, '8888', '2026-11-01T03:00:00Z');
    await expense(c, '25000', '2026-10-12T12:00:00Z', null, 'INCOME');
    const target = await request<Account>(c.headers, 'POST', 'accounts', {
      name: 'Reserve',
      type: 'savings',
      currency: 'BRL',
      initialBalanceMinor: '0',
    });
    await request(c.headers, 'POST', 'transfers', {
      sourceAccountId: c.account.id,
      destinationAccountId: target.id,
      currency: 'BRL',
      amountMinor: '60000',
      description: '',
      occurredAt: '2026-10-12T12:00:00Z',
      idempotencyKey: randomUUID(),
    });
    const s = await summary(c);
    expect(s.categories[0]).toMatchObject({
      baseMinor: '50000',
      spentMinor: '10000',
      remainingMinor: '40000',
      utilizationPercent: '20.00',
    });
    expect(s.expenseTotalMinor).toBe('10000');
    expect(s.elapsedDays).toBe(15);
    expect(s.daysInMonth).toBe(31);
  });
  it('does not hide unbudgeted or uncategorized expenses when a budget is missing', async () => {
    const c = await context();
    await expense(c, '15000');
    await request(c.headers, 'POST', 'transactions', {
      accountId: c.account.id,
      type: 'EXPENSE',
      currency: 'BRL',
      amountMinor: '2000',
      description: '',
      occurredAt: '2026-10-12T12:00:00Z',
    });
    const empty = await summary(c);
    expect(empty.periodId).toBeNull();
    expect(empty.expenseTotalMinor).toBe('17000');
    expect(empty.unbudgetedCategories).toHaveLength(2);
    await ensure(c, '2026-10');
    await limit(c, '2026-10');
    const planned = await summary(c);
    expect(planned.spentBudgetedMinor).toBe('15000');
    expect(planned.unbudgetedSpendingMinor).toBe('2000');
    expect(planned.utilizationPercent).toBe('34.00');
  });
  it('keeps inactive category history but blocks new allocations and reactivation', async () => {
    const c = await context();
    await ensure(c, '2026-09');
    await limit(c, '2026-09');
    await request(c.headers, 'PATCH', 'categories/' + c.category.id, { isActive: false });
    expect((await summary(c, '2026-09')).categories[0]?.categoryIsActive).toBe(false);
    await limit(c, '2026-09', '60000');
    await ensure(c, '2026-10');
    await limit(c, '2026-10', '50000', 'NONE', c.category.id, 'BRL', 409);
    const copied = await request<BudgetCopyResult>(
      c.headers,
      'POST',
      'budgets/2026-10/copy-previous',
      { currency: 'BRL' },
    );
    expect(copied.skippedInactiveCount).toBe(1);
    expect(copied.copiedCount).toBe(0);
    await request(c.headers, 'DELETE', `budgets/2026-09/categories/${c.category.id}?currency=BRL`);
    await limit(c, '2026-09', '1', 'NONE', c.category.id, 'BRL', 409);
  });
  it('computes positive rollover from the closed previous month, NONE and no negative carry', async () => {
    const c = await context();
    await ensure(c, '2026-09');
    await limit(c, '2026-09');
    await expense(c, '42000', '2026-09-10T12:00:00Z');
    await ensure(c, '2026-10');
    await limit(c, '2026-10', '50000', 'POSITIVE_ONLY');
    expect((await summary(c)).categories[0]).toMatchObject({
      rolloverMinor: '8000',
      availableMinor: '58000',
    });
    await limit(c, '2026-10', '50000', 'NONE');
    expect((await summary(c)).rolloverTotalMinor).toBe('0');
    await expense(c, '10000', '2026-09-11T12:00:00Z');
    await limit(c, '2026-10', '50000', 'POSITIVE_ONLY');
    expect((await summary(c)).rolloverTotalMinor).toBe('0');
    await ensure(c, '2026-11');
    await limit(c, '2026-11', '50000', 'POSITIVE_ONLY');
    expect((await summary(c, '2026-11')).rolloverTotalMinor).toBe('0');
    await ensure(c, '2026-12');
    await limit(c, '2026-12', '50000', 'POSITIVE_ONLY');
    expect((await summary(c, '2026-12')).elapsedDays).toBe(0);
  });
  it('copies only base allocations/policy, does not overwrite, and prevents concurrent duplicates', async () => {
    const c = await context();
    await ensure(c, '2026-09');
    await limit(c, '2026-09', '50000', 'POSITIVE_ONLY');
    await expense(c, '42000', '2026-09-10T12:00:00Z');
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request<BudgetCopyResult>(c.headers, 'POST', 'budgets/2026-10/copy-previous', {
          currency: 'BRL',
        }),
      ),
    );
    expect(results.reduce((sum, x) => sum + x.copiedCount, 0)).toBe(1);
    expect((await summary(c)).categories[0]).toMatchObject({
      baseMinor: '50000',
      rolloverMinor: '8000',
      spentMinor: '0',
    });
    await limit(c, '2026-10', '60000');
    await request(c.headers, 'POST', 'budgets/2026-10/copy-previous', { currency: 'BRL' });
    expect((await summary(c)).baseBudgetTotalMinor).toBe('60000');
    await request(c.headers, 'DELETE', `budgets/2026-10/categories/${c.category.id}?currency=BRL`);
    await request(c.headers, 'POST', 'budgets/2026-10/copy-previous', { currency: 'BRL' });
    expect((await summary(c)).categories).toHaveLength(0);
    await request(c.headers, 'POST', 'budgets/2026-08/copy-previous', { currency: 'BRL' }, 404);
  });
  it('rolls back the entire copy including a new destination period after an insert failure', async () => {
    const c = await context();
    const extra = await request<Category>(c.headers, 'POST', 'categories', {
      name: 'Second limit',
      kind: 'EXPENSE',
    });
    await ensure(c, '2026-09');
    await limit(c, '2026-09');
    await limit(c, '2026-09', '25000', 'NONE', extra.id);
    // Synthetic failure exists only in the disposable PostgreSQL integration database.
    const lastCategory = [c.category.id, extra.id].sort().at(-1)!;
    await database.pool.query(
      `create function app.mdl3_copy_test_failure() returns trigger language plpgsql as $$ begin raise exception 'synthetic budget copy failure'; end $$`,
    );
    try {
      await database.pool.query(
        `create trigger mdl3_copy_test_failure after insert on app.financial_budget_allocations for each row when (new.auth_user_id='${c.owner}'::uuid and new.category_id='${lastCategory}'::uuid) execute function app.mdl3_copy_test_failure()`,
      );
      await request(c.headers, 'POST', 'budgets/2026-10/copy-previous', { currency: 'BRL' }, 500);
      expect(
        (
          await database.pool.query(
            'select count(*)::int n from app.financial_budget_periods where auth_user_id=$1 and period_month=$2',
            [c.owner, '2026-10'],
          )
        ).rows[0].n,
      ).toBe(0);
      expect(
        (
          await database.pool.query(
            'select count(*)::int n from app.financial_budget_allocations where auth_user_id=$1',
            [c.owner],
          )
        ).rows[0].n,
      ).toBe(2);
    } finally {
      await database.pool.query(
        'drop trigger if exists mdl3_copy_test_failure on app.financial_budget_allocations',
      );
      await database.pool.query('drop function app.mdl3_copy_test_failure()');
    }
  });
  it('separates currencies and handles zero/three-decimal Money without conversion', async () => {
    const c = await context();
    for (const currency of ['JPY', 'KWD']) {
      const account = await request<Account>(c.headers, 'POST', 'accounts', {
        name: currency,
        type: 'cash',
        currency,
        initialBalanceMinor: '0',
      });
      await ensure(c, '2026-10', currency);
      await limit(c, '2026-10', '500', 'NONE', c.category.id, currency);
      await expense(
        c,
        '100',
        '2026-10-10T12:00:00Z',
        c.category.id,
        'EXPENSE',
        account.id,
        currency,
      );
      expect((await summary(c, '2026-10', currency)).categories[0]).toMatchObject({
        spentMinor: '100',
        remainingMinor: '400',
        utilizationPercent: '20.00',
      });
    }
    expect((await summary(c)).expenseTotalMinor).toBe('0');
  });
  it('uses PostgreSQL calendar boundaries across DST and leap years', async () => {
    const c = await context('America/New_York');
    await ensure(c, '2026-03');
    await limit(c, '2026-03');
    await expense(c, '10000', '2026-03-01T05:00:00Z');
    await expense(c, '9000', '2026-03-01T04:59:59Z');
    await expense(c, '8000', '2026-04-01T04:00:00Z');
    expect(await summary(c, '2026-03')).toMatchObject({
      from: '2026-03-01T05:00:00.000Z',
      to: '2026-04-01T04:00:00.000Z',
      expenseTotalMinor: '10000',
      daysInMonth: 31,
      elapsedDays: 31,
    });
    await ensure(c, '2024-02');
    expect(await summary(c, '2024-02')).toMatchObject({ daysInMonth: 29, elapsedDays: 29 });
  });
  it('preserves exact aggregates exceeding BIGINT', async () => {
    const c = await context();
    const cat = await request<Category>(c.headers, 'POST', 'categories', {
      name: 'Large',
      kind: 'EXPENSE',
    });
    await ensure(c, '2026-10');
    await limit(c, '2026-10', '9223372036854775807');
    await limit(c, '2026-10', '9223372036854775807', 'NONE', cat.id);
    expect((await summary(c)).budgetedTotalMinor).toBe('18446744073709551614');
  });
  it('enforces ownership for every route and does not enumerate foreign category IDs', async () => {
    const a = await context();
    const b = await context();
    await ensure(a, '2026-10');
    await limit(a, '2026-10');
    await expense(a, '1000');
    expect((await summary(b)).periodId).toBeNull();
    expect((await summary(b)).expenseTotalMinor).toBe('0');
    await ensure(b, '2026-10');
    await limit(b, '2026-10', '1', 'NONE', a.category.id, 'BRL', 404);
    await limit(b, '2026-10', '1', 'NONE', randomUUID(), 'BRL', 404);
    await request(
      b.headers,
      'DELETE',
      `budgets/2026-10/categories/${a.category.id}?currency=BRL`,
      undefined,
      404,
    );
    await request(
      b.headers,
      'POST',
      'budgets/2026-11/copy-previous',
      { currency: 'BRL', auth_user_id: a.owner },
      400,
    );
    const view = await request<{ allocations: BudgetAllocation[] }>(
      b.headers,
      'GET',
      'budgets/2026-10?currency=BRL',
    );
    expect(view.allocations).toHaveLength(0);
  });
  it('has database constraints for owner, currency, expense kind, month and nonnegative amount', async () => {
    const a = await context();
    const b = await context();
    const p = await ensure(a, '2026-10');
    const insert = (owner: string, category: string, currency: string, amount: string) =>
      database.pool.query(
        'insert into app.financial_budget_allocations(auth_user_id,budget_period_id,category_id,currency,amount_minor) values($1,$2,$3,$4,$5)',
        [owner, p.id, category, currency, amount],
      );
    await expect(insert(a.owner, b.category.id, 'BRL', '1')).rejects.toMatchObject({
      code: '23503',
    });
    await expect(insert(b.owner, b.category.id, 'BRL', '1')).rejects.toMatchObject({
      code: '23503',
    });
    await expect(insert(a.owner, a.category.id, 'USD', '1')).rejects.toMatchObject({
      code: '23503',
    });
    await expect(insert(a.owner, a.category.id, 'BRL', '-1')).rejects.toMatchObject({
      code: '23514',
    });
    const income = await request<Category>(a.headers, 'POST', 'categories', {
      name: 'Income',
      kind: 'INCOME',
    });
    await expect(insert(a.owner, income.id, 'BRL', '1')).rejects.toMatchObject({ code: '23503' });
    await expect(
      database.pool.query(
        'insert into app.financial_budget_periods(auth_user_id,period_month,currency,time_zone) values($1,$2,$3,$4)',
        [a.owner, '2026-13', 'BRL', 'UTC'],
      ),
    ).rejects.toBeDefined();
    await expect(
      database.pool.query(
        'insert into app.financial_budget_periods(auth_user_id,period_month,currency,time_zone) values($1,$2,$3,$4)',
        [a.owner, '2026-11', 'BRL', 'Invalid/Zone'],
      ),
    ).rejects.toBeDefined();
  });
  it('enforces both new RLS policies for A/B, anon, reassignment and physical deletion', async () => {
    const a = await context();
    const b = await context();
    const p = await ensure(a, '2026-10');
    const alloc = await limit(a, '2026-10');
    async function asRole<T>(
      role: 'authenticated' | 'anon',
      owner: string,
      action: (client: PoolClient) => Promise<T>,
    ) {
      const client = await database.pool.connect();
      try {
        await client.query('begin');
        await client.query(`set local role ${role}`);
        await client.query("select set_config('request.jwt.claim.sub',$1,true)", [owner]);
        return await action(client);
      } finally {
        await client.query('rollback');
        client.release();
      }
    }
    for (const [table, id] of [
      ['financial_budget_periods', p.id],
      ['financial_budget_allocations', alloc.id],
    ]) {
      const select = `select id from app.${table} where id=$1`;
      expect((await asRole('authenticated', a.owner, (c) => c.query(select, [id]))).rowCount).toBe(
        1,
      );
      expect((await asRole('authenticated', b.owner, (c) => c.query(select, [id]))).rowCount).toBe(
        0,
      );
      expect((await asRole('anon', '', (c) => c.query(select, [id]))).rowCount).toBe(0);
      expect(
        (
          await asRole('authenticated', b.owner, (c) =>
            c.query(`update app.${table} set updated_at=now() where id=$1`, [id]),
          )
        ).rowCount,
      ).toBe(0);
      await expect(
        asRole('authenticated', a.owner, (c) =>
          c.query(`update app.${table} set auth_user_id=$1 where id=$2`, [b.owner, id]),
        ),
      ).rejects.toMatchObject({ code: '42501' });
      expect(
        (
          await asRole('authenticated', a.owner, (c) =>
            c.query(`delete from app.${table} where id=$1`, [id]),
          )
        ).rowCount,
      ).toBe(0);
    }
    await expect(
      asRole('authenticated', b.owner, (c) =>
        c.query(
          'insert into app.financial_budget_periods(auth_user_id,period_month,currency,time_zone) values($1,$2,$3,$4)',
          [a.owner, '2026-11', 'BRL', 'UTC'],
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      asRole('authenticated', b.owner, (c) =>
        c.query(
          'insert into app.financial_budget_allocations(auth_user_id,budget_period_id,category_id,currency,amount_minor) values($1,$2,$3,$4,$5)',
          [a.owner, p.id, randomUUID(), 'BRL', '1'],
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });
});
