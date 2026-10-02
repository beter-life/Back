import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { ProfileRepository } from '../profile/repository.js';
import { authGuard, requireIdentity, type createVerifier } from '../auth/identity.js';
import { EmptyQuery, ErrorResponses } from '../../shared/http/schemas.js';
import type { RecurrenceRepository } from './recurrence-repository.js';
import { recurrenceService } from './recurrence-application.js';
import * as C from './recurrence-contracts.js';
export function recurrenceRoutes(app: FastifyInstance, repository: RecurrenceRepository, profiles: ProfileRepository, verify: ReturnType<typeof createVerifier>, clock?: () => Date) {
  const router = app.withTypeProvider<TypeBoxTypeProvider>(), service = recurrenceService(repository, profiles, clock);
  const base = '/api/v1/finance/recurrences', common = { tags: ['Finance Recurrences'], security: [{ bearerAuth: [] }] }, preValidation = authGuard(verify);
  router.get(base, { preValidation, schema: { ...common, operationId: 'listFinancialRecurrences', querystring: C.RecurrenceQuery, response: { 200: C.RecurrencePage, ...ErrorResponses } } }, req => service.list(requireIdentity(req).authUserId, req.query));
  router.post(base, { preValidation, schema: { ...common, operationId: 'createFinancialRecurrence', querystring: EmptyQuery, body: C.RecurrenceInput, response: { 201: C.Recurrence, ...ErrorResponses } } }, async (req, reply) => reply.code(201).send(await service.create(requireIdentity(req).authUserId, req.body)));
  router.get(base + '/:recurrenceId', { preValidation, schema: { ...common, operationId: 'getFinancialRecurrence', params: C.RecurrenceParams, querystring: EmptyQuery, response: { 200: C.Recurrence, ...ErrorResponses } } }, req => service.get(requireIdentity(req).authUserId, req.params.recurrenceId));
  router.patch(base + '/:recurrenceId', { preValidation, schema: { ...common, operationId: 'patchFinancialRecurrence', params: C.RecurrenceParams, querystring: EmptyQuery, body: C.RecurrencePatch, response: { 200: C.Recurrence, ...ErrorResponses } } }, req => service.patch(requireIdentity(req).authUserId, req.params.recurrenceId, req.body));
  for (const [action, status] of [['pause','PAUSED'],['resume','ACTIVE'],['archive','ARCHIVED']] as const) router.post(base + '/:recurrenceId/' + action, { preValidation, schema: { ...common, operationId: action + 'FinancialRecurrence', params: C.RecurrenceParams, querystring: EmptyQuery, body: C.RecurrenceEmptyBody, response: { 200: C.Recurrence, ...ErrorResponses } } }, req => service.status(requireIdentity(req).authUserId, req.params.recurrenceId, status));
  router.get('/api/v1/finance/calendar', { preValidation, schema: { ...common, operationId: 'getFinancialCalendar', querystring: C.CalendarQuery, response: { 200: C.FinancialCalendar, ...ErrorResponses } } }, req => service.calendar(requireIdentity(req).authUserId, req.query));
  router.get('/api/v1/finance/subscriptions/radar', { preValidation, schema: { ...common, operationId: 'getSubscriptionRadar', querystring: C.RadarQuery, response: { 200: C.SubscriptionRadar, ...ErrorResponses } } }, req => service.radar(requireIdentity(req).authUserId, req.query));
}
