import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Character, Message } from './domain';
import { seeds } from './seed';
import { characterChanges, type BrainEvent } from './brain-events';
mkdirSync(process.env.MITRAI_DATA_DIR || path.join(process.cwd(), '.data'), { recursive: true });
const db = new DatabaseSync(
  path.join(process.env.MITRAI_DATA_DIR || path.join(process.cwd(), '.data'), 'mitrai.sqlite'),
);
db.exec('PRAGMA busy_timeout=5000');
db.exec(
  'PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS messages (key TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS nonces (nonce TEXT PRIMARY KEY, message TEXT NOT NULL, expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS offers (id TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, owner TEXT NOT NULL, expires INTEGER NOT NULL);',
);
db.exec(`CREATE TABLE IF NOT EXISTS brain_events(id TEXT PRIMARY KEY,character_id TEXT NOT NULL,owner TEXT NOT NULL,epoch INTEGER NOT NULL,at INTEGER NOT NULL,visibility TEXT NOT NULL,body TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS brain_events_character ON brain_events(character_id,at);
CREATE TABLE IF NOT EXISTS owner_profiles(scope TEXT PRIMARY KEY,character_id TEXT NOT NULL,owner TEXT NOT NULL,epoch INTEGER NOT NULL,started_at INTEGER NOT NULL,ended_at INTEGER,body TEXT NOT NULL);`);
// Templates are available only in explicitly enabled local demo mode.
if (process.env.MITRAI_DEMO_MODE === '1')
  for (const c of seeds()) {
    const existing = db.prepare('SELECT id FROM characters WHERE id=?').get(c.id);
    if (!existing) saveCharacter(c);
  }
export function allCharacters(): Character[] {
  return (db.prepare('SELECT body FROM characters').all() as { body: string }[]).map((r) =>
    JSON.parse(r.body),
  );
}
export function getCharacter(id: string): Character {
  const row = db.prepare('SELECT body FROM characters WHERE id=?').get(id) as
    { body: string } | undefined;
  if (!row) throw new Error('Character not found.');
  return JSON.parse(row.body);
}
export function saveCharacter(c: Character) {
  const existing = db.prepare('SELECT body FROM characters WHERE id=?').get(c.id) as
    { body: string } | undefined;
  const before: Character | undefined = existing ? JSON.parse(existing.body) : undefined;
  const changes = before ? characterChanges(before, c) : [];
  if (!before || changes.length)
    appendBrainEvent(
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
    );
  if (before && before.owner !== c.owner)
    db.prepare(
      'UPDATE owner_profiles SET ended_at=? WHERE character_id=? AND ended_at IS NULL',
    ).run(Date.now(), c.id);
  const scope = JSON.stringify([c.id, c.owner, c.ownershipEpoch || 0]);
  db.prepare(
    'INSERT OR IGNORE INTO owner_profiles(scope,character_id,owner,epoch,started_at,body) VALUES(?,?,?,?,?,?)',
  ).run(
    scope,
    c.id,
    c.owner,
    c.ownershipEpoch || 0,
    Date.now(),
    JSON.stringify({ updatedAt: 0, interests: [], context: [], communication: [], style: {} }),
  );
  db.prepare('INSERT OR REPLACE INTO characters VALUES (?,?)').run(c.id, JSON.stringify(c));
}
export function appendBrainEvent(event: BrainEvent, visibility: 'public' | 'private') {
  db.prepare('INSERT OR IGNORE INTO brain_events VALUES(?,?,?,?,?,?,?)').run(
    event.id,
    event.characterId,
    event.owner,
    event.epoch,
    event.at,
    visibility,
    JSON.stringify(event),
  );
}
export function brainEvents(id: string, owner: string | null, epoch: number): BrainEvent[] {
  return (
    db
      .prepare(
        "SELECT body FROM brain_events WHERE character_id=? AND (visibility='public' OR (owner=? AND epoch=?)) ORDER BY at DESC LIMIT 300",
      )
      .all(id, owner, epoch) as { body: string }[]
  ).map((r) => JSON.parse(r.body));
}
export function messages(id: string, owner: string, epoch = 0): Message[] {
  const r = db.prepare('SELECT body FROM messages WHERE key=?').get(`${id}:${owner}:${epoch}`) as
    { body: string } | undefined;
  return r ? JSON.parse(r.body) : [];
}
export function saveMessages(id: string, owner: string, rows: Message[], epoch = 0) {
  db.prepare('INSERT OR REPLACE INTO messages VALUES (?,?)').run(
    `${id}:${owner}:${epoch}`,
    JSON.stringify(rows.slice(-100)),
  );
}
export function putNonce(nonce: string, message: string) {
  db.prepare('DELETE FROM nonces WHERE expires < ?').run(Date.now());
  db.prepare('INSERT INTO nonces VALUES (?,?,?)').run(nonce, message, Date.now() + 300000);
}
export function consumeNonce(nonce: string) {
  const r = db.prepare('SELECT message,expires FROM nonces WHERE nonce=?').get(nonce) as
    { message: string; expires: number } | undefined;
  db.prepare('DELETE FROM nonces WHERE nonce=?').run(nonce);
  return r && r.expires > Date.now() ? r.message : null;
}
export function createSession(token: string, owner: string) {
  db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(token, owner, Date.now() + 86400000);
}
export function readSession(token: string) {
  const r = db.prepare('SELECT owner,expires FROM sessions WHERE token=?').get(token) as
    { owner: string; expires: number } | undefined;
  return r && r.expires > Date.now() ? r.owner : null;
}
export function deleteSession(token: string) {
  db.prepare('DELETE FROM sessions WHERE token=?').run(token);
}
export function saveOffer(offer: unknown) {
  db.prepare('INSERT INTO offers VALUES (?,?)').run(crypto.randomUUID(), JSON.stringify(offer));
}
export function offersFor(id: string) {
  return (db.prepare('SELECT id,body FROM offers').all() as { id: string; body: string }[])
    .map((r) => ({ ...JSON.parse(r.body), id: r.id }))
    .filter((r) => r.characterId === id);
}

export { db as database };
