import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { authGuard,requireIdentity,type createVerifier } from '../auth/identity.js';
import { EmptyQuery,ErrorResponses } from '../../shared/http/schemas.js';
import type { SafeSpendRepository } from './safe-spend-repository.js';
import * as C from './safe-spend-contracts.js';
export function safeSpendRoutes(app: FastifyInstance,repo: SafeSpendRepository,verify: ReturnType<typeof createVerifier>,clock=()=>new Date()) {
  const r=app.withTypeProvider<TypeBoxTypeProvider>(),base='/api/v1/finance/safe-to-spend',preValidation=authGuard(verify),common={tags:['Finance Safe to Spend'],security:[{bearerAuth:[]}],querystring:C.SafeSpendQuery};
  r.get(base+'/settings',{preValidation,schema:{...common,operationId:'getSafeSpendSettings',response:{200:C.SafeSpendSettingsResponse,...ErrorResponses}}},req=>repo.settings(requireIdentity(req).authUserId,req.query.currency));
  r.put(base+'/settings',{preValidation,schema:{...common,querystring:EmptyQuery,operationId:'putSafeSpendSettings',body:C.SafeSpendSettingsInput,response:{200:C.SafeSpendSettings,...ErrorResponses}}},req=>repo.put(requireIdentity(req).authUserId,req.body));
  r.get(base,{preValidation,schema:{...common,operationId:'getSafeSpend',response:{200:C.SafeSpendView,...ErrorResponses}}},req=>repo.read(requireIdentity(req).authUserId,req.query.currency,clock()));
  r.get(base+'/summary',{preValidation,schema:{...common,querystring:EmptyQuery,operationId:'getSafeSpendSummary',response:{200:C.SafeSpendSummary,...ErrorResponses}}},req=>repo.summary(requireIdentity(req).authUserId,clock()));
}
