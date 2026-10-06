import type { DebtRepository } from './debt-repository.js';
import type { ProfileRepository } from '../profile/repository.js';
import { recurrenceToday } from './recurrence-domain.js';
import { timeZone } from './budget-domain.js';
import { simulate } from './debt-domain.js';
import type * as C from './debt-contracts.js';
export function debtService(repo:DebtRepository,profiles:ProfileRepository,clock=()=>new Date()) {
  const context=async(owner:string)=>{const zone=timeZone((await profiles.findByAuthUser(owner))?.timezone??'UTC'),now=clock();return {zone,now,today:recurrenceToday(zone,now)};};
  const view=async(owner:string,id:string)=>{const c=await context(owner);return repo.read(owner,id,c.today,c.zone,c.now);};
  return {
    list:repo.list,view,patch:repo.patch,
    async create(owner:string,input:C.DebtInput){const c=await context(owner);return repo.create(owner,input,c.today,c.now);},
    async archive(owner:string,id:string){return repo.archive(owner,id,clock());},
    async terms(owner:string,id:string){return (await view(owner,id)).terms;},
    async addTerm(owner:string,id:string,input:C.TermInput){return repo.addTerm(owner,id,input,(await context(owner)).today);},
    payments:repo.paymentPage,
    async payment(owner:string,id:string,input:C.PaymentInput){const c=await context(owner);return repo.payment(owner,id,input,c.today,c.zone,c.now);},
    async cancel(owner:string,id:string,paymentId:string){return repo.cancel(owner,id,paymentId,clock());},
    async simulate(owner:string,input:C.SimulationInput){const c=await context(owner),views=await Promise.all(input.debtIds.map(id=>repo.read(owner,id,c.today,c.zone,c.now)));return simulate(input,views.map(v=>({debt:v.debt,terms:v.terms,principal:v.outstandingPrincipalMinor})),c.today);},
    async summary(owner:string):Promise<C.Summary>{const c=await context(owner);return repo.summary(owner,c.today,c.now);},
  };
}
