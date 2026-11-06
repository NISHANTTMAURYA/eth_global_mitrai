import { database as db, allCharacters, saveCharacter } from './store';
import { lifecycle, type Character } from './domain';
db.exec(
  `CREATE TABLE IF NOT EXISTS model_claims(model TEXT PRIMARY KEY,character_id TEXT NOT NULL UNIQUE,owner TEXT NOT NULL,state TEXT NOT NULL,expires INTEGER NOT NULL,entity_key TEXT);`,
);
// Preserve existing real identities, including those already at Sunset.
for (const c of allCharacters().filter((c) => !c.demo && c.activation !== 'cancelled')) {
  db.prepare('INSERT OR IGNORE INTO model_claims VALUES(?,?,?,?,?,?)').run(
    c.model,
    c.id,
    c.creator,
    c.entityKey ? 'confirmed' : c.activation === 'draft' ? 'reserved' : 'submitted',
    (c.draftAt || Date.now()) + 15 * 60000,
    c.entityKey || null,
  );
}
type Claim = {
  model: string;
  character_id: string;
  owner: string;
  state: string;
  expires: number;
  entity_key: string | null;
};
export function modelClaims(now = Date.now()) {
  const expired = db
    .prepare("SELECT character_id FROM model_claims WHERE state='reserved' AND expires<?")
    .all(now) as { character_id: string }[];
  for (const row of expired)
    db.prepare(
      "UPDATE characters SET body=json_set(body,'$.activation','cancelled') WHERE id=?",
    ).run(row.character_id);
  db.prepare("DELETE FROM model_claims WHERE state='reserved' AND expires<?").run(now);
  return db.prepare('SELECT * FROM model_claims').all() as Claim[];
}
export function reserveModel(c: Character, now = Date.now()) {
  db.exec('BEGIN IMMEDIATE');
  try {
    modelClaims(now);
    if (allCharacters().some((p) => p.owner === c.owner && lifecycle(p, now).alive))
      throw new Error('You already have an active MitrAI.');
    const pending = db
      .prepare(
        "SELECT character_id FROM model_claims WHERE owner=? AND state IN ('reserved','submitted')",
      )
      .get(c.owner);
    if (pending)
      throw new Error('You have a saved creation in progress. Resume or cancel it first.');
    if (db.prepare('SELECT model FROM model_claims WHERE model=?').get(c.model))
      throw new Error(
        'Someone has already chosen this character. Please choose another available template.',
      );
    db.prepare('INSERT INTO model_claims VALUES(?,?,?,?,?,NULL)').run(
      c.model,
      c.id,
      c.owner,
      'reserved',
      now + 15 * 60000,
    );
    saveCharacter(c);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
export function beginModelActivation(c: Character) {
  const result = db
    .prepare(
      "UPDATE model_claims SET state='submitted' WHERE character_id=? AND owner=? AND state IN ('reserved','submitted')",
    )
    .run(c.id, c.owner);
  if (!result.changes)
    throw new Error('This template reservation has ended. Choose an available template.');
}
export function confirmModel(c: Character, key: string) {
  const result = db
    .prepare(
      "UPDATE model_claims SET state='confirmed',entity_key=? WHERE character_id=? AND (entity_key IS NULL OR entity_key=?)",
    )
    .run(key, c.id, key);
  if (!result.changes) throw new Error('This is not the canonical claim for this model.');
}
export function cancelModelDraft(c: Character) {
  if (c.activation === 'cancelled') return;
  const result = db
    .prepare("DELETE FROM model_claims WHERE character_id=? AND owner=? AND state='reserved'")
    .run(c.id, c.owner);
  if (!result.changes)
    throw new Error('A transaction may be in progress. Resolve it before releasing this model.');
  saveCharacter({ ...c, activation: 'cancelled' });
}
export function rejectedModelActivation(c: Character) {
  db.prepare(
    "UPDATE model_claims SET state='reserved',expires=? WHERE character_id=? AND state='submitted' AND entity_key IS NULL",
  ).run(Date.now() + 15 * 60000, c.id);
}
