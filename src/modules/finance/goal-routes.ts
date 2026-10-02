import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import type { ProfileRepository } from '../profile/repository.js';
import { authGuard, requireIdentity, type createVerifier } from '../auth/identity.js';
import { EmptyQuery, ErrorResponses } from '../../shared/http/schemas.js';
import type { GoalRepository } from './goal-repository.js';
import { goalService } from './goal-application.js';
import * as C from './goal-contracts.js';
export function goalRoutes(app: FastifyInstance, repository: GoalRepository, profiles: ProfileRepository, verify: ReturnType<typeof createVerifier>, clock?: () => Date) {
  const router = app.withTypeProvider<TypeBoxTypeProvider>();
  const service = goalService(repository, profiles, clock);
  const base = '/api/v1/finance/goals';
  const common = { tags: ['Finance Goals'], security: [{ bearerAuth: [] }] };
  const preValidation = authGuard(verify);
  router.get(base, { preValidation, schema: { ...common, operationId: 'listFinancialGoals', querystring: C.GoalQuery, response: { 200: Type.Array(C.Goal), ...ErrorResponses } } }, req => service.list(requireIdentity(req).authUserId, req.query));
  router.post(base, { preValidation, schema: { ...common, operationId: 'createFinancialGoal', querystring: EmptyQuery, body: C.GoalInput, response: { 201: C.Goal, ...ErrorResponses } } }, async (req, reply) => reply.code(201).send(await service.create(requireIdentity(req).authUserId, req.body)));
  router.get(base + '/:goalId', { preValidation, schema: { ...common, operationId: 'getFinancialGoal', params: C.GoalParams, querystring: EmptyQuery, response: { 200: C.Goal, ...ErrorResponses } } }, req => service.get(requireIdentity(req).authUserId, req.params.goalId));
  router.patch(base + '/:goalId', { preValidation, schema: { ...common, operationId: 'patchFinancialGoal', params: C.GoalParams, querystring: EmptyQuery, body: C.GoalPatch, response: { 200: C.Goal, ...ErrorResponses } } }, req => service.patch(requireIdentity(req).authUserId, req.params.goalId, req.body));
  router.get(base + '/:goalId/events', { preValidation, schema: { ...common, operationId: 'listFinancialGoalEvents', params: C.GoalParams, querystring: C.GoalEventsQuery, response: { 200: C.GoalEventsPage, ...ErrorResponses } } }, req => service.events(requireIdentity(req).authUserId, req.params.goalId, req.query));
  router.post(base + '/:goalId/events', { preValidation, schema: { ...common, operationId: 'addFinancialGoalEvent', params: C.GoalParams, querystring: EmptyQuery, body: C.GoalEventInput, response: { 201: C.GoalEvent, ...ErrorResponses } } }, async (req, reply) => reply.code(201).send(await service.addEvent(requireIdentity(req).authUserId, req.params.goalId, req.body)));
}
