import { test } from 'node:test';
import assert from 'node:assert/strict';
import { messageBatch } from '../src/lib/message-batch';

test('eight-second trailing edge combines messages and resets for each send', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const sent: string[][] = [];
  const queue = messageBatch<string>({
    deliver: async (items) => {
      sent.push(items);
    },
    changed: () => {},
  });
  queue.add('Hi');
  t.mock.timers.tick(7000);
  queue.add('How are you?');
  t.mock.timers.tick(7999);
  assert.equal(sent.length, 0);
  t.mock.timers.tick(1);
  assert.deepEqual(sent, [['Hi', 'How are you?']]);
  await Promise.resolve();
  queue.dispose();
});
test('bursts wait for an in-flight request and disposal clears scheduled work', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let release!: () => void;
  const sent: string[][] = [];
  const queue = messageBatch<string>({
    deliver: async (items) => {
      sent.push(items);
      if (sent.length === 1)
        await new Promise<void>((resolve) => {
          release = resolve;
        });
    },
    changed: () => {},
  });
  queue.add('first');
  t.mock.timers.tick(8000);
  queue.add('second');
  t.mock.timers.tick(8000);
  assert.equal(sent.length, 1);
  release();
  await Promise.resolve();
  await Promise.resolve();
  t.mock.timers.tick(1);
  assert.deepEqual(sent, [['first'], ['second']]);
  queue.add('discard');
  queue.dispose();
  t.mock.timers.tick(8000);
  assert.equal(sent.length, 2);
});
