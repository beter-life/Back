import type { FastifyInstance } from 'fastify';

export function installShutdown(app: FastifyInstance, timeoutMs: number) {
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    app.log.info('shutdown requested');
    const deadline = setTimeout(() => {
      app.log.fatal('shutdown deadline exceeded');
      process.exit(1); // Bounded last resort after draining was attempted.
    }, timeoutMs);
    deadline.unref();
    void app.close().then(() => {
      clearTimeout(deadline);
      process.off('SIGTERM', shutdown);
      process.off('SIGINT', shutdown);
    }).catch(() => {
      app.log.error('shutdown failed');
      process.exitCode = 1;
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  return shutdown;
}
