import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkOrigin, requireIdentity } from '@/lib/session';
import { getCharacter } from '@/lib/store';
import { query, json } from '@/lib/database';
import { assertOwner } from '@/lib/domain';
import {
  reachPreferences,
  saveReachPreferences,
  inbox,
  loadMind,
  jobsFor,
} from '@/lib/continuity-store';
import { conversationScope } from '@/lib/private-mind';
import { readArkivCharacter } from '@/lib/arkiv';
import { allowedPushEndpoint, pushKeys } from '@/lib/push';
import { startProactiveWorker } from '@/lib/proactive-engine';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function ownCharacter(id: string, owner: string) {
  const c = await getCharacter(id);
  assertOwner(c, owner);
  if (c.entityKey) {
    const remote = await readArkivCharacter(c.entityKey as `0x${string}`);
    if (String(remote.owner).toLowerCase() !== owner)
      throw new Error('Character ownership has changed.');
  }
  return c;
}
const prefsSchema = z.object({
  enabled: z.boolean(),
  inactivityMinutes: z.number().int().min(60).max(120),
  dailyLimit: z.number().int().min(1).max(4),
  timezone: z
    .string()
    .max(80)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, 'Invalid timezone'),
  quietStart: z.number().int().min(0).max(23),
  quietEnd: z.number().int().min(0).max(23),
  emailEnabled: z.boolean(),
  email: z.union([z.email(), z.literal('')]),
  pushEnabled: z.boolean(),
});
const response = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function GET(request: Request) {
  try {
    const owner = await requireIdentity();
    startProactiveWorker();
    const id = new URL(request.url).searchParams.get('character');
    const c = id ? await ownCharacter(id, owner) : null;
    // Old-owner inbox records remain private to that owner; their old character view is no longer accessible.
    return response({
      preferences: await reachPreferences(owner),
      notifications: await inbox(owner),
      mind: c ? await loadMind(c, owner) : null,
      jobs: c ? await jobsFor(conversationScope(c.id, owner, c.ownershipEpoch || 0)) : [],
      emailConfigured: !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM),
      pushPublicKey: pushKeys().publicKey,
    });
  } catch (error) {
    return response(
      { error: error instanceof Error ? error.message : 'Could not load check-ins.' },
      400,
    );
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const owner = await requireIdentity();
    const raw = await request.text();
    if (raw.length > 10000) throw new Error('Request is too large.');
    const body = JSON.parse(raw);
    if (body.action === 'preferences') {
      const prefs = prefsSchema.parse(body.preferences);
      if (prefs.emailEnabled && !prefs.email) throw new Error('Enter your email address.');
      if (prefs.emailEnabled && (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM))
        throw new Error('Email needs RESEND_API_KEY and a verified RESEND_FROM on the server.');
      await saveReachPreferences(owner, prefs);
      if (!prefs.enabled)
        await query(
          "UPDATE proactive_jobs SET status='cancelled' WHERE owner=$1 AND status IN ('pending','processing')",
          [owner],
        );
      return response({ preferences: prefs });
    }
    if (body.action === 'read') {
      const id = z.string().max(100).parse(body.id);
      await query('UPDATE notifications SET read_at=$1 WHERE id=$2 AND owner=$3', [Date.now(), id, owner]);
      return response({ ok: true });
    }
    if (body.action === 'cancel') {
      const id = z.string().max(1000).parse(body.id);
      await query("UPDATE proactive_jobs SET status='cancelled' WHERE id=$1 AND owner=$2", [id, owner]);
      return response({ ok: true });
    }
    if (body.action === 'subscribe') {
      const subscription = z
        .object({
          endpoint: z.url().max(2000).refine(allowedPushEndpoint, 'Unsupported push service'),
          expirationTime: z.number().nullable().optional(),
          keys: z.object({
            p256dh: z.string().min(40).max(300),
            auth: z.string().min(10).max(100),
          }),
        })
        .parse(body.subscription);
      const existingResult = await query<{ owner: string }>(
        'SELECT owner FROM push_subscriptions WHERE endpoint=$1',
        [subscription.endpoint],
      );
      const existing = existingResult.rows[0];
      if (existing && existing.owner !== owner)
        throw new Error(
          'This push subscription belongs to a different session. Disable it before switching accounts.',
        );
      const count = await query<{ n: string }>('SELECT count(*) AS n FROM push_subscriptions WHERE owner=$1', [owner]);
      if (Number(count.rows[0].n) >= 5 && !existing) throw new Error('You already have five notification devices.');
      await query(
        `INSERT INTO push_subscriptions(endpoint,owner,body) VALUES($1,$2,$3::jsonb)
         ON CONFLICT(endpoint) DO UPDATE SET owner=excluded.owner,body=excluded.body`,
        [subscription.endpoint, owner, JSON.stringify(subscription)],
      );
      await saveReachPreferences(owner, { ...(await reachPreferences(owner)), pushEnabled: true });
      return response({ ok: true });
    }
    if (body.action === 'unsubscribe') {
      await query('DELETE FROM push_subscriptions WHERE owner=$1', [owner]);
      await saveReachPreferences(owner, { ...(await reachPreferences(owner)), pushEnabled: false });
      return response({ ok: true });
    }
    throw new Error('Unknown check-in action.');
  } catch (error) {
    return response(
      { error: error instanceof Error ? error.message : 'Could not save check-in settings.' },
      400,
    );
  }
}
