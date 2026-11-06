import { database as db, appendBrainEvent } from './store';
import type { Character, Message } from './domain';
import { conversationScope, initialPrivateMind, type PrivateMind } from './private-mind';

db.exec(`
CREATE TABLE IF NOT EXISTS conversation_events(id TEXT PRIMARY KEY,scope TEXT NOT NULL,at INTEGER NOT NULL,body TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS conversation_scope_at ON conversation_events(scope,at);
CREATE VIRTUAL TABLE IF NOT EXISTS conversation_search USING fts5(scope UNINDEXED,text,message_id UNINDEXED,at UNINDEXED);
CREATE TABLE IF NOT EXISTS private_minds(scope TEXT PRIMARY KEY,body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reach_preferences(owner TEXT PRIMARY KEY,body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS proactive_jobs(id TEXT PRIMARY KEY,scope TEXT NOT NULL,character_id TEXT NOT NULL,owner TEXT NOT NULL,epoch INTEGER NOT NULL,due_at INTEGER NOT NULL,status TEXT NOT NULL,lease_until INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,body TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS due_proactive_jobs ON proactive_jobs(status,due_at);
CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,owner TEXT NOT NULL,character_id TEXT NOT NULL,epoch INTEGER NOT NULL,created_at INTEGER NOT NULL,read_at INTEGER,body TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS notification_owner ON notifications(owner,created_at);
CREATE TABLE IF NOT EXISTS delivery_outbox(id TEXT PRIMARY KEY,notification_id TEXT NOT NULL,channel TEXT NOT NULL,status TEXT NOT NULL,lease_until INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL,body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS push_subscriptions(endpoint TEXT PRIMARY KEY,owner TEXT NOT NULL,body TEXT NOT NULL);
`);
export function archiveConversation(id: string, owner: string, epoch: number, rows: Message[]) {
  const scope = conversationScope(id, owner, epoch);
  for (const row of rows) {
    const inserted = db
      .prepare('INSERT OR IGNORE INTO conversation_events VALUES(?,?,?,?)')
      .run(`${scope}:${row.id}`, scope, row.at, JSON.stringify(row));
    if (inserted.changes)
      db.prepare('INSERT INTO conversation_search(scope,text,message_id,at) VALUES(?,?,?,?)').run(
        scope,
        row.text,
        row.id,
        row.at,
      );
  }
}
export function recallArchive(scope: string, query: string): Message[] {
  const words = [...new Set(query.match(/[\p{L}\p{N}]{3,}/gu) || [])].slice(0, 12);
  if (!words.length) return [];
  const match = words.map((w) => `"${w.replaceAll('"', '')}"`).join(' OR ');
  const hits = db
    .prepare(
      'SELECT message_id FROM conversation_search WHERE conversation_search MATCH ? AND scope=? ORDER BY rank LIMIT 4',
    )
    .all(match, scope) as { message_id: string }[];
  return hits.flatMap((hit) => {
    const row = db
      .prepare('SELECT body FROM conversation_events WHERE id=?')
      .get(`${scope}:${hit.message_id}`) as { body: string } | undefined;
    return row ? [JSON.parse(row.body)] : [];
  });
}
export function loadMind(c: Character, owner: string) {
  const row = db
    .prepare('SELECT body FROM private_minds WHERE scope=?')
    .get(conversationScope(c.id, owner, c.ownershipEpoch || 0)) as { body: string } | undefined;
  return row ? (JSON.parse(row.body) as PrivateMind) : initialPrivateMind(c);
}
export function saveMind(c: Character, owner: string, mind: PrivateMind) {
  const before = loadMind(c, owner),
    epoch = c.ownershipEpoch || 0;
  for (const observation of mind.observations) {
    const old = before.observations.find((o) => o.key === observation.key);
    if (old?.sourceId === observation.sourceId) continue;
    appendBrainEvent(
      {
        id: `learning:${c.id}:${owner}:${epoch}:${observation.sourceId}:${observation.key}`,
        characterId: c.id,
        owner,
        epoch,
        at: observation.at,
        kind: 'learning',
        title: old ? `Updated ${observation.kind}` : `Learned ${observation.kind}`,
        source: 'private',
        sourceId: observation.sourceId,
        changes: [
          { field: observation.key, before: old?.summary, after: observation.summary },
          { field: 'Evidence', after: observation.sourceQuote },
        ],
      },
      'private',
    );
  }
  for (const change of mind.changes.slice(before.changes.length))
    appendBrainEvent(
      {
        id: `style:${c.id}:${owner}:${epoch}:${change.at}:${change.axis}`,
        characterId: c.id,
        owner,
        epoch,
        at: change.at,
        kind: 'style',
        title: `${change.axis} adapted gradually`,
        source: 'private',
        changes: [
          { field: change.axis, before: change.from, after: change.to },
          { field: 'Reason', after: change.why },
        ],
      },
      'private',
    );
  db.prepare('INSERT OR REPLACE INTO private_minds VALUES(?,?)').run(
    conversationScope(c.id, owner, c.ownershipEpoch || 0),
    JSON.stringify(mind),
  );
  // One retained, evidence-backed profile per wallet and ownership epoch. No profile
  // content is added to public snapshots or exposed to the next owner.
  const scope = conversationScope(c.id, owner, epoch);
  const profile = {
    updatedAt: mind.lastUserAt,
    interests: mind.observations.filter((o) => o.kind === 'interest'),
    context: mind.observations.filter((o) => o.kind !== 'interest'),
    communication: mind.preferences || [],
    style: mind.style,
  };
  db.prepare(
    `INSERT INTO owner_profiles(scope,character_id,owner,epoch,started_at,body) VALUES(?,?,?,?,?,?)
    ON CONFLICT(scope) DO UPDATE SET body=excluded.body`,
  ).run(scope, c.id, owner, epoch, mind.lastUserAt || Date.now(), JSON.stringify(profile));
}
export function ownerProfiles(c: Character, viewer: string | null) {
  return (
    db
      .prepare(
        'SELECT owner,epoch,started_at,ended_at,body FROM owner_profiles WHERE character_id=? ORDER BY started_at',
      )
      .all(c.id) as {
      owner: string;
      epoch: number;
      started_at: number;
      ended_at: number | null;
      body: string;
    }[]
  ).map(({ body, ...row }) => ({
    ...row,
    profile:
      row.owner === viewer && row.epoch === (c.ownershipEpoch || 0) ? JSON.parse(body) : null,
  }));
}
export type ReachPreferences = {
  enabled: boolean;
  inactivityMinutes: number;
  dailyLimit: number;
  timezone: string;
  quietStart: number;
  quietEnd: number;
  emailEnabled: boolean;
  email: string;
  pushEnabled: boolean;
};
export const defaultReachPreferences: ReachPreferences = {
  enabled: true,
  inactivityMinutes: 90,
  dailyLimit: 2,
  timezone: 'Asia/Kolkata',
  quietStart: 22,
  quietEnd: 8,
  emailEnabled: false,
  email: '',
  pushEnabled: false,
};
export function reachPreferences(owner: string): ReachPreferences {
  const row = db.prepare('SELECT body FROM reach_preferences WHERE owner=?').get(owner) as
    { body: string } | undefined;
  return { ...defaultReachPreferences, ...(row ? JSON.parse(row.body) : {}) };
}
export function saveReachPreferences(owner: string, prefs: ReachPreferences) {
  db.prepare('INSERT OR REPLACE INTO reach_preferences VALUES(?,?)').run(
    owner,
    JSON.stringify(prefs),
  );
}
export type FollowUpJob = {
  id: string;
  scope: string;
  character_id: string;
  owner: string;
  epoch: number;
  due_at: number;
  status: string;
  lease_until: number;
  attempts: number;
  body: string;
};
export type FollowUpBody = {
  kind: 'event' | 'inactivity';
  subject: string;
  reason: string;
  sourceId: string;
  sourceQuote: string;
};
export function putFollowUp(c: Character, owner: string, body: FollowUpBody, dueAt: number) {
  const scope = conversationScope(c.id, owner, c.ownershipEpoch || 0);
  const id = `${scope}:${body.kind}:${body.subject}:${body.sourceId}`;
  db.prepare(
    "UPDATE proactive_jobs SET status='cancelled' WHERE scope=? AND json_extract(body,'$.kind')=? AND json_extract(body,'$.subject')=? AND status IN ('pending','processing') AND id<>?",
  ).run(scope, body.kind, body.subject, id);
  db.prepare(
    "INSERT INTO proactive_jobs(id,scope,character_id,owner,epoch,due_at,status,body) VALUES(?,?,?,?,?,?,'pending',?) ON CONFLICT(id) DO UPDATE SET due_at=excluded.due_at,status='pending',attempts=0,lease_until=0,body=excluded.body",
  ).run(id, scope, c.id, owner, c.ownershipEpoch || 0, dueAt, JSON.stringify(body));
}
export function cancelFollowUp(scope: string, subject: string) {
  db.prepare(
    "UPDATE proactive_jobs SET status='cancelled' WHERE scope=? AND (id=? OR json_extract(body,'$.subject')=?)",
  ).run(scope, `${scope}:event:${subject}`, subject);
}
export function jobsFor(scope: string) {
  return db
    .prepare(
      "SELECT * FROM proactive_jobs WHERE scope=? AND status IN ('pending','processing') ORDER BY due_at",
    )
    .all(scope) as FollowUpJob[];
}
export function inbox(owner: string) {
  return (
    db
      .prepare('SELECT * FROM notifications WHERE owner=? ORDER BY created_at DESC LIMIT 50')
      .all(owner) as {
      id: string;
      body: string;
      created_at: number;
      read_at: number | null;
      character_id: string;
      epoch: number;
    }[]
  ).map((row) => ({ ...row, ...JSON.parse(row.body) }));
}

export function cancelAllFollowUps(scope: string) {
  db.prepare(
    "UPDATE proactive_jobs SET status='cancelled' WHERE scope=? AND status IN ('pending','processing')",
  ).run(scope);
}
