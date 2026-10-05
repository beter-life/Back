import type { ProfileRepository } from '../profile/repository.js';
import type { NetWorthRepository } from './net-worth-repository.js';
import type * as C from './net-worth-contracts.js';
import { recurrenceToday } from './recurrence-domain.js';
import { timeZone } from './budget-domain.js';
import { historyDates,observedDate,summarizeNetWorth } from './net-worth-domain.js';
import { AppError } from '../../shared/errors/index.js';
function cursor(q:{cursorAt?:string;cursorId?:string;cursorDate?:string},valuation=false) {
  const count=[q.cursorAt,q.cursorId,...(valuation?[q.cursorDate]:[])].filter(Boolean).length;
  if(count!==0&&count!==(valuation?3:2))throw new AppError('VALIDATION_ERROR');
}
export function netWorthService(repo:NetWorthRepository,profiles:ProfileRepository,clock=()=>new Date()) {
  const context=async(owner:string)=>{const timezone=timeZone((await profiles.findByAuthUser(owner))?.timezone??'UTC');return {timezone,today:recurrenceToday(timezone,clock())};};
  return {
    async summary(owner:string,asOf?:string) {const c=await context(owner),date=observedDate(asOf??c.today,c.today);const components=await repo.components(owner,date,c.timezone);return {asOf:date,timezone:c.timezone,components,totals:summarizeNetWorth(components)};},
    async history(owner:string,q:C.NetWorthHistoryQuery) {const c=await context(owner);return {...q,timezone:c.timezone,points:await repo.history(owner,historyDates(q.from,q.to,c.today),c.timezone,q.currency)};},
    async list(owner:string,q:C.NetWorthItemQuery) {cursor(q);return repo.list(owner,q);},
    async get(owner:string,id:string) {const r=await repo.get(owner,id);if(!r)throw new AppError('NOT_FOUND');return r;},
    async create(owner:string,input:C.NetWorthItemInput) {const c=await context(owner);observedDate(input.valuationDate,c.today);return repo.create(owner,input);},
    patch:repo.patch,archive:repo.archive,
    async valuations(owner:string,id:string,q:C.NetWorthValuationQuery) {cursor(q,true);return repo.valuations(owner,id,q);},
    async addValuation(owner:string,id:string,input:C.NetWorthValuationInput) {const c=await context(owner);observedDate(input.valuationDate,c.today);return repo.addValuation(owner,id,input);},
  };
}
