import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL must point to the Supabase Postgres database.');

// Keep a deliberately small server-side pool. Supabase transaction poolers share
// connections across app instances; never put this credential in a NEXT_PUBLIC variable.
export const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_POOL_MAX || 4),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  application_name: 'mitrai',
});
pool.on('error', (error) => console.error('Supabase Postgres pool error:', error.message));

export type DbClient = Pool | PoolClient;

let schemaReady: Promise<void> | null = null;
export async function ensureDatabase() {
  if (!schemaReady) {
    schemaReady = readFile(
      path.join(process.cwd(), 'supabase/migrations/202611060001_initial.sql'),
      'utf8',
    )
      .then((schema) => pool.query(schema).then(() => undefined))
      .catch((error) => {
        schemaReady = null;
        throw error;
      });
  }
  await schemaReady;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
  client: DbClient = pool,
) {
  await ensureDatabase();
  const result = await client.query<T>(text, values);
  return result;
}

export async function transaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureDatabase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export function json<T>(value: unknown): T {
  return (typeof value === 'string' ? JSON.parse(value) : value) as T;
}
