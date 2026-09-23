import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import type { FastifyRequest } from 'fastify';
import type { AppConfig } from '../../config/env.js';
import { AppError } from '../../shared/errors/index.js';
import { uuidPattern } from '../../shared/http/schemas.js';

export interface Identity { readonly authUserId: string }
declare module 'fastify' { interface FastifyRequest { identity: Identity | null } }

export function createVerifier(config: AppConfig, resolver?: JWTVerifyGetKey) {
  const keys = resolver ?? createRemoteJWKSet(new URL(config.jwksUrl), {
    timeoutDuration: 3000, cooldownDuration: 30000, cacheMaxAge: 600000,
  });
  return async (token: string): Promise<Identity> => {
    try {
      const { payload } = await jwtVerify(token, keys, {
        algorithms: [config.algorithm], issuer: config.issuer, audience: config.audience,
        requiredClaims: ['sub', 'exp', 'iat', 'iss', 'aud'], clockTolerance: 5,
      });
      if (!payload.sub || !uuidPattern.test(payload.sub) || payload.role !== 'authenticated') throw new AppError('AUTH_INVALID_TOKEN');
      return Object.freeze({ authUserId: payload.sub });
    } catch (error) {
      if (error instanceof joseErrors.JWKSTimeout || error instanceof TypeError) throw new AppError('AUTH_UNAVAILABLE');
      throw new AppError('AUTH_INVALID_TOKEN');
    }
  };
}

export function authGuard(verify: ReturnType<typeof createVerifier>) {
  return async (request: FastifyRequest) => {
    const header = request.headers.authorization;
    if (!header) throw new AppError('AUTH_MISSING_TOKEN');
    const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(header);
    if (!match?.[1] || header.length > 8192) throw new AppError('AUTH_INVALID_TOKEN');
    request.identity = await verify(match[1]);
  };
}
export function requireIdentity(request: FastifyRequest): Identity {
  if (!request.identity) throw new AppError('AUTH_MISSING_TOKEN');
  return request.identity;
}
