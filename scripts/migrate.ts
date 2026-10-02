import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { migrationConfig } from '../src/config/migration.js';
import { ConfigurationError } from '../src/config/env.js';

// Uses Drizzle's SQL journal; same generated migrations as drizzle-kit migrate.
try {
  const config = migrationConfig();
  const pool = new pg.Pool({ connectionString: config.url, ssl: config.ssl, max: 1, connectionTimeoutMillis: 5000 });
  try { await migrate(drizzle(pool), { migrationsFolder: './drizzle' }); process.stdout.write('Migrations applied.\n'); }
  finally { await pool.end(); }
} catch (error) {
  process.stderr.write(error instanceof ConfigurationError ? `${error.message}\n` : 'Migration failed; no credentials or SQL details emitted.\n');
  process.exitCode = 1;
}
