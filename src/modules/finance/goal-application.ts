import { AppError } from '../../shared/errors/index.js';
import type { ProfileRepository } from '../profile/repository.js';
import type { GoalRepository } from './goal-repository.js';
import type { GoalInput, GoalPatch, GoalQuery, GoalEventInput, GoalEventsQuery } from './goal-contracts.js';
import { calculateGoal, validateGoalInput, validateGoalEvent } from './goal-domain.js';
export function goalService(repository: GoalRepository, profiles: ProfileRepository, clock: () => Date = () => new Date()) {
  const zone = async (owner: string) => (await profiles.findByAuthUser(owner))?.timezone ?? 'UTC';
  const found = async (owner: string, id: string) => { const row = await repository.get(owner, id); if (!row) throw new AppError('NOT_FOUND'); return row; };
  return {
    async list(owner: string, query: GoalQuery) { const timeZone = await zone(owner); const now = clock(); return (await repository.list(owner, query)).map(row => calculateGoal(row, timeZone, now)); },
    async get(owner: string, id: string) { return calculateGoal(await found(owner, id), await zone(owner), clock()); },
    async create(owner: string, input: GoalInput) { return calculateGoal(await repository.create(owner, validateGoalInput(input, input.currency)), await zone(owner), clock()); },
    async patch(owner: string, id: string, input: GoalPatch) { const row = await found(owner, id); return calculateGoal(await repository.patch(owner, id, validateGoalInput(input, row.currency)), await zone(owner), clock()); },
    events(owner: string, id: string, query: GoalEventsQuery) { if (!!query.cursorAt !== !!query.cursorId) throw new AppError('VALIDATION_ERROR'); return repository.events(owner, id, query); },
    async addEvent(owner: string, id: string, input: GoalEventInput) { const row = await found(owner, id); return repository.addEvent(owner, id, validateGoalEvent(input, row.currency)); },
  };
}
