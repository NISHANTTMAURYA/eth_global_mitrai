import { test } from 'node:test';
import assert from 'node:assert/strict';
import { characterSubname, getCharacterEnsPassport, ENS_PARENT_DOMAIN } from '../src/lib/ens';
import { initialBrain, type Character } from '../src/lib/domain';

test('characterSubname formats valid ENS subname under mitrai.eth', () => {
  assert.equal(characterSubname({ name: 'Milo' }), `milo.${ENS_PARENT_DOMAIN}`);
  assert.equal(characterSubname({ name: 'Aurora Fox!' }), `aurora-fox.${ENS_PARENT_DOMAIN}`);
  assert.equal(characterSubname({ name: '  Rusty Robot #1  ' }), `rusty-robot-1.${ENS_PARENT_DOMAIN}`);
  assert.equal(characterSubname({ name: '' }), `companion.${ENS_PARENT_DOMAIN}`);
});

test('getCharacterEnsPassport populates verifiable text records and node hash', () => {
  const c: Character = {
    id: 'char-123',
    name: 'Milo',
    tagline: 'A little wanderer with a big heart.',
    description: 'Looking for a friend to share stories with under the stars.',
    behavior: 'Curious and attentive.',
    model: 'fox',
    tags: ['Curious', 'Storytelling'],
    owner: '0x1111111111111111111111111111111111111111',
    creator: '0x1111111111111111111111111111111111111111',
    createdAt: Date.now() - 3600000,
    lifespan: 14 * 86400000,
    published: true,
    availability: 'showcase',
    brain: initialBrain(),
    highlights: [],
    history: [],
    demo: false,
    entityKey: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  };

  const passport = getCharacterEnsPassport(c);

  assert.equal(passport.subname, 'milo.mitrai.eth');
  assert.equal(passport.parent, 'mitrai.eth');
  assert.ok(passport.node.startsWith('0x'));
  assert.equal(passport.records['arkiv.entity'], c.entityKey);
  assert.equal(passport.records['agent.model'], 'fox');
  assert.equal(passport.records['agent.guardian'], c.owner);
  assert.equal(passport.records['description'], c.tagline);
  assert.ok(passport.records['agent.status']);
  assert.ok(passport.records['agent.lifespan']);
});

