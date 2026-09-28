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
  it('enforces owner-only RLS and denies requests without an Auth subject', async () => {
    const ownerA = randomUUID();
    const ownerB = randomUUID();
    await database.pool.query(
      'insert into app.profiles (auth_user_id, display_name, locale, timezone) values ($1,$2,$3,$4)',
      [ownerB, ...Object.values(profileInput)],
    );
    const client = await database.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE authenticated');
      await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [ownerA]);
      await client.query(
        'insert into app.profiles (auth_user_id, display_name, locale, timezone) values ($1,$2,$3,$4)',
        [ownerA, ...Object.values(profileInput)],
      );
      expect((await client.query('select auth_user_id from app.profiles where auth_user_id=$1', [ownerA])).rowCount).toBe(1);
      expect((await client.query('select auth_user_id from app.profiles where auth_user_id=$1', [ownerB])).rowCount).toBe(0);
      expect((await client.query('update app.profiles set display_name=$1 where auth_user_id=$2', ['Cross-owner', ownerB])).rowCount).toBe(0);
      expect((await client.query('delete from app.profiles where auth_user_id=$1', [ownerB])).rowCount).toBe(0);
      expect((await client.query('update app.profiles set display_name=$1 where auth_user_id=$2', ['Updated', ownerA])).rowCount).toBe(1);
      expect((await client.query('delete from app.profiles where auth_user_id=$1', [ownerA])).rowCount).toBe(1);
      await expect(client.query(
        'insert into app.profiles (auth_user_id, display_name, locale, timezone) values ($1,$2,$3,$4)',
        [ownerB, ...Object.values(profileInput)],
      )).rejects.toMatchObject({ code: '42501' });
      await client.query('ROLLBACK');

      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE anon');
      await client.query("SELECT set_config('request.jwt.claim.sub', '', true)");
      expect((await client.query('select auth.uid() as uid')).rows[0]?.uid).toBeNull();
      expect((await client.query('select auth_user_id from app.profiles where auth_user_id=$1', [ownerB])).rowCount).toBe(0);
      expect((await client.query('update app.profiles set display_name=$1 where auth_user_id=$2', ['Anonymous', ownerB])).rowCount).toBe(0);
      expect((await client.query('delete from app.profiles where auth_user_id=$1', [ownerB])).rowCount).toBe(0);
      await expect(client.query(
        'insert into app.profiles (auth_user_id, display_name, locale, timezone) values ($1,$2,$3,$4)',
        [ownerA, ...Object.values(profileInput)],
      )).rejects.toMatchObject({ code: '42501' });
      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
      await database.pool.query('delete from app.profiles where auth_user_id=$1', [ownerB]);
    }
  });
});
