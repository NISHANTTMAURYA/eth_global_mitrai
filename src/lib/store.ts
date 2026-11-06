import type { Character, Message } from './domain';
import { seeds } from './seed';
import { characterChanges, type BrainEvent } from './brain-events';
import { json, query, type DbClient } from './database';

let demoSeed: Promise<void> | null = null;
async function ensureDemoSeed() {
  if (process.env.MITRAI_DEMO_MODE !== '1') return;
  if (!demoSeed) {
    demoSeed = (async () => {
      for (const c of seeds()) {
        const existing = await query('SELECT id FROM characters WHERE id=$1', [c.id]);
        if (!existing.rowCount) await saveCharacter(c);
      }
    })().catch((error) => {
      demoSeed = null;
      throw error;
    });
  }
  await demoSeed;
}

export async function allCharacters(client?: DbClient): Promise<Character[]> {
  await ensureDemoSeed();
  const result = await query<{ body: unknown }>('SELECT body FROM characters ORDER BY id', [], client);
  return result.rows.map((row) => json<Character>(row.body));
}

export async function getCharacter(id: string, client?: DbClient): Promise<Character> {
  const result = await query<{ body: unknown }>('SELECT body FROM characters WHERE id=$1', [id], client);
  if (!result.rowCount) throw new Error('Character not found.');
  return json<Character>(result.rows[0].body);
}

export async function saveCharacter(c: Character, client?: DbClient) {
  const existing = await query<{ body: unknown }>(
    'SELECT body FROM characters WHERE id=$1 FOR UPDATE',
    [c.id],
    client,
  );
  const before = existing.rowCount ? json<Character>(existing.rows[0].body) : undefined;
  const changes = before ? characterChanges(before, c) : [];
  if (!before || changes.length)
    await appendBrainEvent(
      {
        id: crypto.randomUUID(),
        characterId: c.id,
        owner: c.owner,
        epoch: c.ownershipEpoch || 0,
        at: Date.now(),
        kind: !before
          ? 'birth'
          : before.owner !== c.owner
            ? 'ownership'
            : before.brain.version !== c.brain.version
              ? 'checkpoint'
              : 'profile',
        title: !before
          ? 'Character registered'
          : before.owner !== c.owner
            ? 'Ownership reconciled'
            : before.brain.version !== c.brain.version
              ? `Brain checkpoint ${c.brain.version}`
              : 'Public character updated',
        source: 'application',
        changes,
      },
      'public',
      client,
    );
  if (before && before.owner !== c.owner)
    await query(
      'UPDATE owner_profiles SET ended_at=$1 WHERE character_id=$2 AND ended_at IS NULL',
      [Date.now(), c.id],
      client,
    );
  const scope = JSON.stringify([c.id, c.owner, c.ownershipEpoch || 0]);
  const now = Date.now();
  await query(
    `INSERT INTO owner_profiles(scope,character_id,owner,epoch,started_at,body)
     VALUES($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT(scope) DO NOTHING`,
    [scope, c.id, c.owner, c.ownershipEpoch || 0, now, JSON.stringify({ updatedAt: 0, interests: [], context: [], communication: [], style: {} })],
    client,
  );
  await query(
    `INSERT INTO characters(id,body) VALUES($1,$2::jsonb)
     ON CONFLICT(id) DO UPDATE SET body=excluded.body`,
    [c.id, JSON.stringify(c)],
    client,
  );
}

export async function appendBrainEvent(
  event: BrainEvent,
  visibility: 'public' | 'private',
  client?: DbClient,
) {
  await query(
    'INSERT INTO brain_events(id,character_id,owner,epoch,at,visibility,body) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT(id) DO NOTHING',
    [event.id, event.characterId, event.owner, event.epoch, event.at, visibility, JSON.stringify(event)],
    client,
  );
}

export async function brainEvents(id: string, owner: string | null, epoch: number): Promise<BrainEvent[]> {
  const result = await query<{ body: unknown }>(
    "SELECT body FROM brain_events WHERE character_id=$1 AND (visibility='public' OR (owner=$2 AND epoch=$3)) ORDER BY at DESC LIMIT 300",
    [id, owner, epoch],
  );
  return result.rows.map((row) => json<BrainEvent>(row.body));
}

const messageKey = (id: string, owner: string, epoch: number) => `${id}:${owner}:${epoch}`;
export async function messages(id: string, owner: string, epoch = 0): Promise<Message[]> {
  const result = await query<{ body: unknown }>('SELECT body FROM messages WHERE key=$1', [messageKey(id, owner, epoch)]);
  return result.rowCount ? json<Message[]>(result.rows[0].body) : [];
}

export async function saveMessages(id: string, owner: string, rows: Message[], epoch = 0, client?: DbClient) {
  await query(
    `INSERT INTO messages(key,body) VALUES($1,$2::jsonb)
     ON CONFLICT(key) DO UPDATE SET body=excluded.body`,
    [messageKey(id, owner, epoch), JSON.stringify(rows.slice(-100))],
    client,
  );
}

export async function putNonce(nonce: string, message: string) {
  await query('DELETE FROM nonces WHERE expires < $1', [Date.now()]);
  await query('INSERT INTO nonces(nonce,message,expires) VALUES($1,$2,$3)', [nonce, message, Date.now() + 300000]);
}

export async function consumeNonce(nonce: string) {
  const result = await query<{ message: string }>(
    'DELETE FROM nonces WHERE nonce=$1 AND expires>$2 RETURNING message',
    [nonce, Date.now()],
  );
  return result.rows[0]?.message || null;
}

export async function createSession(token: string, owner: string) {
  await query('INSERT INTO sessions(token,owner,expires) VALUES($1,$2,$3)', [token, owner, Date.now() + 86400000]);
}

export async function readSession(token: string) {
  const result = await query<{ owner: string }>('SELECT owner FROM sessions WHERE token=$1 AND expires>$2', [token, Date.now()]);
  return result.rows[0]?.owner || null;
}

export async function deleteSession(token: string) {
  await query('DELETE FROM sessions WHERE token=$1', [token]);
}

export async function saveOffer(offer: unknown) {
  await query('INSERT INTO offers(id,body) VALUES($1,$2::jsonb)', [crypto.randomUUID(), JSON.stringify(offer)]);
}

export async function offersFor(id: string) {
  const result = await query<{ id: string; body: unknown }>(
    "SELECT id,body FROM offers WHERE body->>'characterId'=$1 ORDER BY (body->>'at')::bigint",
    [id],
  );
  return result.rows.map((row) => ({ ...json<Record<string, unknown>>(row.body), id: row.id }));
}
