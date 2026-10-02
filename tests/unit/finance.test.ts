import { describe, expect, it, vi } from 'vitest';
import { currencyDigits, maxMinor, money, dateRange } from '../../src/modules/finance/domain.js';
import { financeService } from '../../src/modules/finance/application.js';
import type { FinanceRepository } from '../../src/modules/finance/repository.js';
import { userA, userB } from '../helpers.js';
const repository = {
  createAccount: vi.fn(),
  createTransaction: vi.fn(),
  createTransfer: vi.fn(),
  getAccount: vi.fn(async () => null),
  listTransactions: vi.fn(),
} as unknown as FinanceRepository;
const service = financeService(repository);
describe('finance domain and application boundary', () => {
  it('keeps bigint exact beyond safe JS numbers and validates storage range', () => {
    expect(money('9007199254740993', 'BRL').amountMinor).toBe(9007199254740993n);
    for (const input of ['0', '-1', '1.2', '01', String(maxMinor + 1n)])
      expect(() => money(input, 'BRL')).toThrow();
    expect(() => money('1', 'ZZZ')).toThrow();
    expect(money('-100', 'JPY', false)).toEqual({ amountMinor: -100n, currency: 'JPY' });
  });
  it('uses explicit zero/two/three-decimal currency exponents', () => {
    expect(currencyDigits.JPY).toBe(0);
    expect(currencyDigits.BRL).toBe(2);
    expect(currencyDigits.KWD).toBe(3);
    for (const [code, digits] of Object.entries(currencyDigits))
      expect(
        new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions()
          .maximumFractionDigits,
      ).toBe(digits);
  });
  it('rejects invalid ranges, incomplete cursors and same-account transfers', () => {
    expect(() => dateRange('invalid')).toThrow();
    expect(() => dateRange('2026-01-02Z', '2026-01-01Z')).toThrow();
    expect(() => service.transactions(userA, { cursorId: userB })).toThrow();
    expect(() =>
      service.createTransfer(userA, {
        sourceAccountId: userB,
        destinationAccountId: userB,
        amountMinor: '1',
        currency: 'BRL',
        description: '',
        occurredAt: new Date().toISOString(),
        idempotencyKey: userA,
      }),
    ).toThrow();
    expect(repository.createTransfer).not.toHaveBeenCalled();
  });
  it('normalizes names and scopes adapters by the supplied trusted owner', async () => {
    service.createAccount(userA, {
      name: '  Conta  ',
      currency: 'BRL',
      type: 'cash',
      initialBalanceMinor: '0',
    });
    expect(repository.createAccount).toHaveBeenCalledWith(userA, {
      name: 'Conta',
      currency: 'BRL',
      type: 'cash',
      initialBalanceMinor: '0',
    });
    expect(() =>
      service.createAccount(userA, {
        name: ' ',
        currency: 'BRL',
        type: 'cash',
        initialBalanceMinor: '0',
      }),
    ).toThrow();
    await expect(service.account(userA, userB)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
