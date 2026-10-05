import { Decimal } from 'decimal.js';
import type { Currency } from './domain.js';
import { money } from './domain.js';
import { AppError } from '../../shared/errors/index.js';
import { addCivilDays,civilDate,civilOrdinal } from './recurrence-domain.js';
import type { YieldEstimate,YieldRule,YieldRuleInput } from './yield-contracts.js';
export const D=Decimal.clone({precision:50,rounding:Decimal.ROUND_HALF_UP,toExpNeg:-60,toExpPos:60});
export type Observation={date:string;value:string};
export type RateSet={observations:Observation[];status:'CURRENT'|'STALE'|'UNAVAILABLE'};
export type YieldMarket=Partial<Record<'12'|'11'|'432'|'226',RateSet>>;
export type DailyBalance={date:string;openingMinor:string;minimumMinor:string;closingMinor:string};
const invalid=()=>{throw new AppError('VALIDATION_ERROR');};
export function validateYieldRule(input:YieldRuleInput,currency:Currency) {
  civilDate(input.effectiveFrom);if(input.effectiveFrom>'9988-12-31')invalid();
  if(input.taxReferenceDate){civilDate(input.taxReferenceDate);if(input.taxReferenceDate>input.effectiveFrom)invalid();}
  const r={...input,benchmark:input.benchmark??null,fixedRate:input.fixedRate??null,benchmarkPercentage:input.benchmarkPercentage??null,ratePeriod:input.ratePeriod??null,eligibilityDelayDays:input.eligibilityDelayDays??0,eligibleBalanceCapMinor:input.eligibleBalanceCapMinor??null,taxReferenceDate:input.taxReferenceDate??null};
  for(const rate of [r.fixedRate,r.benchmarkPercentage])if(rate!==null&&(!/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(rate)||new D(rate).gt(10)))invalid();
  if(r.eligibleBalanceCapMinor!==null)money(r.eligibleBalanceCapMinor,currency);
  if(!Number.isInteger(r.eligibilityDelayDays)||r.eligibilityDelayDays<0||r.eligibilityDelayDays>3650)invalid();
  if(currency!=='BRL'&&(r.ruleType==='BENCHMARK_PERCENTAGE'||r.ruleType==='SAVINGS_BR'||r.taxTreatment!=='NONE'))invalid();
  if(r.ruleType==='ZERO'&&(r.fixedRate!==null||r.benchmark!==null||r.benchmarkPercentage!==null||r.ratePeriod!==null||r.dayCountConvention!=='CALENDAR_365'||r.taxTreatment!=='NONE'))invalid();
  if(r.ruleType==='FIXED_RATE'&&(r.fixedRate===null||r.benchmark!==null||r.benchmarkPercentage!==null||!r.ratePeriod||r.dayCountConvention==='MONTHLY_ANNIVERSARY'||r.taxTreatment==='BR_SAVINGS_EXEMPT'))invalid();
  if(r.ruleType==='BENCHMARK_PERCENTAGE'&&(!r.benchmark||r.benchmarkPercentage===null||r.fixedRate!==null||r.ratePeriod!==null||r.dayCountConvention!=='BUSINESS_252'||r.taxTreatment==='BR_SAVINGS_EXEMPT'))invalid();
  if(r.ruleType==='SAVINGS_BR'&&(r.fixedRate!==null||r.benchmark!==null||r.benchmarkPercentage!==null||r.ratePeriod!==null||r.dayCountConvention!=='MONTHLY_ANNIVERSARY'||r.taxTreatment!=='BR_SAVINGS_EXEMPT'))invalid();
  return r;
}
export function yieldRange(from:string,to:string) {
  const f=civilDate(from);civilDate(to);
  if(to<=from||to>`${Math.min(f.y+10,9998)}-${String(f.m).padStart(2,'0')}-${String(f.d).padStart(2,'0')}`)invalid();
  return civilOrdinal(to)-civilOrdinal(from);
}
export const irRate=(days:number)=>days<=180?'0.225':days<=360?'0.20':days<=720?'0.175':'0.15';
const iof=[100,96,93,90,86,83,80,76,73,70,66,63,60,56,53,50,46,43,40,36,33,30,26,23,20,16,13,10,6,3];
export function estimateTax(yieldMinor:Decimal,days:number,treatment:YieldRuleInput['taxTreatment']) {
  if(treatment!=='BR_FIXED_INCOME_STANDARD')return {iof:new D(0),ir:new D(0),rate:'0'};
  const gross=D.max(yieldMinor,0),iofValue=gross.mul(new D(days>=30?0:iof[Math.max(days,0)]!).div(100));
  return {iof:iofValue,ir:gross.sub(iofValue).mul(irRate(days)),rate:irRate(days)};
}
export function savingsMonthlyRate(target:string,tr:string) {
  // Circular3595: round the additional percentage to4 places (fraction6),
  // half-even NBR5891, then compound the period-start TR correction.
  const additional=new D(target).gt('0.085')?new D('0.005'):new D(1).add(new D(target).mul('0.7')).pow(new D(1).div(12)).sub(1).toDecimalPlaces(6,Decimal.ROUND_HALF_EVEN);
  return new D(1).add(tr).mul(new D(1).add(additional)).sub(1);
}
export function savingsAnchor(start:string) {
  const p=civilDate(start);return p.d<29?start:monthAfter(`${start.slice(0,8)}01`);
}
function monthAfter(date:string) {const p=civilDate(date);return `${p.m===12?p.y+1:p.y}-${String(p.m===12?1:p.m+1).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`;}
export function nextSavingsAnniversary(start:string,date:string) {
  const anchor=savingsAnchor(start),a=civilDate(anchor),d=civilDate(date);
  if(date<anchor)return anchor;
  const candidate=`${d.y}-${String(d.m).padStart(2,'0')}-${String(a.d).padStart(2,'0')}`;
  return candidate>date?candidate:monthAfter(candidate);
}
const weekdays=(date:string)=>{const day=(civilOrdinal(date)+1)%7;return day!==0&&day!==6;};
const minor=(d:Decimal)=>d.toDecimalPlaces(0,Decimal.ROUND_HALF_UP).toFixed(0);
export function calculateYield(input:{currency:Currency;principalMinor:string;from:string;to:string;today:string;rules:YieldRule[];market?:YieldMarket;balances?:DailyBalance[]}):YieldEstimate {
  const {currency,from,to,today,rules}=input;yieldRange(from,to);
  const principal=D.max(new D(input.principalMinor),0),projection=to>today,history=from<today;
  const current=rules.find(r=>r.effectiveFrom<=from&&(!r.effectiveTo||r.effectiveTo>from))??rules[0];
  const usesBenchmark=rules.some(r=>r.ruleType==='BENCHMARK_PERCENTAGE'||r.ruleType==='SAVINGS_BR');
  const taxReference=rules[0]?.taxReferenceDate??rules[0]?.effectiveFrom??from;
  const result:YieldEstimate={currency,from,to,principalMinor:minor(principal),grossYieldMinor:null,grossValueMinor:null,estimatedIofMinor:null,estimatedIrMinor:null,estimatedTaxesMinor:null,estimatedNetYieldMinor:null,estimatedNetValueMinor:null,estimatedIrRate:null,taxReferenceDate:taxReference,status:'AVAILABLE',sourceStatus:'CURRENT',projection,observed:!projection,assumption:projection?'CURRENT_RATE':null,
    calendarAssumption:current?.ruleType==='SAVINGS_BR'?'MONTHLY_ANNIVERSARY':rules.some(r=>r.dayCountConvention==='BUSINESS_252')?(projection?'WEEKDAYS_ONLY':'OBSERVED_DATES'):'CALENDAR_DAYS',benchmarkSource:usesBenchmark?'BCB':null,benchmarkAsOf:null,nextAnniversary:current?.ruleType==='SAVINGS_BR'?nextSavingsAnniversary(rules[0]!.effectiveFrom,today):null,model:history?'REAL_BALANCE_HISTORY':'CURRENT_PRINCIPAL',points:[]};
  const rates=input.market??{},balances=new Map(input.balances?.map(b=>[b.date,b]));
  let unavailable=false,gross=new D(0),futureYield=new D(0),historicalDailyYield=new D(0);
  const byRule=new Map<YieldRule,Decimal>(),dailyFactors=new Map<YieldRule,Decimal>();
  const useSeries=(series:keyof YieldMarket,date:string,exact=false)=>{
    const set=rates[series];if(!set||set.status==='UNAVAILABLE'){unavailable=true;return null;}
    if(set.status==='STALE')result.sourceStatus='STALE';
    const observations=set.observations;
    const obs=date>=today?observations.at(-1):exact?observations.find(o=>o.date===date):observations.findLast(o=>o.date<=date);
    if(!obs){unavailable=true;return null;}
    result.benchmarkAsOf=result.benchmarkAsOf===null||obs.date<result.benchmarkAsOf?obs.date:result.benchmarkAsOf;return new D(obs.value);
  };
  const eligible=(balance:Decimal,r:YieldRule)=>r.eligibleBalanceCapMinor===null?D.max(balance,0):D.min(D.max(balance,0),r.eligibleBalanceCapMinor);
  const add=(date:string,r:YieldRule,gain:Decimal)=>{gross=gross.add(gain);if(date>=today)futureYield=futureYield.add(gain);else if(r.ruleType!=='SAVINGS_BR')historicalDailyYield=historicalDailyYield.add(gain);byRule.set(r,(byRule.get(r)??new D(0)).add(gain));};
  const savingsPeriods=new Map<string,{start:string;rule:YieldRule}>();
  if(rules.length&&rules.some(r=>r.ruleType==='SAVINGS_BR')){
    let end=nextSavingsAnniversary(rules[0]!.effectiveFrom,from),start=monthBefore(end);
    for(;end<=to;start=end,end=monthAfter(start)){
      const r=rules.find(r=>r.effectiveFrom<=start&&(!r.effectiveTo||r.effectiveTo>=end));
      if(r?.ruleType==='SAVINGS_BR'&&civilOrdinal(start)-civilOrdinal(r.effectiveFrom)>=r.eligibilityDelayDays)savingsPeriods.set(end,{start,rule:r});
    }
  }
  for(let date=from;date<=to;date=addCivilDays(date,1)!){
    const period=savingsPeriods.get(date);
    if(period){
      const r=period.rule;let minimum:Decimal|null=null;
      for(let day=period.start;day<date;day=addCivilDays(day,1)!){
        const b=day<today?new D(balances.get(day)?.minimumMinor??'0'):principal.add(futureYield);
        minimum=minimum===null?b:D.min(minimum,b);
      }
      const amount=eligible(minimum??new D(0),r);
      if(!amount.isZero()){
        const target=useSeries('432',period.start),tr=useSeries('226',period.start,true);
        if(target&&tr){add(date>=today?date:addCivilDays(date,-1)!,r,amount.mul(savingsMonthlyRate(target.toString(),tr.toString())));result.points.push({date,grossYieldMinor:minor(gross)});}
      }
    }
    if(date===to)break;
    const r=rules.find(r=>r.effectiveFrom<=date&&(!r.effectiveTo||date<r.effectiveTo));
    if(!r||r.ruleType==='ZERO'||r.ruleType==='SAVINGS_BR'||civilOrdinal(date)-civilOrdinal(r.effectiveFrom)<r.eligibilityDelayDays)continue;
    const real=new D(balances.get(date)?.closingMinor??'0');
    // Historical daily factors compound only in this hypothetical accumulator,
    // never a second stored/real balance. Nonpositive real principal earns0.
    const balance=date<today?(real.gt(0)?real.add(historicalDailyYield):new D(0)):principal.add(futureYield);
    if(eligible(balance,r).isZero())continue;
    let factor:Decimal|null;
    if(r.ruleType==='FIXED_RATE'){
      if(r.dayCountConvention==='BUSINESS_252'){
        if(date<today){const set=rates['12'];if(!set||set.status==='UNAVAILABLE'){unavailable=true;continue;}if(set.status==='STALE')result.sourceStatus='STALE';if(!set.observations.some(o=>o.date===date))continue;}
        else if(!weekdays(date))continue;
      }
      factor=dailyFactors.get(r)??new D(1).add(r.fixedRate!).pow(new D(r.ratePeriod==='MONTHLY'?12:1).div(r.dayCountConvention==='BUSINESS_252'?252:365)).sub(1);dailyFactors.set(r,factor);
    }else {
      const series=r.benchmark==='CDI'?'12':'11',set=rates[series];
      if(date<today&&set&&set.status!=='UNAVAILABLE'&&!set.observations.some(o=>o.date===date))continue;
      if(date>=today&&!weekdays(date))continue;
      factor=useSeries(series,date,true)?.mul(r.benchmarkPercentage!)??null;
    }
    if(factor)add(date,r,eligible(balance,r).mul(factor));
    result.points.push({date:addCivilDays(date,1)!,grossYieldMinor:minor(gross)});
  }
  if(unavailable){return {...result,status:'UNAVAILABLE',sourceStatus:'UNAVAILABLE',points:[]};}
  let iofValue=new D(0),irValue=new D(0);
  for(const [r,gain] of byRule){const reference=r.taxReferenceDate??taxReference;const tax=estimateTax(gain,Math.max(0,civilOrdinal(to)-civilOrdinal(reference)),r.taxTreatment);iofValue=iofValue.add(tax.iof);irValue=irValue.add(tax.ir);if(r.taxTreatment==='BR_FIXED_INCOME_STANDARD')result.estimatedIrRate=tax.rate;}
  const grossMinor=BigInt(minor(gross)),iofMinor=BigInt(minor(iofValue)),irMinor=BigInt(minor(irValue));
  const taxes=iofMinor+irMinor>grossMinor?grossMinor:iofMinor+irMinor;
  Object.assign(result,{grossYieldMinor:String(grossMinor),grossValueMinor:String(BigInt(result.principalMinor)+grossMinor),estimatedIofMinor:String(iofMinor),estimatedIrMinor:String(taxes-iofMinor),estimatedTaxesMinor:String(taxes),estimatedNetYieldMinor:String(grossMinor-taxes),estimatedNetValueMinor:String(BigInt(result.principalMinor)+grossMinor-taxes)});
  result.points=[...new Map(result.points.map(p=>[p.date,p])).values()].sort((a,b)=>a.date.localeCompare(b.date));return result;
}
function monthBefore(date:string){const p=civilDate(date);return `${p.m===1?p.y-1:p.y}-${String(p.m===1?12:p.m-1).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`;}
