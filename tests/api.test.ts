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
      model: 'human',
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
