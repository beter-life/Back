import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { ProfileRepository } from '../profile/repository.js';
import type { FinanceRepository } from './repository.js';
import type { YieldRepository } from './yield-repository.js';
import type { MarketRateService } from './yield-market.js';
import { authGuard,requireIdentity,type createVerifier } from '../auth/identity.js';
import { EmptyQuery,ErrorResponses } from '../../shared/http/schemas.js';
import { RecurrenceEmptyBody } from './recurrence-contracts.js';
import { yieldService } from './yield-application.js';
import * as C from './yield-contracts.js';
export function yieldRoutes(app:FastifyInstance,repo:YieldRepository,finance:FinanceRepository,profiles:ProfileRepository,market:MarketRateService,verify:ReturnType<typeof createVerifier>,clock?:()=>Date){
  const r=app.withTypeProvider<TypeBoxTypeProvider>(),s=yieldService(repo,finance,profiles,market,clock),base='/api/v1/finance/yield',account='/api/v1/finance/accounts/:accountId',preValidation=authGuard(verify),common={tags:['Finance Yield'],security:[{bearerAuth:[]}]};
  r.get(base+'/benchmarks',{preValidation,schema:{...common,operationId:'getYieldBenchmarks',querystring:EmptyQuery,response:{200:C.YieldBenchmarks,...ErrorResponses}}},()=>s.benchmarks());
  r.get(base+'/profiles',{preValidation,schema:{...common,operationId:'listYieldProfiles',querystring:EmptyQuery,response:{200:C.YieldProfiles,...ErrorResponses}}},req=>s.list(requireIdentity(req).authUserId));
  r.get(base+'/summary',{preValidation,schema:{...common,operationId:'getYieldSummary',querystring:C.YieldEstimateQuery,response:{200:C.YieldSummary,...ErrorResponses}}},req=>s.summary(requireIdentity(req).authUserId,req.query));
  r.post(base+'/comparison',{preValidation,schema:{...common,operationId:'compareYieldRules',querystring:EmptyQuery,body:C.YieldComparisonInput,response:{200:C.YieldComparison,...ErrorResponses}}},req=>s.compare(requireIdentity(req).authUserId,req.body));
  r.get(account+'/yield-profile',{preValidation,schema:{...common,operationId:'getYieldProfile',querystring:EmptyQuery,params:C.YieldAccountParams,response:{200:C.YieldProfileResult,...ErrorResponses}}},req=>s.get(requireIdentity(req).authUserId,req.params.accountId));
  r.get(account+'/yield-profile/history',{preValidation,schema:{...common,operationId:'getYieldRuleHistory',querystring:EmptyQuery,params:C.YieldAccountParams,response:{200:C.YieldProfileResult,...ErrorResponses}}},req=>s.get(requireIdentity(req).authUserId,req.params.accountId));
  r.post(account+'/yield-profile',{preValidation,schema:{...common,operationId:'createYieldProfile',querystring:EmptyQuery,params:C.YieldAccountParams,body:C.YieldRuleInput,response:{201:C.YieldProfile,...ErrorResponses}}},async(req,reply)=>reply.code(201).send(await s.save(requireIdentity(req).authUserId,req.params.accountId,req.body,true)));
  r.post(account+'/yield-profile/versions',{preValidation,schema:{...common,operationId:'addYieldRuleVersion',querystring:EmptyQuery,params:C.YieldAccountParams,body:C.YieldRuleInput,response:{201:C.YieldProfile,...ErrorResponses}}},async(req,reply)=>reply.code(201).send(await s.save(requireIdentity(req).authUserId,req.params.accountId,req.body,false)));
  r.post(account+'/yield-profile/archive',{preValidation,schema:{...common,operationId:'archiveYieldProfile',querystring:EmptyQuery,params:C.YieldAccountParams,body:RecurrenceEmptyBody,response:{200:C.YieldProfile,...ErrorResponses}}},req=>s.archive(requireIdentity(req).authUserId,req.params.accountId));
  r.get(account+'/yield/estimate',{preValidation,schema:{...common,operationId:'estimateAccountYield',querystring:C.YieldEstimateQuery,params:C.YieldAccountParams,response:{200:C.YieldEstimate,...ErrorResponses}}},req=>s.estimate(requireIdentity(req).authUserId,req.params.accountId,req.query));
}
