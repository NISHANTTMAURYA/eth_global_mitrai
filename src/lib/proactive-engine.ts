import { createHash } from 'node:crypto';
import { database as db, getCharacter, messages, saveMessages } from './store';
import {
  reachPreferences,
  loadMind,
  archiveConversation,
  type FollowUpJob,
  type FollowUpBody,
} from './continuity-store';
import { continuityContext } from './continuity';
import { reply, configuredProvider } from './chat';
import { lifecycle, type Character, type Message } from './domain';
import { nextAllowedTime } from './proactive-policy';
import { readArkivCharacter } from './arkiv';
import { verifySnapshot } from './proof';
import { sendPush } from './push';

const hash = (text: string) => createHash('sha256').update(text).digest('hex');
async function entitled(c: Character, job: FollowUpJob) {
  if (c.owner !== job.owner || (c.ownershipEpoch || 0) !== job.epoch || !lifecycle(c).alive)
    return false;
  if (c.entityKey) {
    const remote = await readArkivCharacter(c.entityKey as `0x${string}`);
    return (
      String(remote.owner).toLowerCase() === job.owner &&
      verifySnapshot(remote.character, remote.proof, remote.verifier)
    );
  }
  return true;
}
const defaultGenerate = async (c: Character, job: FollowUpJob) => {
  const body = JSON.parse(job.body) as FollowUpBody;
  if (configuredProvider() === 'Scripted demo')
    throw new Error('Personalized check-ins require a live inference provider.');
  return (
    await reply(
      c,
      'Write the scheduled check-in now.',
      messages(c.id, job.owner, job.epoch),
      false,
      {
        context: continuityContext(c, job.owner, body.reason),
        timezone: reachPreferences(job.owner).timezone,
        followUp: JSON.stringify(body),
      },
    )
  ).messages;
};
/** Durable leased jobs; no setTimeout per user and no keyword-specific reminders. */
export async function processProactive(
  options: { now?: number; generate?: typeof defaultGenerate } = {},
) {
  const now = options.now ?? Date.now();
  const jobs = db
    .prepare(
      "SELECT * FROM proactive_jobs WHERE due_at<=? AND (status='pending' OR (status='processing' AND lease_until<?)) ORDER BY CASE WHEN json_extract(body,'$.kind')='event' THEN 0 ELSE 1 END,due_at LIMIT 12",
    )
    .all(now, now) as FollowUpJob[];
  let delivered = 0;
  for (const job of jobs) {
    const claimed = db
      .prepare(
        "UPDATE proactive_jobs SET status='processing',lease_until=? WHERE id=? AND (status='pending' OR (status='processing' AND lease_until<?))",
      )
      .run(now + 180000, job.id, now);
    if (!claimed.changes) continue;
    try {
      const c = getCharacter(job.character_id),
        prefs = reachPreferences(job.owner),
        body = JSON.parse(job.body) as FollowUpBody;
      if (!prefs.enabled || !(await entitled(c, job))) {
        cancel(job.id);
        continue;
      }
      const mind = loadMind(c, job.owner),
        recent = db
          .prepare(
            'SELECT created_at FROM notifications WHERE owner=? ORDER BY created_at DESC LIMIT 1',
          )
          .get(job.owner) as { created_at: number } | undefined;
      if (body.kind === 'inactivity' && recent && recent.created_at > mind.lastUserAt) {
        cancel(job.id);
        continue;
      }
      const quietUntil = nextAllowedTime(now, prefs);
      const count = db
        .prepare('SELECT count(*) AS n FROM notifications WHERE owner=? AND created_at>?')
        .get(job.owner, now - 86400000) as { n: number };
      const earliest = Math.max(
        quietUntil,
        mind.lastUserAt + (body.kind === 'inactivity' ? prefs.inactivityMinutes * 60000 : 60000),
        recent ? recent.created_at + 3600000 : 0,
      );
      if (count.n >= prefs.dailyLimit) {
        defer(job.id, now + 3600000);
        continue;
      }
      if (earliest > now) {
        defer(job.id, earliest);
        continue;
      }
      db.prepare('UPDATE proactive_jobs SET attempts=attempts+1 WHERE id=?').run(job.id);
      const bubbles = await (options.generate || defaultGenerate)(c, job);
      const fresh = getCharacter(c.id);
      if (!(await entitled(fresh, job)) || !reachPreferences(job.owner).enabled) {
        cancel(job.id);
        continue;
      }
      if (loadMind(fresh, job.owner).lastUserAt !== mind.lastUserAt) {
        if (body.kind === 'inactivity') cancel(job.id);
        else defer(job.id, Date.now() + 300000);
        continue;
      }
      const text = bubbles
        .map((b) => b.text)
        .join('\n\n')
        .trim();
      if (!text || text.length > 2400) throw new Error('Invalid proactive reply.');
      const id = hash(`${job.id}:${body.sourceId}`),
        at = options.now ?? Date.now();
      const record = {
        title: `${c.name} checked in`,
        text,
        characterName: c.name,
        url: `/companion/${c.id}`,
      };
      db.exec('BEGIN IMMEDIATE');
      try {
        const inserted = db
          .prepare('INSERT OR IGNORE INTO notifications VALUES(?,?,?,?,?,?,?)')
          .run(id, job.owner, c.id, job.epoch, at, null, JSON.stringify(record));
        if (inserted.changes) {
          const message: Message = {
            id: `proactive-${id}`,
            role: 'assistant',
            text,
            at,
            provider: 'Character check-in',
            proactive: true,
          };
          saveMessages(
            c.id,
            job.owner,
            [...messages(c.id, job.owner, job.epoch), message],
            job.epoch,
          );
          archiveConversation(c.id, job.owner, job.epoch, [message]);
          const channels = [
            ...(prefs.emailEnabled && prefs.email ? ['email'] : []),
            ...(prefs.pushEnabled ? ['push'] : []),
          ];
          for (const channel of channels) {
            const payload =
              channel === 'email'
                ? {
                    to: prefs.email,
                    subject: record.title,
                    text: `${c.name} left you a private check-in. Read it in MitrAI: ${process.env.APP_ORIGIN || 'http://localhost:3000'}${record.url}`,
                  }
                : {
                    title: record.title,
                    body: 'You have a private message in MitrAI.',
                    url: record.url,
                    tag: id,
                  };
            db.prepare(
              "INSERT OR IGNORE INTO delivery_outbox(id,notification_id,channel,status,next_at,body) VALUES(?,?,?,'pending',?,?)",
            ).run(`${id}:${channel}`, id, channel, at, JSON.stringify(payload));
          }
          delivered++;
        }
        db.prepare("UPDATE proactive_jobs SET status='sent',lease_until=0 WHERE id=?").run(job.id);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      if (job.attempts >= 4)
        db.prepare("UPDATE proactive_jobs SET status='failed',lease_until=0 WHERE id=?").run(
          job.id,
        );
      else defer(job.id, now + Math.min(3600000, 60000 * 2 ** job.attempts));
      console.warn(
        'Character check-in preparation failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
    }
  }
  return { delivered };
}
function cancel(id: string) {
  db.prepare("UPDATE proactive_jobs SET status='cancelled',lease_until=0 WHERE id=?").run(id);
}
function defer(id: string, at: number) {
  db.prepare("UPDATE proactive_jobs SET status='pending',due_at=?,lease_until=0 WHERE id=?").run(
    at,
    id,
  );
}
export async function drainDeliveries(
  options: { now?: number; fetcher?: typeof fetch; push?: typeof sendPush } = {},
) {
  const now = options.now ?? Date.now();
  const rows = db
    .prepare(
      "SELECT o.*,n.owner,n.character_id,n.epoch,n.created_at FROM delivery_outbox o JOIN notifications n ON n.id=o.notification_id WHERE o.next_at<=? AND (o.status='pending' OR (o.status='processing' AND o.lease_until<?)) LIMIT 12",
    )
    .all(now, now) as {
    id: string;
    owner: string;
    character_id: string;
    epoch: number;
    channel: string;
    attempts: number;
    created_at: number;
    body: string;
  }[];
  for (const row of rows) {
    const claim = db
      .prepare(
        "UPDATE delivery_outbox SET status='processing',lease_until=?,attempts=attempts+1 WHERE id=? AND (status='pending' OR (status='processing' AND lease_until<?))",
      )
      .run(now + 90000, row.id, now);
    if (!claim.changes) continue;
    try {
      const c = getCharacter(row.character_id),
        prefs = reachPreferences(row.owner),
        payload = JSON.parse(row.body);
      if (
        !prefs.enabled ||
        !lifecycle(c, now).alive ||
        c.owner !== row.owner ||
        (c.ownershipEpoch || 0) !== row.epoch ||
        now - row.created_at > 23 * 3600000
      ) {
        finish('cancelled');
        continue;
      }
      if (c.entityKey) {
        const remote = await readArkivCharacter(c.entityKey as `0x${string}`);
        if (String(remote.owner).toLowerCase() !== row.owner) {
          finish('cancelled');
          continue;
        }
      }
      const allowedAt = nextAllowedTime(now, prefs);
      if (allowedAt > now) {
        db.prepare(
          "UPDATE delivery_outbox SET status='pending',lease_until=0,next_at=? WHERE id=?",
        ).run(allowedAt, row.id);
        continue;
      }
      if (row.channel === 'email') {
        if (!prefs.emailEnabled || prefs.email !== payload.to) {
          finish('cancelled');
          continue;
        }
        if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM)
          throw new Error('Email is awaiting Resend configuration.');
        const response = await (options.fetcher || fetch)('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': row.id,
          },
          body: JSON.stringify({ from: process.env.RESEND_FROM, ...payload }),
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error(`Email delivery returned ${response.status}.`);
      } else {
        if (!prefs.pushEnabled) {
          finish('cancelled');
          continue;
        }
        const subscriptions = db
          .prepare('SELECT endpoint,body FROM push_subscriptions WHERE owner=?')
          .all(row.owner) as { endpoint: string; body: string }[];
        for (const subscription of subscriptions) {
          try {
            await (options.push || sendPush)(JSON.parse(subscription.body), row.body);
          } catch (error) {
            const status = (error as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410)
              db.prepare('DELETE FROM push_subscriptions WHERE endpoint=?').run(
                subscription.endpoint,
              );
            else throw error;
          }
        }
      }
      finish('sent');
    } catch {
      if (row.attempts >= 5) finish('failed');
      else
        db.prepare(
          "UPDATE delivery_outbox SET status='pending',lease_until=0,next_at=? WHERE id=?",
        ).run(now + Math.min(3600000, 60000 * 2 ** row.attempts), row.id);
    }
    function finish(status: string) {
      db.prepare('UPDATE delivery_outbox SET status=?,lease_until=0 WHERE id=?').run(
        status,
        row.id,
      );
    }
  }
}
export function startProactiveWorker() {
  const state = globalThis as typeof globalThis & {
    mitraiReachTimer?: ReturnType<typeof setInterval>;
    mitraiReachBusy?: boolean;
    mitraiReachTick?: () => Promise<void>;
    mitraiReachVersion?: string;
  };
  if (process.env.PROACTIVE_DISABLED === '1') return;
  if (state.mitraiReachTimer && state.mitraiReachVersion !== 'leased-reach-v2') {
    clearInterval(state.mitraiReachTimer);
    state.mitraiReachTimer = undefined;
  }
  state.mitraiReachVersion = 'leased-reach-v2';
  const tick = async () => {
    if (state.mitraiReachBusy) return;
    state.mitraiReachBusy = true;
    try {
      await processProactive();
      await drainDeliveries();
    } catch (error) {
      console.warn(
        'Character check-in worker:',
        error instanceof Error ? error.message : 'unavailable',
      );
    } finally {
      state.mitraiReachBusy = false;
    }
  };
  state.mitraiReachTick = tick;
  if (state.mitraiReachTimer) return;
  state.mitraiReachTimer = setInterval(() => void state.mitraiReachTick?.(), 60000);
  state.mitraiReachTimer.unref();
}
