import { D,type Observation,type RateSet } from './yield-domain.js';
import { addCivilDays,civilDate,civilOrdinal,recurrenceToday } from './recurrence-domain.js';
import type { YieldMarketRate } from './yield-contracts.js';
export const marketSeries={
  '12':{benchmark:'CDI',unit:'DAILY_DECIMAL'},'4389':{benchmark:'CDI',unit:'ANNUAL_DECIMAL'},
  '11':{benchmark:'SELIC',unit:'DAILY_DECIMAL'},'1178':{benchmark:'SELIC',unit:'ANNUAL_DECIMAL'},
  '432':{benchmark:'SELIC_TARGET',unit:'ANNUAL_DECIMAL'},'226':{benchmark:'TR',unit:'MONTHLY_DECIMAL'},
} as const;
export type Series=keyof typeof marketSeries;
export type CachedRate=Observation&{fetchedAt:string};
export interface MarketRateCache {read(series:Series,from:string,to:string):Promise<CachedRate[]>;write(series:Series,observations:Observation[],fetchedAt:string):Promise<void>}
export class BcbMarketRateProvider {
  constructor(private readonly request:typeof fetch=fetch){}
  async observations(series:Series,from:string,to:string):Promise<Observation[]> {
    civilDate(from);civilDate(to);if(from>to||civilOrdinal(to)-civilOrdinal(from)>366)throw new Error('BCB_WINDOW_INVALID');
    const format=(date:string)=>date.split('-').reverse().join('/');
    const url=new URL(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${series}/dados`);
    url.searchParams.set('formato','json');url.searchParams.set('dataInicial',format(from));url.searchParams.set('dataFinal',format(to));
    const response=await this.request(url,{signal:AbortSignal.timeout(4000),headers:{accept:'application/json'}});
    if(!response.ok)throw new Error('BCB_HTTP_ERROR');
    // Bound the body before JSON parsing, including chunked responses.
    const reader=response.body?.getReader();if(!reader)throw new Error('BCB_BODY_INVALID');
    let size=0;const chunks:Uint8Array[]=[];
    try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>1000000)throw new Error('BCB_BODY_LIMIT');chunks.push(value);}}finally{await reader.cancel();}
    const body=JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    if(!Array.isArray(body)||body.length>367)throw new Error('BCB_DATA_INVALID');
    const rows=new Map<string,Observation>();
    for(const item of body){
      if(!item||typeof item!=='object'||typeof item.data!=='string'||typeof item.valor!=='string'||!/^\d{2}\/\d{2}\/\d{4}$/.test(item.data)||!/^\d+(?:[.,]\d{1,12})?$/.test(item.valor))throw new Error('BCB_DATA_INVALID');
      const date=item.data.split('/').reverse().join('-');civilDate(date);if(date<from||date>to)throw new Error('BCB_DATE_INVALID');
      const value=new D(item.valor.replace(',','.')).div(100);if(value.lt(0)||value.gt(10))throw new Error('BCB_RATE_INVALID');
      const obs={date,value:value.toFixed()};if(rows.has(date)&&rows.get(date)!.value!==obs.value)throw new Error('BCB_DUPLICATE_CONFLICT');rows.set(date,obs);
    }
    return [...rows.values()].sort((a,b)=>a.date.localeCompare(b.date));
  }
}
export class MarketRateService {
  private readonly windows=new Map<string,{until:number;result:RateSet}>();
  private readonly pending=new Map<string,Promise<RateSet>>();
  constructor(private readonly cache:MarketRateCache,private readonly provider=new BcbMarketRateProvider(),private readonly clock=()=>new Date()){}
  async range(series:Series,from:string,to:string):Promise<RateSet>{
    if(from>to)return {observations:[],status:'CURRENT'};
    const parts:RateSet[]=[];
    for(let start=from;start<=to;){const end=addCivilDays(start,365)!<to?addCivilDays(start,365)!:to;parts.push(await this.window(series,start,end));start=addCivilDays(end,1)!;}
    return {observations:parts.flatMap(p=>p.observations),status:parts.some(p=>p.status==='UNAVAILABLE')?'UNAVAILABLE':parts.some(p=>p.status==='STALE')?'STALE':'CURRENT'};
  }
  private window(series:Series,from:string,to:string):Promise<RateSet>{
    const key=`${series}:${from}:${to}`,previous=this.windows.get(key);if(previous&&previous.until>this.clock().getTime())return Promise.resolve(previous.result);
    const pending=this.pending.get(key);if(pending)return pending;
    const task=this.refresh(series,from,to).finally(()=>this.pending.delete(key));this.pending.set(key,task);return task;
  }
  private async refresh(series:Series,from:string,to:string):Promise<RateSet>{
    const cached=await this.cache.read(series,from,to);let result:RateSet;
    try{
      // Persisted recent cache avoids repeated external work after process reload.
      const fresh=cached.length>0&&cached.every(o=>this.clock().getTime()-Date.parse(o.fetchedAt)<21600000)&&cached[0]!.date<=addCivilDays(from,7)!&&cached.at(-1)!.date>=addCivilDays(to,-7)!;
      const observations=fresh?cached:await this.provider.observations(series,from,to);
      if(!fresh&&observations.length)await this.cache.write(series,observations,this.clock().toISOString());
      result={observations,status:observations.length?'CURRENT':'UNAVAILABLE'};
    }catch{
      // Partial cache must never silently represent a complete historical range.
      const covered=cached.length>0&&cached[0]!.date<=addCivilDays(from,7)!&&cached.at(-1)!.date>=addCivilDays(to,-7)!;
      result={observations:covered?cached:[],status:covered?'STALE':'UNAVAILABLE'};
    }
    if(this.windows.size>=512)this.windows.delete(this.windows.keys().next().value!);
    this.windows.set(`${series}:${from}:${to}`,{until:this.clock().getTime()+(result.status==='CURRENT'?21600000:60000),result});return result;
  }
  async latest(series:Series):Promise<RateSet>{const today=recurrenceToday('America/Sao_Paulo',this.clock());return this.range(series,addCivilDays(today,-14)!,today);}
  async benchmarks():Promise<YieldMarketRate[]>{
    return Promise.all((['4389','1178','432','226'] as const).map(async series=>{
      const set=await this.latest(series),last=set.observations.at(-1),cached=last?(await this.cache.read(series,last.date,last.date))[0]:null;
      return {benchmark:marketSeries[series].benchmark,seriesCode:series,value:last?.value??null,unit:marketSeries[series].unit,observedDate:last?.date??null,source:'BCB',sourceStatus:set.status,lastUpdatedAt:cached?.fetchedAt??null};
    }));
  }
}
