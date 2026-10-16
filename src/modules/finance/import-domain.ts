import { currencyDigits, money, type Currency } from './domain.js';
import { civilDate } from './recurrence-domain.js';
import { normalizeInboxDraft } from './inbox-domain.js';
import type { InboxDraft } from './inbox-contracts.js';
import type { ImportFormat, ImportIssue, ImportMapping } from './import-contracts.js';

export function importMoney(raw:string,format:'BR'|'INT',currency:Currency) {
  let text=raw.trim(),negative=false,explicitPositive=false;
  if(/^\(.*\)$/.test(text)){negative=true;text=text.slice(1,-1);}
  if(text.startsWith('-')){if(negative)throw new Error('amount');negative=true;text=text.slice(1);}
  else if(text.startsWith('+')){explicitPositive=true;text=text.slice(1);}
  const pattern=format==='BR'?/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/:/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;
  if(!pattern.test(text)||text.length>40)throw new Error('amount');
  const normalized=format==='BR'?text.replaceAll('.','').replace(',','.'):text.replaceAll(',','');
  const [whole,fraction='']=normalized.split('.'),digits=currencyDigits[currency];
  if(fraction.length>digits)throw new Error('amount');
  const amountMinor=String(BigInt(whole!)*10n**BigInt(digits)+BigInt(fraction.padEnd(digits,'0')||'0'));
  money(amountMinor,currency);
  return {amountMinor,type:negative?'EXPENSE' as const:'INCOME' as const,negative,explicitPositive};
}
const normalizedText=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const kinds:Record<string,InboxDraft['type']>={INCOME:'INCOME',RECEITA:'INCOME',CREDIT:'INCOME',CREDITO:'INCOME',EXPENSE:'EXPENSE',DESPESA:'EXPENSE',DEBIT:'EXPENSE',DEBITO:'EXPENSE'};
function noon(date:string,zone:string) {
  civilDate(date);
  const formatter=new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const wall=Date.parse(date+'T12:00:00Z');let instant=wall;
  const render=(time:number)=>{const p=Object.fromEntries(formatter.formatToParts(new Date(time)).map(v=>[v.type,v.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;};
  for(let n=0;n<4;n++){const rendered=render(instant),delta=wall-Date.parse(rendered+':00Z');if(!delta){for(const shift of [-120,-90,-60,-30,30,60,90,120])if(render(instant+shift*60000)===date+'T12:00')throw new Error('ambiguous date');return new Date(instant).toISOString();}instant+=delta;}
  throw new Error('date');
}
function dateInstant(raw:string,format:ImportMapping['dateFormat'],zone:string,native:boolean) {
  const text=raw.trim();
  if((native||format==='ISO')&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(text)){
    civilDate(text.slice(0,10));if(Number(text.slice(11,13))>23||Number(text.slice(14,16))>59||Number(text.slice(17,19))>59)throw new Error('date');
    const instant=Date.parse(text);if(!Number.isFinite(instant))throw new Error('date');return new Date(instant).toISOString();
  }
  if(native&&/^\d{4}-\d{2}-\d{2}$/.test(text))return noon(text,zone);
  if(format==='ISO')return noon(text,zone);
  const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);if(!match)throw new Error('date');
  return noon(`${match[3]}-${format==='DMY'?match[2]:match[1]}-${format==='DMY'?match[1]:match[2]}`,zone);
}
export function normalizeImportRow(cells:string[],mapping:ImportMapping,format:ImportFormat,currency:Currency,zone:string):{draft:InboxDraft|null;issues:ImportIssue[];externalId:string|null} {
  const c=mapping.columns,read=(i:number|null)=>(i===null?'':cells[i]??'').trim(),issues:ImportIssue[]=[];
  const description=read(c.description),kindText=normalizedText(read(c.type));
  if(!description||description.length>500)issues.push('DESCRIPTION_INVALID');
  if(/^(SALDO(?:\s|$)|TOTAL(?:\s|$)|SUBTOTAL(?:\s|$)|BALANCE(?:\s|$)|OPENING BALANCE|CLOSING BALANCE)/.test(normalizedText(description)))issues.push('NOT_TRANSACTION');
  if(read(c.currency)&&read(c.currency).toUpperCase()!==currency)issues.push('CURRENCY_MISMATCH');
  let amount:ReturnType<typeof importMoney>|undefined,type:InboxDraft['type']|undefined,occurredAt:string|undefined;
  try{amount=importMoney(read(c.amount),format==='OFX'?'INT':mapping.numberFormat,currency);}catch{issues.push('AMOUNT_INVALID');}
  if(kindText){type=kinds[kindText];if(!type)issues.push('TYPE_UNSUPPORTED');}
  else if(mapping.amountMode==='TYPE_COLUMN'||format!=='CSV')issues.push('TYPE_UNSUPPORTED');
  if(!type&&amount&&!issues.includes('TYPE_UNSUPPORTED'))type=amount.type;
  if(type&&amount&&((amount.negative&&type!=='EXPENSE')||(amount.explicitPositive&&type!=='INCOME')||((mapping.amountMode==='SIGNED'||format==='OFX')&&amount.type!==type)))issues.push('SIGN_CONFLICT');
  try{occurredAt=dateInstant(read(c.date),mapping.dateFormat,zone,format==='OFX');}catch{issues.push('DATE_INVALID');}
  const externalId=read(c.externalId)||null;if(externalId&&externalId.length>160)issues.push('EXTERNAL_ID_CONFLICT');
  const draft=issues.length||!amount||!type||!occurredAt?null:normalizeInboxDraft({description,type,currency,accountId:mapping.accountId,categoryId:null,amountMinor:amount.amountMinor,occurredAt});
  return {draft,issues,externalId};
}
