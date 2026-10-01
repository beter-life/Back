import Fastify, { LogController } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { Type } from 'typebox';
import { randomUUID } from 'node:crypto';
import type { Writable } from 'node:stream';
import type { JWTVerifyGetKey } from 'jose';
import type { AppConfig } from './config/env.js';
import { createDatabase } from './db/client.js';
import { createProfileRepository } from './modules/profile/repository.js';
import type { ProfileRepository } from './modules/profile/repository.js';
import { createVerifier } from './modules/auth/identity.js';
import { profileRoutes } from './modules/profile/routes.js';
import { healthRoutes } from './modules/health/routes.js';
import { createFinanceRepository, type FinanceRepository } from './modules/finance/repository.js';
import { financeRoutes } from './modules/finance/routes.js';
import { loggerOptions } from './plugins/logging.js';
import { AppError, installErrors } from './shared/errors/index.js';
import { EmptyQuery, ErrorResponses } from './shared/http/schemas.js';

export interface AppDependencies {
  profiles: ProfileRepository;
  finance?: FinanceRepository;
  ping: () => Promise<void>;
  close: () => Promise<void>;
}
export interface AppOptions { dependencies?: AppDependencies; jwks?: JWTVerifyGetKey; logStream?: Writable }

export async function buildApp(config: AppConfig, options: AppOptions = {}) {
  const app = Fastify({
    logger: { ...loggerOptions, level: config.logLevel, ...(options.logStream ? { stream: options.logStream } : {}) },
    logController: new LogController({ disableRequestLogging: true }), requestIdHeader: false, bodyLimit: config.bodyLimit,
    requestTimeout: 15000, connectionTimeout: 10000, keepAliveTimeout: 5000,
    trustProxy: (_address, hop) => hop < config.trustProxyHops,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false, useDefaults: false } },
    genReqId: (request) => {
      const external = request.headers['x-request-id'];
      return typeof external === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(external) ? external : randomUUID();
    },
  });
  app.decorateRequest('identity', null);
  installErrors(app);
  app.addHook('onRequest', async (request, reply) => { reply.header('x-request-id', request.id); });
  app.addHook('onResponse', async (request, reply) => {
    request.log.info({ requestId: request.id, method: request.method,
      route: request.routeOptions.url ?? 'unmatched', status: reply.statusCode, durationMs: reply.elapsedTime }, 'request completed');
  });
  const database = options.dependencies ? undefined : createDatabase(config);
  const dependencies = options.dependencies ?? {
    profiles: createProfileRepository(database!), finance: createFinanceRepository(database!), ping: database!.ping, close: database!.close,
  };
  database?.pool.on('error', () => app.log.error({ code: 'DATABASE_POOL_ERROR' }, 'database connection failed'));
  app.addHook('onClose', dependencies.close);
  try {
    await app.register(swagger, { openapi: {
      openapi: '3.0.3', info: { title: 'Beter Life Backend API', version: '1.0.0' },
      servers: [{ url: '/' }], components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    } });
    await app.register(helmet);
    await app.register(cors, {
      origin: (origin, callback) => {
        if (!origin || config.corsOrigins.includes(origin)) callback(null, true);
        else callback(new AppError('FORBIDDEN'), false);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'], allowedHeaders: ['authorization', 'content-type', 'x-request-id'],
      exposedHeaders: ['x-request-id'], credentials: false, maxAge: 600,
    });
    await app.register(rateLimit, {
      max: config.rateLimitMax, timeWindow: '1 minute',
      errorResponseBuilder: () => new AppError('RATE_LIMITED'),
    });
    healthRoutes(app, dependencies.ping);
    profileRoutes(app, dependencies.profiles, createVerifier(config, options.jwks));
    if (dependencies.finance) financeRoutes(app, dependencies.finance, createVerifier(config, options.jwks));
    app.get('/api/v1/openapi.json', { schema: {
      operationId: 'getOpenApi', tags: ['Contract'], querystring: EmptyQuery,
      response: { 200: Type.Record(Type.String(), Type.Unknown()), ...ErrorResponses },
    } }, async () => app.swagger());
    if (config.mode === 'development') await app.register(swaggerUi, { routePrefix: '/docs' });
    await app.ready();
    return app;
  } catch (error) { await app.close(); throw error; }
}
