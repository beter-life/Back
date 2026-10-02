import { afterEach, describe, it, expect, vi } from 'vitest';
import { Writable } from 'node:stream';
import { buildApp } from '../../src/app.js';
import { config, signingFixture, memoryProfiles, userA, userB, profileInput } from '../helpers.js';
import type { AppDependencies } from '../../src/app.js';

const fixture = await signingFixture();
const apps: Awaited<ReturnType<typeof buildApp>>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });
async function makeApp(overrides: Partial<AppDependencies> = {}, limit = 100) {
  const app = await buildApp({ ...config, rateLimitMax: limit }, { jwks: fixture.resolver,
    dependencies: { profiles: memoryProfiles(), ping: async () => {}, close: async () => {}, ...overrides } });
  apps.push(app);
  return app;
}
const bearer = async (sub = userA) => ({ authorization: `Bearer ${await fixture.token({ sub })}` });

describe('HTTP application', () => {
  it('liveness is independent; readiness checks PostgreSQL and hides failure details', async () => {
    const ping = vi.fn().mockRejectedValue(new Error('postgresql://sensitive/path'));
    const app = await makeApp({ ping });
    expect((await app.inject('/api/v1/health/live')).json()).toEqual({ status: 'alive' });
    expect(ping).not.toHaveBeenCalled();
    const ready = await app.inject('/api/v1/health/ready');
    expect(ready.statusCode).toBe(503);
    expect(ready.json().error.code).toBe('NOT_READY');
    expect(ready.body).not.toContain('postgresql');
  });
  it('reports ready when the database probe passes', async () => {
    expect((await (await makeApp()).inject('/api/v1/health/ready')).statusCode).toBe(200);
  });
  it('returns stable not-found errors and request IDs', async () => {
    const app = await makeApp();
    const response = await app.inject({ url: '/missing', headers: { 'x-request-id': 'safe-id' } });
    expect(response.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Resource not found.', requestId: 'safe-id' } });
    expect(response.headers['x-request-id']).toBe('safe-id');
    const generated = await app.inject({ url: '/missing', headers: { 'x-request-id': 'unsafe id' } });
    expect(generated.headers['x-request-id']).toMatch(/^[a-f0-9-]{36}$/);
  });
  it('enforces CORS allowlist and security headers', async () => {
    const app = await makeApp();
    const allowed = await app.inject({ url: '/api/v1/health/live', headers: { origin: 'http://localhost:3000' } });
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(allowed.headers['x-content-type-options']).toBe('nosniff');
    const denied = await app.inject({ url: '/api/v1/health/live', headers: { origin: 'https://evil.test' } });
    expect(denied.statusCode).toBe(403);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
    expect((await app.inject({ method: 'OPTIONS', url: '/api/v1/me', headers: {
      origin: 'http://localhost:3000', 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization',
    } })).statusCode).toBe(204);
  });
  it('rejects missing and malformed authentication', async () => {
    const app = await makeApp();
    expect((await app.inject('/api/v1/me')).json().error.code).toBe('AUTH_MISSING_TOKEN');
    const invalid = await app.inject({ url: '/api/v1/me', headers: { authorization: 'Bearer nonsense' } });
    expect(invalid.statusCode).toBe(401);
    expect(invalid.json().error.code).toBe('AUTH_INVALID_TOKEN');
  });
  it('GET does not create a profile; writes are scoped to token identity', async () => {
    const app = await makeApp();
    const headersA = await bearer();
    const headersB = await bearer(userB);
    expect((await app.inject({ url: '/api/v1/me', headers: headersA })).json()).toEqual({ identity: { authUserId: userA }, profile: null });
    const put = await app.inject({ method: 'PUT', url: '/api/v1/me/profile', headers: headersA, payload: profileInput });
    expect(put.statusCode).toBe(200);
    expect((await app.inject({ url: '/api/v1/me', headers: headersB })).json().profile).toBeNull();
    expect((await app.inject({ url: '/api/v1/me', headers: { ...headersA, 'x-user-id': userB } })).json().profile.id).toBe(put.json().id);
    expect((await app.inject({ method: 'PUT', url: '/api/v1/me/profile', headers: headersA, payload: { ...profileInput, authUserId: userB } })).statusCode).toBe(400);
  });
  it.each([{ displayName: ' ' }, { timezone: 'Invalid/Zone' }, { locale: 'a' }, { displayName: 'x'.repeat(101) }])('rejects invalid profile %j', async (invalid) => {
    const app = await makeApp();
    const response = await app.inject({ method: 'PUT', url: '/api/v1/me/profile', headers: await bearer(), payload: { ...profileInput, ...invalid } });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });
  it('rejects unexpected query, unsupported content types and oversized bodies', async () => {
    const app = await makeApp();
    expect((await app.inject({ url: '/api/v1/me?userId=another', headers: await bearer() })).statusCode).toBe(400);
    expect((await app.inject({ method: 'PUT', url: '/api/v1/me/profile', headers: { ...await bearer(), 'content-type': 'application/xml' }, payload: '<x />' })).statusCode).toBe(415);
    expect((await app.inject({ method: 'PUT', url: '/api/v1/me/profile', headers: await bearer(), payload: { ...profileInput, displayName: 'x'.repeat(20000) } })).statusCode).toBe(413);
  });
  it('rate-limits requests with consistent errors', async () => {
    const app = await makeApp({}, 1);
    await app.inject('/api/v1/me');
    const response = await app.inject('/api/v1/me');
    expect(response.statusCode).toBe(429);
    expect(response.json().error.code).toBe('RATE_LIMITED');
    expect(response.json().error.requestId).toBe(response.headers['x-request-id']);
  });
  it('closes owned resources', async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    const app = await makeApp({ close });
    await app.close();
    expect(close).toHaveBeenCalledOnce();
  });
  it('does not enable interactive docs in test/production contract', async () => {
    expect((await (await makeApp()).inject('/docs')).statusCode).toBe(404);
  });
  it('redacts sensitive log fields and never logs request secrets or internal errors', async () => {
    let logs = '';
    const stream = new Writable({ write(chunk: Buffer, _encoding, callback) { logs += chunk.toString(); callback(); } });
    const repository = memoryProfiles();
    repository.findByAuthUser = async () => { throw new Error('SQL_PASSWORD_SECRET'); };
    const app = await buildApp({ ...config, logLevel: 'info' }, { jwks: fixture.resolver, logStream: stream,
      dependencies: { profiles: repository, ping: async () => {}, close: async () => {} } });
    apps.push(app);
    const token = await fixture.token();
    const response = await app.inject({ url: '/api/v1/me', headers: { authorization: `Bearer ${token}`, cookie: 'COOKIE_SECRET' } });
    await app.inject('/unknown?token=QUERY_SECRET');
    app.log.info({ password: 'PASSWORD_SECRET', DATABASE_URL: 'CONNECTION_SECRET', refresh_token: 'REFRESH_SECRET' }, 'redaction test');
    expect(response.statusCode).toBe(500);
    expect(response.json().error.code).toBe('INTERNAL_ERROR');
    for (const secret of [token, 'COOKIE_SECRET', 'SQL_PASSWORD_SECRET', 'PASSWORD_SECRET', 'QUERY_SECRET', 'CONNECTION_SECRET', 'REFRESH_SECRET']) {
      expect(logs).not.toContain(secret); expect(response.body).not.toContain(secret);
    }
    expect(logs).toContain('[REDACTED]');
  });
});
