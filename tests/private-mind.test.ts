import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialPrivateMind,
  developMind,
  groundedProposal,
  emptyProposal,
  conversationScope,
  privateContext,
} from '../src/lib/private-mind';
import { seeds } from '../src/lib/seed';
test('memory proposals must cite exact user evidence; arbitrary generated facts do not enter memory', () => {
  const raw = {
    observations: [
      { key: 'hobby', kind: 'interest', summary: 'Enjoys pottery', sourceQuote: 'I enjoy pottery' },
    ],
    adaptations: [],
    followUps: [],
  };
  assert.equal(groundedProposal(raw, 'I enjoy pottery.').observations.length, 1);
  assert.equal(groundedProposal(raw, 'hello').observations.length, 0);
  assert.deepEqual(groundedProposal({ nonsense: true }, 'hello'), emptyProposal);
});
test('identity changes only after independent spaced sessions, remains bounded, and rejects repeated evidence', () => {
  let mind = initialPrivateMind(seeds()[0]);
  const start = Date.UTC(2026, 10, 1, 10);
  for (let i = 0; i < 3; i++) {
    const text = `Please keep my ${['project', 'study', 'story'][i]} conversations brief`;
    const proposal = groundedProposal(
      {
        observations: [],
        adaptations: [{ axis: 'brevity', direction: 1, sourceQuote: text }],
        followUps: [],
      },
      text,
    );
    mind = developMind(mind, proposal, `m${i}`, text, start + i * 12 * 3600000);
    if (i < 2) assert.equal(mind.style.brevity, 50);
  }
  assert.equal(mind.style.brevity, 50.5);
  assert.equal(mind.preferences?.[0].sourceId, 'm2');
  assert.match(mind.preferences?.[0].sourceQuote || '', /story conversations brief/);
  const last = structuredClone(mind);
  mind = developMind(
    mind,
    {
      observations: [],
      adaptations: [{ axis: 'brevity', direction: 1, sourceQuote: 'same' }],
      followUps: [],
    },
    'm2',
    'same',
    start + 2 * 86400000,
  );
  assert.deepEqual(mind, last);
  assert.ok(mind.style.brevity <= mind.seed.brevity + 15);
});
test('memory corrections retain source timestamps and private contexts have distinct ownership epochs', () => {
  const c = seeds()[0];
  let mind = initialPrivateMind(c);
  mind = developMind(
    mind,
    {
      ...emptyProposal,
      observations: [
        { key: 'activity', kind: 'interest', summary: 'Enjoys drawing', sourceQuote: 'I draw' },
      ],
    },
    'one',
    'I draw',
    1000,
  );
  mind = developMind(
    mind,
    {
      ...emptyProposal,
      observations: [
        {
          key: 'activity',
          kind: 'interest',
          summary: 'Now prefers ceramics',
          sourceQuote: 'I prefer ceramics now',
        },
      ],
    },
    'two',
    'I prefer ceramics now',
    2000,
  );
  assert.equal(mind.observations.length, 1);
  assert.equal(mind.observations[0].sourceId, 'two');
  assert.match(privateContext(mind, 'ceramics'), /1970-01-01/);
  assert.notEqual(conversationScope(c.id, 'owner', 0), conversationScope(c.id, 'owner', 1));
});

test('relative event dates use the owner local calendar across UTC midnight', async () => {
  const { localCalendar } = await import('../src/lib/chat');
  const dates = JSON.parse(localCalendar(Date.UTC(2026, 10, 6, 22, 0), 'Asia/Kolkata'));
  assert.equal(dates.today, '2026-11-07');
  assert.equal(dates.tomorrow, '2026-11-08');
});
