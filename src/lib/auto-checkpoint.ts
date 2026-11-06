import { query } from './database';
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
  const leaseUntil = Date.now() + 120_000;
  const lease = await query(
    `INSERT INTO checkpoint_leases(character_id,lease_until) VALUES($1,$2)
     ON CONFLICT(character_id) DO UPDATE SET lease_until=excluded.lease_until
     WHERE checkpoint_leases.lease_until<$3 RETURNING character_id`,
    [id, leaseUntil, Date.now()],
  );
  if (!lease.rowCount) return;
  try {
    let c = await getCharacter(id);
    if (!c.entityKey || !c.published || c.owner.toLowerCase() !== owner.toLowerCase()) return;
    const remote = await readArkivCharacter(c.entityKey as Hex);
    if (remote.owner.toLowerCase() !== owner.toLowerCase()) return;
    if ((c.chainVersion ?? remote.character.brain.version) >= c.brain.version) {
      const row = await query<{ body: unknown }>('SELECT body FROM messages WHERE key=$1', [`${id}:${owner}:${c.ownershipEpoch || 0}`]);
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
      await saveCharacter(c);
    }
    const signed = signSnapshot(c);
    const existing = (await readArkivCheckpoints(c.entityKey as Hex)).find((point) =>
      point.owner.toLowerCase() !== owner.toLowerCase() &&
      verifySnapshot(point.character, point.proof, point.verifier) &&
      point.character.brain.version === c.brain.version &&
      samePublicState(point.character, c));
    let checkpointKey = existing?.key;
    if (!existing) {
      const receipt = await writeAppCheckpoint(c, signed.proof, signed.verifier);
      checkpointKey = receipt.createdEntities[0];
      if (checkpointKey)
        await recordArkivReceipt(c.id, receipt.createdEntities[0] as Hex, receipt.txHash);
    }
    const current = await getCharacter(id);
    if (current.owner === c.owner && current.brain.version === c.brain.version) {
      current.chainVersion = c.brain.version;
      current.checkpointKey = checkpointKey;
      current.history.push({ at: Date.now(), text: `Automatic Arkiv checkpoint ${c.brain.version} confirmed` });
      await saveCharacter(current);
    }
  } finally {
    await query('UPDATE checkpoint_leases SET lease_until=0 WHERE character_id=$1 AND lease_until=$2', [id, leaseUntil]).catch(() => undefined);
  }
}
