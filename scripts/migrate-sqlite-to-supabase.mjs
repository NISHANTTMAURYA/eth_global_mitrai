import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'pg';

const { Pool } = postgres;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('Set DATABASE_URL to the Supabase Postgres connection string.');
const dataDir = process.env.MITRAI_DATA_DIR || path.join(process.cwd(), '.data');
const sqlitePath = path.join(dataDir, 'mitrai.sqlite');
const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });

const migration = await readFile(
  path.join(process.cwd(), 'supabase/migrations/202611060001_initial.sql'),
  'utf8',
);
await pool.query(migration);

const tables = [
  ['characters', ['id', 'body'], ['jsonb']],
  ['messages', ['key', 'body'], ['jsonb']],
  ['nonces', ['nonce', 'message', 'expires'], []],
  ['offers', ['id', 'body'], ['jsonb']],
  ['sessions', ['token', 'owner', 'expires'], []],
  ['brain_events', ['id', 'character_id', 'owner', 'epoch', 'at', 'visibility', 'body'], ['jsonb']],
  ['owner_profiles', ['scope', 'character_id', 'owner', 'epoch', 'started_at', 'ended_at', 'body'], ['jsonb']],
  ['conversation_events', ['id', 'scope', 'at', 'body'], ['jsonb']],
  ['private_minds', ['scope', 'body'], ['jsonb']],
  ['reach_preferences', ['owner', 'body'], ['jsonb']],
  ['proactive_jobs', ['id', 'scope', 'character_id', 'owner', 'epoch', 'due_at', 'status', 'lease_until', 'attempts', 'body'], ['jsonb']],
  ['notifications', ['id', 'owner', 'character_id', 'epoch', 'created_at', 'read_at', 'body'], ['jsonb']],
  ['delivery_outbox', ['id', 'notification_id', 'channel', 'status', 'lease_until', 'attempts', 'next_at', 'body'], ['jsonb']],
  ['push_subscriptions', ['endpoint', 'owner', 'body'], ['jsonb']],
  ['model_claims', ['model', 'character_id', 'owner', 'state', 'expires', 'entity_key'], []],
];

try {
  const available = new Set(
    sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name),
  );
  for (const [table, columns, jsonColumns] of tables) {
    if (!available.has(table)) continue;
    const rows = sqlite.prepare(`SELECT ${columns.join(',')} FROM ${table}`).all();
    let copied = 0;
    for (let start = 0; start < rows.length; start += 200) {
      const batch = rows.slice(start, start + 200);
      if (!batch.length) continue;
      const values = [];
      const placeholders = batch.map((row, rowIndex) => {
        const offset = rowIndex * columns.length;
        for (const column of columns) {
          const value = row[column];
          values.push(jsonColumns.includes(column) && value !== null ? String(value) : value);
        }
        return `(${columns.map((column, columnIndex) => `$${offset + columnIndex + 1}${jsonColumns.includes(column) ? '::jsonb' : ''}`).join(',')})`;
      });
      const result = await pool.query(
        `INSERT INTO ${table}(${columns.join(',')}) VALUES ${placeholders.join(',')} ON CONFLICT DO NOTHING`,
        values,
      );
      copied += result.rowCount || 0;
    }
    process.stdout.write(`${table}: copied ${copied} of ${rows.length} rows\n`);
  }
} finally {
  sqlite.close();
  await pool.end();
}
