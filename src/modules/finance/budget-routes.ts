import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { ProfileRepository } from '../profile/repository.js';
import { authGuard, requireIdentity, type createVerifier } from '../auth/identity.js';
import { ErrorResponses, EmptyQuery } from '../../shared/http/schemas.js';
import type { BudgetRepository } from './budget-repository.js';
import { budgetService } from './budget-application.js';
import * as C from './budget-contracts.js';

export function budgetRoutes(
  app: FastifyInstance,
  repository: BudgetRepository,
  profiles: ProfileRepository,
  verify: ReturnType<typeof createVerifier>,
  clock?: () => Date,
) {
  const router = app.withTypeProvider<TypeBoxTypeProvider>();
  const service = budgetService(repository, profiles, clock);
  const base = '/api/v1/finance/budgets/:month';
  const common = {
    tags: ['Finance Budget'],
    security: [{ bearerAuth: [] }],
    params: C.BudgetMonthParams,
  };
  const preValidation = authGuard(verify);
  router.get(
    base,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'getMonthlyBudget',
        querystring: C.BudgetCurrencyQuery,
        response: { 200: C.BudgetView, ...ErrorResponses },
      },
    },
    (req) => service.get(requireIdentity(req).authUserId, req.params.month, req.query.currency),
  );
  router.put(
    base,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'ensureMonthlyBudget',
        querystring: EmptyQuery,
        body: C.BudgetPeriodInput,
        response: { 200: C.BudgetPeriod, ...ErrorResponses },
      },
    },
    (req) => service.create(requireIdentity(req).authUserId, req.params.month, req.body),
  );
  router.patch(
    `${base}/categories/:categoryId`,
    {
      preValidation,
      schema: {
        ...common,
        params: C.BudgetCategoryParams,
        operationId: 'putMonthlyBudgetAllocation',
        querystring: EmptyQuery,
        body: C.BudgetAllocationInput,
        response: { 200: C.BudgetAllocation, ...ErrorResponses },
      },
    },
    (req) =>
      service.putAllocation(
        requireIdentity(req).authUserId,
        req.params.month,
        req.params.categoryId,
        req.body,
      ),
  );
  router.delete(
    `${base}/categories/:categoryId`,
    {
      preValidation,
      schema: {
        ...common,
        params: C.BudgetCategoryParams,
        operationId: 'deactivateMonthlyBudgetAllocation',
        querystring: C.BudgetCurrencyQuery,
        response: { 200: C.BudgetAllocation, ...ErrorResponses },
      },
    },
    (req) =>
      service.remove(
        requireIdentity(req).authUserId,
        req.params.month,
        req.params.categoryId,
        req.query.currency,
      ),
  );
  router.post(
    `${base}/copy-previous`,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'copyPreviousMonthlyBudget',
        querystring: EmptyQuery,
        body: C.BudgetPeriodInput,
        response: { 200: C.BudgetCopyResult, ...ErrorResponses },
      },
    },
    (req) => service.copy(requireIdentity(req).authUserId, req.params.month, req.body),
  );
  router.get(
    `${base}/summary`,
    {
      preValidation,
      schema: {
        ...common,
        operationId: 'getMonthlyBudgetSummary',
        querystring: C.BudgetCurrencyQuery,
        response: { 200: C.BudgetSummary, ...ErrorResponses },
      },
    },
    (req) => service.summary(requireIdentity(req).authUserId, req.params.month, req.query.currency),
  );
}
