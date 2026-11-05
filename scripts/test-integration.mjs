import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory = mkdtempSync(path.join(tmpdir(), 'mitrai-test-'));
const port = process.env.MITRAI_TEST_PORT || '3107';
const base = `http://localhost:${port}`;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', port], {
  env: { ...process.env, MITRAI_DATA_DIR: directory, OG_API_KEY: '', OG_MODEL: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let exited = false;
server.on('exit', () => {
  exited = true;
});
let output = '';
server.stdout.on('data', (b) => (output += b));
server.stderr.on('data', (b) => (output += b));
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (exited) throw new Error(output);
    try {
      const response = await fetch(base + '/api/auth');
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ready) throw new Error('Test server did not start. ' + output);
  const child = spawn(
    process.execPath,
    ['node_modules/tsx/dist/cli.mjs', '--test', 'tests/api.test.ts'],
    { env: { ...process.env, MITRAI_TEST_URL: base }, stdio: 'inherit' },
  );
  const code = await new Promise((resolve) => child.on('exit', resolve));
  if (code !== 0) process.exitCode = 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (!exited) {
    server.kill('SIGTERM');
    await new Promise((resolve) => server.once('exit', resolve));
  }
  rmSync(directory, { recursive: true, force: true });
}
