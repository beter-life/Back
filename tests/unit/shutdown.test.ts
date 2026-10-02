import { it, expect, vi } from 'vitest';
import { buildApp } from '../../src/app.js';
import { installShutdown } from '../../src/app/shutdown.js';
import { config, memoryProfiles, signingFixture } from '../helpers.js';

it('gracefully drains Fastify, closes dependencies once and removes signal handlers', async () => {
  const fixture = await signingFixture();
  const close = vi.fn().mockResolvedValue(undefined);
  const app = await buildApp(config, { jwks: fixture.resolver, dependencies: { profiles: memoryProfiles(), ping: async () => {}, close } });
  const shutdown = installShutdown(app, 1000);
  expect(process.listeners('SIGTERM')).toContain(shutdown);
  expect(process.listeners('SIGINT')).toContain(shutdown);
  shutdown(); shutdown();
  await vi.waitFor(() => expect(process.listeners('SIGTERM')).not.toContain(shutdown));
  expect(process.listeners('SIGINT')).not.toContain(shutdown);
  expect(close).toHaveBeenCalledOnce();
});
