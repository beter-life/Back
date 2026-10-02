import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import { authGuard, requireIdentity } from '../auth/identity.js';
import type { createVerifier } from '../auth/identity.js';
import type { FinanceRepository } from './repository.js';
import { financeService } from './application.js';
import * as C from './contracts.js';
import { EmptyQuery, ErrorResponses } from '../../shared/http/schemas.js';
export function financeRoutes(
  app: FastifyInstance,
  repository: FinanceRepository,
  verify: ReturnType<typeof createVerifier>,
) {
  const router = app.withTypeProvider<TypeBoxTypeProvider>();
  const service = financeService(repository);
  const base = '/api/v1/finance';
  const common = { tags: ['Finance'], security: [{ bearerAuth: [] }], querystring: EmptyQuery };
  const preValidation = authGuard(verify);
  router.get(
    `${base}/accounts`,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'listFinancialAccounts',
        response: { 200: Type.Array(C.Account), ...ErrorResponses },
      },
    },
    (req) => service.accounts(requireIdentity(req).authUserId),
  );
  router.get(
    `${base}/accounts/:id`,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'getFinancialAccount',
        params: C.IdParams,
        response: { 200: C.Account, ...ErrorResponses },
      },
    },
    (req) => service.account(requireIdentity(req).authUserId, req.params.id),
  );
  router.post(
    `${base}/accounts`,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'createFinancialAccount',
        body: C.AccountInput,
        response: { 201: C.Account, ...ErrorResponses },
      },
    },
    async (req, reply) =>
      reply.code(201).send(await service.createAccount(requireIdentity(req).authUserId, req.body)),
  );
  router.patch(
    `${base}/accounts/:id`,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'patchFinancialAccount',
        params: C.IdParams,
        body: C.AccountPatch,
        response: { 200: C.Account, ...ErrorResponses },
      },
    },
    (req) => service.patchAccount(requireIdentity(req).authUserId, req.params.id, req.body),
  );
  router.get(
    `${base}/categories`,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'listFinancialCategories',
        response: { 200: Type.Array(C.Category), ...ErrorResponses },
      },
    },
    (req) => service.categories(requireIdentity(req).authUserId),
  );
  router.post(
    `${base}/categories`,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'createFinancialCategory',
        body: C.CategoryInput,
        response: { 201: C.Category, ...ErrorResponses },
      },
    },
    async (req, reply) =>
      reply.code(201).send(await service.createCategory(requireIdentity(req).authUserId, req.body)),
  );
  router.patch(
    `${base}/categories/:id`,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'patchFinancialCategory',
        params: C.IdParams,
        body: C.CategoryPatch,
        response: { 200: C.Category, ...ErrorResponses },
      },
    },
    (req) => service.patchCategory(requireIdentity(req).authUserId, req.params.id, req.body),
  );
  router.get(
    `${base}/transactions`,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'listFinancialTransactions',
        querystring: C.TransactionQuery,
        response: { 200: C.TransactionPage, ...ErrorResponses },
      },
    },
    (req) => service.transactions(requireIdentity(req).authUserId, req.query),
  );
  router.get(
    `${base}/transactions/:id`,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'getFinancialTransaction',
        params: C.IdParams,
        response: { 200: C.Transaction, ...ErrorResponses },
      },
    },
    (req) => service.transaction(requireIdentity(req).authUserId, req.params.id),
  );
  router.post(
    `${base}/transactions`,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'createFinancialTransaction',
        body: C.TransactionInput,
        response: { 201: C.Transaction, ...ErrorResponses },
      },
    },
    async (req, reply) =>
      reply
        .code(201)
        .send(await service.createTransaction(requireIdentity(req).authUserId, req.body)),
  );
  router.patch(
    `${base}/transactions/:id`,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'patchFinancialTransaction',
        params: C.IdParams,
        body: C.TransactionPatch,
        response: { 200: C.Transaction, ...ErrorResponses },
      },
    },
    (req) => service.patchTransaction(requireIdentity(req).authUserId, req.params.id, req.body),
  );
  router.post(
    `${base}/transfers`,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'createFinancialTransfer',
        body: C.TransferInput,
        response: { 201: C.Transfer, ...ErrorResponses },
      },
    },
    async (req, reply) =>
      reply.code(201).send(await service.createTransfer(requireIdentity(req).authUserId, req.body)),
  );
  router.patch(
    `${base}/transfers/:id`,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'patchFinancialTransfer',
        params: C.IdParams,
        body: C.TransferPatch,
        response: { 200: C.Transfer, ...ErrorResponses },
      },
    },
    (req) => service.patchTransfer(requireIdentity(req).authUserId, req.params.id, req.body),
  );
  router.get(
    `${base}/summary`,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'getFinancialSummary',
        querystring: C.SummaryQuery,
        response: { 200: C.Summary, ...ErrorResponses },
      },
    },
    (req) => service.summary(requireIdentity(req).authUserId, req.query.from, req.query.to),
  );
}
