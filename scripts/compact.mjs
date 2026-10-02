import { spawn } from 'node:child_process';
const task = process.argv[2];
const allowed = ['lint', 'typecheck', 'test', 'test:integration', 'test:postgres', 'build', 'db:generate', 'db:migrate', 'openapi:generate', 'openapi:check', 'security:scan'];
if (!allowed.includes(task) || !process.env.npm_execpath || process.argv.length !== 3) {
  process.stderr.write('Use pnpm compact <quality-gate>.\n');
  process.exitCode = 64;
} else {
  // Launch the pnpm JS entrypoint with Node, avoiding Windows .cmd shell quoting.
  const child = spawn(process.execPath, ['.codex/scripts/compact-command.mjs', '--', process.execPath, process.env.npm_execpath, 'run', task], { stdio: 'inherit', shell: false });
  child.on('error', () => { process.exitCode = 1; });
  child.on('close', (code) => { process.exitCode = code ?? 1; });
}
