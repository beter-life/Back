import { spawn } from 'node:child_process';
import { testDatabaseUrl } from '../src/config/env.js';

// Refuse missing or unsafe targets, rather than silently skipping integration gates.
testDatabaseUrl(process.env);
const child = spawn(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--project', 'integration'], {
  stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test' }, shell: false,
});
child.on('error', () => { process.exitCode = 1; });
child.on('close', (code) => { process.exitCode = code ?? 1; });
