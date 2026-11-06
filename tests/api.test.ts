import { test } from 'node:test';
import assert from 'node:assert/strict';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
const base = process.env.MITRAI_TEST_URL;
function client() {
  let cookie = '';
  return async (path: string, body?: unknown) => {
    const r = await fetch(`${base}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        ...(body ? { 'Content-Type': 'application/json', Origin: base! } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = r.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: r.status, data: await r.json() };
  };
}
test(
  'full API journey: draft, creation limit, private memory, checkpoint, publishing, audition isolation, offers, handover and stale-owner denial',
  { skip: !base },
  async () => {
    const alice = client(),
      bob = client();
    await alice('/api/auth', { action: 'demo' });
    await bob('/api/auth', { action: 'demo' });
    const input = {
      action: 'create',
      name: 'Integration Mira',
      tagline: 'A test story worth continuing',
      description: 'Curious and thoughtful, ready to explore ideas together.',
      behavior: 'Be warm and ask useful questions.',
      model: 'download:Casual_Female',
      tags: ['Tests'],
      shortLife: true,
      traits: { curiosity: 60, warmth: 70, playfulness: 50 },
    };
    const created = await alice('/api/app', input);
    assert.equal(created.status, 200);
    const id = created.data.character.id;
    const born = created.data.character.createdAt;
    const duration = created.data.character.lifespan;
    assert.equal((await alice('/api/app', input)).status, 400);
    assert.equal((await bob(`/api/app?id=${id}`)).status, 400);
    assert.equal(
      (
        await alice('/api/app', {
          action: 'memory',
          id,
          text: 'PRIVATE_ZEBRA_SECRET',
          scope: 'private',
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await alice('/api/app', {
          action: 'memory',
          id,
          text: 'Enjoys inventing little stories',
          scope: 'public',
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await alice('/api/app', {
          action: 'chat',
          id,
          text: 'Please keep explanations short',
          audition: false,
        })
      ).status,
      200,
    );
    assert.equal((await alice('/api/app', { action: 'checkpoint', id })).status, 200);
    assert.equal(
      (
        await alice('/api/app', {
          action: 'publish',
          id,
          availability: 'offers',
          highlights: ['An approved public example'],
        })
      ).status,
      200,
    );
    const publicView = await bob(`/api/app?id=${id}`);
    assert.equal(publicView.status, 200);
    assert.ok(!JSON.stringify(publicView.data).includes('PRIVATE_ZEBRA_SECRET'));
    assert.deepEqual(publicView.data.messages, []);
    const publicLedger = await bob(`/api/brain?id=${id}`);
    assert.equal(publicLedger.status, 200);
    assert.equal(publicLedger.data.mind, null);
    assert.deepEqual(publicLedger.data.profiles, []);
    assert.ok(publicLedger.data.events.length > 0);
    assert.ok(!JSON.stringify(publicLedger.data).includes('PRIVATE_ZEBRA_SECRET'));
    const privateLedger = await alice(`/api/brain?id=${id}`);
    assert.equal(privateLedger.status, 200);
    assert.equal(privateLedger.data.profiles.length, 1);
    assert.ok(privateLedger.data.mind);
    const before = JSON.stringify(publicView.data.character.brain);
    assert.equal(
      (await bob('/api/app', { action: 'chat', id, text: 'What do you remember?', audition: true }))
        .status,
      200,
    );
    assert.equal(JSON.stringify((await bob(`/api/app?id=${id}`)).data.character.brain), before);
    assert.equal(
      (await bob('/api/app', { action: 'offer', id, note: 'I would like to continue this story.' }))
        .status,
      200,
    );
    assert.equal((await alice(`/api/app?id=${id}`)).data.offers.length, 1);
    const wallet = privateKeyToAccount(generatePrivateKey());
    const challenge = await bob('/api/auth', { action: 'challenge', address: wallet.address });
    const signature = await wallet.signMessage({ message: challenge.data.message });
    assert.equal(
      (
        await bob('/api/auth', {
          action: 'verify',
          address: wallet.address,
          nonce: challenge.data.nonce,
          signature,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await bob('/api/auth', {
          action: 'verify',
          address: wallet.address,
          nonce: challenge.data.nonce,
          signature,
        })
      ).status,
      400,
      'nonce replay rejected',
    );
    assert.equal(
      (await alice('/api/app', { action: 'transfer', id, recipient: wallet.address })).status,
      200,
    );
    const adopted = await bob(`/api/app?id=${id}`);
    assert.equal(adopted.status, 200);
    assert.equal(adopted.data.character.createdAt, born);
    assert.equal(adopted.data.character.lifespan, duration);
    assert.deepEqual(adopted.data.messages, []);
    assert.ok(!JSON.stringify(adopted.data).includes('PRIVATE_ZEBRA_SECRET'));
    const nextLedger = await bob(`/api/brain?id=${id}`);
    assert.equal(nextLedger.data.profiles.length, 2);
    assert.equal(nextLedger.data.profiles[0].profile, null, 'prior owner metadata stays sealed');
    assert.equal(
      (
        await alice('/api/app', {
          action: 'memory',
          id,
          text: 'unauthorized write',
          scope: 'public',
        })
      ).status,
      400,
    );
    assert.equal((await alice('/api/app', input)).status, 400, 'creation cooldown after handover');
  },
);
test('Sunset and unauthenticated mutation denied by API', { skip: !base }, async () => {
  const c = client();
  assert.equal(
    (await c('/api/app', { action: 'memory', id: 'milo', text: 'not allowed', scope: 'public' }))
      .status,
    400,
  );
  await c('/api/auth', { action: 'demo' });
  assert.equal(
    (await c('/api/app', { action: 'chat', id: 'juniper', text: 'hello', audition: true })).status,
    400,
  );
});

test(
  'private continuity, inbox preferences and push endpoints enforce owner/session boundaries',
  { skip: !base },
  async () => {
    const alice = client(),
      bob = client();
    assert.equal((await alice('/api/proactive')).status, 400);
    await alice('/api/auth', { action: 'demo' });
    await bob('/api/auth', { action: 'demo' });
    const created = await alice('/api/app', {
      action: 'create',
      name: 'Continuity Test',
      tagline: 'A careful growing mind',
      description: 'A friendly companion for testing private continuity.',
      behavior: 'Ask thoughtful questions and listen.',
      model: 'download:BlueSoldier_Male',
      tags: ['Test'],
      shortLife: false,
      traits: { curiosity: 60, warmth: 70, playfulness: 50 },
    });
    assert.equal(created.status, 200);
    const id = created.data.character.id;
    assert.equal((await bob(`/api/proactive?character=${id}`)).status, 400);
    const sent = await alice('/api/app', {
      action: 'chat',
      id,
      text: 'I enjoy ceramics and am exploring new glazes.',
      audition: false,
    });
    assert.equal(sent.status, 200);
    const privateState = await alice(`/api/proactive?character=${id}`);
    assert.equal(privateState.status, 200);
    assert.ok(privateState.data.mind.lastUserAt > 0);
    assert.equal(privateState.data.jobs.length, 1);
    const preferences = { ...privateState.data.preferences, enabled: false };
    assert.equal(
      (await alice('/api/proactive', { action: 'preferences', preferences })).status,
      200,
    );
    assert.equal((await alice(`/api/proactive?character=${id}`)).data.jobs.length, 0);
    assert.equal(
      (
        await alice('/api/proactive', {
          action: 'subscribe',
          subscription: {
            endpoint: 'https://127.0.0.1/internal',
            keys: { p256dh: 'x'.repeat(80), auth: 'x'.repeat(24) },
          },
        })
      ).status,
      400,
    );
    assert.equal((await alice('/api/proactive/run', {})).status, 401);
    const other = await bob('/api/proactive');
    assert.equal(other.data.notifications.length, 0);
  },
);
