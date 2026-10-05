import { and, eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { netWorthItems as items, netWorthValuations as valuations } from '../../db/schema/net-worth.js';
import { AppError } from '../../shared/errors/index.js';
import type { Currency } from './domain.js';
import { netWorthTotal, validateNetWorthMetadata, valuationAmount } from './net-worth-domain.js';
import type * as C from './net-worth-contracts.js';

// One bounded SQL statement per summary/history; exact numeric SUM, never float.
// PostgreSQL converts next local midnight to an instant, including DST days.
const positions = `with points as (
 select d as as_of, ((d + 1)::timestamp at time zone $3) as cutoff from unnest($2::date[]) d
), movements as (
 select account_id, occurred_at, case when type='INCOME' then amount_minor::numeric else -amount_minor::numeric end as delta
 from app.financial_transactions where auth_user_id=$1::uuid and not is_cancelled and occurred_at<(select max(cutoff) from points)
 union all select source_account_id, occurred_at, -amount_minor::numeric from app.financial_transfers where auth_user_id=$1::uuid and not is_cancelled and occurred_at<(select max(cutoff) from points)
 union all select destination_account_id, occurred_at, amount_minor::numeric from app.financial_transfers where auth_user_id=$1::uuid and not is_cancelled and occurred_at<(select max(cutoff) from points)
), account_positions as (
 select p.as_of,a.id,a.name,a.currency,a.is_active,a.initial_balance_minor::numeric+coalesce(sum(m.delta),0) as value
 from points p join app.financial_accounts a on a.auth_user_id=$1::uuid and a.created_at<p.cutoff and ($4::text is null or a.currency=$4)
 left join movements m on m.account_id=a.id and m.occurred_at<p.cutoff
 group by p.as_of,a.id
), manual_positions as (
 select p.as_of,i.id,i.name,i.currency,i.kind,i.category,i.status,v.value_minor::numeric as value,v.valuation_date
 from points p join app.financial_net_worth_items i on i.auth_user_id=$1::uuid and (i.archived_at is null or i.archived_at>=p.cutoff) and ($4::text is null or i.currency=$4)
 join lateral (select value_minor,valuation_date from app.financial_net_worth_valuations v where v.item_id=i.id and v.auth_user_id=$1::uuid and v.valuation_date<=p.as_of order by valuation_date desc,created_at desc,id desc limit 1) v on true
), components as (
 select as_of,'ACCOUNT' as source,id,name,currency,case when value<0 then 'LIABILITY' else 'ASSET' end as kind,abs(value) as value,value as signed_value,null::text as category,is_active,null::date as valuation_date from account_positions
 union all select as_of,'MANUAL',id,name,currency,kind,value,case when kind='LIABILITY' then -value else value end,category,status='ACTIVE',valuation_date from manual_positions
)`;
const valuationColumns = `id,item_id as "itemId",value_minor::text as "valueMinor",valuation_date::text as "valuationDate",note,created_at as "createdAt"`;
type ValuationRow = Omit<C.NetWorthValuation,'createdAt'> & {createdAt:Date};
const valuationView=(r:ValuationRow):C.NetWorthValuation=>({...r,createdAt:r.createdAt.toISOString()});
export function createNetWorthRepository({db,pool}:Database) {
  async function get(owner:string,id:string):Promise<C.NetWorthItem|null> {
    const [r]=await db.select().from(items).where(and(eq(items.authUserId,owner),eq(items.id,id)));
    if(!r)return null;
    const latest=await pool.query<ValuationRow>(`select ${valuationColumns} from app.financial_net_worth_valuations where auth_user_id=$1 and item_id=$2 order by valuation_date desc,created_at desc,id desc limit 1`,[owner,id]);
    return {id:r.id,name:r.name,description:r.description,kind:r.kind,category:r.category as C.NetWorthItem['category'],currency:r.currency,status:r.status,createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString(),archivedAt:r.archivedAt?.toISOString()??null,latestValuation:latest.rows[0]?valuationView(latest.rows[0]):null};
  }
  async function lock(tx:Parameters<Parameters<typeof db.transaction>[0]>[0],owner:string,id:string) {
    const [row]=await tx.select().from(items).where(and(eq(items.authUserId,owner),eq(items.id,id))).for('update');
    if(!row)throw new AppError('NOT_FOUND');if(row.status==='ARCHIVED')throw new AppError('CONFLICT');return row;
  }
  return {
    get,
    async create(owner:string,input:C.NetWorthItemInput) {
      const metadata=validateNetWorthMetadata(input.kind,input),amount=valuationAmount(input.initialValueMinor,input.currency,true);
      const id=await db.transaction(async tx=>{
        const [row]=await tx.insert(items).values({authUserId:owner,name:metadata.name,description:metadata.description,category:input.category,kind:input.kind,currency:input.currency}).returning({id:items.id});
        await tx.insert(valuations).values({authUserId:owner,itemId:row!.id,valueMinor:amount,valuationDate:input.valuationDate,note:input.valuationNote?.trim()||null});return row!.id;
      });return (await get(owner,id))!;
    },
    async patch(owner:string,id:string,input:C.NetWorthItemPatch) {
      await db.transaction(async tx=>{const r=await lock(tx,owner,id);const metadata=validateNetWorthMetadata(r.kind,{name:r.name,category:r.category,description:r.description,...input});await tx.update(items).set({...metadata,updatedAt:new Date()}).where(and(eq(items.authUserId,owner),eq(items.id,id)));});return (await get(owner,id))!;
    },
    async archive(owner:string,id:string) {
      await db.transaction(async tx=>{
        const [r]=await tx.select().from(items).where(and(eq(items.authUserId,owner),eq(items.id,id))).for('update');
        if(!r)throw new AppError('NOT_FOUND');
        if(r.status!=='ARCHIVED')await tx.update(items).set({status:'ARCHIVED',archivedAt:new Date(),updatedAt:new Date()}).where(and(eq(items.authUserId,owner),eq(items.id,id)));
      });return (await get(owner,id))!;
    },
    async addValuation(owner:string,id:string,input:C.NetWorthValuationInput) {
      const row=await db.transaction(async tx=>{const item=await lock(tx,owner,id);const [v]=await tx.insert(valuations).values({authUserId:owner,itemId:id,valueMinor:valuationAmount(input.valueMinor,item.currency),valuationDate:input.valuationDate,note:input.note?.trim()||null}).returning();await tx.update(items).set({updatedAt:new Date()}).where(and(eq(items.authUserId,owner),eq(items.id,id)));return v!;});
      return {id:row.id,itemId:row.itemId,valueMinor:String(row.valueMinor),valuationDate:row.valuationDate,note:row.note,createdAt:row.createdAt.toISOString()};
    },
    async list(owner:string,q:C.NetWorthItemQuery) {
      const limit=Number(q.limit??'50');
      // Join latest values in one statement (no per-item get/query).
      const rows=await pool.query<{item:C.NetWorthItem}>(`select jsonb_build_object('id',i.id,'name',i.name,'description',i.description,'kind',i.kind,'category',i.category,'currency',i.currency,'status',i.status,'createdAt',i.created_at,'updatedAt',i.updated_at,'archivedAt',i.archived_at,'latestValuation',v.value) as item from app.financial_net_worth_items i left join lateral (select jsonb_build_object('id',id,'itemId',item_id,'valueMinor',value_minor::text,'valuationDate',valuation_date::text,'note',note,'createdAt',created_at) as value from app.financial_net_worth_valuations where auth_user_id=$1::uuid and item_id=i.id order by valuation_date desc,created_at desc,id desc limit 1) v on true where i.auth_user_id=$1::uuid and ($2::text is null or kind=$2) and ($3::text is null or status=$3) and ($4::text is null or currency=$4) and ($5::text is null or category=$5) and ($6::timestamptz is null or (i.created_at,i.id)<($6::timestamptz,$7::uuid)) order by i.created_at desc,i.id desc limit $8`,[owner,q.kind??null,q.status??null,q.currency??null,q.category??null,q.cursorAt??null,q.cursorId??null,limit+1]);
      const page=rows.rows.slice(0,limit).map(r=>r.item),last=page.at(-1);return {items:page,nextCursor:rows.rows.length>limit&&last?{createdAt:last.createdAt,id:last.id}:null};
    },
    async valuations(owner:string,id:string,q:C.NetWorthValuationQuery) {
      if(!(await get(owner,id)))throw new AppError('NOT_FOUND');const limit=Number(q.limit??'50');
      const rows=await pool.query<ValuationRow>(`select ${valuationColumns} from app.financial_net_worth_valuations where auth_user_id=$1::uuid and item_id=$2::uuid and ($3::date is null or (valuation_date,created_at,id)<($3::date,$4::timestamptz,$5::uuid)) order by valuation_date desc,created_at desc,id desc limit $6`,[owner,id,q.cursorDate??null,q.cursorAt??null,q.cursorId??null,limit+1]);
      const page=rows.rows.slice(0,limit).map(valuationView),last=page.at(-1);return {items:page,nextCursor:rows.rows.length>limit&&last?{valuationDate:last.valuationDate,createdAt:last.createdAt,id:last.id}:null};
    },
    async components(owner:string,asOf:string,zone:string):Promise<C.NetWorthComponent[]> {
      const result=await pool.query<C.NetWorthComponent>(positions+` select source,id,name,currency,kind,value::text as "valueMinor",signed_value::text as "signedValueMinor",category,is_active as "isActive",valuation_date::text as "valuationDate" from components order by currency,source,name,id limit 10001`,[owner,[asOf],zone,null]);
      if(result.rows.length>10000)throw new AppError('CONFLICT');return result.rows;
    },
    async history(owner:string,dates:string[],zone:string,currency:Currency) {
      const result=await pool.query<{asOf:string;aa:string;al:string;ma:string;ml:string}>(positions+` select p.as_of::text as "asOf",coalesce(sum(value) filter(where source='ACCOUNT' and kind='ASSET'),0)::text as aa,coalesce(sum(value) filter(where source='ACCOUNT' and kind='LIABILITY'),0)::text as al,coalesce(sum(value) filter(where source='MANUAL' and kind='ASSET'),0)::text as ma,coalesce(sum(value) filter(where source='MANUAL' and kind='LIABILITY'),0)::text as ml from points p left join components c on c.as_of=p.as_of group by p.as_of order by p.as_of`,[owner,dates,zone,currency]);
      return result.rows.map(r=>({asOf:r.asOf,...netWorthTotal(currency,r.aa,r.al,r.ma,r.ml)}));
    },
  };
}
export type NetWorthRepository = ReturnType<typeof createNetWorthRepository>;
