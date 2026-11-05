import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signSnapshot, verifySnapshot } from '../src/lib/proof';
import { seeds } from '../src/lib/seed';
test('engine signature excludes private state and rejects tampering or another issuer', () => {
  const c = seeds()[0];
  c.brain.memories.push({ id: 'secret', text: 'secret', scope: 'private', createdAt: 0 });
  const result = signSnapshot(c);
  assert.ok(!JSON.stringify(result.character).includes('secret'));
  assert.equal(verifySnapshot(result.character, result.proof, result.verifier), true);
  result.character.lifespan += 1000;
  assert.equal(verifySnapshot(result.character, result.proof, result.verifier), false);
  assert.equal(verifySnapshot(c, result.proof, 'foreign-verifier'), false);
});
