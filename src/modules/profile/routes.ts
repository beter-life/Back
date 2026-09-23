import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { authGuard, requireIdentity } from '../auth/identity.js';
import type { createVerifier } from '../auth/identity.js';
import type { ProfileRepository } from './repository.js';
import { Profile, ProfileInput, MeResponse } from './schema.js';
import { profileService } from './service.js';
import { EmptyQuery, ErrorResponses } from '../../shared/http/schemas.js';

export function profileRoutes(app: FastifyInstance, repository: ProfileRepository, verify: ReturnType<typeof createVerifier>) {
  const router = app.withTypeProvider<TypeBoxTypeProvider>();
  const service = profileService(repository);
  const guard = authGuard(verify);
  router.get('/api/v1/me', { preValidation: guard, schema: {
    operationId: 'getMe', tags: ['Identity'], security: [{ bearerAuth: [] }], querystring: EmptyQuery,
    summary: 'Read the authenticated identity and optional profile; no writes.',
    response: { 200: MeResponse, ...ErrorResponses },
  } }, async (request) => service.me(requireIdentity(request)));
  router.put('/api/v1/me/profile', { preValidation: guard, schema: {
    operationId: 'putMyProfile', tags: ['Identity'], security: [{ bearerAuth: [] }], querystring: EmptyQuery,
    summary: 'Idempotently create or replace the authenticated user profile.',
    body: ProfileInput, response: { 200: Profile, ...ErrorResponses },
  } }, async (request) => service.put(requireIdentity(request), request.body));
}
