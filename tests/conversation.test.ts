import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReply, speechSegments, availableGestures } from '../src/lib/conversation';
test('reply contract preserves distinct bubbles and rejects malformed or oversized output', () => {
  const raw = JSON.stringify({
    messages: [
      { text: 'Hi! 👋', animation: 'Wave', wordIndex: 0 },
      { text: 'How was your day?', animation: '', wordIndex: 0 },
    ],
  });
  const result = parseReply(raw, 'download:09_CactusBoy');
  assert.equal(result.length, 2);
  assert.equal(result[0].gesture?.animation, 'Wave');
  assert.equal(result[1].gesture, undefined);
  assert.throws(() => parseReply('plain paragraph', 'human'));
  assert.throws(() => parseReply('{"messages":[]}', 'human'));
  assert.throws(() =>
    parseReply(JSON.stringify({ messages: [{ text: 'x'.repeat(901) }] }), 'human'),
  );
});
test('unavailable animations and invalid word indices cannot trigger clips', () => {
  for (const [animation, wordIndex] of [
    ['Attack', 0],
    ['Wave', 99],
    ['Wave', -1],
    ['Wave', 0.5],
  ]) {
    assert.equal(
      parseReply(
        JSON.stringify({ messages: [{ text: 'Hi there', animation, wordIndex }] }),
        'human',
      )[0].gesture,
      undefined,
    );
  }
  assert.deepEqual(availableGestures('fox'), []);
});
test('speech splits at the selected word and strips emojis without changing the anchor', () => {
  assert.deepEqual(
    speechSegments({ text: 'Well hello there! 👋', gesture: { animation: 'Wave', wordIndex: 1 } }),
    [{ text: 'Well' }, { text: 'hello there!', animation: 'Wave' }],
  );
  assert.deepEqual(
    speechSegments({ text: 'Hi 👋', gesture: { animation: 'Wave', wordIndex: 0 } }),
    [{ text: 'Hi', animation: 'Wave' }],
  );
});
