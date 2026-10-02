import { Type } from 'typebox';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../../shared/errors/index.js';
import { EmptyQuery, ErrorResponses } from '../../shared/http/schemas.js';

export function healthRoutes(app: FastifyInstance, ping: () => Promise<void>) {
  app.get('/api/v1/health/live', { config: { rateLimit: false }, schema: {
    operationId: 'liveness', tags: ['Health'], querystring: EmptyQuery,
    response: { 200: Type.Object({ status: Type.Literal('alive') }), ...ErrorResponses },
  } }, async () => ({ status: 'alive' }));
  app.get('/api/v1/health/ready', { config: { rateLimit: false }, schema: {
    operationId: 'readiness', tags: ['Health'], querystring: EmptyQuery,
    response: { 200: Type.Object({ status: Type.Literal('ready') }), ...ErrorResponses },
  } }, async () => {
    try { await ping(); } catch { throw new AppError('NOT_READY'); }
    return { status: 'ready' };
  });
}
