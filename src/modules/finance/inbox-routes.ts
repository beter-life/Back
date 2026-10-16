import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { authGuard, requireIdentity, type createVerifier } from '../auth/identity.js';
import { EmptyQuery, ErrorResponses } from '../../shared/http/schemas.js';
import { IdParams } from './contracts.js';
import type { InboxRepository } from './inbox-repository.js';
import * as C from './inbox-contracts.js';

export function inboxRoutes(app: FastifyInstance, repository: InboxRepository, verify: ReturnType<typeof createVerifier>) {
  const router=app.withTypeProvider<TypeBoxTypeProvider>(),base='/api/v1/finance/inbox';
  const preValidation=authGuard(verify), common={tags:['Financial Inbox'],security:[{bearerAuth:[]}],querystring:EmptyQuery};
  router.get(base,{preValidation,schema:{...common,operationId:'listInboxCandidates',querystring:C.InboxQuery,response:{200:C.InboxPage,...ErrorResponses}}},req=>repository.list(requireIdentity(req).authUserId,req.query));
  router.post(base,{preValidation,schema:{...common,operationId:'createInboxCandidate',body:C.InboxCreate,response:{201:C.InboxItem,...ErrorResponses}}},async(req,reply)=>reply.code(201).send(await repository.create(requireIdentity(req).authUserId,req.body)));
  router.get(base+'/:id',{preValidation,schema:{...common,operationId:'reviewInboxCandidate',params:IdParams,response:{200:C.InboxReview,...ErrorResponses}}},req=>repository.review(requireIdentity(req).authUserId,req.params.id));
  router.patch(base+'/:id',{preValidation,schema:{...common,operationId:'editInboxCandidate',params:IdParams,body:C.InboxEdit,response:{200:C.InboxItem,...ErrorResponses}}},req=>repository.edit(requireIdentity(req).authUserId,req.params.id,req.body));
  router.post(base+'/:id/confirm',{preValidation,schema:{...common,operationId:'confirmInboxCandidate',params:IdParams,body:C.InboxConfirm,response:{200:C.InboxItem,...ErrorResponses}}},req=>repository.confirm(requireIdentity(req).authUserId,req.params.id,req.body));
  router.post(base+'/:id/discard',{preValidation,schema:{...common,operationId:'discardInboxCandidate',params:IdParams,body:C.InboxDiscard,response:{200:C.InboxItem,...ErrorResponses}}},req=>repository.discard(requireIdentity(req).authUserId,req.params.id,req.body));
}
