import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../../src/db/client.js';
import { loadConfig } from '../../src/config/env.js';
import { buildApp } from '../../src/app.js';
import { createProfileRepository } from '../../src/modules/profile/repository.js';
import { testEnv, signingFixture, profileInput } from '../helpers.js';

// loadConfig enforces a loopback, explicitly named test database.
const config = loadConfig({ ...testEnv, ...process.env, TEST_DATABASE_URL: process.env.TEST_DATABASE_URL, NODE_ENV: 'test', DATABASE_SSL: 'disable' });
const database = createDatabase(config);
const fixture = await signingFixture();
const repository = createProfileRepository(database);
const app = await buildApp(config, { jwks: fixture.resolver, dependencies: { profiles: repository, ping: database.ping, close: database.close } });
beforeAll(async () => {
  await migrate(database.db, { migrationsFolder: './drizzle' });
  // A second application must be a no-op.
  await migrate(database.db, { migrationsFolder: './drizzle' });
});
afterAll(async () => { await app.close(); });

describe('real PostgreSQL migrations and ownership', () => {
  it('has schema, constraints and a working readiness probe', async () => {
    expect((await app.inject('/api/v1/health/ready')).statusCode).toBe(200);
    const result = await database.pool.query<{ total: number }>("select count(*)::int as total from information_schema.tables where table_schema='app' and table_name='profiles'");
    expect(result.rows[0]?.total).toBe(1);
    await expect(database.pool.query('insert into app.profiles (auth_user_id, display_name, locale, timezone) values ($1,$2,$3,$4)', [randomUUID(), '', 'en', 'UTC'])).rejects.toMatchObject({ code: '23514' });
  });
  it('scopes real HTTP writes, preserves idempotency and does not create on GET', async () => {
    const ownerA = randomUUID(); const ownerB = randomUUID();
    const headersA = { authorization: `Bearer ${await fixture.token({ sub: ownerA })}` };
    const headersB = { authorization: `Bearer ${await fixture.token({ sub: ownerB })}` };
    expect((await app.inject({ url: '/api/v1/me', headers: headersA })).json().profile).toBeNull();
    const first = await app.inject({ method: 'PUT', url: '/api/v1/me/profile', headers: headersA, payload: profileInput });
    expect(first.statusCode).toBe(200);
    const second = await app.inject({ method: 'PUT', url: '/api/v1/me/profile', headers: headersA, payload: profileInput });
    expect(second.json()).toEqual(first.json());
    expect((await app.inject({ url: '/api/v1/me', headers: headersB })).json().profile).toBeNull();
    const updated = await app.inject({ method: 'PUT', url: '/api/v1/me/profile', headers: headersA, payload: { ...profileInput, displayName: 'Updated' } });
    expect(updated.json()).toMatchObject({ id: first.json().id, displayName: 'Updated' });
    expect((await app.inject({ url: '/api/v1/me', headers: headersB })).json().profile).toBeNull();
  });
  it('handles concurrent upserts with a unique owner', async () => {
    const owner = randomUUID();
    const results = await Promise.all(Array.from({ length: 8 }, () => repository.upsertForAuthUser(owner, profileInput)));
    expect(new Set(results.map((profile) => profile.id)).size).toBe(1);
    const count = await database.pool.query<{ total: number }>('select count(*)::int as total from app.profiles where auth_user_id=$1', [owner]);
    expect(count.rows[0]?.total).toBe(1);
  });
});
