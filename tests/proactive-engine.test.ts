import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory = mkdtempSync(path.join(tmpdir(), 'mitrai-reach-test-'));
process.env.MITRAI_DATA_DIR = directory;
process.env.PROACTIVE_DISABLED = '1';
const store = await import('../src/lib/store');
const continuity = await import('../src/lib/continuity-store');
const { acceptConversation } = await import('../src/lib/continuity');
const { emptyProposal, conversationScope } = await import('../src/lib/private-mind');
const { processProactive, drainDeliveries } = await import('../src/lib/proactive-engine');
const { nextAllowedTime } = await import('../src/lib/proactive-policy');
const { seeds } = await import('../src/lib/seed');
after(() => rmSync(directory, { recursive: true, force: true }));
function fixture() {
  const c = structuredClone(seeds()[0]);
  c.id = crypto.randomUUID();
  c.owner = `demo:${c.id}`;
  c.ownershipEpoch = 0;
  c.createdAt = Date.now() - 3600000;
  c.lifespan = 30 * 86400000;
  store.saveCharacter(c);
  continuity.saveReachPreferences(c.owner, {
    ...continuity.defaultReachPreferences,
    quietStart: 0,
    quietEnd: 0,
  });
  return c;
}
const generate = async () => [{ text: 'How did your ceramics showcase go? No rush to answer.' }];

test('the dated archive survives the 100-message recent window and excludes other owners', () => {
  const c = fixture();
  const rows = Array.from({ length: 150 }, (_, i) => ({
    id: `m${i}`,
    role: 'user' as const,
    text: i === 0 ? 'UNIQUE_CERAMICS_BIRTHDAY' : 'ordinary message',
    at: Date.now() + i,
  }));
  store.saveMessages(c.id, c.owner, rows, 0);
  continuity.archiveConversation(c.id, c.owner, 0, rows);
  assert.equal(store.messages(c.id, c.owner).length, 100);
  assert.equal(
    continuity.recallArchive(conversationScope(c.id, c.owner), 'UNIQUE_CERAMICS_BIRTHDAY')[0].id,
    'm0',
  );
  assert.deepEqual(
    continuity.recallArchive(conversationScope(c.id, 'other'), 'UNIQUE_CERAMICS_BIRTHDAY'),
    [],
  );
});
test('semantic follow-up plans and inactivity jobs persist and are scoped to their source turn', async () => {
  const c = fixture(),
    now = Date.now();
  acceptConversation(
    c,
    c.owner,
    { id: 'turn1', role: 'user', text: 'My pottery showcase ends at 4.', at: now },
    [],
    {
      ...emptyProposal,
      followUps: [
        {
          subject: 'pottery',
          reason: 'Check how the showcase went',
          sourceQuote: 'My pottery showcase ends at 4.',
          dueAt: new Date(now + 7200000).toISOString(),
          action: 'schedule',
        },
      ],
    },
    now,
  );
  const jobs = continuity.jobsFor(conversationScope(c.id, c.owner));
  assert.equal(jobs.length, 2);
  assert.ok(jobs.some((j) => JSON.parse(j.body).kind === 'event'));
  const result = await processProactive({ now: now + 90 * 60000 + 1, generate });
  assert.equal(result.delivered, 1);
  assert.equal(continuity.inbox(c.owner).length, 1);
  assert.ok(store.messages(c.id, c.owner).some((m) => m.proactive));
  assert.equal((await processProactive({ now: now + 90 * 60000 + 1, generate })).delivered, 0);
});
test('new activity replaces the older inactivity job; transfer and Sunset prevent delivery', async () => {
  const c = fixture(),
    now = Date.now();
  for (const id of ['old', 'new'])
    acceptConversation(c, c.owner, { id, role: 'user', text: id, at: now }, [], emptyProposal, now);
  const scope = conversationScope(c.id, c.owner);
  assert.equal(
    continuity.jobsFor(scope).filter((j) => JSON.parse(j.body).kind === 'inactivity').length,
    1,
  );
  const previous = c.owner;
  c.owner = 'demo:recipient';
  c.ownershipEpoch = 1;
  store.saveCharacter(c);
  assert.equal((await processProactive({ now: now + 2 * 3600000, generate })).delivered, 0);
  assert.equal(continuity.inbox(previous).length, 0);
  const expired = fixture();
  expired.createdAt = now - 86400000;
  expired.lifespan = 1000;
  store.saveCharacter(expired);
  continuity.putFollowUp(
    expired,
    expired.owner,
    { kind: 'event', subject: 'x', reason: 'x', sourceId: 'x', sourceQuote: 'x' },
    now,
  );
  assert.equal((await processProactive({ now, generate })).delivered, 0);
});
test('quiet hours defer instead of sending at night, including non-UTC offsets', () => {
  const prefs = {
    ...continuity.defaultReachPreferences,
    timezone: 'Asia/Kolkata',
    quietStart: 22,
    quietEnd: 8,
  };
  const at = Date.UTC(2026, 10, 6, 18, 0);
  const next = nextAllowedTime(at, prefs);
  assert.equal(new Date(next).toISOString(), '2026-11-07T02:30:00.000Z');
  assert.equal(nextAllowedTime(Date.UTC(2026, 10, 6, 8), prefs), Date.UTC(2026, 10, 6, 8));
});
test('Resend outbox is idempotent and sends only opted-in generic inbox notices', async () => {
  const c = fixture(),
    now = Date.now();
  continuity.saveReachPreferences(c.owner, {
    ...continuity.defaultReachPreferences,
    emailEnabled: true,
    email: 'test@example.com',
    quietStart: 0,
    quietEnd: 0,
  });
  acceptConversation(
    c,
    c.owner,
    { id: 'email-turn', role: 'user', text: 'PRIVATE_SHOWCASE_DETAILS', at: now },
    [],
    emptyProposal,
    now,
  );
  await processProactive({ now: now + 90 * 60000 + 1, generate });
  let calls = 0;
  process.env.RESEND_API_KEY = 'test-key';
  process.env.RESEND_FROM = 'MitrAI <test@example.com>';
  const fetcher: typeof fetch = async (_input, init) => {
    calls++;
    assert.ok((init?.headers as Record<string, string>)['Idempotency-Key']);
    assert.ok(!String(init?.body).includes('PRIVATE_SHOWCASE_DETAILS'));
    return Response.json({ id: 'test-email' });
  };
  await drainDeliveries({ now: now + 90 * 60000 + 1, fetcher });
  await drainDeliveries({ now: now + 90 * 60000 + 2, fetcher });
  assert.equal(calls, 1);
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM;
});
