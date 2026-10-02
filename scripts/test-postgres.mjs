import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';

const name = `beter-life-mdl1b-test-${randomUUID()}`;
const label = 'beter-life.disposable-test';
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 180000, ...options });
  if (result.status !== 0) throw new Error(`${command} failed (${result.status ?? 'timeout/spawn error'})`);
  return result.stdout?.trim() ?? '';
};

try {
  if (!process.env.npm_execpath) throw new Error('Run through pnpm test:postgres');
  run('docker', ['pull', 'postgres:17'], { stdio: 'inherit' });
  run('docker', ['run', '--detach', '--rm', '--name', name, '--label', `${label}=true`,
    '-e', 'POSTGRES_USER=test', '-e', 'POSTGRES_DB=beter_life_test',
    '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-p', '127.0.0.1::5432', 'postgres:17']);
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const probe = spawnSync('docker', ['exec', name, 'pg_isready', '-U', 'test', '-d', 'beter_life_test'], { timeout: 3000, stdio: 'ignore' });
    if (probe.status === 0) { ready = true; break; }
    await setTimeout(1000);
  }
  if (!ready) throw new Error('Disposable PostgreSQL did not become ready');
  const port = run('docker', ['port', name, '5432/tcp']).split(':').at(-1);
  if (!port || !/^\d+$/.test(port)) throw new Error('Unexpected Docker port');
  const authBootstrap = [
    'CREATE ROLE anon;',
    'CREATE ROLE authenticated;',
    'CREATE SCHEMA auth;',
    "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $function$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $function$;",
    'GRANT USAGE ON SCHEMA auth TO anon, authenticated;',
    'GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;',
  ].join('\n');
  run('docker', ['exec', name, 'psql', '-U', 'test', '-d', 'beter_life_test', '-v', 'ON_ERROR_STOP=1', '-c', authBootstrap], { stdio: 'inherit' });
  // Trust auth is confined to this disposable container bound ONLY to loopback.
  const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: '', DATABASE_SSL: 'disable',
    TEST_DATABASE_URL: `postgresql://test@127.0.0.1:${port}/beter_life_test` };
  run(process.execPath, [process.env.npm_execpath, 'run', 'db:migrate'], { env, stdio: 'inherit' });
  const testGrants = 'GRANT USAGE ON SCHEMA app TO anon, authenticated; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO anon, authenticated;';
  run('docker', ['exec', name, 'psql', '-U', 'test', '-d', 'beter_life_test', '-v', 'ON_ERROR_STOP=1', '-c', testGrants], { stdio: 'inherit' });
  run(process.execPath, [process.env.npm_execpath, 'run', 'test:integration'], { env, stdio: 'inherit' });
  process.stdout.write('Disposable PostgreSQL migration and integration passed.\n');
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'PostgreSQL validation failed'}\n`);
  process.exitCode = 1;
} finally {
  const owned = spawnSync('docker', ['inspect', '--format', `{{index .Config.Labels "${label}"}}`, name], { encoding: 'utf8', timeout: 10000 });
  if (owned.status === 0 && owned.stdout.trim() === 'true') {
    const stopped = spawnSync('docker', ['stop', '--time', '5', name], { timeout: 15000, stdio: 'ignore' });
    if (stopped.status !== 0) { process.stderr.write(`Cleanup pending for disposable container ${name}\n`); process.exitCode = 1; }
  }
}
