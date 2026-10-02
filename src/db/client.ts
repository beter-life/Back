import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { AppConfig } from '../config/env.js';

export function createDatabase(config: AppConfig) {
  const pool = new pg.Pool({
    connectionString: config.databaseUrl, max: config.poolMax,
    connectionTimeoutMillis: 3000, idleTimeoutMillis: 30000,
    statement_timeout: 5000, query_timeout: 6000,
    ssl: config.databaseSsl === 'verify-full' ? { rejectUnauthorized: true, ...(config.databaseCa ? { ca: config.databaseCa } : {}) } : false,
    application_name: 'beter-life-backend',
  });
  const db = drizzle(pool);
  return { pool, db, ping: async () => { await pool.query('select 1'); }, close: async () => { await pool.end(); } };
}
export type Database = ReturnType<typeof createDatabase>;
