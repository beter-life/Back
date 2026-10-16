import { createHash,randomUUID } from 'node:crypto';
import { and,desc,eq,getTableColumns,inArray,sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { importBatches as batches,importRows as receipts } from '../../db/schema/imports.js';
import { financialAccounts as accounts } from '../../db/schema/finance.js';
import { profiles } from '../../db/schema/profiles.js';
import { AppError } from '../../shared/errors/index.js';
import { inboxFingerprint } from './inbox-domain.js';
import { createPendingInboxProposal,lockInboxOwner } from './inbox-repository.js';
import type { FinanceTransaction } from './repository.js';
import { normalizeImportRow } from './import-domain.js';
import { parseImportFile } from './import-parser.js';
import type * as C from './import-contracts.js';
type Batch=typeof batches.$inferSelect;
type Normalized=ReturnType<typeof normalizeImportRow>&{rowNumber:number;cells:string[];fingerprint:string|null;identity:string|null};
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export interface FileImportRepository {
  analyze(owner:string,input:C.ImportUpload):Promise<C.ImportBatch>;
  preview(owner:string,id:string,offset?:number):Promise<C.ImportPreview>;
  map(owner:string,id:string,input:C.ImportMapInput):Promise<C.ImportBatch>;
  select(owner:string,id:string,input:C.ImportSelect):Promise<C.ImportResult>;
  history(owner:string,cursor:{cursorAt?:string;cursorId?:string}):Promise<C.ImportHistory>;
}
const nativeColumns={date:0,description:1,amount:2,type:3,currency:4,externalId:5};
export function createFileImportRepository({db}:Database,clock=()=>new Date()):FileImportRepository {
  async function expire(owner:string){await db.transaction(async tx=>{await lockInboxOwner(tx,owner);await tx.update(batches).set({parsed:null,parsedBytes:0,version:sql`${batches.version}+1`,updatedAt:clock()}).where(and(eq(batches.authUserId,owner),sql`${batches.expiresAt}<=${clock()} and ${batches.parsed} is not null`));});}
  async function own(tx:Pick<FinanceTransaction,'select'>,owner:string,id:string,lock=false):Promise<Batch>{const query=tx.select().from(batches).where(and(eq(batches.authUserId,owner),eq(batches.id,id)));const [row]=await(lock?query.for('update'):query);if(!row)throw new AppError('NOT_FOUND');return row;}
  async function count(tx:Pick<FinanceTransaction,'select'>,owner:string,id:string){const [r]=await tx.select({count:sql<number>`count(*)::int`}).from(receipts).where(and(eq(receipts.authUserId,owner),eq(receipts.batchId,id)));return r!.count;}
  function view(row:Batch,importedCount:number):C.ImportBatch{return {id:row.id,fileName:row.fileName,format:row.format,fileSize:row.fileSize,version:row.version,rowCount:row.rowCount,importedCount,
    status:row.issues.length?'UNSUPPORTED':!row.parsed||row.expiresAt<=clock()?'EXPIRED':row.mapping&&importedCount>=row.rowCount?'IMPORTED':!row.mapping?'NEEDS_MAPPING':'READY',
    mapping:row.mapping,issues:row.issues,accountHint:row.accountHint,createdAt:row.createdAt.toISOString(),expiresAt:row.expiresAt.toISOString()};}
  async function account(tx:FinanceTransaction,owner:string,id:string){
    const [row]=await tx.select().from(accounts).where(and(eq(accounts.authUserId,owner),eq(accounts.id,id))).for('share');
    if(!row)throw new AppError('NOT_FOUND');if(!row.isActive)throw new AppError('CONFLICT');
    if(!['checking','savings','cash','other'].includes(row.type))throw new AppError('VALIDATION_ERROR');
    const managed=await tx.execute(sql`select 1 from app.financial_debts where auth_user_id=${owner}::uuid and account_id=${id}::uuid union all select 1 from app.financial_credit_cards where auth_user_id=${owner}::uuid and account_id=${id}::uuid limit 1`);
    if(managed.rows.length)throw new AppError('CONFLICT');return row;
  }
  function normalize(row:Batch):Normalized[]{return row.parsed?.rows.map((cells,index)=>{
    const n=row.mapping&&row.currency?normalizeImportRow(cells,row.mapping,row.format,row.currency,row.timeZone):{draft:null,issues:['MAPPING_REQUIRED'] as C.ImportIssue[],externalId:null};
    return {...n,cells,rowNumber:index+1,fingerprint:n.draft?inboxFingerprint(n.draft):null,identity:n.externalId&&n.draft?digest(JSON.stringify([n.draft.accountId,n.draft.currency,n.externalId])):null};
  })??[];}
  async function decorate(tx:Pick<FinanceTransaction,'select'|'execute'>,owner:string,batch:Batch,all:Normalized[],selected:Normalized[]):Promise<C.ImportRow[]>{
    const existing=await tx.select().from(receipts).where(and(eq(receipts.authUserId,owner),eq(receipts.batchId,batch.id)));
    const byRow=new Map(existing.map(r=>[r.rowNumber,r]));
    const identities=selected.flatMap(r=>r.identity?[r.identity]:[]),known=identities.length?await tx.select().from(receipts).where(and(eq(receipts.authUserId,owner),inArray(receipts.sourceIdentity,identities))):[];
    const byIdentity=new Map(known.map(r=>[r.sourceIdentity,r])),localIdentity=new Map<string,Normalized[]>(),localGroups=new Map<string,Normalized[]>();
    for(const r of all){if(r.identity)localIdentity.set(r.identity,[...(localIdentity.get(r.identity)??[]),r]);if(r.draft){const key=[r.draft.type,r.draft.currency,r.draft.amountMinor].join(':');localGroups.set(key,[...(localGroups.get(key)??[]),r]);}}
    const localPossible=new Set<number>();for(const group of localGroups.values()){group.sort((a,b)=>Date.parse(a.draft!.occurredAt!)-Date.parse(b.draft!.occurredAt!));for(let i=1;i<group.length;i++)if(Date.parse(group[i]!.draft!.occurredAt!)-Date.parse(group[i-1]!.draft!.occurredAt!)<=86400000){localPossible.add(group[i]!.rowNumber);localPossible.add(group[i-1]!.rowNumber);}}
    const proposals=selected.filter(r=>r.draft).map(r=>({n:r.rowNumber,account_id:r.draft!.accountId,currency:r.draft!.currency,type:r.draft!.type,amount:r.draft!.amountMinor,date:r.draft!.occurredAt}));
    const matches=proposals.length?await tx.execute(sql`with proposed as(select * from jsonb_to_recordset(${JSON.stringify(proposals)}::jsonb) as p(n int,account_id uuid,currency text,type text,amount bigint,date timestamptz)) select p.n from proposed p where exists(select 1 from app.financial_transactions t where t.auth_user_id=${owner}::uuid and t.account_id=p.account_id and t.currency=p.currency and t.type=p.type and t.amount_minor=p.amount and t.occurred_at between p.date-interval '24 hours' and p.date+interval '24 hours' and not t.is_cancelled) or exists(select 1 from app.financial_inbox_candidates t where t.auth_user_id=${owner}::uuid and t.account_id=p.account_id and t.currency=p.currency and t.type=p.type and t.amount_minor=p.amount and t.occurred_at between p.date-interval '24 hours' and p.date+interval '24 hours' and t.status='PENDING')`):{rows:[]};
    const possible=new Set(matches.rows.map(r=>Number(r.n)));
    return selected.map(r=>{const previous=byRow.get(r.rowNumber),canonical=r.identity?byIdentity.get(r.identity):undefined,siblings=r.identity?localIdentity.get(r.identity)??[]:[];
      const conflict=!!canonical&&canonical.fingerprint!==r.fingerprint||siblings.some(s=>s.fingerprint!==r.fingerprint);
      const duplicate:C.ImportRow['duplicate']=previous?'PROVEN':conflict?'CONFLICT':canonical||siblings.length>1?'PROVEN':localPossible.has(r.rowNumber)||possible.has(r.rowNumber)?'POSSIBLE':'NONE';
      return {rowNumber:r.rowNumber,cells:r.cells,draft:r.draft,issues:conflict?[...r.issues,'EXTERNAL_ID_CONFLICT']:r.issues,candidateId:previous?.candidateId??canonical?.candidateId??null,duplicate};
    });
  }
  return {
    async analyze(owner,input){
      const bytes=Buffer.from(input.dataBase64,'base64'),hash=createHash('sha256').update(bytes).digest('hex');
      if(!bytes.length||bytes.length>2097152)throw new AppError('VALIDATION_ERROR');
      const parsed=await parseImportFile(input),serialized=JSON.stringify(parsed),size=Buffer.byteLength(serialized);
      if(size>4194304)throw new AppError('PAYLOAD_TOO_LARGE');
      return db.transaction(async tx=>{
        await lockInboxOwner(tx,owner);
        await tx.update(batches).set({parsed:null,parsedBytes:0,version:sql`${batches.version}+1`,updatedAt:clock()}).where(and(eq(batches.authUserId,owner),sql`${batches.expiresAt}<=${clock()} and ${batches.parsed} is not null`));
        const previous=await tx.select().from(batches).where(and(eq(batches.authUserId,owner),sql`(${batches.idempotencyKey}=${input.idempotencyKey}::uuid or ${batches.fileHash}=${hash})`));
        if(previous.some(r=>r.idempotencyKey===input.idempotencyKey&&r.fileHash!==hash))throw new AppError('CONFLICT');
        const found=previous.find(r=>r.fileHash===hash);
        if(found&&found.format!==input.format)throw new AppError('CONFLICT');
        const sameOptions=found&&found.parserOptions.encoding===input.encoding&&found.parserOptions.delimiter===input.delimiter;
        if(found&&!sameOptions&&await count(tx,owner,found.id)>0)throw new AppError('CONFLICT');
        if(found&&sameOptions&&found.parsed&&found.expiresAt>clock())return view(found,await count(tx,owner,found.id));
        const [quota]=await tx.select({count:sql<number>`count(*)::int`,live:sql<number>`count(*) filter(where ${batches.parsed} is not null)::int`,bytes:sql<string>`coalesce(sum(${batches.parsedBytes}),0)::text`}).from(batches).where(eq(batches.authUserId,owner));
        if((!found&&quota!.count>=200)||quota!.live>=10||Number(quota!.bytes)+size>20971520)throw new AppError('CONFLICT');
        const data={parsed:parsed.issues.length?null:parsed,parsedBytes:parsed.issues.length?0:size,issues:parsed.issues,rowCount:parsed.rows.length,accountHint:parsed.accountHint,parserOptions:{encoding:input.encoding,delimiter:input.delimiter},expiresAt:new Date(clock().getTime()+86400000),updatedAt:clock()};
        const [row]=found?await tx.update(batches).set({...data,version:found.version+1}).where(eq(batches.id,found.id)).returning():await tx.insert(batches).values({...data,authUserId:owner,idempotencyKey:input.idempotencyKey,fileHash:hash,fileName:input.fileName,format:input.format,fileSize:bytes.length}).returning();
        return view(row!,await count(tx,owner,row!.id));
      });
    },
    async preview(owner,id,offset=0){
      if(!Number.isInteger(offset)||offset<0||offset>1000)throw new AppError('VALIDATION_ERROR');await expire(owner);
      return db.transaction(async tx=>{const batch=await own(tx,owner,id),all=normalize(batch),page=all.slice(offset,offset+50);
        if(!batch.parsed){const history=await tx.select().from(receipts).where(and(eq(receipts.authUserId,owner),eq(receipts.batchId,id))).orderBy(receipts.rowNumber).limit(51).offset(offset);return {batch:view(batch,await count(tx,owner,id)),headers:[],rows:history.slice(0,50).map(r=>({rowNumber:r.rowNumber,cells:[],draft:null,issues:[],candidateId:r.candidateId,duplicate:'PROVEN' as const})),nextOffset:history.length>50?offset+50:null};}
        return {batch:view(batch,await count(tx,owner,id)),headers:batch.parsed?.headers??[],rows:await decorate(tx,owner,batch,all,page),nextOffset:offset+50<all.length?offset+50:null};
      },{isolationLevel:'repeatable read',accessMode:'read only'});
    },
    async map(owner,id,input){
      await expire(owner);return db.transaction(async tx=>{
        await lockInboxOwner(tx,owner);const batch=await own(tx,owner,id,true);
        if(!batch.parsed||batch.expiresAt<=clock()||batch.version!==input.expectedVersion||await count(tx,owner,id)>0)throw new AppError('CONFLICT');
        const accountRow=await account(tx,owner,input.accountId),[profile]=await tx.select({zone:profiles.timezone}).from(profiles).where(eq(profiles.authUserId,owner));
        const fields=Object.values(input.columns).filter((n):n is number=>n!==null);
        if(fields.some(n=>n>=batch.parsed!.headers.length)||new Set(fields).size!==fields.length)throw new AppError('VALIDATION_ERROR');
        if(batch.format!=='CSV'&&(Object.entries(nativeColumns).some(([key,value])=>input.columns[key as keyof typeof nativeColumns]!==value)||input.dateFormat!==(batch.format==='OFX'?'ISO':'DMY')||input.numberFormat!==(batch.format==='OFX'?'INT':'BR')||input.amountMode!=='SIGNED'))throw new AppError('VALIDATION_ERROR');
        const {expectedVersion:_,...mapping}=input;void _;
        mapping.accountId=accountRow.id;
        const [row]=await tx.update(batches).set({mapping,accountId:accountRow.id,currency:accountRow.currency,timeZone:profile?.zone??'UTC',version:batch.version+1,updatedAt:clock()}).where(eq(batches.id,id)).returning();
        return view(row!,0);
      });
    },
    async select(owner,id,input){
      return db.transaction(async tx=>{
        await lockInboxOwner(tx,owner);const batch=await own(tx,owner,id,true),prior=await tx.select().from(receipts).where(and(eq(receipts.authUserId,owner),eq(receipts.batchId,id),inArray(receipts.rowNumber,input.rowNumbers)));
        if(prior.length===input.rowNumbers.length)return {batchId:id,items:input.rowNumbers.map(n=>({rowNumber:n,candidateId:prior.find(r=>r.rowNumber===n)!.candidateId,reused:true}))};
        if(batch.version!==input.expectedVersion||!batch.mapping||!batch.parsed||batch.expiresAt<=clock())throw new AppError('CONFLICT');
        await account(tx,owner,batch.mapping.accountId);
        const all=normalize(batch),selected=input.rowNumbers.map(n=>all[n-1]);
        if(selected.some(r=>!r))throw new AppError('VALIDATION_ERROR');
        const decorated=await decorate(tx,owner,batch,all,selected as Normalized[]);
        if(decorated.some(r=>!r.draft||r.issues.length))throw new AppError('VALIDATION_ERROR');
        if(decorated.some(r=>r.duplicate==='POSSIBLE')&&!input.acknowledgePossibleDuplicates)throw new AppError('INBOX_POSSIBLE_DUPLICATE');
        const items:C.ImportResult['items']=[];
        for(const n of input.rowNumbers){
          const r=all[n-1]!,previous=prior.find(p=>p.rowNumber===n);if(previous){items.push({rowNumber:n,candidateId:previous.candidateId,reused:true});continue;}
          const [canonical]=r.identity?await tx.select().from(receipts).where(and(eq(receipts.authUserId,owner),eq(receipts.sourceIdentity,r.identity))):[];
          if(canonical&&canonical.fingerprint!==r.fingerprint)throw new AppError('CONFLICT');
          const candidate=canonical?{id:canonical.candidateId}:await createPendingInboxProposal(tx,owner,{...r.draft!,idempotencyKey:randomUUID()},('FILE_'+batch.format) as 'FILE_CSV'|'FILE_OFX'|'FILE_PDF',true);
          await tx.insert(receipts).values({authUserId:owner,batchId:id,rowNumber:n,candidateId:candidate.id,fingerprint:r.fingerprint!,externalId:r.externalId,sourceIdentity:canonical?null:r.identity,matchedReceiptId:canonical?.id??null});
          items.push({rowNumber:n,candidateId:candidate.id,reused:!!canonical});
        }
        await tx.update(batches).set({version:batch.version+1,updatedAt:clock()}).where(eq(batches.id,id));return {batchId:id,items};
      });
    },
    async history(owner,cursor){
      if(!!cursor.cursorAt!==!!cursor.cursorId)throw new AppError('VALIDATION_ERROR');await expire(owner);
      const rows=await db.select({...getTableColumns(batches),parsed:sql<Batch['parsed']>`case when ${batches.parsed} is null then null else '{"headers":[],"rows":[],"issues":[],"accountHint":null}'::jsonb end`,imported:sql<number>`(select count(*)::int from app.financial_import_rows r where r.batch_id=${batches.id} and r.auth_user_id=${owner}::uuid)`}).from(batches).where(and(eq(batches.authUserId,owner),cursor.cursorAt&&cursor.cursorId?sql`(${batches.createdAt},${batches.id})<(${new Date(cursor.cursorAt)},${cursor.cursorId}::uuid)`:undefined)).orderBy(desc(batches.createdAt),desc(batches.id)).limit(26);
      const items=rows.slice(0,25).map(r=>view(r,r.imported)),last=items.at(-1);return {items,nextCursor:rows.length>25&&last?{createdAt:last.createdAt,id:last.id}:null};
    },
  };
}
