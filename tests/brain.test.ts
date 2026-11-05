import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lifecycle, initialBrain, evolve, publicCharacter, handover } from '../src/lib/domain';
import { seeds } from '../src/lib/seed';
test('Sunset occurs exactly at deadline and does not depend on a job', () => {
  assert.equal(lifecycle({ createdAt: 100, lifespan: 100 }, 199).alive, true);
  assert.equal(lifecycle({ createdAt: 100, lifespan: 100 }, 200).alive, false);
});
test('public view removes private memories and evidence', () => {
  const c = seeds()[0];
  c.brain.memories.push({ id: 'secret', text: 'PRIVATE', scope: 'private', createdAt: 0 });
  c.brain.evidence = ['secret'];
  const p = publicCharacter(c);
  assert.equal(
    p.brain.memories.some((m) => m.id === 'secret'),
    false,
  );
  assert.deepEqual(p.brain.evidence, []);
});
test('duplicate accepted event is idempotent', () => {
  const b = evolve(initialBrain(), 'Please keep explanations short', 'event1');
  assert.deepEqual(evolve(b, 'Please keep explanations short', 'event1'), b);
});
test('handover preserves lifetime and public history, removes private memories', () => {
  const c = seeds()[0];
  c.brain.memories.push({ id: 's', text: 'secret', scope: 'private', createdAt: 0 });
  const next = handover(c, 'demo:new');
  assert.equal(next.createdAt, c.createdAt);
  assert.equal(next.lifespan, c.lifespan);
  assert.equal(next.brain.memories.length, 1);
  assert.equal(next.owner, 'demo:new');
  assert.equal(next.published, false);
});
test('expired characters cannot transfer', () => {
  const c = seeds().find((c) => c.id === 'juniper')!;
  assert.throws(() => handover(c, 'demo:new'), /Sunset/);
});
test('one feedback does not rewrite personality', () => {
  const b = initialBrain();
  assert.deepEqual(evolve(b, 'I like thoughtful questions', 'one').traits, b.traits);
});
test('repeated identical feedback cannot farm trait growth across checkpoints', () => {
  let b = initialBrain();
  for (let i = 0; i < 12; i++) b = evolve(b, 'I like thoughtful questions', `event-${i}`);
  assert.equal(b.traits.curiosity, 62);
  assert.equal(b.habits.find((h) => h.context === 'feedback:questions')?.successes, 1);
});
test('trait movement remains capped per UTC day', () => {
  let b = initialBrain();
  for (let i = 0; i < 15; i++)
    b = evolve(b, `I appreciate ${'very '.repeat(i)}thoughtful questions`, `event-${i}`, 100000);
  assert.ok(b.traits.curiosity <= 63);
});
test('an old character handover starts a fresh creation cooldown for the sender', async () => {
  const { creationBlockReason } = await import('../src/lib/domain');
  const c = seeds()[0];
  const now = Date.now();
  const owner = c.owner;
  const transferred = handover(c, 'demo:new', now);
  assert.match(creationBlockReason([transferred], owner, now + 1) || '', /cooldown/);
  assert.equal(creationBlockReason([transferred], owner, now + 600001), null);
});
