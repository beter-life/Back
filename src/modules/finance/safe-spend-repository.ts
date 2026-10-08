import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { profiles } from '../../db/schema/profiles.js';
import { safeSpendProfiles as settings, safeSpendAccounts as selected } from '../../db/schema/safe-spend.js';
import { financialAccounts, financialTransactions } from '../../db/schema/finance.js';
import { financialDebts, financialDebtTerms } from '../../db/schema/debts.js';
import { AppError } from '../../shared/errors/index.js';
import { money, type Currency } from './domain.js';
import { recurrenceToday } from './recurrence-domain.js';
import { anchorMonth, cardView } from './card-domain.js';
import { readCardSnapshots } from './card-repository.js';
import { createFinanceRepository } from './repository.js';
import { createBudgetRepository } from './budget-repository.js';
import { calculateBudget, timeZone } from './budget-domain.js';
import { createRecurrenceRepository } from './recurrence-repository.js';
import { createGoalRepository } from './goal-repository.js';
import { calculateGoal } from './goal-domain.js';
import { nextDue, termAt } from './debt-domain.js';
import { termView } from './debt-repository.js';
import { calculateSafeSpend, type SafeSpendSnapshot } from './safe-spend-domain.js';
import type * as C from './safe-spend-contracts.js';
type Tx = Parameters<Parameters<Database['db']['transaction']>[0]>[0];
const eligible = new Set(['checking','cash','savings','other']);
async function setting(tx: Tx, owner: string, currency: Currency): Promise<C.SafeSpendSettings|null> {
  const [row]=await tx.select().from(settings).where(and(eq(settings.authUserId,owner),eq(settings.currency,currency)));
  if (!row) return null;
  const accounts=await tx.select().from(selected).where(and(eq(selected.authUserId,owner),eq(selected.profileId,row.id))).orderBy(selected.accountId);
  return {id:row.id,currency:row.currency,accountIds:accounts.map(a=>a.accountId),safetyBufferMinor:String(row.safetyBufferMinor),respectBudget:row.respectBudget,reserveRecurrences:row.reserveRecurrences,reserveGoalPlans:row.reserveGoalPlans,createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString()};
}
export function createSafeSpendRepository(database: Database) {
  async function snapshot(tx: Tx, owner: string, currency: Currency, now: Date): Promise<SafeSpendSnapshot> {
    const config=await setting(tx,owner,currency);
    if (!config?.accountIds.length) throw new AppError('SAFE_SPEND_NOT_CONFIGURED');
    const [p]=await tx.select({zone:profiles.timezone}).from(profiles).where(eq(profiles.authUserId,owner));
    const zone=timeZone(p?.zone??'UTC'),today=recurrenceToday(zone,now),start=today.slice(0,7)+'-01',end=anchorMonth(start,1,1);
    // Drizzle's transaction supports the same query/repository surface. Nested
    // repository transactions use savepoints on THIS connection, not fresh pools.
    // The outer transaction enforces repeatable-read/read-only throughout.
    const scoped: Database={...database,db:tx as unknown as Database['db']};
    const allAccounts=await createFinanceRepository(scoped,()=>now).listAccounts(owner);
    if (allAccounts.length>1500) throw new AppError('SAFE_SPEND_LIMIT');
    const accounts=config.accountIds.map(id=>allAccounts.find(a=>a.id===id));
    if (accounts.some(a=>!a || !a.isActive || a.currency!==currency || !eligible.has(a.type))) throw new AppError('SAFE_SPEND_NOT_CONFIGURED');
    const cardSnapshots=await readCardSnapshots(tx,owner,currency,zone,now,allAccounts);
    const debtRows=await tx.select().from(financialDebts).where(and(eq(financialDebts.authUserId,owner),eq(financialDebts.currency,currency),eq(financialDebts.status,'ACTIVE'))).orderBy(financialDebts.id).limit(501);
    if (debtRows.length>500) throw new AppError('SAFE_SPEND_LIMIT');
    const terms=debtRows.length?await tx.select().from(financialDebtTerms).where(and(eq(financialDebtTerms.authUserId,owner),inArray(financialDebtTerms.debtId,debtRows.map(d=>d.id)))).orderBy(financialDebtTerms.effectiveFrom).limit(250001):[];
    if (terms.length>250000) throw new AppError('SAFE_SPEND_LIMIT');
    const paid=await tx.execute<{id:string;amount:string}>(sql`select debt_id id,sum(principal_amount_minor::numeric+interest_amount_minor+fee_amount_minor)::text amount from app.financial_debt_payments where auth_user_id=${owner}::uuid and currency=${currency} and status='ACTIVE' and paid_at>=${start}::date::timestamp at time zone ${zone} and paid_at<=${now} group by debt_id`);
    const debts: SafeSpendSnapshot['debts']=[];
    for (const d of debtRows) {
      if (BigInt(allAccounts.find(a=>a.id===d.accountId)!.balanceMinor)>=0n) continue;
      const versions=terms.filter(t=>t.debtId===d.id).map(termView),due=nextDue(versions,today);
      if (due<end) debts.push({id:d.id,name:d.name,due,minimum:termAt(versions,due).minimumPaymentMinor,paid:paid.rows.find(r=>r.id===d.id)?.amount??'0'});
    }
    // Include earlier-today expenses only for an overlap warning. They are
    // already reflected in cash, never another hard-commitment subtraction.
    const future=await tx.select({row:financialTransactions,local:sql<string>`(${financialTransactions.occurredAt} at time zone ${zone})::date::text`,linked:sql<boolean>`exists(select 1 from app.financial_card_installments i where i.auth_user_id=${owner}::uuid and i.transaction_id=${financialTransactions.id}) or exists(select 1 from app.financial_debt_payments p where p.auth_user_id=${owner}::uuid and (${financialTransactions.id}=p.interest_transaction_id or ${financialTransactions.id}=p.fee_transaction_id))`}).from(financialTransactions).where(and(eq(financialTransactions.authUserId,owner),eq(financialTransactions.currency,currency),eq(financialTransactions.isCancelled,false),sql`${financialTransactions.occurredAt}>=${today}::date::timestamp at time zone ${zone} and ${financialTransactions.occurredAt}<${end}::date::timestamp at time zone ${zone}`)).orderBy(financialTransactions.occurredAt,financialTransactions.id).limit(10001);
    if (future.length>10000) throw new AppError('SAFE_SPEND_LIMIT');
    const recurrences=await createRecurrenceRepository(scoped).eligible(owner,{currency},today,end);
    if (recurrences.length>500) throw new AppError('RECURRENCE_PROJECTION_LIMIT');
    const goalRecords=await createGoalRepository(scoped).list(owner,{currency,status:'ACTIVE'});
    if (goalRecords.length>500) throw new AppError('SAFE_SPEND_LIMIT');
    const contributions=await tx.execute<{id:string;amount:string}>(sql`select goal_id id,sum(case when type='CONTRIBUTION' then amount_minor::numeric else -amount_minor::numeric end)::text amount from app.financial_goal_events where auth_user_id=${owner}::uuid and occurred_at>=${start}::date::timestamp at time zone ${zone} and occurred_at<=${now} group by goal_id`);
    const budget=calculateBudget(await createBudgetRepository(scoped).snapshot(owner,today.slice(0,7),currency,zone),now);
    return {settings:config,accounts:accounts.filter((a):a is NonNullable<typeof a>=>!!a),cards:cardSnapshots.map(s=>cardView(s,today,zone)),debts,
      goals:goalRecords.filter(g=>BigInt(g.plannedMonthlyMinor??'0')>0n).map(g=>({id:g.id,name:g.name,planned:g.plannedMonthlyMinor!,contributed:contributions.rows.find(r=>r.id===g.id)?.amount??'0',achieved:calculateGoal(g,zone,now).planStatus==='ACHIEVED'})),
      recurrences,knownExpenses:future.filter(t=>t.row.type==='EXPENSE').map(({row,local})=>({amount:String(row.amountMinor),date:local,categoryId:row.categoryId})),future:future.filter(t=>t.row.occurredAt>=now).map(({row,local,linked})=>({id:row.id,type:row.type as 'INCOME'|'EXPENSE',amount:String(row.amountMinor),date:local,description:row.description,categoryId:row.categoryId,accountId:row.accountId,linked})),budget,today,end,zone,now};
  }
  return {
    async settings(owner: string,currency: Currency) {return database.db.transaction(tx=>setting(tx,owner,currency),{isolationLevel:'repeatable read',accessMode:'read only'});},
    async put(owner: string,input: C.SafeSpendSettingsInput) {
      const buffer=money(input.safetyBufferMinor,input.currency,false).amountMinor;
      if (buffer<0n || !input.accountIds.length || input.accountIds.length>100 || new Set(input.accountIds.map(id=>id.toLowerCase())).size!==input.accountIds.length) throw new AppError('VALIDATION_ERROR');
      return database.db.transaction(async tx=>{
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${owner+':safe-spend:'+input.currency},0))`);
        const accounts=await tx.select().from(financialAccounts).where(and(eq(financialAccounts.authUserId,owner),inArray(financialAccounts.id,input.accountIds))).orderBy(financialAccounts.id).for('share');
        if (accounts.length!==input.accountIds.length) throw new AppError('NOT_FOUND');
        if (accounts.some(a=>!a.isActive || a.currency!==input.currency || !eligible.has(a.type))) throw new AppError('VALIDATION_ERROR');
        const [p]=await tx.insert(settings).values({authUserId:owner,currency:input.currency,safetyBufferMinor:buffer,respectBudget:input.respectBudget,reserveRecurrences:input.reserveRecurrences,reserveGoalPlans:input.reserveGoalPlans}).onConflictDoUpdate({target:[settings.authUserId,settings.currency],set:{safetyBufferMinor:buffer,respectBudget:input.respectBudget,reserveRecurrences:input.reserveRecurrences,reserveGoalPlans:input.reserveGoalPlans,updatedAt:new Date()}}).returning();
        await tx.delete(selected).where(and(eq(selected.authUserId,owner),eq(selected.profileId,p!.id)));
        await tx.insert(selected).values(accounts.map(a=>({profileId:p!.id,authUserId:owner,accountId:a.id,currency:a.currency,accountType:a.type})));
        return (await setting(tx,owner,input.currency))!;
      });
    },
    async read(owner: string,currency: Currency,now: Date) {return calculateSafeSpend(await database.db.transaction(tx=>snapshot(tx,owner,currency,now),{isolationLevel:'repeatable read',accessMode:'read only'}));},
    async summary(owner: string,now: Date) {
      const snapshots=await database.db.transaction(async tx=>{
        const rows=await tx.select({currency:settings.currency}).from(settings).where(eq(settings.authUserId,owner)).orderBy(settings.currency);
        const result: SafeSpendSnapshot[]=[];
        for (const row of rows) result.push(await snapshot(tx,owner,row.currency,now));
        return result;
      },{isolationLevel:'repeatable read',accessMode:'read only'});
      return snapshots.map(calculateSafeSpend);
    },
  };
}
export type SafeSpendRepository = ReturnType<typeof createSafeSpendRepository>;
