import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { authGuard,requireIdentity,type createVerifier } from '../auth/identity.js';
import { EmptyQuery,ErrorResponses } from '../../shared/http/schemas.js';
import { IdParams } from './contracts.js';
import type { ReconciliationRepository } from './reconciliation-repository.js';
import * as C from './reconciliation-contracts.js';
export function reconciliationRoutes(app:FastifyInstance,repo:ReconciliationRepository,verify:ReturnType<typeof createVerifier>){
  const r=app.withTypeProvider<TypeBoxTypeProvider>(),base='/api/v1/finance/reconciliation',onRequest=authGuard(verify),common={tags:['Financial Reconciliation'],security:[{bearerAuth:[]}],querystring:EmptyQuery};
  r.get(base+'/evidence',{onRequest,schema:{...common,operationId:'listStatementEvidence',querystring:C.ReconciliationQuery,response:{200:C.ReconciliationEvidencePage,...ErrorResponses}}},req=>repo.listEvidence(requireIdentity(req).authUserId,req.query));
  r.post(base+'/evidence',{onRequest,schema:{...common,operationId:'captureStatementEvidence',body:C.ReconciliationCapture,response:{200:C.ReconciliationCaptured,...ErrorResponses}}},req=>repo.capture(requireIdentity(req).authUserId,req.body));
  r.get(base+'/evidence/:id',{onRequest,schema:{...common,operationId:'reviewStatementEvidence',params:IdParams,response:{200:C.ReconciliationReview,...ErrorResponses}}},req=>repo.review(requireIdentity(req).authUserId,req.params.id));
  r.get(base+'/movements',{onRequest,schema:{...common,operationId:'listReconciliationMovements',querystring:C.ReconciliationQuery,response:{200:C.ReconciliationMovementPage,...ErrorResponses}}},req=>repo.movements(requireIdentity(req).authUserId,req.query));
  r.get(base+'/proposals',{onRequest,schema:{...common,operationId:'listReconciliationProposals',querystring:C.ReconciliationQuery,response:{200:C.ReconciliationProposalPage,...ErrorResponses}}},req=>repo.proposals(requireIdentity(req).authUserId,req.query));
  r.get(base+'/history',{onRequest,schema:{...common,operationId:'listReconciliationHistory',querystring:C.ReconciliationQuery,response:{200:C.ReconciliationHistory,...ErrorResponses}}},req=>repo.history(requireIdentity(req).authUserId,req.query));
  r.post(base+'/matches',{onRequest,schema:{...common,operationId:'confirmFinancialReconciliation',body:C.ReconciliationConfirm,response:{200:C.ReconciliationMatch,...ErrorResponses}}},req=>repo.confirm(requireIdentity(req).authUserId,req.body));
  r.post(base+'/matches/:id/reverse',{onRequest,schema:{...common,operationId:'reverseFinancialReconciliation',params:IdParams,body:C.ReconciliationReverse,response:{200:C.ReconciliationMatch,...ErrorResponses}}},req=>repo.reverse(requireIdentity(req).authUserId,req.params.id,req.body));
}
