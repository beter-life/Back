import { describe, it, expect } from 'vitest';
import { loadConfig, testDatabaseUrl } from '../../src/config/env.js';
import { testEnv } from '../helpers.js';

describe('typed configuration', () => {
  it('loads validated defaults', () => {
    expect(loadConfig(testEnv)).toMatchObject({ port: 3001, algorithm: 'ES256', poolMax: 5, audience: 'authenticated' });
  });
  it.each([
    { NODE_ENV: 'other' }, { PORT: '0' }, { PORT: 'abc' }, { SUPABASE_URL: '' },
    { SUPABASE_URL: 'http://example.com' }, { SUPABASE_URL: 'https://u:p@example.com' },
    { JWT_ALGORITHM: 'HS256' }, { CORS_ORIGINS: '*' }, { DATABASE_POOL_MAX: '999' },
    { TEST_DATABASE_URL: 'postgresql://test@production.example/beter_life_test' },
    { TEST_DATABASE_URL: 'postgresql://test@localhost/production' },
    { DATABASE_SSL: 'insecure' }, { BODY_LIMIT_BYTES: '0' }, { LOG_LEVEL: 'verbose' },
  ])('rejects malformed config %j', (override) => expect(() => loadConfig({ ...testEnv, ...override })).toThrow('Invalid configuration'));
  it('does not expose secrets in errors', () => {
    expect(() => loadConfig({ ...testEnv, TEST_DATABASE_URL: 'PRIVATE_DATABASE_VALUE' })).toThrow('TEST_DATABASE_URL');
    try { loadConfig({ ...testEnv, TEST_DATABASE_URL: 'PRIVATE_DATABASE_VALUE' }); }
    catch (error) { expect(String(error)).not.toContain('PRIVATE_DATABASE_VALUE'); }
  });
  it('rejects production TLS disable and non-HTTPS origins', () => {
    const production = { ...testEnv, NODE_ENV: 'production', DATABASE_URL: 'postgresql://user@db.example/app', CORS_ORIGINS: 'https://app.example' };
    expect(() => loadConfig(production)).toThrow('DATABASE_SSL');
    expect(loadConfig({ ...production, DATABASE_SSL: 'verify-full' }).production).toBe(true);
    expect(() => loadConfig({ ...production, DATABASE_SSL: 'verify-full', CORS_ORIGINS: 'http://app.example' })).toThrow('CORS_ORIGINS');
  });
  it('rejects database URL TLS overrides and shared production/test destinations', () => {
    expect(() => loadConfig({ ...testEnv, TEST_DATABASE_URL: testEnv.TEST_DATABASE_URL + '?sslmode=disable' })).toThrow();
    expect(() => testDatabaseUrl({ ...testEnv, DATABASE_URL: testEnv.TEST_DATABASE_URL })).toThrow('must differ');
  });
});
