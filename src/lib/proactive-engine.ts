import { createHash } from 'node:crypto';
import { getCharacter, messages, saveMessages } from './store';
import { query, transaction } from './database';
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
      await messages(c.id, job.owner, job.epoch),
      false,
      {
        context: await continuityContext(c, job.owner, body.reason),
        timezone: (await reachPreferences(job.owner)).timezone,
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
  const jobRows = await query<FollowUpJob & { due_at: string; lease_until: string; body: string }>(
    "SELECT id,scope,character_id,owner,epoch,due_at,status,lease_until,attempts,body::text AS body FROM proactive_jobs WHERE due_at<=$1 AND (status='pending' OR (status='processing' AND lease_until<$1)) ORDER BY CASE WHEN body->>'kind'='event' THEN 0 ELSE 1 END,due_at LIMIT 12",
    [now],
  );
  const jobs = jobRows.rows.map((job) => ({ ...job, due_at: Number(job.due_at), lease_until: Number(job.lease_until) }));
  let delivered = 0;
  for (const job of jobs) {
    const claimed = await query(
      "UPDATE proactive_jobs SET status='processing',lease_until=$1 WHERE id=$2 AND (status='pending' OR (status='processing' AND lease_until<$3)) RETURNING id",
      [now + 180000, job.id, now],
    );
    if (!claimed.rowCount) continue;
    try {
      const c = await getCharacter(job.character_id),
        prefs = await reachPreferences(job.owner),
        body = JSON.parse(job.body) as FollowUpBody;
      if (!prefs.enabled || !(await entitled(c, job))) {
        await cancel(job.id);
        continue;
      }
      const mind = await loadMind(c, job.owner),
        recentResult = await query<{ created_at: string }>(
          'SELECT created_at FROM notifications WHERE owner=$1 ORDER BY created_at DESC LIMIT 1',
          [job.owner],
        ),
        recent = recentResult.rows[0] ? { created_at: Number(recentResult.rows[0].created_at) } : null;
      if (body.kind === 'inactivity' && recent && recent.created_at > mind.lastUserAt) {
        await cancel(job.id);
        continue;
      }
      const quietUntil = nextAllowedTime(now, prefs);
      const count = await query<{ n: string }>(
        'SELECT count(*) AS n FROM notifications WHERE owner=$1 AND created_at>$2',
        [job.owner, now - 86400000],
      );
      const earliest = Math.max(
        quietUntil,
        mind.lastUserAt + (body.kind === 'inactivity' ? prefs.inactivityMinutes * 60000 : 60000),
        recent ? recent.created_at + 3600000 : 0,
      );
      if (Number(count.rows[0].n) >= prefs.dailyLimit) {
        await defer(job.id, now + 3600000);
        continue;
      }
      if (earliest > now) {
        await defer(job.id, earliest);
        continue;
      }
      await query('UPDATE proactive_jobs SET attempts=attempts+1 WHERE id=$1', [job.id]);
      const bubbles = await (options.generate || defaultGenerate)(c, job);
      const fresh = await getCharacter(c.id);
      if (!(await entitled(fresh, job)) || !(await reachPreferences(job.owner)).enabled) {
        await cancel(job.id);
        continue;
      }
      if ((await loadMind(fresh, job.owner)).lastUserAt !== mind.lastUserAt) {
        if (body.kind === 'inactivity') await cancel(job.id);
        else await defer(job.id, Date.now() + 300000);
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
      await transaction(async (client) => {
        const inserted = await query(
          'INSERT INTO notifications(id,owner,character_id,epoch,created_at,read_at,body) VALUES($1,$2,$3,$4,$5,NULL,$6::jsonb) ON CONFLICT(id) DO NOTHING RETURNING id',
          [id, job.owner, c.id, job.epoch, at, JSON.stringify(record)],
          client,
        );
        if (inserted.rowCount) {
          const message: Message = {
            id: `proactive-${id}`,
            role: 'assistant',
            text,
            at,
            provider: 'Character check-in',
            proactive: true,
          };
          await saveMessages(
            c.id,
            job.owner,
            [...(await messages(c.id, job.owner, job.epoch)), message],
            job.epoch,
            client,
          );
          await archiveConversation(c.id, job.owner, job.epoch, [message], client);
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
            await query(
              "INSERT INTO delivery_outbox(id,notification_id,channel,status,next_at,body) VALUES($1,$2,$3,'pending',$4,$5::jsonb) ON CONFLICT(id) DO NOTHING",
              [`${id}:${channel}`, id, channel, at, JSON.stringify(payload)],
              client,
            );
          }
          delivered++;
        }
        await query("UPDATE proactive_jobs SET status='sent',lease_until=0 WHERE id=$1", [job.id], client);
      });
    } catch (error) {
      if (job.attempts >= 4)
        await query("UPDATE proactive_jobs SET status='failed',lease_until=0 WHERE id=$1", [job.id]);
      else await defer(job.id, now + Math.min(3600000, 60000 * 2 ** job.attempts));
      console.warn(
        'Character check-in preparation failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
    }
  }
  return { delivered };
}
async function cancel(id: string) {
  await query("UPDATE proactive_jobs SET status='cancelled',lease_until=0 WHERE id=$1", [id]);
}
async function defer(id: string, at: number) {
  await query("UPDATE proactive_jobs SET status='pending',due_at=$1,lease_until=0 WHERE id=$2", [at, id]);
}
export async function drainDeliveries(
  options: { now?: number; fetcher?: typeof fetch; push?: typeof sendPush } = {},
) {
  const now = options.now ?? Date.now();
  const result = await query<{
    id: string;
    owner: string;
    character_id: string;
    epoch: number;
    channel: string;
    attempts: number;
    created_at: string;
    body: string;
  }>(
    "SELECT o.id,o.channel,o.attempts,n.owner,n.character_id,n.epoch,n.created_at,o.body::text AS body FROM delivery_outbox o JOIN notifications n ON n.id=o.notification_id WHERE o.next_at<=$1 AND (o.status='pending' OR (o.status='processing' AND o.lease_until<$1)) ORDER BY o.next_at LIMIT 12",
    [now],
  );
  const rows = result.rows.map((row) => ({ ...row, created_at: Number(row.created_at) }));
  for (const row of rows) {
    const claim = await query(
      "UPDATE delivery_outbox SET status='processing',lease_until=$1,attempts=attempts+1 WHERE id=$2 AND (status='pending' OR (status='processing' AND lease_until<$3)) RETURNING id",
      [now + 90000, row.id, now],
    );
    if (!claim.rowCount) continue;
    try {
      const c = await getCharacter(row.character_id),
        prefs = await reachPreferences(row.owner),
        payload = JSON.parse(row.body);
      if (
        !prefs.enabled ||
        !lifecycle(c, now).alive ||
        c.owner !== row.owner ||
        (c.ownershipEpoch || 0) !== row.epoch ||
        now - row.created_at > 23 * 3600000
      ) {
        await finish('cancelled');
        continue;
      }
      if (c.entityKey) {
        const remote = await readArkivCharacter(c.entityKey as `0x${string}`);
        if (String(remote.owner).toLowerCase() !== row.owner) {
          await finish('cancelled');
          continue;
        }
      }
      const allowedAt = nextAllowedTime(now, prefs);
      if (allowedAt > now) {
        await query("UPDATE delivery_outbox SET status='pending',lease_until=0,next_at=$1 WHERE id=$2", [allowedAt, row.id]);
        continue;
      }
      if (row.channel === 'email') {
        if (!prefs.emailEnabled || prefs.email !== payload.to) {
          await finish('cancelled');
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
          await finish('cancelled');
          continue;
        }
        const subscriptions = await query<{ endpoint: string; body: string }>(
          'SELECT endpoint,body::text AS body FROM push_subscriptions WHERE owner=$1',
          [row.owner],
        );
        for (const subscription of subscriptions.rows) {
          try {
            await (options.push || sendPush)(JSON.parse(subscription.body), row.body);
          } catch (error) {
            const status = (error as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410)
              await query('DELETE FROM push_subscriptions WHERE endpoint=$1', [subscription.endpoint]);
            else throw error;
          }
        }
      }
      await finish('sent');
    } catch {
      if (row.attempts >= 5) await finish('failed');
      else
        await query(
          "UPDATE delivery_outbox SET status='pending',lease_until=0,next_at=$1 WHERE id=$2",
          [now + Math.min(3600000, 60000 * 2 ** row.attempts), row.id],
        );
    }
    async function finish(status: string) {
      await query('UPDATE delivery_outbox SET status=$1,lease_until=0 WHERE id=$2', [status, row.id]);
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
