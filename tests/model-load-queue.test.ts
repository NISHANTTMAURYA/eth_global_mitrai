import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createModelLoadQueue } from '../src/lib/model-load-queue';
test('model initialization is serialized and cancelled cards do not block the queue', () => {
  const queue = createModelLoadQueue(1);
  const starts: number[] = [];
  const releases: (() => void)[] = [];
  queue.request((done) => {
    starts.push(1);
    releases.push(done);
  });
  const cancel = queue.request((done) => {
    starts.push(2);
    releases.push(done);
  });
  queue.request((done) => {
    starts.push(3);
    releases.push(done);
  });
  assert.deepEqual(starts, [1]);
  cancel();
  releases[0]();
  assert.deepEqual(starts, [1, 3]);
  releases[0]();
  assert.deepEqual(starts, [1, 3]);
  releases[1]();
  queue.request((done) => {
    starts.push(4);
    done();
  });
  assert.deepEqual(starts, [1, 3, 4]);
});
