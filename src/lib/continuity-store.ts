import { appendBrainEvent } from './store';
import type { Character, Message } from './domain';
import { conversationScope, initialPrivateMind, type PrivateMind } from './private-mind';
import { json, query, type DbClient } from './database';

export async function archiveConversation(
  id: string,
  owner: string,
  epoch: number,
  rows: Message[],
  client?: DbClient,
) {
  const scope = conversationScope(id, owner, epoch);
  for (const row of rows)
    await query(
      'INSERT INTO conversation_events(id,scope,at,body) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(id) DO NOTHING',
      [`${scope}:${row.id}`, scope, row.at, JSON.stringify(row)],
      client,
    );
}

export async function recallArchive(scope: string, queryText: string): Promise<Message[]> {
  const words = [...new Set(queryText.match(/[\p{L}\p{N}]{3,}/gu) || [])].slice(0, 12);
  if (!words.length) return [];
  const result = await query<{ body: unknown }>(
    `SELECT body FROM conversation_events
     WHERE scope=$1 AND search_vector @@ plainto_tsquery('simple',$2)
     ORDER BY ts_rank(search_vector,plainto_tsquery('simple',$2)) DESC, at DESC LIMIT 4`,
    [scope, words.join(' ')],
  );
  return result.rows.map((row) => json<Message>(row.body));
}

export async function loadMind(c: Character, owner: string, client?: DbClient): Promise<PrivateMind> {
  const result = await query<{ body: unknown }>(
    'SELECT body FROM private_minds WHERE scope=$1',
    [conversationScope(c.id, owner, c.ownershipEpoch || 0)],
    client,
  );
  return result.rowCount
    ? json<PrivateMind>(result.rows[0].body)
    : initialPrivateMind(c);
}

export async function saveMind(c: Character, owner: string, mind: PrivateMind, client?: DbClient) {
  const before = await loadMind(c, owner, client);
  const epoch = c.ownershipEpoch || 0;
  for (const observation of mind.observations) {
    const old = before.observations.find((o) => o.key === observation.key);
    if (old?.sourceId === observation.sourceId) continue;
    await appendBrainEvent(
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
      client,
    );
  }
  for (const change of mind.changes.slice(before.changes.length))
    await appendBrainEvent(
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
      client,
    );
  await query(
    `INSERT INTO private_minds(scope,body) VALUES($1,$2::jsonb)
     ON CONFLICT(scope) DO UPDATE SET body=excluded.body`,
    [conversationScope(c.id, owner, epoch), JSON.stringify(mind)],
    client,
  );
  const scope = conversationScope(c.id, owner, epoch);
  const profile = {
    updatedAt: mind.lastUserAt,
    interests: mind.observations.filter((o) => o.kind === 'interest'),
    context: mind.observations.filter((o) => o.kind !== 'interest'),
    communication: mind.preferences || [],
    style: mind.style,
  };
  await query(
    `INSERT INTO owner_profiles(scope,character_id,owner,epoch,started_at,body)
     VALUES($1,$2,$3,$4,$5,$6::jsonb)
     ON CONFLICT(scope) DO UPDATE SET body=excluded.body`,
    [scope, c.id, owner, epoch, mind.lastUserAt || Date.now(), JSON.stringify(profile)],
    client,
  );
}

export async function ownerProfiles(c: Character, viewer: string | null) {
  const result = await query<{
    owner: string;
    epoch: number;
    started_at: string | number;
    ended_at: string | number | null;
    body: unknown;
  }>(
    'SELECT owner,epoch,started_at,ended_at,body FROM owner_profiles WHERE character_id=$1 ORDER BY started_at',
    [c.id],
  );
  return result.rows.map((row) => ({
    owner: row.owner,
    epoch: row.epoch,
    started_at: Number(row.started_at),
    ended_at: row.ended_at === null ? null : Number(row.ended_at),
    profile:
      row.owner === viewer && row.epoch === (c.ownershipEpoch || 0)
        ? json(row.body)
        : null,
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
export async function reachPreferences(owner: string, client?: DbClient): Promise<ReachPreferences> {
  const result = await query<{ body: unknown }>(
    'SELECT body FROM reach_preferences WHERE owner=$1',
    [owner],
    client,
  );
  return { ...defaultReachPreferences, ...(result.rowCount ? json(result.rows[0].body) : {}) };
}

export async function saveReachPreferences(owner: string, prefs: ReachPreferences, client?: DbClient) {
  await query(
    `INSERT INTO reach_preferences(owner,body) VALUES($1,$2::jsonb)
     ON CONFLICT(owner) DO UPDATE SET body=excluded.body`,
    [owner, JSON.stringify(prefs)],
    client,
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

export async function putFollowUp(c: Character, owner: string, body: FollowUpBody, dueAt: number, client?: DbClient) {
  const scope = conversationScope(c.id, owner, c.ownershipEpoch || 0);
  const id = `${scope}:${body.kind}:${body.subject}:${body.sourceId}`;
  await query(
    `UPDATE proactive_jobs SET status='cancelled' WHERE scope=$1
     AND body->>'kind'=$2 AND body->>'subject'=$3 AND status IN ('pending','processing') AND id<>$4`,
    [scope, body.kind, body.subject, id],
    client,
  );
  await query(
    `INSERT INTO proactive_jobs(id,scope,character_id,owner,epoch,due_at,status,body)
     VALUES($1,$2,$3,$4,$5,$6,'pending',$7::jsonb)
     ON CONFLICT(id) DO UPDATE SET due_at=excluded.due_at,status='pending',attempts=0,lease_until=0,body=excluded.body`,
    [id, scope, c.id, owner, c.ownershipEpoch || 0, dueAt, JSON.stringify(body)],
    client,
  );
}

export async function cancelFollowUp(scope: string, subject: string, client?: DbClient) {
  await query(
    "UPDATE proactive_jobs SET status='cancelled' WHERE scope=$1 AND (id=$2 OR body->>'subject'=$3)",
    [scope, `${scope}:event:${subject}`, subject],
    client,
  );
}

export async function jobsFor(scope: string): Promise<FollowUpJob[]> {
  const result = await query<FollowUpJob & { body: unknown; due_at: string; lease_until: string }>(
    "SELECT id,scope,character_id,owner,epoch,due_at,status,lease_until,attempts,body::text AS body FROM proactive_jobs WHERE scope=$1 AND status IN ('pending','processing') ORDER BY due_at",
    [scope],
  );
  return result.rows.map((row) => ({
    ...row,
    due_at: Number(row.due_at),
    lease_until: Number(row.lease_until),
  }));
}

export async function inbox(owner: string) {
  const result = await query<{
    id: string;
    body: unknown;
    created_at: string | number;
    read_at: string | number | null;
    character_id: string;
    epoch: number;
  }>(
    'SELECT id,body,created_at,read_at,character_id,epoch FROM notifications WHERE owner=$1 ORDER BY created_at DESC LIMIT 50',
    [owner],
  );
  return result.rows.map((row) => ({
    ...json<Record<string, unknown>>(row.body),
    id: row.id,
    created_at: Number(row.created_at),
    read_at: row.read_at === null ? null : Number(row.read_at),
    character_id: row.character_id,
    epoch: row.epoch,
  }));
}

export async function cancelAllFollowUps(scope: string, client?: DbClient) {
  await query(
    "UPDATE proactive_jobs SET status='cancelled' WHERE scope=$1 AND status IN ('pending','processing')",
    [scope],
    client,
  );
}
