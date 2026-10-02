import type { FinanceRepository } from './repository.js';
import type {
  AccountInput,
  AccountPatch,
  CategoryInput,
  CategoryPatch,
  TransactionInput,
  TransactionPatch,
  TransactionQuery,
  TransferInput,
} from './contracts.js';
import { dateRange, money, name } from './domain.js';
import { AppError } from '../../shared/errors/index.js';
import type { TransferPatch } from './contracts.js';
const found = <T>(row: T | null): T => {
  if (!row) throw new AppError('NOT_FOUND');
  return row;
};
export function financeService(repository: FinanceRepository) {
  return {
    accounts: (owner: string) => repository.listAccounts(owner),
    account: async (owner: string, id: string) => found(await repository.getAccount(owner, id)),
    createAccount(owner: string, input: AccountInput) {
      money(input.initialBalanceMinor, input.currency, false);
      return repository.createAccount(owner, { ...input, name: name(input.name) });
    },
    patchAccount: async (owner: string, id: string, input: AccountPatch) =>
      found(
        await repository.patchAccount(owner, id, {
          ...input,
          ...(input.name !== undefined ? { name: name(input.name) } : {}),
        }),
      ),
    categories: (owner: string) => repository.listCategories(owner),
    createCategory: (owner: string, input: CategoryInput) =>
      repository.createCategory(owner, { ...input, name: name(input.name) }),
    patchCategory: async (owner: string, id: string, input: CategoryPatch) =>
      found(
        await repository.patchCategory(owner, id, {
          ...input,
          ...(input.name !== undefined ? { name: name(input.name) } : {}),
        }),
      ),
    transactions(owner: string, query: TransactionQuery) {
      dateRange(query.from, query.to);
      if (!!query.cursorAt !== !!query.cursorId) throw new AppError('VALIDATION_ERROR');
      return repository.listTransactions(owner, query);
    },
    transaction: async (owner: string, id: string) =>
      found(await repository.getTransaction(owner, id)),
    createTransaction(owner: string, input: TransactionInput) {
      money(input.amountMinor, input.currency);
      dateRange(input.occurredAt);
      return repository.createTransaction(owner, {
        ...input,
        description: input.description.trim(),
      });
    },
    patchTransaction: async (owner: string, id: string, input: TransactionPatch) =>
      found(await repository.patchTransaction(owner, id, input)),
    createTransfer(owner: string, input: TransferInput) {
      money(input.amountMinor, input.currency);
      dateRange(input.occurredAt);
      if (input.sourceAccountId === input.destinationAccountId)
        throw new AppError('VALIDATION_ERROR');
      return repository.createTransfer(owner, { ...input, description: input.description.trim() });
    },
    patchTransfer: async (owner: string, id: string, input: TransferPatch) =>
      found(await repository.patchTransfer(owner, id, input)),
    summary(owner: string, from: string, to: string) {
      dateRange(from, to);
      return repository.summary(owner, from, to);
    },
  };
}
