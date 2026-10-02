export class ConfigurationError extends Error {
  constructor(key: string) { super(`Invalid configuration: ${key}`); this.name = 'ConfigurationError'; }
}

type Environment = Readonly<Record<string, string | undefined>>;
const required = (env: Environment, key: string): string => {
  const value = env[key]?.trim();
  if (!value) throw new ConfigurationError(key);
  return value;
};
const integer = (env: Environment, key: string, fallback: number, min: number, max: number): number => {
  const raw = env[key] ?? String(fallback);
  if (!/^\d+$/.test(raw)) throw new ConfigurationError(key);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new ConfigurationError(key);
  return value;
};

export function databaseUrl(value: string, key = 'DATABASE_URL'): string {
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || url.pathname.length < 2 || url.hash) throw new Error();
    // TLS is configured centrally, never overridden by connection-string options.
    if ([...url.searchParams.keys()].some((param) => /^ssl/i.test(param))) throw new Error();
    return value;
  } catch { throw new ConfigurationError(key); }
}

export function testDatabaseUrl(env: Environment): string {
  const value = databaseUrl(required(env, 'TEST_DATABASE_URL'), 'TEST_DATABASE_URL');
  const url = new URL(value);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !/^\/beter_life_test(?:_[a-z0-9_]+)?$/.test(url.pathname)) {
    throw new ConfigurationError('TEST_DATABASE_URL (must be loopback and beter_life_test*)');
  }
  if (env.DATABASE_URL) {
    const primary = new URL(databaseUrl(env.DATABASE_URL));
    if (primary.hostname === url.hostname && (primary.port || '5432') === (url.port || '5432') && primary.pathname === url.pathname) {
      throw new ConfigurationError('TEST_DATABASE_URL (must differ from DATABASE_URL)');
    }
  }
  return value;
}

export function loadConfig(env: Environment = process.env) {
  const mode = env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(mode)) throw new ConfigurationError('NODE_ENV');
  const production = mode === 'production';
  const dbUrl = mode === 'test' ? testDatabaseUrl(env) : databaseUrl(required(env, 'DATABASE_URL'));
  const ssl = env.DATABASE_SSL ?? (production ? 'verify-full' : 'disable');
  if (!['disable', 'verify-full'].includes(ssl) || (production && ssl !== 'verify-full')) throw new ConfigurationError('DATABASE_SSL');
  const supabase = required(env, 'SUPABASE_URL');
  let provider: URL;
  try { provider = new URL(supabase); } catch { throw new ConfigurationError('SUPABASE_URL'); }
  if (provider.protocol !== 'https:' || provider.username || provider.password || provider.search || provider.hash || provider.pathname !== '/') {
    throw new ConfigurationError('SUPABASE_URL');
  }
  const algorithm = env.JWT_ALGORITHM ?? 'ES256';
  if (algorithm !== 'ES256' && algorithm !== 'RS256') throw new ConfigurationError('JWT_ALGORITHM');
  const origins = required(env, 'CORS_ORIGINS').split(',').map((origin) => origin.trim());
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.origin !== origin || !['https:', 'http:'].includes(url.protocol) || (production && url.protocol !== 'https:')) throw new Error();
    } catch { throw new ConfigurationError('CORS_ORIGINS'); }
  }
  const logLevel = env.LOG_LEVEL ?? (mode === 'test' ? 'silent' : 'info');
  if (!['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(logLevel)) throw new ConfigurationError('LOG_LEVEL');
  const host = env.HOST ?? '0.0.0.0';
  if (!['0.0.0.0', '127.0.0.1', '::', 'localhost'].includes(host)) throw new ConfigurationError('HOST');
  return Object.freeze({
    mode, production, databaseUrl: dbUrl, databaseSsl: ssl,
    databaseCa: env.DATABASE_CA_CERT, poolMax: integer(env, 'DATABASE_POOL_MAX', 5, 1, 20),
    issuer: `${provider.origin}/auth/v1`, jwksUrl: `${provider.origin}/auth/v1/.well-known/jwks.json`,
    audience: 'authenticated', algorithm, corsOrigins: origins, logLevel, host,
    port: integer(env, 'PORT', 3001, 1, 65535), bodyLimit: integer(env, 'BODY_LIMIT_BYTES', 16384, 1024, 1048576),
    rateLimitMax: integer(env, 'RATE_LIMIT_MAX', 100, 1, 10000),
    trustProxyHops: integer(env, 'TRUST_PROXY_HOPS', 0, 0, 1),
    shutdownTimeoutMs: integer(env, 'SHUTDOWN_TIMEOUT_MS', 15000, 1000, 30000),
  });
}
export type AppConfig = ReturnType<typeof loadConfig>;
