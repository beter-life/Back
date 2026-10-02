import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { financialGoals as goals, financialGoalEvents as events } from '../../db/schema/goals.js';
import { AppError } from '../../shared/errors/index.js';
import type { GoalRecord } from './goal-domain.js';
import type { GoalInput, GoalPatch, GoalQuery, GoalEvent, GoalEventInput, GoalEventsQuery, GoalEventsPage } from './goal-contracts.js';
export interface GoalRepository {
  list(owner: string, query: GoalQuery): Promise<GoalRecord[]>;
  get(owner: string, id: string): Promise<GoalRecord | null>;
  create(owner: string, input: GoalInput): Promise<GoalRecord>;
  patch(owner: string, id: string, input: GoalPatch): Promise<GoalRecord>;
  events(owner: string, id: string, query: GoalEventsQuery): Promise<GoalEventsPage>;
  addEvent(owner: string, id: string, input: GoalEventInput): Promise<GoalEvent>;
}
const sum = (owner: string, id: string | ReturnType<typeof sql>) => sql<string>`coalesce((select sum(case when type='CONTRIBUTION' then amount_minor else -amount_minor end) from app.financial_goal_events where goal_id=${id}::uuid and auth_user_id=${owner}::uuid),0)::text`;
function record(row: typeof goals.$inferSelect, current: string): GoalRecord {
  return { id: row.id, name: row.name, description: row.description, currency: row.currency, targetAmountMinor: String(row.targetAmountMinor), plannedMonthlyMinor: row.plannedMonthlyMinor === null ? null : String(row.plannedMonthlyMinor), targetMonth: row.targetMonth, priority: row.priority, status: row.status, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), archivedAt: row.archivedAt?.toISOString() ?? null, currentAmountMinor: current };
}
function event(row: typeof events.$inferSelect, currency: GoalRecord['currency']): GoalEvent {
  return { id: row.id, goalId: row.goalId, type: row.type, amountMinor: String(row.amountMinor), currency, occurredAt: row.occurredAt.toISOString(), note: row.note, idempotencyKey: row.idempotencyKey, createdAt: row.createdAt.toISOString() };
}
export function createGoalRepository({ db }: Database): GoalRepository {
  async function list(owner: string, query: GoalQuery, id?: string) {
    const rows = await db.select({ row: goals, current: sum(owner, sql`${goals.id}`) }).from(goals)
      .where(and(eq(goals.authUserId, owner), id ? eq(goals.id, id) : undefined, query.status ? eq(goals.status, query.status) : undefined, query.currency ? eq(goals.currency, query.currency) : undefined))
      .orderBy(sql`case ${goals.priority} when 'HIGH' then 0 when 'MEDIUM' then 1 else 2 end`, goals.createdAt, goals.id);
    return rows.map(({ row, current }) => record(row, current));
  }
  const get = async (owner: string, id: string) => (await list(owner, {}, id))[0] ?? null;
  const requireGoal = async (owner: string, id: string) => { const row = await get(owner, id); if (!row) throw new AppError('NOT_FOUND'); return row; };
  return {
    list, get,
    async create(owner, input) {
      const [row] = await db.insert(goals).values({ authUserId: owner, ...input, targetAmountMinor: BigInt(input.targetAmountMinor), plannedMonthlyMinor: input.plannedMonthlyMinor == null ? null : BigInt(input.plannedMonthlyMinor) }).returning();
      return record(row!, '0');
    },
    async patch(owner, id, input) {
      return db.transaction(async tx => {
        const [existing] = await tx.select().from(goals).where(and(eq(goals.authUserId, owner), eq(goals.id, id))).for('update');
        if (!existing) throw new AppError('NOT_FOUND');
        if (existing.status === 'ARCHIVED') throw new AppError('CONFLICT');
        const { targetAmountMinor, plannedMonthlyMinor, ...fields } = input;
        const [row] = await tx.update(goals).set({ ...fields, ...(targetAmountMinor !== undefined ? { targetAmountMinor: BigInt(targetAmountMinor) } : {}), ...(plannedMonthlyMinor !== undefined ? { plannedMonthlyMinor: plannedMonthlyMinor === null ? null : BigInt(plannedMonthlyMinor) } : {}), ...(input.status === 'ARCHIVED' ? { archivedAt: new Date() } : {}), updatedAt: new Date() }).where(eq(goals.id, id)).returning();
        const [balance] = await tx.select({ current: sum(owner, id) }).from(goals).where(eq(goals.id, id));
        return record(row!, balance!.current);
      });
    },
    async events(owner, id, query) {
      const goal = await requireGoal(owner, id);
      const limit = Number(query.limit ?? '50');
      const rows = await db.select().from(events).where(and(eq(events.authUserId, owner), eq(events.goalId, id), query.cursorAt && query.cursorId ? sql`(${events.occurredAt},${events.id}) < (${new Date(query.cursorAt)},${query.cursorId}::uuid)` : undefined)).orderBy(sql`${events.occurredAt} desc`, sql`${events.id} desc`).limit(limit + 1);
      const items = rows.slice(0, limit).map(row => event(row, goal.currency));
      const last = items.at(-1);
      return { items, nextCursor: rows.length > limit && last ? { occurredAt: last.occurredAt, id: last.id } : null };
    },
    async addEvent(owner, id, input) {
      return db.transaction(async tx => {
        // Serialize the same owner/key even across goals; then lock the goal for balance/status invariants.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${owner + ':' + input.idempotencyKey},0))`);
        const [goal] = await tx.select().from(goals).where(and(eq(goals.authUserId, owner), eq(goals.id, id))).for('update');
        if (!goal) throw new AppError('NOT_FOUND');
        const [previous] = await tx.select().from(events).where(and(eq(events.authUserId, owner), eq(events.idempotencyKey, input.idempotencyKey)));
        if (previous) {
          if (previous.goalId !== goal.id || previous.type !== input.type || previous.amountMinor !== BigInt(input.amountMinor) || previous.occurredAt.toISOString() !== input.occurredAt || previous.note !== (input.note ?? null)) throw new AppError('CONFLICT');
          return event(previous, goal.currency);
        }
        if (goal.status !== 'ACTIVE') throw new AppError('CONFLICT');
        const [balance] = await tx.select({ current: sum(owner, id) }).from(goals).where(eq(goals.id, id));
        if (input.type === 'WITHDRAWAL' && BigInt(input.amountMinor) > BigInt(balance!.current)) throw new AppError('CONFLICT');
        const [row] = await tx.insert(events).values({ authUserId: owner, goalId: id, ...input, amountMinor: BigInt(input.amountMinor), occurredAt: new Date(input.occurredAt) }).returning();
        return event(row!, goal.currency);
      });
    },
  };
}
