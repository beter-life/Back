import { randomUUID } from 'node:crypto';
import type { FinanceRepository } from './repository.js';
import type { ProfileRepository } from '../profile/repository.js';
import type { YieldRepository } from './yield-repository.js';
import type * as C from './yield-contracts.js';
import { calculateYield,validateYieldRule,yieldRange,type YieldMarket } from './yield-domain.js';
import type { MarketRateService,Series } from './yield-market.js';
import { addCivilDays,recurrenceToday } from './recurrence-domain.js';
import { timeZone } from './budget-domain.js';
import { money } from './domain.js';
import { AppError } from '../../shared/errors/index.js';
export function yieldService(repo:YieldRepository,finance:FinanceRepository,profiles:ProfileRepository,market:MarketRateService,clock=()=>new Date()){
  const context=async(owner:string)=>{const timezone=timeZone((await profiles.findByAuthUser(owner))?.timezone??'UTC');return {timezone,today:recurrenceToday(timezone,clock())};};
  const account=async(owner:string,id:string)=>{const a=await finance.getAccount(owner,id);if(!a)throw new AppError('NOT_FOUND');return a;};
  async function observations(rules:C.YieldRule[],from:string,to:string,today:string):Promise<YieldMarket>{
    const series=new Set<Series>();
    for(const r of rules){if(r.ruleType==='BENCHMARK_PERCENTAGE')series.add(r.benchmark==='CDI'?'12':'11');if(r.ruleType==='SAVINGS_BR'){series.add('432');series.add('226');}if(r.ruleType==='FIXED_RATE'&&r.dayCountConvention==='BUSINESS_252'&&from<today)series.add('12');}
    const start=from<today?addCivilDays(from,-31)!:addCivilDays(today,-31)!,end=to<today?to:today;
    const entries=await Promise.all([...series].map(async s=>[s,await market.range(s,start,end)] as const));return Object.fromEntries(entries);
  }
  async function estimate(owner:string,id:string,q:C.YieldEstimateQuery):Promise<C.YieldEstimate>{
    const c=await context(owner),a=await account(owner,id),p=await repo.get(owner,id);if(!p)throw new AppError('NOT_FOUND');
    const from=q.from??c.today;yieldRange(from,q.to);
    if(q.to>c.today&&(!a.isActive||p.status!=='ACTIVE'))throw new AppError('CONFLICT');
    const needed=p.rules.filter(r=>r.effectiveFrom<q.to&&(!r.effectiveTo||r.effectiveTo>addCivilDays(from,-31)!));
    const balances=(from<c.today||needed.some(r=>r.ruleType==='SAVINGS_BR'))?await repo.balances(owner,id,addCivilDays(from,-31)!,q.to<c.today?q.to:c.today,c.timezone,clock()):[];
    const historical=balances.find(b=>b.date===from);
    return calculateYield({currency:a.currency,principalMinor:from<c.today?(historical?.openingMinor??'0'):a.balanceMinor,from,to:q.to,today:c.today,rules:p.rules,balances,market:await observations(needed,from,q.to,c.today)});
  }
  return {
    benchmarks:()=>market.benchmarks(),list:repo.list,
    async get(owner:string,id:string){await account(owner,id);return repo.get(owner,id);},
    async save(owner:string,id:string,input:C.YieldRuleInput,creating:boolean){const c=await context(owner);await account(owner,id);return repo.save(owner,id,input,creating,c.today);},
    async archive(owner:string,id:string){await account(owner,id);return repo.archive(owner,id);},estimate,
    async summary(owner:string,q:C.YieldEstimateQuery):Promise<C.YieldSummary>{
      const c=await context(owner),from=q.from??c.today;yieldRange(from,q.to);
      const all=await repo.list(owner),accounts=await finance.listAccounts(owner),totals=new Map<C.YieldProfile['currency'],C.YieldSummary['totals'][number]>();
      for(const p of all){const a=accounts.find(a=>a.id===p.accountId);if(!a||p.status!=='ACTIVE'||!a.isActive)continue;
        const e=await estimate(owner,a.id,q),t=totals.get(a.currency)??{currency:a.currency,yieldingAccounts:0,principalMinor:'0',estimatedGrossYieldMinor:'0',estimatedNetYieldMinor:'0',unavailableAccounts:0};
        t.yieldingAccounts++;t.principalMinor=String(BigInt(t.principalMinor)+BigInt(e.principalMinor));
        if(e.status==='UNAVAILABLE')t.unavailableAccounts++;else{t.estimatedGrossYieldMinor=String(BigInt(t.estimatedGrossYieldMinor)+BigInt(e.grossYieldMinor!));t.estimatedNetYieldMinor=String(BigInt(t.estimatedNetYieldMinor)+BigInt(e.estimatedNetYieldMinor!));}totals.set(a.currency,t);
      }return {from,to:q.to,totals:[...totals.values()].sort((a,b)=>a.currency.localeCompare(b.currency))};
    },
    async compare(owner:string,input:C.YieldComparisonInput){
      const c=await context(owner);money(input.principalMinor,input.currency,false);yieldRange(input.from,input.to);
      if(input.currency!=='BRL'||input.from<c.today)throw new AppError('VALIDATION_ERROR');
      const make=(specific:Partial<C.YieldRuleInput>):C.YieldRule=>({...validateYieldRule({ruleType:'FIXED_RATE',effectiveFrom:input.from,fixedRate:input.fixedRate,ratePeriod:input.ratePeriod,dayCountConvention:'CALENDAR_365',taxTreatment:input.taxTreatment,...specific},'BRL'),id:randomUUID(),profileId:randomUUID(),effectiveTo:null,createdAt:clock().toISOString()});
      const rules={cdi:make({ruleType:'BENCHMARK_PERCENTAGE',benchmark:'CDI',benchmarkPercentage:'1',fixedRate:null,ratePeriod:null,dayCountConvention:'BUSINESS_252'}),savings:make({ruleType:'SAVINGS_BR',fixedRate:null,ratePeriod:null,dayCountConvention:'MONTHLY_ANNIVERSARY',taxTreatment:'BR_SAVINGS_EXEMPT'}),fixed:make({})};
      const data=await observations(Object.values(rules),input.from,input.to,c.today);
      const calc=(rule:C.YieldRule)=>calculateYield({currency:'BRL',principalMinor:input.principalMinor,from:input.from,to:input.to,today:c.today,rules:[rule],market:data});
      return {cdi:calc(rules.cdi),savings:calc(rules.savings),fixed:calc(rules.fixed)};
    },
  };
}
