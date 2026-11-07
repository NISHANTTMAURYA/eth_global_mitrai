import { allCharacters, offersFor } from './store';
import { json, query, transaction } from './database';
import { lifecycle, type Character } from './domain';
import { modelClaims } from './model-claims';

export type AdoptionRequest = {
  id: string;
  characterId: string;
  from: string;
  note: string;
  bidTglm?: string;
  at: number;
  owner: string;
  epoch: number;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'closed';
};

export async function recipientEligible(c: Character, recipient: string) {
  if (recipient === c.owner) throw new Error('Choose a different owner.');
  const [characters, claims] = await Promise.all([allCharacters(), modelClaims()]);
  const activeCount = characters.filter(
    (p) => p.id !== c.id && p.owner === recipient && lifecycle(p).alive,
  ).length;
  if (activeCount >= 2 || claims.some((m) => m.owner === recipient && m.state !== 'confirmed'))
    throw new Error('This wallet already has two active MitrAIs or a creation in progress.');
}

export async function adoptionRequests(id: string): Promise<AdoptionRequest[]> {
  return ((await offersFor(id)) as unknown as AdoptionRequest[]).map((o) => ({
    ...o,
    status: o.status || 'pending',
  }));
}

export async function createRequest(c: Character, from: string, note: string, bidTglm?: string) {
  await recipientEligible(c, from);
  return transaction(async (client) => {
    const existing = await query<{ id: string; body: unknown }>(
      "SELECT id,body FROM offers WHERE body->>'characterId'=$1 AND body->>'from'=$2 AND body->>'owner'=$3 AND (body->>'epoch')::integer=$4 AND body->>'status' IN ('pending','accepted') LIMIT 1",
      [c.id, from, c.owner, c.ownershipEpoch || 0],
      client,
    );
    if (existing.rowCount)
      return { ...json<AdoptionRequest>(existing.rows[0].body), id: existing.rows[0].id };
    const request: AdoptionRequest = {
      id: crypto.randomUUID(),
      characterId: c.id,
      from,
      note,
      bidTglm,
      at: Date.now(),
      owner: c.owner,
      epoch: c.ownershipEpoch || 0,
      status: 'pending',
    };
    await query('INSERT INTO offers(id,body) VALUES($1,$2::jsonb)', [request.id, JSON.stringify(request)], client);
    return request;
  });
}

export async function updateRequest(c: Character, id: string, status: AdoptionRequest['status']) {
  return transaction(async (client) => {
    const rows = await adoptionRequests(c.id);
    const request = rows.find((r) => r.id === id);
    if (
      !request ||
      request.owner !== c.owner ||
      request.epoch !== (c.ownershipEpoch || 0) ||
      !['pending', 'accepted'].includes(request.status)
    )
      throw new Error('This adoption request is no longer available.');
    const next = { ...request, status };
    await query('UPDATE offers SET body=$1::jsonb WHERE id=$2', [JSON.stringify(next), id], client);
    return next;
  });
}

export async function closeRequests(c: Character, completedId?: string) {
  const rows = await adoptionRequests(c.id);
  for (const request of rows)
    if (['pending', 'accepted'].includes(request.status))
      await query('UPDATE offers SET body=$1::jsonb WHERE id=$2', [
        JSON.stringify({ ...request, status: request.id === completedId ? 'completed' : 'closed' }),
        request.id,
      ]);
}
