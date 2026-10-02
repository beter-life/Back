import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import type { JWTPayload } from 'jose';
import { randomUUID } from 'node:crypto';
import { loadConfig } from '../src/config/env.js';
import type { ProfileRepository } from '../src/modules/profile/repository.js';
import type { Profile } from '../src/modules/profile/schema.js';

export const testEnv = {
  NODE_ENV: 'test', TEST_DATABASE_URL: 'postgresql://test@127.0.0.1:5432/beter_life_test',
  SUPABASE_URL: 'https://identity.example.test', CORS_ORIGINS: 'http://localhost:3000', DATABASE_SSL: 'disable',
};
export const config = loadConfig(testEnv);
export const userA = '11111111-1111-4111-8111-111111111111';
export const userB = '22222222-2222-4222-8222-222222222222';
export const profileInput = { displayName: 'Alex', locale: 'pt-BR', timezone: 'America/Sao_Paulo' };

export async function signingFixture() {
  const keys = await generateKeyPair('ES256');
  const jwk = { ...await exportJWK(keys.publicKey), kid: 'test-key', alg: 'ES256', use: 'sig' };
  const token = (claims: JWTPayload = {}, key = keys.privateKey) => new SignJWT({
    sub: userA, iss: config.issuer, aud: config.audience, iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300, role: 'authenticated', ...claims,
  }).setProtectedHeader({ alg: 'ES256', kid: 'test-key' }).sign(key);
  return { keys, jwk, resolver: createLocalJWKSet({ keys: [jwk] }), token };
}

export function memoryProfiles(): ProfileRepository {
  const rows = new Map<string, Profile>();
  return {
    findByAuthUser: async (owner) => rows.get(owner) ?? null,
    upsertForAuthUser: async (owner, input) => {
      const previous = rows.get(owner);
      const now = new Date().toISOString();
      const row = { id: previous?.id ?? randomUUID(), ...input, createdAt: previous?.createdAt ?? now, updatedAt: now };
      rows.set(owner, row);
      return row;
    },
  };
}
