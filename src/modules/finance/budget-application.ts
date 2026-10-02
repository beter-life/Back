import type { ProfileRepository } from '../profile/repository.js';
import type { BudgetRepository } from './budget-repository.js';
import type { BudgetAllocationInput, BudgetPeriodInput, BudgetView } from './budget-contracts.js';
import { budgetMoney, calculateBudget, timeZone, validateMonth } from './budget-domain.js';
import type { Currency } from './domain.js';

export function budgetService(
  repository: BudgetRepository,
  profiles: ProfileRepository,
  clock: () => Date = () => new Date(),
) {
  const zone = async (owner: string) =>
    timeZone((await profiles.findByAuthUser(owner))?.timezone ?? 'UTC');
  return {
    async get(owner: string, month: string, currency: Currency): Promise<BudgetView> {
      validateMonth(month);
      budgetMoney('0', currency);
      const s = await repository.snapshot(owner, month, currency, await zone(owner));
      return {
        month,
        currency,
        timeZone: s.timeZone,
        period: s.period,
        allocations: s.allocations.filter((a) => a.budgetPeriodId === s.period?.id),
        canCopyPrevious: s.canCopyPrevious,
      };
    },
    async create(owner: string, month: string, input: BudgetPeriodInput) {
      validateMonth(month);
      budgetMoney('0', input.currency);
      return repository.ensurePeriod(owner, month, input.currency, await zone(owner));
    },
    async putAllocation(
      owner: string,
      month: string,
      categoryId: string,
      input: BudgetAllocationInput,
    ) {
      validateMonth(month);
      budgetMoney(input.amountMinor, input.currency);
      return repository.putAllocation(owner, month, categoryId, input);
    },
    async remove(owner: string, month: string, categoryId: string, currency: Currency) {
      validateMonth(month);
      budgetMoney('0', currency);
      return repository.removeAllocation(owner, month, categoryId, currency);
    },
    async copy(owner: string, month: string, input: BudgetPeriodInput) {
      validateMonth(month);
      budgetMoney('0', input.currency);
      return repository.copyPrevious(owner, month, input.currency, await zone(owner));
    },
    async summary(owner: string, month: string, currency: Currency) {
      validateMonth(month);
      budgetMoney('0', currency);
      const s = await repository.snapshot(owner, month, currency, await zone(owner));
      return calculateBudget(s, clock());
    },
  };
}
