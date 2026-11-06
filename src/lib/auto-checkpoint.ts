import { pool, query } from './database';
import { evolve, type Message } from './domain';
import { getCharacter, saveCharacter } from './store';
import { loadMind } from './continuity-store';
import { readArkivCharacter, readArkivCheckpoints, writeAppCheckpoint } from './arkiv';
import { signSnapshot, verifySnapshot } from './proof';
import { samePublicState } from './brain-events';
import { recordArkivReceipt } from './chain-ledger';
import type { Hex } from 'viem';

/** Publish an occasional approved public summary. Chat transcripts remain in Postgres. */
export async function autoCheckpoint(id: string, owner: string) {
  if (!process.env.ARKIV_WRITER_PRIVATE_KEY) return;
  const client = await pool.connect();
  const lockKey = `arkiv:${id}`;
  let locked = false;
  try {
    await client.query('BEGIN');
    const lock = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked', [lockKey]);
    locked = lock.rows[0]?.locked || false;
    if (!locked) return;
    let c = await getCharacter(id, client);
    if (!c.entityKey || !c.published || c.owner.toLowerCase() !== owner.toLowerCase()) return;
    const remote = await readArkivCharacter(c.entityKey as Hex);
    if (remote.owner.toLowerCase() !== owner.toLowerCase()) return;
    if ((c.chainVersion ?? remote.character.brain.version) >= c.brain.version) {
      const row = await query<{ body: unknown }>('SELECT body FROM messages WHERE key=$1', [`${id}:${owner}:${c.ownershipEpoch || 0}`], client);
      const history = (row.rows[0]?.body || []) as Message[];
      const last = c.history.filter((h) => h.text.startsWith('Checkpoint')).at(-1)?.at || 0;
      const recent = history.filter((m) => m.role === 'user' && m.at > last);
      if (recent.length < 5) return;
      c.brain = evolve(c.brain, recent.map((m) => m.text).join('\n'), recent.at(-1)!.id);
      const growth = await loadMind(c, owner);
      if (growth.changes.length)
        for (const axis of ['curiosity', 'warmth', 'playfulness'] as const)
          c.brain.traits[axis] = growth.style[axis];
      c.history.push({ at: Date.now(), text: `Checkpoint ${c.brain.version} · ${recent.length} conversations consolidated automatically` });
      await saveCharacter(c, client);
    }
    const signed = signSnapshot(c);
    const existing = (await readArkivCheckpoints(c.entityKey as Hex)).some((point) =>
      point.owner.toLowerCase() !== owner.toLowerCase() &&
      verifySnapshot(point.character, point.proof, point.verifier) &&
      point.character.brain.version === c.brain.version &&
      samePublicState(point.character, c));
    if (!existing) {
      const receipt = await writeAppCheckpoint(c, signed.proof, signed.verifier);
      if (receipt.createdEntities[0])
        await recordArkivReceipt(c.id, receipt.createdEntities[0] as Hex, receipt.txHash);
    }
    const current = await getCharacter(id, client);
    if (current.owner === c.owner && current.brain.version === c.brain.version) {
      current.chainVersion = c.brain.version;
      current.history.push({ at: Date.now(), text: `Automatic Arkiv checkpoint ${c.brain.version} confirmed` });
      await saveCharacter(current, client);
    }
  } finally {
    await client.query(locked ? 'COMMIT' : 'ROLLBACK').catch(() => undefined);
    client.release();
  }
}
