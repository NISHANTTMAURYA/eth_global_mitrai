import { allCharacters, getCharacter, saveCharacter } from './store';
import { query, transaction, type DbClient } from './database';
import { lifecycle, type Character } from './domain';

export type Claim = {
  model: string;
  character_id: string;
  owner: string;
  state: string;
  expires: number;
  entity_key: string | null;
};

async function backfill(client?: DbClient) {
  const characters = await allCharacters(client);
  for (const c of characters.filter((p) => !p.demo && p.activation !== 'cancelled'))
    await query(
      `INSERT INTO model_claims(model,character_id,owner,state,expires,entity_key)
       VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(model) DO NOTHING`,
      [c.model, c.id, c.creator, c.entityKey ? 'confirmed' : c.activation === 'draft' ? 'reserved' : 'submitted', (c.draftAt || Date.now()) + 15 * 60000, c.entityKey || null],
      client,
    );
}

export async function modelClaims(now = Date.now(), client?: DbClient): Promise<Claim[]> {
  await backfill(client);
  const expired = await query<{ character_id: string }>(
    "DELETE FROM model_claims WHERE state='reserved' AND expires<$1 RETURNING character_id",
    [now],
    client,
  );
  for (const row of expired.rows) {
    const c = await getCharacter(row.character_id, client).catch(() => null);
    if (c && c.activation !== 'cancelled') await saveCharacter({ ...c, activation: 'cancelled' }, client);
  }
  const result = await query<Claim>(
    'SELECT model,character_id,owner,state,expires,entity_key FROM model_claims ORDER BY model',
    [],
    client,
  );
  return result.rows.map((row) => ({ ...row, expires: Number(row.expires) }));
}

export async function reserveModel(c: Character, now = Date.now()) {
  try {
    await transaction(async (client) => {
      // Serialize reservations per wallet, matching the old SQLite write lock.
      await query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [c.owner], client);
      await modelClaims(now, client);
      const chars = await allCharacters(client);
      if (chars.some((p) => p.owner === c.owner && lifecycle(p, now).alive))
        throw new Error('You already have an active MitrAI.');
      const pending = await query(
        "SELECT character_id FROM model_claims WHERE owner=$1 AND state IN ('reserved','submitted') LIMIT 1",
        [c.owner],
        client,
      );
      if (pending.rowCount)
        throw new Error('You have a saved creation in progress. Resume or cancel it first.');
      await query(
        "INSERT INTO model_claims(model,character_id,owner,state,expires,entity_key) VALUES($1,$2,$3,'reserved',$4,NULL)",
        [c.model, c.id, c.owner, now + 15 * 60000],
        client,
      );
      await saveCharacter(c, client);
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === '23505')
      throw new Error('Someone has already chosen this character. Please choose another available template.');
    throw error;
  }
}

export async function beginModelActivation(c: Character) {
  const result = await query(
    "UPDATE model_claims SET state='submitted' WHERE character_id=$1 AND owner=$2 AND state IN ('reserved','submitted')",
    [c.id, c.owner],
  );
  if (!result.rowCount) throw new Error('This template reservation has ended. Choose an available template.');
}

export async function confirmModel(c: Character, key: string) {
  const result = await query(
    "UPDATE model_claims SET state='confirmed',entity_key=$1 WHERE character_id=$2 AND (entity_key IS NULL OR entity_key=$1)",
    [key, c.id],
  );
  if (!result.rowCount) throw new Error('This is not the canonical claim for this model.');
}

export async function cancelModelDraft(c: Character) {
  if (c.activation === 'cancelled') return;
  await transaction(async (client) => {
    const result = await query(
      "DELETE FROM model_claims WHERE character_id=$1 AND owner=$2 AND state='reserved'",
      [c.id, c.owner],
      client,
    );
    if (!result.rowCount)
      throw new Error('A transaction may be in progress. Resolve it before releasing this model.');
    await saveCharacter({ ...c, activation: 'cancelled' }, client);
  });
}

export async function rejectedModelActivation(c: Character) {
  await query(
    "UPDATE model_claims SET state='reserved',expires=$1 WHERE character_id=$2 AND state='submitted' AND entity_key IS NULL",
    [Date.now() + 15 * 60000, c.id],
  );
}
