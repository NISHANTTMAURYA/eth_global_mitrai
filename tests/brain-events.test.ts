import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory = mkdtempSync(path.join(tmpdir(), 'mitrai-brain-ledger-'));
process.env.MITRAI_DATA_DIR = directory;
process.env.PROACTIVE_DISABLED = '1';
const { saveCharacter, brainEvents } = await import('../src/lib/store');
const { saveMind, loadMind, ownerProfiles } = await import('../src/lib/continuity-store');
const { seeds } = await import('../src/lib/seed');
const { handover } = await import('../src/lib/domain');
after(() => rmSync(directory, { recursive: true, force: true }));
test('brain ledger retains corrected evidence and isolates every owner profile and epoch', () => {
  let c = { ...seeds()[0], id: crypto.randomUUID(), owner: 'alice', createdAt: Date.now() };
  saveCharacter(c);
  const mind = loadMind(c, 'alice');
  mind.lastUserAt = Date.now();
  mind.observations = [
    {
      key: 'hobby',
      kind: 'interest',
      summary: 'PRIVATE: terrariums',
      sourceQuote: 'I enjoy terrariums',
      sourceId: 'one',
      at: Date.now(),
    },
  ];
  saveMind(c, 'alice', mind);
  mind.observations[0] = {
    ...mind.observations[0],
    summary: 'PRIVATE: astronomy',
    sourceQuote: 'Actually astronomy',
    sourceId: 'two',
    at: Date.now() + 1,
  };
  saveMind(c, 'alice', mind);
  const events = brainEvents(c.id, 'alice', 0);
  assert.equal(
    events.filter((e) => e.kind === 'learning').length,
    2,
    'correction does not erase the first observation',
  );
  assert.ok(
    events.some((e) =>
      e.changes.some((v) => v.before === 'PRIVATE: terrariums' && v.after === 'PRIVATE: astronomy'),
    ),
  );
  assert.ok(!JSON.stringify(brainEvents(c.id, null, 0)).includes('PRIVATE:'));
  c = handover(c, 'bob');
  saveCharacter(c);
  assert.equal(ownerProfiles(c, 'bob').length, 2);
  assert.equal(ownerProfiles(c, 'bob')[0].profile, null);
  assert.ok(!JSON.stringify(brainEvents(c.id, 'bob', 1)).includes('PRIVATE:'));
  assert.equal(loadMind(c, 'bob').observations.length, 0);
  assert.ok(
    brainEvents(c.id, null, 1).some(
      (e) =>
        e.kind === 'ownership' && e.changes.some((v) => v.before === 'alice' && v.after === 'bob'),
    ),
  );
});
test('public before/after diffs exclude private memories', () => {
  const c = { ...seeds()[0], id: crypto.randomUUID(), owner: 'alice' };
  saveCharacter(c);
  c.brain.memories.push({
    id: 'secret',
    text: 'PRIVATE_MEMORY',
    scope: 'private',
    createdAt: Date.now(),
  });
  c.brain.version++;
  saveCharacter(c);
  assert.ok(!JSON.stringify(brainEvents(c.id, null, 0)).includes('PRIVATE_MEMORY'));
});
