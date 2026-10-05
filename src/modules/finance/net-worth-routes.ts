import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { ProfileRepository } from '../profile/repository.js';
import { authGuard,requireIdentity,type createVerifier } from '../auth/identity.js';
import { EmptyQuery,ErrorResponses } from '../../shared/http/schemas.js';
import { RecurrenceEmptyBody } from './recurrence-contracts.js';
import type { NetWorthRepository } from './net-worth-repository.js';
import { netWorthService } from './net-worth-application.js';
import * as C from './net-worth-contracts.js';
export function netWorthRoutes(app:FastifyInstance,repo:NetWorthRepository,profiles:ProfileRepository,verify:ReturnType<typeof createVerifier>,clock?:()=>Date) {
  const r=app.withTypeProvider<TypeBoxTypeProvider>(),service=netWorthService(repo,profiles,clock),base='/api/v1/finance/net-worth',preValidation=authGuard(verify),common={tags:['Finance Net Worth'],security:[{bearerAuth:[]}]};
  r.get(base,{preValidation,schema:{...common,operationId:'getNetWorth',querystring:C.NetWorthQuery,response:{200:C.NetWorthSummary,...ErrorResponses}}},req=>service.summary(requireIdentity(req).authUserId,req.query.asOf));
  r.get(base+'/history',{preValidation,schema:{...common,operationId:'getNetWorthHistory',querystring:C.NetWorthHistoryQuery,response:{200:C.NetWorthHistory,...ErrorResponses}}},req=>service.history(requireIdentity(req).authUserId,req.query));
  r.get(base+'/items',{preValidation,schema:{...common,operationId:'listNetWorthItems',querystring:C.NetWorthItemQuery,response:{200:C.NetWorthItemsPage,...ErrorResponses}}},req=>service.list(requireIdentity(req).authUserId,req.query));
  r.post(base+'/items',{preValidation,schema:{...common,operationId:'createNetWorthItem',querystring:EmptyQuery,body:C.NetWorthItemInput,response:{201:C.NetWorthItem,...ErrorResponses}}},async(req,reply)=>reply.code(201).send(await service.create(requireIdentity(req).authUserId,req.body)));
  r.get(base+'/items/:itemId',{preValidation,schema:{...common,operationId:'getNetWorthItem',querystring:EmptyQuery,params:C.NetWorthParams,response:{200:C.NetWorthItem,...ErrorResponses}}},req=>service.get(requireIdentity(req).authUserId,req.params.itemId));
  r.patch(base+'/items/:itemId',{preValidation,schema:{...common,operationId:'patchNetWorthItem',querystring:EmptyQuery,params:C.NetWorthParams,body:C.NetWorthItemPatch,response:{200:C.NetWorthItem,...ErrorResponses}}},req=>service.patch(requireIdentity(req).authUserId,req.params.itemId,req.body));
  r.post(base+'/items/:itemId/archive',{preValidation,schema:{...common,operationId:'archiveNetWorthItem',querystring:EmptyQuery,params:C.NetWorthParams,body:RecurrenceEmptyBody,response:{200:C.NetWorthItem,...ErrorResponses}}},req=>service.archive(requireIdentity(req).authUserId,req.params.itemId));
  r.get(base+'/items/:itemId/valuations',{preValidation,schema:{...common,operationId:'listNetWorthValuations',querystring:C.NetWorthValuationQuery,params:C.NetWorthParams,response:{200:C.NetWorthValuationsPage,...ErrorResponses}}},req=>service.valuations(requireIdentity(req).authUserId,req.params.itemId,req.query));
  r.post(base+'/items/:itemId/valuations',{preValidation,schema:{...common,operationId:'addNetWorthValuation',querystring:EmptyQuery,params:C.NetWorthParams,body:C.NetWorthValuationInput,response:{201:C.NetWorthValuation,...ErrorResponses}}},async(req,reply)=>reply.code(201).send(await service.addValuation(requireIdentity(req).authUserId,req.params.itemId,req.body)));
}
