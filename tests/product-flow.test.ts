import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
const dir = mkdtempSync(path.join(tmpdir(), 'mitrai-product-'));
process.env.MITRAI_DATA_DIR = dir;
process.env.PROACTIVE_DISABLED = '1';
const store = await import('../src/lib/store');
const claims = await import('../src/lib/model-claims');
const { templates } = await import('../src/lib/templates');
const { models } = await import('../src/lib/models');
const { lifecycle, initialBrain, handover } = await import('../src/lib/domain');
const adoption = await import('../src/lib/adoption');
after(() => rmSync(dir, { recursive: true, force: true }));
function fixture(
  model: string,
  owner = crypto.randomUUID(),
): import('../src/lib/domain').Character {
  const t = templates.find((t) => t.model === model)!;
  return {
    ...t,
    id: crypto.randomUUID(),
    owner,
    creator: owner,
    createdAt: 0,
    draftAt: Date.now(),
    activation: 'draft',
    lifespan: 30 * 86400000,
    published: false,
    availability: 'showcase',
    brain: initialBrain(t.traits),
    highlights: [],
    history: [],
    demo: false,
  };
}
test('every model has a complete editable identity, zero learned history, and reusable voices', () => {
  assert.equal(templates.length, models.length);
  assert.equal(new Set(templates.map((t) => t.model)).size, models.length);
  for (const t of templates) {
    assert.ok(t.name && t.description && t.behavior && t.voice);
    assert.ok(!('createdAt' in t));
    assert.ok(!('memories' in t));
  }
  assert.ok(new Set(templates.map((t) => t.voice)).size < templates.length);
  assert.notDeepEqual(templates[0].traits, templates[1].traits);
});
test('drafts do not age, confirmed birth controls life, and handover preserves that birth', () => {
  const c = fixture('robot');
  assert.equal(lifecycle(c, 9e12).remaining, c.lifespan);
  assert.equal(lifecycle(c).alive, false);
  c.entityKey = '0x1';
  c.activation = 'active';
  c.birth = { at: 1000, blockNumber: '42' };
  assert.equal(lifecycle(c, 999 + c.lifespan).alive, true);
  assert.equal(lifecycle(c, 1000 + c.lifespan).alive, false);
  assert.deepEqual(handover(c, 'next', 1001).birth, c.birth);
});
test('two independent processes cannot claim the same model', async () => {
  const script = `const {reserveModel}=await import('./src/lib/model-claims.ts');const c=JSON.parse(process.env.CLAIM_FIXTURE);try{reserveModel(c);process.exitCode=0;}catch{process.exitCode=2;}`;
  const run = (c: ReturnType<typeof fixture>) =>
    new Promise<number | null>((resolve) => {
      const child = spawn(
        process.execPath,
        ['--import', 'tsx', '--input-type=module', '-e', script],
        { env: { ...process.env, CLAIM_FIXTURE: JSON.stringify(c) }, stdio: 'ignore' },
      );
      child.once('exit', resolve);
    });
  const results = await Promise.all([run(fixture('robot')), run(fixture('robot'))]);
  assert.deepEqual(results.sort(), [0, 2]);
  assert.equal(claims.modelClaims().filter((c) => c.model === 'robot').length, 1);
});
test('expired unsigned drafts release a model, submitted transactions hold it, and confirmed claims never release', () => {
  const c = fixture('fox');
  claims.reserveModel(c, Date.now() - 16 * 60000);
  assert.ok(!claims.modelClaims().some((r) => r.character_id === c.id));
  assert.equal(store.getCharacter(c.id).activation, 'cancelled');
  const next = fixture('fox');
  claims.reserveModel(next);
  claims.beginModelActivation(next);
  assert.ok(
    claims.modelClaims(Date.now() + 365 * 86400000).some((r) => r.character_id === next.id),
    'unresolved transactions are never silently recycled',
  );
  assert.throws(() => claims.cancelModelDraft(next), /transaction/);
  claims.confirmModel(next, '0x2');
  assert.throws(() => claims.reserveModel(fixture('fox')), /already chosen/);
});
test('adoption request acceptance, decline and handover are tied to owner and ownership epoch', () => {
  const c = fixture('human', 'seller');
  c.activation = 'active';
  c.createdAt = Date.now();
  c.entityKey = '0x3';
  c.published = true;
  c.availability = 'transfer';
  store.saveCharacter(c);
  const r = adoption.createRequest(c, 'buyer', 'I would love to explore stories together.');
  assert.equal(
    adoption.createRequest(c, 'buyer', 'Another note').id,
    r.id,
    'repeated requests do not spam the owner',
  );
  assert.equal(adoption.updateRequest(c, r.id, 'accepted').status, 'accepted');
  assert.throws(
    () => adoption.updateRequest({ ...c, ownershipEpoch: 1 }, r.id, 'declined'),
    /no longer/,
  );
  adoption.closeRequests(c, r.id);
  assert.equal(adoption.adoptionRequests(c.id)[0].status, 'completed');
  const other = adoption.createRequest(c, 'other', 'I want to continue this character story.');
  assert.equal(adoption.updateRequest(c, other.id, 'declined').status, 'declined');
  const occupied = fixture('download:09_CactusBoy', 'busy-wallet');
  occupied.createdAt = Date.now();
  occupied.activation = undefined;
  store.saveCharacter(occupied);
  assert.throws(
    () => adoption.createRequest(c, 'busy-wallet', 'Please give it to me'),
    /already has/,
  );
});
