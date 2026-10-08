import { createHash, randomUUID } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { financialDebts as debts, financialDebtTerms as terms, financialDebtPayments as payments } from '../../db/schema/debts.js';
import { financialAccounts as accounts, financialCategories as categories, financialTransactions as transactions, financialTransfers as transfers } from '../../db/schema/finance.js';
import { netWorthItems } from '../../db/schema/net-worth.js';
import { AppError } from '../../shared/errors/index.js';
import { money } from './domain.js';
import { recurrenceToday } from './recurrence-domain.js';
import { nextDue, validateDebt, validateTerm } from './debt-domain.js';
import type * as C from './debt-contracts.js';
const debtView = (r: typeof debts.$inferSelect): C.Debt => ({ id:r.id,accountId:r.accountId,currency:r.currency,name:r.name,lender:r.lender,debtType:r.debtType,trackingStartDate:r.trackingStartDate,status:r.status,createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString(),paidOffAt:r.paidOffAt?.toISOString()??null,archivedAt:r.archivedAt?.toISOString()??null });
export const termView = (r: typeof terms.$inferSelect): C.Term => ({ id:r.id,debtId:r.debtId,effectiveFrom:r.effectiveFrom,effectiveTo:r.effectiveTo,rate:r.rate.replace(/\.?0+$/, '') || '0',ratePeriod:r.ratePeriod,minimumPaymentMinor:String(r.minimumPaymentMinor),dueDay:r.dueDay,createdAt:r.createdAt.toISOString() });
const own = (owner:string,id:string) => and(eq(debts.authUserId,owner),eq(debts.id,id));
export function createDebtRepository({db}:Database) {
  type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
  async function get(owner:string,id:string,tx:Tx|typeof db=db) {const [r]=await tx.select().from(debts).where(own(owner,id));if(!r)throw new AppError('NOT_FOUND');return r;}
  async function balance(tx:Tx|typeof db,owner:string,accountId:string,now:Date) {
    const result=await tx.execute(sql`select (a.initial_balance_minor::numeric
      +coalesce((select sum(case when type='INCOME' then amount_minor::numeric else -amount_minor::numeric end) from app.financial_transactions where auth_user_id=${owner}::uuid and account_id=a.id and not is_cancelled and occurred_at<=${now}),0)
      +coalesce((select sum(case when destination_account_id=a.id then amount_minor::numeric else -amount_minor::numeric end) from app.financial_transfers where auth_user_id=${owner}::uuid and (source_account_id=a.id or destination_account_id=a.id) and not is_cancelled and occurred_at<=${now}),0))::text as balance from app.financial_accounts a where a.auth_user_id=${owner}::uuid and a.id=${accountId}::uuid`);
    if(!result.rows[0])throw new AppError('NOT_FOUND');return BigInt(String(result.rows[0].balance));
  }
  async function lock(tx:Tx,owner:string,id:string,source?:string) {
    const candidate=await get(owner,id,tx),ids=source?[candidate.accountId,source]:[candidate.accountId];
    if(source===candidate.accountId)throw new AppError('VALIDATION_ERROR');
    const rows=await tx.select().from(accounts).where(and(eq(accounts.authUserId,owner),inArray(accounts.id,ids))).orderBy(accounts.id).for('update');
    if(rows.length!==ids.length)throw new AppError('NOT_FOUND');
    const [r]=await tx.select().from(debts).where(own(owner,id)).for('update');if(!r)throw new AppError('NOT_FOUND');return {debt:r,accounts:rows};
  }
  async function versions(owner:string,id:string,tx:Tx|typeof db=db) {const rows=await tx.select().from(terms).where(and(eq(terms.authUserId,owner),eq(terms.debtId,id))).orderBy(terms.effectiveFrom).limit(501);if(rows.length>500)throw new AppError('CONFLICT');return rows.map(termView);}
  async function paymentView(tx:Tx|typeof db,r:typeof payments.$inferSelect):Promise<C.Payment> {
    const ids=[r.interestTransactionId,r.feeTransactionId].filter((id):id is string=>!!id),cats=ids.length?await tx.select({id:transactions.id,categoryId:transactions.categoryId}).from(transactions).where(and(eq(transactions.authUserId,r.authUserId),inArray(transactions.id,ids))):[];
    return {id:r.id,debtId:r.debtId,sourceAccountId:r.sourceAccountId,currency:r.currency,principalAmountMinor:String(r.principalAmountMinor),interestAmountMinor:String(r.interestAmountMinor),feeAmountMinor:String(r.feeAmountMinor),totalAmountMinor:String(r.principalAmountMinor+r.interestAmountMinor+r.feeAmountMinor),remainingPrincipalMinor:String(r.remainingPrincipalMinor),transferId:r.transferId,interestTransactionId:r.interestTransactionId,feeTransactionId:r.feeTransactionId,interestCategoryId:cats.find(c=>c.id===r.interestTransactionId)?.categoryId??null,feeCategoryId:cats.find(c=>c.id===r.feeTransactionId)?.categoryId??null,paidAt:r.paidAt.toISOString(),idempotencyKey:r.idempotencyKey,status:r.status,createdAt:r.createdAt.toISOString(),cancelledAt:r.cancelledAt?.toISOString()??null};
  }
  return {
    async summary(owner:string,today:string,now:Date):Promise<C.Summary> {
      const result=await db.execute(sql`with movement as (
        select account_id,sum(case when type='INCOME' then amount_minor::numeric else -amount_minor::numeric end) as delta from app.financial_transactions where auth_user_id=${owner}::uuid and not is_cancelled and occurred_at<=${now} group by account_id
        union all select source_account_id,-sum(amount_minor::numeric) from app.financial_transfers where auth_user_id=${owner}::uuid and not is_cancelled and occurred_at<=${now} group by source_account_id
        union all select destination_account_id,sum(amount_minor::numeric) from app.financial_transfers where auth_user_id=${owner}::uuid and not is_cancelled and occurred_at<=${now} group by destination_account_id
      ), balances as (select account_id,sum(delta) as delta from movement group by account_id), positions as (
        select d.id,d.currency,a.initial_balance_minor::numeric+coalesce(b.delta,0) as balance from app.financial_debts d join app.financial_accounts a on a.id=d.account_id and a.auth_user_id=d.auth_user_id left join balances b on b.account_id=a.id where d.auth_user_id=${owner}::uuid and d.status='ACTIVE'
      ), dues as (
        select t.debt_id,t.effective_from,t.effective_to,(m.month+(least(t.due_day,extract(day from m.month+interval '1 month - 1 day')::int)-1)*interval '1 day')::date as due from app.financial_debt_terms t join positions p on p.id=t.debt_id cross join generate_series(date_trunc('month',${today}::date::timestamp),date_trunc('month',${today}::date::timestamp)+interval '2 months',interval '1 month') m(month) where t.auth_user_id=${owner}::uuid
      ), next_due as (select debt_id,min(due) as due from dues where due>=${today}::date and effective_from<=due and (effective_to is null or due<effective_to) group by debt_id)
      select p.currency,count(*)::int as count,sum(-p.balance)::text as principal,sum(t.minimum_payment_minor)::text as minimum,min(n.due)::text as due,count(*) filter(where p.balance>0)::int as invalid from positions p join app.financial_debt_terms t on t.debt_id=p.id and t.auth_user_id=${owner}::uuid and t.effective_from<=${today}::date and (t.effective_to is null or ${today}::date<t.effective_to) left join next_due n on n.debt_id=p.id group by p.currency order by p.currency`);
      if(result.rows.some(r=>Number(r.invalid)>0))throw new AppError('CONFLICT');
      return {asOf:today,currencies:result.rows.map(r=>({currency:String(r.currency) as C.Debt['currency'],activeDebts:Number(r.count),principalOutstandingMinor:String(r.principal),minimumMonthlyCommitmentMinor:String(r.minimum),nextDueDate:r.due===null?null:String(r.due)}))};
    },
    async list(owner:string) {const rows=await db.select().from(debts).where(eq(debts.authUserId,owner)).orderBy(debts.createdAt,debts.id).limit(501);if(rows.length>500)throw new AppError('CONFLICT');return rows.map(debtView);},
    async read(owner:string,id:string,today:string,zone:string,now:Date):Promise<C.DebtView> {
      return db.transaction(async tx=>{const r=await get(owner,id,tx),v=await versions(owner,id,tx),principal=-(await balance(tx,owner,r.accountId,now));if(principal<0n)throw new AppError('CONFLICT');
        const totals=await tx.execute(sql`select coalesce(sum(principal_amount_minor),0)::text as principal,coalesce(sum(interest_amount_minor),0)::text as interest,coalesce(sum(fee_amount_minor),0)::text as fee from app.financial_debt_payments where auth_user_id=${owner}::uuid and debt_id=${id}::uuid and status='ACTIVE'`),t=totals.rows[0]!;
        return {debt:debtView(r),terms:v,asOf:today,timeZone:zone,outstandingPrincipalMinor:String(principal),nextDueDate:r.status==='ACTIVE'?nextDue(v,today):null,principalPaidMinor:String(t.principal),interestPaidMinor:String(t.interest),feesPaidMinor:String(t.fee)};
      },{isolationLevel:'repeatable read',accessMode:'read only'});
    },
    async create(owner:string,input:C.DebtInput,today:string,now:Date) {
      const v=validateDebt(input,today),principal=money(input.initialPrincipalMinor,input.currency,false).amountMinor;
      const id=await db.transaction(async tx=>{
        if(input.manualNetWorthItemId){
          const [item]=await tx.select().from(netWorthItems).where(and(eq(netWorthItems.authUserId,owner),eq(netWorthItems.id,input.manualNetWorthItemId))).for('update');if(!item)throw new AppError('NOT_FOUND');
          if(item.status!=='ACTIVE'||item.kind!=='LIABILITY'||item.currency!==input.currency)throw new AppError('CONFLICT');
          const latest=await tx.execute(sql`select value_minor::text as value,valuation_date::text as date from app.financial_net_worth_valuations where auth_user_id=${owner}::uuid and item_id=${item.id}::uuid order by valuation_date desc,created_at desc,id desc limit 1`);
          if(!latest.rows[0]||String(latest.rows[0].date)>today||BigInt(String(latest.rows[0].value))!==principal)throw new AppError('CONFLICT');
          await tx.update(netWorthItems).set({status:'ARCHIVED',archivedAt:now,updatedAt:now}).where(and(eq(netWorthItems.authUserId,owner),eq(netWorthItems.id,item.id)));
        }
        const [account]=await tx.insert(accounts).values({authUserId:owner,name:v.name,type:'debt',currency:v.currency,initialBalanceMinor:-principal}).returning();
        const [d]=await tx.insert(debts).values({authUserId:owner,accountId:account!.id,currency:v.currency,name:v.name,lender:v.lender,debtType:v.debtType,trackingStartDate:v.trackingStartDate,status:principal===0n?'PAID_OFF':'ACTIVE',paidOffAt:principal===0n?now:null}).returning();
        await tx.insert(terms).values({authUserId:owner,debtId:d!.id,effectiveFrom:v.trackingStartDate,rate:v.rate,ratePeriod:v.ratePeriod,minimumPaymentMinor:BigInt(v.minimumPaymentMinor),dueDay:v.dueDay});return d!.id;
      });return debtView(await get(owner,id));
    },
    async patch(owner:string,id:string,input:C.DebtPatch) {return db.transaction(async tx=>{const {debt}=await lock(tx,owner,id);if(debt.status==='ARCHIVED')throw new AppError('CONFLICT');if(input.name!==undefined&&!input.name.trim())throw new AppError('VALIDATION_ERROR');const [r]=await tx.update(debts).set({...input,...(input.name!==undefined?{name:input.name.trim()}:{}),...(input.lender!==undefined?{lender:input.lender?.trim()||null}:{}),updatedAt:new Date()}).where(own(owner,id)).returning();return debtView(r!);});},
    async archive(owner:string,id:string,now:Date) {return db.transaction(async tx=>{const {debt}=await lock(tx,owner,id);if(debt.status==='ARCHIVED')return debtView(debt);if(debt.status!=='PAID_OFF'||await balance(tx,owner,debt.accountId,now)!==0n)throw new AppError('CONFLICT');const [r]=await tx.update(debts).set({status:'ARCHIVED',archivedAt:now,updatedAt:now}).where(own(owner,id)).returning();return debtView(r!);});},
    async addTerm(owner:string,id:string,input:C.TermInput,today:string) {return db.transaction(async tx=>{const {debt}=await lock(tx,owner,id);if(debt.status!=='ACTIVE')throw new AppError('CONFLICT');const v=validateTerm(input,debt.currency),previous=(await versions(owner,id,tx)).at(-1);if(!previous||input.effectiveFrom<=today||input.effectiveFrom<=previous.effectiveFrom)throw new AppError('VALIDATION_ERROR');if((await versions(owner,id,tx)).length>=500)throw new AppError('CONFLICT');await tx.update(terms).set({effectiveTo:input.effectiveFrom}).where(and(eq(terms.authUserId,owner),eq(terms.id,previous.id)));const [r]=await tx.insert(terms).values({...v,minimumPaymentMinor:BigInt(v.minimumPaymentMinor),authUserId:owner,debtId:id}).returning();return termView(r!);});},
    async payment(owner:string,id:string,input:C.PaymentInput,today:string,zone:string,now:Date) {
      const canonical={debtId:id,sourceAccountId:input.sourceAccountId,principalAmountMinor:input.principalAmountMinor,interestAmountMinor:input.interestAmountMinor,feeAmountMinor:input.feeAmountMinor,interestCategoryId:input.interestCategoryId??null,feeCategoryId:input.feeCategoryId??null,paidAt:new Date(input.paidAt).toISOString()},fingerprint=createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
      return db.transaction(async tx=>{
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${owner+':debt-payment:'+input.idempotencyKey},0))`);
        const [previous]=await tx.select().from(payments).where(and(eq(payments.authUserId,owner),eq(payments.idempotencyKey,input.idempotencyKey)));
        if(previous){if(previous.requestFingerprint!==fingerprint)throw new AppError('CONFLICT');return paymentView(tx,previous);}
        const {debt,accounts:locked}=await lock(tx,owner,id,input.sourceAccountId),source=locked.find(a=>a.id===input.sourceAccountId);
        if(debt.status!=='ACTIVE'||!source?.isActive||!locked.every(a=>a.isActive))throw new AppError('CONFLICT');
        if(source.currency!==debt.currency||!['checking','savings','cash','other'].includes(source.type))throw new AppError('VALIDATION_ERROR');
        const principal=money(input.principalAmountMinor,debt.currency,false).amountMinor,interest=money(input.interestAmountMinor,debt.currency,false).amountMinor,fee=money(input.feeAmountMinor,debt.currency,false).amountMinor,total=principal+interest+fee,outstanding=-(await balance(tx,owner,debt.accountId,now));
        money(String(total),debt.currency);if(principal<0n||interest<0n||fee<0n||principal>outstanding||await balance(tx,owner,source.id,now)<total)throw new AppError('CONFLICT');
        const paidAt=new Date(input.paidAt),date=recurrenceToday(zone,paidAt);if(paidAt>now||date>today||date<debt.trackingStartDate)throw new AppError('VALIDATION_ERROR');
        const latestDate=await tx.execute(sql`select max(paid_at) as date from app.financial_debt_payments where auth_user_id=${owner}::uuid and debt_id=${id}::uuid and status='ACTIVE'`);
        if(latestDate.rows[0]?.date && paidAt < new Date(String(latestDate.rows[0].date)))throw new AppError('CONFLICT');
        for(const [amount,categoryId] of [[interest,input.interestCategoryId],[fee,input.feeCategoryId]] as const){if(!categoryId)continue;if(amount===0n)throw new AppError('VALIDATION_ERROR');const [cat]=await tx.select().from(categories).where(and(eq(categories.authUserId,owner),eq(categories.id,categoryId))).for('share');if(!cat)throw new AppError('NOT_FOUND');if(!cat.isActive||cat.kind!=='EXPENSE')throw new AppError('VALIDATION_ERROR');}
        const description=`Debt payment ${id}`;
        let transferId:string|null=null;
        if(principal>0n){const [r]=await tx.insert(transfers).values({authUserId:owner,sourceAccountId:source.id,destinationAccountId:debt.accountId,amountMinor:principal,currency:debt.currency,description,occurredAt:paidAt,idempotencyKey:randomUUID()}).returning();transferId=r!.id;}
        const expense=async(amount:bigint,categoryId:string|undefined,label:string)=>{if(amount===0n)return null;const [r]=await tx.insert(transactions).values({authUserId:owner,accountId:source.id,categoryId:categoryId??null,type:'EXPENSE',amountMinor:amount,currency:debt.currency,description:description+' '+label,occurredAt:paidAt}).returning();return r!.id;};
        const interestTransactionId=await expense(interest,input.interestCategoryId,'interest'),feeTransactionId=await expense(fee,input.feeCategoryId,'fee');
        const [r]=await tx.insert(payments).values({authUserId:owner,debtId:id,sourceAccountId:source.id,currency:debt.currency,principalAmountMinor:principal,interestAmountMinor:interest,feeAmountMinor:fee,remainingPrincipalMinor:outstanding-principal,transferId,interestTransactionId,feeTransactionId,paidAt,idempotencyKey:input.idempotencyKey,requestFingerprint:fingerprint,createdAt:sql`greatest(date_trunc('milliseconds',clock_timestamp()),coalesce((select max(created_at)+interval '1 millisecond' from app.financial_debt_payments where auth_user_id=${owner}::uuid and debt_id=${id}::uuid),'-infinity'::timestamptz))`}).returning();
        if(outstanding===principal)await tx.update(debts).set({status:'PAID_OFF',paidOffAt:paidAt,updatedAt:now}).where(own(owner,id));return paymentView(tx,r!);
      });
    },
    async paymentPage(owner:string,id:string,q:C.PaymentQuery):Promise<C.PaymentPage> {
      await get(owner,id);if(!!q.cursorAt!==!!q.cursorId)throw new AppError('VALIDATION_ERROR');const limit=Number(q.limit??'25');
      const rows=await db.select().from(payments).where(and(eq(payments.authUserId,owner),eq(payments.debtId,id),q.cursorAt?sql`(${payments.createdAt},${payments.id})<(${new Date(q.cursorAt)},${q.cursorId}::uuid)`:undefined)).orderBy(sql`${payments.createdAt} desc`,sql`${payments.id} desc`).limit(limit+1),page=rows.slice(0,limit),last=page.at(-1);
      // Bounded page. Linked expenses are queried in a single batch below.
      const ids=page.flatMap(p=>[p.interestTransactionId,p.feeTransactionId]).filter((id):id is string=>!!id),linked=ids.length?await db.select().from(transactions).where(and(eq(transactions.authUserId,owner),inArray(transactions.id,ids))):[];
      const items=page.map(r=>({id:r.id,debtId:r.debtId,sourceAccountId:r.sourceAccountId,currency:r.currency,principalAmountMinor:String(r.principalAmountMinor),interestAmountMinor:String(r.interestAmountMinor),feeAmountMinor:String(r.feeAmountMinor),totalAmountMinor:String(r.principalAmountMinor+r.interestAmountMinor+r.feeAmountMinor),remainingPrincipalMinor:String(r.remainingPrincipalMinor),transferId:r.transferId,interestTransactionId:r.interestTransactionId,feeTransactionId:r.feeTransactionId,interestCategoryId:linked.find(t=>t.id===r.interestTransactionId)?.categoryId??null,feeCategoryId:linked.find(t=>t.id===r.feeTransactionId)?.categoryId??null,paidAt:r.paidAt.toISOString(),idempotencyKey:r.idempotencyKey,status:r.status,createdAt:r.createdAt.toISOString(),cancelledAt:r.cancelledAt?.toISOString()??null}));
      return {items,nextCursor:rows.length>limit&&last?{createdAt:last.createdAt.toISOString(),id:last.id}:null};
    },
    async cancel(owner:string,id:string,paymentId:string,now:Date) {return db.transaction(async tx=>{
      const [candidate]=await tx.select().from(payments).where(and(eq(payments.authUserId,owner),eq(payments.debtId,id),eq(payments.id,paymentId)));if(!candidate)throw new AppError('NOT_FOUND');
      const {debt}=await lock(tx,owner,id,candidate.sourceAccountId),[p]=await tx.select().from(payments).where(and(eq(payments.authUserId,owner),eq(payments.id,paymentId))).for('update');
      if(p!.status==='CANCELLED')return paymentView(tx,p!);if(debt.status==='ARCHIVED')throw new AppError('CONFLICT');
      const [latest]=await tx.select().from(payments).where(and(eq(payments.authUserId,owner),eq(payments.debtId,id),eq(payments.status,'ACTIVE'))).orderBy(sql`${payments.createdAt} desc`,sql`${payments.id} desc`).limit(1);if(latest?.id!==paymentId)throw new AppError('DEBT_CANCEL_UNSAFE');
      if(p!.transferId)await tx.update(transfers).set({isCancelled:true,updatedAt:now}).where(and(eq(transfers.authUserId,owner),eq(transfers.id,p!.transferId)));
      const ids=[p!.interestTransactionId,p!.feeTransactionId].filter((v):v is string=>!!v);if(ids.length)await tx.update(transactions).set({isCancelled:true,updatedAt:now}).where(and(eq(transactions.authUserId,owner),inArray(transactions.id,ids)));
      const [r]=await tx.update(payments).set({status:'CANCELLED',cancelledAt:now}).where(and(eq(payments.authUserId,owner),eq(payments.id,paymentId))).returning();
      if(debt.status==='PAID_OFF'&&p!.principalAmountMinor>0n)await tx.update(debts).set({status:'ACTIVE',paidOffAt:null,updatedAt:now}).where(own(owner,id));return paymentView(tx,r!);
    });},
  };
}
export type DebtRepository = ReturnType<typeof createDebtRepository>;
