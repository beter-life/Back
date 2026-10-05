import { AppError } from '../../shared/errors/index.js';
import { money, name, type Currency } from './domain.js';
import { validateMonth, monthDays } from './budget-domain.js';
import { civilDate } from './recurrence-domain.js';
import type { NetWorthComponent, NetWorthTotal } from './net-worth-contracts.js';
export const netWorthCategories = { ASSET:['PROPERTY','VEHICLE','BUSINESS','VALUABLE','OTHER'], LIABILITY:['MORTGAGE','LOAN','FINANCING','OTHER'] } as const;
export function validateNetWorthMetadata(kind:'ASSET'|'LIABILITY',input:{name:string;category:string;description?:string|null}) {
  if (!(netWorthCategories[kind] as readonly string[]).includes(input.category)) throw new AppError('VALIDATION_ERROR');
  return {...input,name:name(input.name),description:input.description?.trim()||null};
}
export function valuationAmount(value:string,currency:Currency,initial=false) { const amount=money(value,currency,initial).amountMinor; if(amount<0n)throw new AppError('VALIDATION_ERROR');return amount; }
export function observedDate(value:string,today:string) {civilDate(value);if(value>today)throw new AppError('VALIDATION_ERROR');return value;}
export function historyDates(from:string,to:string,today:string) {
  validateMonth(from);validateMonth(to);
  const number=(v:string)=>Number(v.slice(0,4))*12+Number(v.slice(5))-1;
  if(from>to||to>today.slice(0,7)||number(to)-number(from)>=60)throw new AppError('VALIDATION_ERROR');
  const dates:string[]=[];
  for(let n=number(from);n<=number(to);n++) {const m=String(Math.floor(n/12))+'-'+String(n%12+1).padStart(2,'0');dates.push(m===today.slice(0,7)?today:m+'-'+String(monthDays(m)).padStart(2,'0'));}
  return dates;
}
export function netWorthTotal(currency:Currency,accountAssets:string,accountLiabilities:string,manualAssets:string,manualLiabilities:string):NetWorthTotal {
  const aa=BigInt(accountAssets),al=BigInt(accountLiabilities),ma=BigInt(manualAssets),ml=BigInt(manualLiabilities);
  return {currency,accountAssetsMinor:String(aa),accountLiabilitiesMinor:String(al),accountNetMinor:String(aa-al),manualAssetsMinor:String(ma),manualLiabilitiesMinor:String(ml),totalAssetsMinor:String(aa+ma),totalLiabilitiesMinor:String(al+ml),netWorthMinor:String(aa+ma-al-ml)};
}
export function summarizeNetWorth(rows:NetWorthComponent[]):NetWorthTotal[] {
  const totals=new Map<Currency,bigint[]>();
  for(const r of rows){const values=totals.get(r.currency)??[0n,0n,0n,0n];values[(r.source==='ACCOUNT'?0:2)+(r.kind==='LIABILITY'?1:0)]!+=BigInt(r.valueMinor);totals.set(r.currency,values);}
  return [...totals].sort(([a],[b])=>a.localeCompare(b)).map(([currency,v])=>netWorthTotal(currency,...v.map(String) as [string,string,string,string]));
}
