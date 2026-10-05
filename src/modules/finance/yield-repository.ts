import { and,eq,inArray,gte,lte,sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { yieldProfiles as profiles,yieldRules as rules,marketRates } from '../../db/schema/yield.js';
import { financialAccounts as accounts } from '../../db/schema/finance.js';
import type { YieldProfile,YieldRule } from './yield-contracts.js';
import { D,type DailyBalance,validateYieldRule } from './yield-domain.js';
import { addCivilDays,recurrenceToday } from './recurrence-domain.js';
import type { MarketRateCache } from './yield-market.js';
import { marketSeries } from './yield-market.js';
import { AppError } from '../../shared/errors/index.js';
const ruleView=(r:typeof rules.$inferSelect):YieldRule=>({id:r.id,profileId:r.profileId,ruleType:r.ruleType,effectiveFrom:r.effectiveFrom,effectiveTo:r.effectiveTo,benchmark:r.benchmark,fixedRate:r.fixedRate===null?null:new D(r.fixedRate).toFixed(),benchmarkPercentage:r.benchmarkPercentage===null?null:new D(r.benchmarkPercentage).toFixed(),ratePeriod:r.ratePeriod,dayCountConvention:r.dayCountConvention,eligibilityDelayDays:r.eligibilityDelayDays,eligibleBalanceCapMinor:r.eligibleBalanceCapMinor===null?null:String(r.eligibleBalanceCapMinor),taxTreatment:r.taxTreatment,taxReferenceDate:r.taxReferenceDate,createdAt:r.createdAt.toISOString()});
const view=(p:typeof profiles.$inferSelect,versions:YieldRule[]):YieldProfile=>({id:p.id,accountId:p.accountId,currency:p.currency,status:p.status,createdAt:p.createdAt.toISOString(),updatedAt:p.updatedAt.toISOString(),rules:versions});
export function createYieldRepository({db,pool}:Database){
  async function get(owner:string,accountId:string):Promise<YieldProfile|null>{
    const [p]=await db.select().from(profiles).where(and(eq(profiles.authUserId,owner),eq(profiles.accountId,accountId)));if(!p)return null;
    const versions=await db.select().from(rules).where(and(eq(rules.authUserId,owner),eq(rules.profileId,p.id))).orderBy(rules.effectiveFrom).limit(501);
    if(versions.length>500)throw new AppError('CONFLICT');return view(p,versions.map(ruleView));
  }
  return {get,
    async list(owner:string){
      const rows=await db.select().from(profiles).where(eq(profiles.authUserId,owner)).orderBy(profiles.createdAt,profiles.id).limit(501);if(rows.length>500)throw new AppError('CONFLICT');if(!rows.length)return [];
      const versions=await db.select().from(rules).where(and(eq(rules.authUserId,owner),inArray(rules.profileId,rows.map(p=>p.id)))).orderBy(rules.effectiveFrom).limit(10001);if(versions.length>10000)throw new AppError('CONFLICT');
      return rows.map(p=>view(p,versions.filter(r=>r.profileId===p.id).map(ruleView)));
    },
    async save(owner:string,accountId:string,input:Parameters<typeof validateYieldRule>[0],creating:boolean,today:string){
      await db.transaction(async tx=>{
        const [account]=await tx.select().from(accounts).where(and(eq(accounts.id,accountId),eq(accounts.authUserId,owner))).for('update');if(!account)throw new AppError('NOT_FOUND');if(!account.isActive)throw new AppError('CONFLICT');
        const rule=validateYieldRule(input,account.currency);
        let [p]=await tx.select().from(profiles).where(and(eq(profiles.accountId,accountId),eq(profiles.authUserId,owner))).for('update');
        if(creating){if(p)throw new AppError('CONFLICT');[p]=await tx.insert(profiles).values({authUserId:owner,accountId,currency:account.currency}).returning();}
        if(!p)throw new AppError('NOT_FOUND');if(p.status!=='ACTIVE')throw new AppError('CONFLICT');
        const versions=await tx.select().from(rules).where(and(eq(rules.authUserId,owner),eq(rules.profileId,p.id))).orderBy(rules.effectiveFrom).limit(501);
        const previous=versions.at(-1);if(versions.length>=500)throw new AppError('CONFLICT');
        if(previous&&(rule.effectiveFrom<today||rule.effectiveFrom<=previous.effectiveFrom))throw new AppError('VALIDATION_ERROR');
        if(previous)await tx.update(rules).set({effectiveTo:rule.effectiveFrom}).where(and(eq(rules.id,previous.id),eq(rules.authUserId,owner)));
        await tx.insert(rules).values({...rule,authUserId:owner,profileId:p.id,eligibleBalanceCapMinor:rule.eligibleBalanceCapMinor===null?null:BigInt(rule.eligibleBalanceCapMinor)});
        await tx.update(profiles).set({updatedAt:new Date()}).where(and(eq(profiles.id,p.id),eq(profiles.authUserId,owner)));
      });return (await get(owner,accountId))!;
    },
    async archive(owner:string,accountId:string){
      const [p]=await db.update(profiles).set({status:'ARCHIVED',updatedAt:new Date()}).where(and(eq(profiles.accountId,accountId),eq(profiles.authUserId,owner))).returning();if(!p)throw new AppError('NOT_FOUND');return (await get(owner,accountId))!;
    },
    async balances(owner:string,accountId:string,from:string,to:string,zone:string,now:Date):Promise<DailyBalance[]>{
      const movementSql=`with m as (
        select id,occurred_at,case when type='INCOME' then amount_minor::numeric else -amount_minor::numeric end delta from app.financial_transactions where auth_user_id=$1::uuid and account_id=$2::uuid and not is_cancelled
        union all select id,occurred_at,case when source_account_id=$2::uuid then -amount_minor::numeric else amount_minor::numeric end from app.financial_transfers where auth_user_id=$1::uuid and (source_account_id=$2::uuid or destination_account_id=$2::uuid) and not is_cancelled
      )`;
      const params=[owner,accountId,from,to,zone,now.toISOString()];
      const base=await pool.query<{balance:string;createdAt:Date}>(movementSql+` select (a.initial_balance_minor::numeric+coalesce((select sum(delta) from m where occurred_at<($3::date::timestamp at time zone $4) and occurred_at<$5::timestamptz),0))::text balance,a.created_at as "createdAt" from app.financial_accounts a where a.id=$2::uuid and a.auth_user_id=$1::uuid`,[owner,accountId,from,zone,now.toISOString()]);
      if(!base.rows[0])throw new AppError('NOT_FOUND');
      const movements=await pool.query<{date:string;delta:string}>(movementSql+` select (occurred_at at time zone $5)::date::text date,delta::text from m where occurred_at>=($3::date::timestamp at time zone $5) and occurred_at<($4::date::timestamp at time zone $5) and occurred_at<$6::timestamptz order by occurred_at,id limit 10001`,params);
      if(movements.rows.length>10000)throw new AppError('CONFLICT');
      const created=recurrenceToday(zone,base.rows[0].createdAt),rows:DailyBalance[]=[];let balance=BigInt(base.rows[0].balance),index=0;
      for(let date=from;date<to;date=addCivilDays(date,1)!){let opening=balance,minimum=balance;while(index<movements.rows.length&&movements.rows[index]!.date===date){balance+=BigInt(movements.rows[index++]!.delta);if(balance<minimum)minimum=balance;}if(date<created){opening=0n;minimum=0n;}rows.push({date,openingMinor:String(opening),minimumMinor:String(minimum),closingMinor:date<created?'0':String(balance)});}
      return rows;
    },
  };
}
export type YieldRepository=ReturnType<typeof createYieldRepository>;
export function createMarketRateCache({db}:Database):MarketRateCache{return {
  async read(series,from,to){const rows=await db.select().from(marketRates).where(and(eq(marketRates.seriesCode,series),gte(marketRates.rateDate,from),lte(marketRates.rateDate,to))).orderBy(marketRates.rateDate).limit(3661);return rows.map(r=>({date:r.rateDate,value:new D(r.rateValue).toFixed(),fetchedAt:r.fetchedAt.toISOString()}));},
  async write(series,observations,fetchedAt){if(!observations.length)return;await db.insert(marketRates).values(observations.map(o=>({benchmark:marketSeries[series].benchmark,seriesCode:series,rateDate:o.date,rateValue:o.value,rateUnit:marketSeries[series].unit,source:'BCB',fetchedAt:new Date(fetchedAt)}))).onConflictDoUpdate({target:[marketRates.benchmark,marketRates.seriesCode,marketRates.rateDate],set:{rateValue:sql`excluded.rate_value`,fetchedAt:new Date(fetchedAt)}});},
};}
