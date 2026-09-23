import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, SignJWT, createRemoteJWKSet } from 'jose';
import { createServer } from 'node:http';
import { createVerifier } from '../../src/modules/auth/identity.js';
import { config, signingFixture, userA } from '../helpers.js';

const fixture = await signingFixture();
const verify = createVerifier(config, fixture.resolver);
describe('real signature and claim verification', () => {
  it('accepts a valid token and returns only required identity', async () => {
    expect(await verify(await fixture.token())).toEqual({ authUserId: userA });
  });
  it.each([
    { exp: 1 }, { iss: 'https://attacker.test/auth/v1' }, { aud: 'wrong' }, { sub: 'invalid' },
    { role: 'service_role' }, { nbf: Math.floor(Date.now() / 1000) + 1000 },
  ])('rejects invalid claims %j', async (claims) => {
    await expect(verify(await fixture.token(claims))).rejects.toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
  });
  it('requires expiry', async () => {
    const token = await new SignJWT({ sub: userA, iss: config.issuer, aud: config.audience, role: 'authenticated' })
      .setIssuedAt().setProtectedHeader({ alg: 'ES256', kid: 'test-key' }).sign(fixture.keys.privateKey);
    await expect(verify(token)).rejects.toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
  });
  it('rejects an invalid signature', async () => {
    const other = await generateKeyPair('ES256');
    await expect(verify(await fixture.token({}, other.privateKey))).rejects.toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
  });
  it('rejects malformed JWT and symmetric algorithm', async () => {
    await expect(verify('malformed')).rejects.toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
    const hs = await new SignJWT({ sub: userA }).setProtectedHeader({ alg: 'HS256' }).sign(new Uint8Array(32));
    await expect(verify(hs)).rejects.toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
  });
});

describe('JWKS transport with controlled local HTTP server', () => {
  let requests = 0;
  const server = createServer((_request, response) => {
    requests++;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ keys: [fixture.jwk] }));
  });
  beforeAll(async () => { await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve)); });
  afterAll(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });
  it('fetches public key, verifies signature and caches JWKS', async () => {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server unavailable');
    const verifyRemote = createVerifier(config, createRemoteJWKSet(new URL(`http://127.0.0.1:${address.port}/jwks`)));
    expect(await verifyRemote(await fixture.token())).toEqual({ authUserId: userA });
    expect(await verifyRemote(await fixture.token())).toEqual({ authUserId: userA });
    expect(requests).toBe(1);
  });
});
