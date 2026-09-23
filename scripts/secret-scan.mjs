import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const patterns = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16})\b/, /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/];
let failed = false;
for (const file of new Set(files)) {
  if (/(^|\/)\.env($|\.(?!example$))|^\.harness\/|\.log$/.test(file)) { process.stderr.write(`Forbidden versioned artifact: ${file}\n`); failed = true; continue; }
  const content = readFileSync(file, 'utf8');
  if (patterns.some((pattern) => pattern.test(content))) { process.stderr.write(`Potential secret: ${file}\n`); failed = true; }
}
process.stdout.write(failed ? 'Secret scan failed.\n' : 'Secret scan passed (heuristic; review remains required).\n');
process.exitCode = failed ? 1 : 0;
