import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory = mkdtempSync(path.join(tmpdir(), 'mitrai-test-'));
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('Set TEST_DATABASE_URL to a dedicated, disposable Supabase test database. Tests never use DATABASE_URL.');
if (testDatabaseUrl === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL must be separate from DATABASE_URL to protect application data.');
const port = process.env.MITRAI_TEST_PORT || '3107';
const base = `http://localhost:${port}`;
// A deliberately expired fixture tests Sunset. Product templates have fresh clocks.
execFileSync(
  process.execPath,
  [
    '--import',
    'tsx',
    '--input-type=module',
    '-e',
    `const s=await import('./src/lib/store.ts');const c=await s.getCharacter('juniper');c.createdAt=Date.now()-c.lifespan-1000;await s.saveCharacter(c);`,
  ],
  {
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      MITRAI_DATA_DIR: directory,
      MITRAI_DEMO_MODE: '1',
      PROACTIVE_DISABLED: '1',
    },
    stdio: 'ignore',
  },
);
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', port], {
  env: {
    ...process.env,
    DATABASE_URL: testDatabaseUrl,
    MITRAI_DATA_DIR: directory,
    MITRAI_DEMO_MODE: '1',
    PROACTIVE_DISABLED: '1',
    OG_API_KEY: '',
    OG_MODEL: '',
    GEMINI_USE_VERTEX: '',
    APP_ORIGIN: base,
  },
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
