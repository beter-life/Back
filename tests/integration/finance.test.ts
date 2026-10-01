import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../../src/db/client.js';
import { loadConfig } from '../../src/config/env.js';
import { buildApp } from '../../src/app.js';
import { createProfileRepository } from '../../src/modules/profile/repository.js';
import { createFinanceRepository } from '../../src/modules/finance/repository.js';
import { testEnv, signingFixture } from '../helpers.js';
import type {
  Account,
  Category,
  Transaction,
  Transfer,
} from '../../src/modules/finance/contracts.js';

const config = loadConfig({ ...testEnv, TEST_DATABASE_URL: process.env.TEST_DATABASE_URL });
const database = createDatabase(config);
const fixture = await signingFixture();
const app = await buildApp(config, {
  jwks: fixture.resolver,
  dependencies: {
    profiles: createProfileRepository(database),
    finance: createFinanceRepository(database),
    ping: database.ping,
    close: database.close,
  },
});
const ownerA = randomUUID();
const ownerB = randomUUID();
const headersA = { authorization: `Bearer ${await fixture.token({ sub: ownerA })}` };
const headersB = { authorization: `Bearer ${await fixture.token({ sub: ownerB })}` };
const occurredAt = '2026-01-15T12:00:00.000Z';
const url = (suffix: string) => '/api/v1/finance/' + suffix;
async function post<T>(
  suffix: string,
  payload: Record<string, unknown>,
  headers = headersA,
): Promise<T> {
  const result = await app.inject({ method: 'POST', url: url(suffix), headers, payload });
  expect(result.statusCode, result.body).toBe(201);
  return result.json<T>();
}
const accountInput = (name: string, currency = 'BRL', initialBalanceMinor = '10000') => ({
  name,
  type: 'checking',
  currency,
  initialBalanceMinor,
});
let a: Account;
let b: Account;
let foreign: Account;
let incomeCategory: Category;
let expenseCategory: Category;
let foreignCategory: Category;
beforeAll(async () => {
  a = await post('accounts', accountInput('A'));
  b = await post('accounts', accountInput('B', 'BRL', '0'));
  foreign = await post('accounts', accountInput('Foreign'), headersB);
  incomeCategory = await post('categories', { name: 'Salary', kind: 'INCOME' });
  expenseCategory = await post('categories', { name: 'Food', kind: 'EXPENSE' });
  foreignCategory = await post('categories', { name: 'Private', kind: 'EXPENSE' }, headersB);
});
afterAll(async () => {
  await app.close();
});
describe('finance HTTP + real PostgreSQL', () => {
  it('creates/lists/patches accounts, keeps opening money immutable and never leaks another owner', async () => {
    const list = await app.inject({ url: url('accounts'), headers: headersA });
    expect(list.json<Account[]>().map((row) => row.id)).toEqual([a.id, b.id]);
    expect(a.balanceMinor).toBe('10000');
    expect(
      (await app.inject({ url: url('accounts/' + foreign.id), headers: headersA })).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: url('accounts/' + foreign.id),
          headers: headersA,
          payload: { name: 'Forbidden' },
        })
      ).statusCode,
    ).toBe(404);
    const changed = await app.inject({
      method: 'PATCH',
      url: url('accounts/' + a.id),
      headers: headersA,
      payload: { name: ' Updated ' },
    });
    expect(changed.json().name).toBe('Updated');
    for (const extra of [{ currency: 'USD' }, { initialBalanceMinor: '5' }, { authUserId: ownerB }])
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: url('accounts/' + a.id),
            headers: headersA,
            payload: extra,
          })
        ).statusCode,
      ).toBe(400);
    for (const input of [
      accountInput('', 'BRL'),
      accountInput('x', 'ZZZ'),
      { ...accountInput('x'), type: 'bad' },
      { ...accountInput('x'), authUserId: ownerB },
    ])
      expect(
        (
          await app.inject({
            method: 'POST',
            url: url('accounts'),
            headers: headersA,
            payload: input,
          })
        ).statusCode,
      ).toBe(400);
    expect((await app.inject(url('accounts'))).statusCode).toBe(401);
  });
  it('creates income/expense with matching categories and rejects invalid relationships/money', async () => {
    await post<Transaction>('transactions', {
      accountId: a.id,
      categoryId: incomeCategory.id,
      type: 'INCOME',
      amountMinor: '5000',
      currency: 'BRL',
      description: 'Salary',
      occurredAt,
    });
    await post<Transaction>('transactions', {
      accountId: a.id,
      categoryId: expenseCategory.id,
      type: 'EXPENSE',
      amountMinor: '1250',
      currency: 'BRL',
      description: 'Lunch',
      occurredAt,
    });
    const input = {
      accountId: a.id,
      type: 'EXPENSE',
      amountMinor: '10',
      currency: 'BRL',
      description: '',
      occurredAt,
    };
    for (const amountMinor of ['0', '-1', '1.1', '9223372036854775808'])
      expect(
        (
          await app.inject({
            method: 'POST',
            url: url('transactions'),
            headers: headersA,
            payload: { ...input, amountMinor },
          })
        ).statusCode,
      ).toBe(400);
    for (const extra of [{ accountId: foreign.id }, { categoryId: foreignCategory.id }])
      expect(
        (
          await app.inject({
            method: 'POST',
            url: url('transactions'),
            headers: headersA,
            payload: { ...input, ...extra },
          })
        ).statusCode,
      ).toBe(404);
    for (const extra of [{ categoryId: incomeCategory.id }, { currency: 'USD' }])
      expect(
        (
          await app.inject({
            method: 'POST',
            url: url('transactions'),
            headers: headersA,
            payload: { ...input, ...extra },
          })
        ).statusCode,
      ).toBe(400);
    expect(
      (await app.inject({ url: url('accounts/' + a.id), headers: headersA })).json().balanceMinor,
    ).toBe('13750');
  });
  it('transfers atomically, rejects cross-currency/owner and is concurrently idempotent', async () => {
    const input = {
      sourceAccountId: a.id,
      destinationAccountId: b.id,
      amountMinor: '2000',
      currency: 'BRL',
      description: 'Transfer',
      occurredAt,
      idempotencyKey: randomUUID(),
    };
    const attempts = await Promise.all(
      Array.from({ length: 5 }, () => post<Transfer>('transfers', input)),
    );
    expect(new Set(attempts.map((row) => row.id)).size).toBe(1);
    expect(
      (await app.inject({ url: url('accounts/' + a.id), headers: headersA })).json().balanceMinor,
    ).toBe('11750');
    expect(
      (await app.inject({ url: url('accounts/' + b.id), headers: headersA })).json().balanceMinor,
    ).toBe('2000');
    const usd = await post<Account>('accounts', accountInput('USD', 'USD', '0'));
    for (const [destinationAccountId, status] of [
      [a.id, 400],
      [foreign.id, 404],
      [usd.id, 400],
    ] as const)
      expect(
        (
          await app.inject({
            method: 'POST',
            url: url('transfers'),
            headers: headersA,
            payload: { ...input, destinationAccountId, idempotencyKey: randomUUID() },
          })
        ).statusCode,
      ).toBe(status);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: url('transfers'),
          headers: headersA,
          payload: { ...input, amountMinor: '2001' },
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (await app.inject({ url: url('transactions/' + attempts[0]!.id), headers: headersB }))
        .statusCode,
    ).toBe(404);
  });
  it('rolls back a database failure without creating either balance effect', async () => {
    const before = await app.inject({ url: url('accounts/' + a.id), headers: headersA });
    const key = randomUUID();
    // Fault injection in this disposable database only; failure happens after row insertion.
    await database.pool.query(
      "CREATE FUNCTION app.test_transfer_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic rollback'; END $$; CREATE TRIGGER test_failure AFTER INSERT ON app.financial_transfers FOR EACH ROW EXECUTE FUNCTION app.test_transfer_failure()",
    );
    try {
      const failed = await app.inject({
        method: 'POST',
        url: url('transfers'),
        headers: headersA,
        payload: {
          sourceAccountId: a.id,
          destinationAccountId: b.id,
          amountMinor: '3',
          currency: 'BRL',
          description: '',
          occurredAt,
          idempotencyKey: key,
        },
      });
      expect(failed.statusCode).toBe(500);
      expect(
        (
          await database.pool.query(
            'select id from app.financial_transfers where idempotency_key=$1',
            [key],
          )
        ).rowCount,
      ).toBe(0);
      expect(
        (await app.inject({ url: url('accounts/' + a.id), headers: headersA })).json().balanceMinor,
      ).toBe(before.json().balanceMinor);
      expect(
        (await app.inject({ url: url('accounts/' + b.id), headers: headersA })).json().balanceMinor,
      ).toBe('2000');
    } finally {
      await database.pool.query(
        'DROP TRIGGER test_failure ON app.financial_transfers; DROP FUNCTION app.test_transfer_failure()',
      );
    }
  });
  it('supports deterministic keyset pagination and all basic filters', async () => {
    const first = await app.inject({ url: url('transactions?limit=1'), headers: headersA });
    expect(first.json().items).toHaveLength(1);
    expect(first.json().nextCursor).not.toBeNull();
    const cursor = first.json().nextCursor;
    const next = await app.inject({
      url: url(
        `transactions?limit=1&cursorAt=${encodeURIComponent(cursor.occurredAt)}&cursorId=${cursor.id}`,
      ),
      headers: headersA,
    });
    expect(next.json().items[0].id).not.toBe(first.json().items[0].id);
    for (const filter of [
      `categoryId=${expenseCategory.id}`,
      'type=EXPENSE',
      `accountId=${a.id}&type=EXPENSE`,
      'from=2026-01-01T00:00:00Z&to=2026-02-01T00:00:00Z&type=EXPENSE',
    ])
      expect(
        (await app.inject({ url: url('transactions?' + filter), headers: headersA })).json().items,
      ).toHaveLength(1);
    expect(
      (await app.inject({ url: url('transactions?accountId=' + b.id), headers: headersA })).json()
        .items[0].type,
    ).toBe('TRANSFER');
    expect(
      (await app.inject({ url: url('transactions?limit=51'), headers: headersA })).statusCode,
    ).toBe(400);
    expect(
      (await app.inject({ url: url('transactions?cursorId=' + a.id), headers: headersA }))
        .statusCode,
    ).toBe(400);
  });
  it('deactivates without breaking history, cancels without deleting, and summarizes by currency', async () => {
    const list = (
      await app.inject({ url: url('transactions?type=EXPENSE'), headers: headersA })
    ).json();
    const id = list.items[0].id;
    const summaryUrl = url('summary?from=2026-01-01T00:00:00Z&to=2026-02-01T00:00:00Z');
    expect(
      (await app.inject({ url: summaryUrl, headers: headersA }))
        .json()
        .currencies.find((row: { currency: string }) => row.currency === 'BRL'),
    ).toEqual({
      currency: 'BRL',
      totalBalanceMinor: '13750',
      incomeMinor: '5000',
      expenseMinor: '1250',
      netMinor: '3750',
    });
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: url('categories/' + foreignCategory.id),
          headers: headersA,
          payload: { isActive: false },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: url('categories/' + expenseCategory.id),
          headers: headersA,
          payload: { isActive: false },
        })
      ).json().isActive,
    ).toBe(false);
    expect(
      (await app.inject({ url: url('transactions/' + id), headers: headersA })).json().categoryId,
    ).toBe(expenseCategory.id);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: url('transactions/' + id),
          headers: headersB,
          payload: { isCancelled: true },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: url('transactions/' + id),
          headers: headersA,
          payload: { isCancelled: true },
        })
      ).json().isCancelled,
    ).toBe(true);
    expect(
      (await app.inject({ url: url('accounts/' + a.id), headers: headersA })).json().balanceMinor,
    ).toBe('13000');
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: url('accounts/' + b.id),
          headers: headersA,
          payload: { isActive: false },
        })
      ).json().balanceMinor,
    ).toBe('2000');
  });
  it('cancels both transfer effects and replays an existing key even with inactive accounts', async () => {
    const list = (await app.inject({ url: url('transactions?type=TRANSFER'), headers: headersA })).json();
    const row = list.items[0];
    expect((await app.inject({ method: 'PATCH', url: url('transfers/' + row.id), headers: headersB, payload: { isCancelled: true } })).statusCode).toBe(404);
    const receipt = await app.inject({ method: 'PATCH', url: url('transfers/' + row.id), headers: headersA, payload: { isCancelled: true } });
    expect(receipt.statusCode).toBe(200);
    expect((await app.inject({ url: url('accounts/' + a.id), headers: headersA })).json().balanceMinor).toBe('15000');
    expect((await app.inject({ url: url('accounts/' + b.id), headers: headersA })).json().balanceMinor).toBe('0');
    const replay = await post<Transfer>('transfers', { sourceAccountId: a.id, destinationAccountId: b.id, amountMinor: row.amountMinor, currency: row.currency, description: row.description, occurredAt: row.occurredAt, idempotencyKey: receipt.json().idempotencyKey });
    expect(replay.id).toBe(row.id); expect(replay.isCancelled).toBe(true);
    expect((await app.inject({ method: 'PATCH', url: url('transfers/' + row.id), headers: headersA, payload: { description: 'Changed' } })).statusCode).toBe(400);
  });
  it('retains exact aggregates above BIGINT and uses an exclusive period end', async () => {
    const owner = randomUUID(); const headers = { authorization: `Bearer ${await fixture.token({ sub: owner })}` };
    const account = await post<Account>('accounts', accountInput('Large', 'BRL', '9223372036854775807'), headers);
    const input = { accountId: account.id, type: 'INCOME', amountMinor: '9223372036854775807', currency: 'BRL', description: '', occurredAt: '2026-01-31T23:59:00Z' };
    await post('transactions', input, headers);
    await post('transactions', { ...input, amountMinor: '1', occurredAt: '2026-02-01T00:00:00Z' }, headers);
    expect((await app.inject({ url: url('accounts/' + account.id), headers })).json().balanceMinor).toBe('18446744073709551615');
    const summary = await app.inject({ url: url('summary?from=2026-01-01T00:00:00Z&to=2026-02-01T00:00:00Z'), headers });
    expect(summary.statusCode).toBe(200); expect(summary.json().currencies[0]).toMatchObject({ totalBalanceMinor: '18446744073709551614', incomeMinor: '9223372036854775807' });
  });
  it('enforces DB ownership/currency/check constraints, even through direct writes', async () => {
    await expect(
      database.pool.query(
        "insert into app.financial_transactions(auth_user_id, account_id, type, amount_minor, currency, description, occurred_at) values($1,$2,'EXPENSE',1,'BRL','',now())",
        [ownerB, a.id],
      ),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      database.pool.query(
        "insert into app.financial_transactions(auth_user_id, account_id, type, amount_minor, currency, description, occurred_at) values($1,$2,'EXPENSE',0,'BRL','',now())",
        [ownerA, a.id],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
  it('RLS isolates all four tables for A/B and denies anonymous writes/deletion', async () => {
    const client = await database.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE authenticated');
      await client.query("select set_config('request.jwt.claim.sub',$1,true)", [ownerB]);
      for (const table of [
        'financial_accounts',
        'financial_categories',
        'financial_transactions',
        'financial_transfers',
      ]) {
        expect(
          (await client.query(`select id from app.${table} where auth_user_id=$1`, [ownerA]))
            .rowCount,
        ).toBe(0);
        expect(
          (
            await client.query(`update app.${table} set updated_at=now() where auth_user_id=$1`, [
              ownerA,
            ])
          ).rowCount,
        ).toBe(0);
        expect(
          (await client.query(`delete from app.${table} where auth_user_id=$1`, [ownerA])).rowCount,
        ).toBe(0);
      }
      await client.query('SAVEPOINT forbidden');
      await expect(
        client.query(
          "insert into app.financial_accounts(auth_user_id,name,type,currency,initial_balance_minor) values($1,'x','cash','BRL',0)",
          [ownerA],
        ),
      ).rejects.toMatchObject({ code: '42501' });
      await client.query('ROLLBACK TO SAVEPOINT forbidden');
      await expect(
        client.query('update app.financial_accounts set auth_user_id=$1 where id=$2', [
          ownerA,
          foreign.id,
        ]),
      ).rejects.toMatchObject({ code: '42501' });
      await client.query('ROLLBACK');
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE anon');
      await client.query("select set_config('request.jwt.claim.sub','',true)");
      for (const table of [
        'financial_accounts',
        'financial_categories',
        'financial_transactions',
        'financial_transfers',
      ])
        expect((await client.query(`select id from app.${table}`)).rowCount).toBe(0);
      await expect(
        client.query(
          "insert into app.financial_accounts(auth_user_id,name,type,currency,initial_balance_minor) values($1,'x','cash','BRL',0)",
          [ownerA],
        ),
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
