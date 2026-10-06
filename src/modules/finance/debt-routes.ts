import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import type { DebtRepository } from './debt-repository.js';
import type { ProfileRepository } from '../profile/repository.js';
import { authGuard, requireIdentity, type createVerifier } from '../auth/identity.js';
import { EmptyQuery, ErrorResponses } from '../../shared/http/schemas.js';
import { debtService } from './debt-application.js';
import * as C from './debt-contracts.js';
export function debtRoutes(app:FastifyInstance,repo:DebtRepository,profiles:ProfileRepository,verify:ReturnType<typeof createVerifier>,clock?:()=>Date) {
  const r=app.withTypeProvider<TypeBoxTypeProvider>(),s=debtService(repo,profiles,clock),base='/api/v1/finance/debts',item=base+'/:debtId',preValidation=authGuard(verify),common={tags:['Finance Debts'],security:[{bearerAuth:[]}],querystring:EmptyQuery},empty=Type.Object({},{additionalProperties:false});
  r.get(base,{preValidation,schema:{...common,operationId:'listDebts',response:{200:Type.Array(C.Debt),...ErrorResponses}}},req=>s.list(requireIdentity(req).authUserId));
  r.post(base,{preValidation,schema:{...common,operationId:'createDebt',body:C.DebtInput,response:{201:C.Debt,...ErrorResponses}}},async(req,reply)=>reply.code(201).send(await s.create(requireIdentity(req).authUserId,req.body)));
  r.get(base+'/summary',{preValidation,schema:{...common,operationId:'getDebtSummary',response:{200:C.Summary,...ErrorResponses}}},req=>s.summary(requireIdentity(req).authUserId));
  r.post(base+'/simulate',{preValidation,schema:{...common,operationId:'simulateDebtPayoff',body:C.SimulationInput,response:{200:C.SimulationResponse,...ErrorResponses}}},req=>s.simulate(requireIdentity(req).authUserId,req.body));
  r.get(item,{preValidation,schema:{...common,params:C.DebtParams,operationId:'getDebt',response:{200:C.DebtView,...ErrorResponses}}},req=>s.view(requireIdentity(req).authUserId,req.params.debtId));
  r.patch(item,{preValidation,schema:{...common,params:C.DebtParams,operationId:'patchDebt',body:C.DebtPatch,response:{200:C.Debt,...ErrorResponses}}},req=>s.patch(requireIdentity(req).authUserId,req.params.debtId,req.body));
  r.post(item+'/archive',{preValidation,schema:{...common,params:C.DebtParams,operationId:'archiveDebt',body:empty,response:{200:C.Debt,...ErrorResponses}}},req=>s.archive(requireIdentity(req).authUserId,req.params.debtId));
  r.get(item+'/terms',{preValidation,schema:{...common,params:C.DebtParams,operationId:'listDebtTerms',response:{200:Type.Array(C.Term),...ErrorResponses}}},req=>s.terms(requireIdentity(req).authUserId,req.params.debtId));
  r.post(item+'/terms',{preValidation,schema:{...common,params:C.DebtParams,operationId:'addDebtTerm',body:C.TermInput,response:{201:C.Term,...ErrorResponses}}},async(req,reply)=>reply.code(201).send(await s.addTerm(requireIdentity(req).authUserId,req.params.debtId,req.body)));
  r.get(item+'/payments',{preValidation,schema:{...common,params:C.DebtParams,querystring:C.PaymentQuery,operationId:'listDebtPayments',response:{200:C.PaymentPage,...ErrorResponses}}},req=>s.payments(requireIdentity(req).authUserId,req.params.debtId,req.query));
  r.post(item+'/payments',{preValidation,schema:{...common,params:C.DebtParams,operationId:'createDebtPayment',body:C.PaymentInput,response:{201:C.Payment,...ErrorResponses}}},async(req,reply)=>reply.code(201).send(await s.payment(requireIdentity(req).authUserId,req.params.debtId,req.body)));
  r.post(item+'/payments/:paymentId/cancel',{preValidation,schema:{...common,params:C.PaymentParams,operationId:'cancelDebtPayment',body:empty,response:{200:C.Payment,...ErrorResponses}}},req=>s.cancel(requireIdentity(req).authUserId,req.params.debtId,req.params.paymentId));
}
