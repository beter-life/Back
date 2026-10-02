import { buildApp } from './app.js';
import { loadConfig, ConfigurationError } from './config/env.js';
import { installShutdown } from './app/shutdown.js';

try {
  const config = loadConfig();
  const app = await buildApp(config);
  try {
    await app.listen({ host: config.host, port: config.port });
    installShutdown(app, config.shutdownTimeoutMs);
  } catch {
    app.log.fatal({ code: 'STARTUP_FAILED' }, 'HTTP startup failed');
    await app.close();
    process.exitCode = 1;
  }
} catch (error) {
  process.stderr.write(JSON.stringify({ level: 'fatal', code: 'STARTUP_FAILED',
    message: error instanceof ConfigurationError ? error.message : 'Application startup failed' }) + '\n');
  process.exitCode = 1;
}
