import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Character, Message } from './domain';
import { seeds } from './seed';
mkdirSync(process.env.MITRAI_DATA_DIR || path.join(process.cwd(), '.data'), { recursive: true });
const db = new DatabaseSync(
  path.join(process.env.MITRAI_DATA_DIR || path.join(process.cwd(), '.data'), 'mitrai.sqlite'),
);
db.exec(
  'PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS messages (key TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS nonces (nonce TEXT PRIMARY KEY, message TEXT NOT NULL, expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS offers (id TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, owner TEXT NOT NULL, expires INTEGER NOT NULL);',
);
for (const c of seeds())
  db.prepare('INSERT OR IGNORE INTO characters VALUES (?,?)').run(c.id, JSON.stringify(c));
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
  db.prepare('INSERT OR REPLACE INTO characters VALUES (?,?)').run(c.id, JSON.stringify(c));
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
  return (db.prepare('SELECT body FROM offers').all() as { body: string }[])
    .map((r) => JSON.parse(r.body))
    .filter((r) => r.characterId === id);
}
