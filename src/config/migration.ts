import { databaseUrl, testDatabaseUrl, ConfigurationError } from './env.js';

export function migrationConfig(env: Readonly<Record<string, string | undefined>> = process.env) {
  const testing = env.NODE_ENV === 'test';
  const production = env.NODE_ENV === 'production';
  if (env.NODE_ENV && !['development', 'test', 'production'].includes(env.NODE_ENV)) throw new ConfigurationError('NODE_ENV');
  const url = testing ? testDatabaseUrl(env) : databaseUrl(env.DATABASE_URL ?? '');
  const ssl = env.DATABASE_SSL ?? (production ? 'verify-full' : 'disable');
  if (!['disable', 'verify-full'].includes(ssl) || (production && ssl !== 'verify-full')) throw new ConfigurationError('DATABASE_SSL');
  return { url, ssl: ssl === 'verify-full' ? { rejectUnauthorized: true, ...(env.DATABASE_CA_CERT ? { ca: env.DATABASE_CA_CERT } : {}) } : false as const };
}
