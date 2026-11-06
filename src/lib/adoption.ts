import { database as db, allCharacters, offersFor } from './store';
import { lifecycle, type Character } from './domain';
import { modelClaims } from './model-claims';
export type AdoptionRequest = {
  id: string;
  characterId: string;
  from: string;
  note: string;
  at: number;
  owner: string;
  epoch: number;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'closed';
};
export function recipientEligible(c: Character, recipient: string) {
  if (recipient === c.owner) throw new Error('Choose a different owner.');
  if (
    allCharacters().some((p) => p.id !== c.id && p.owner === recipient && lifecycle(p).alive) ||
    modelClaims().some((m) => m.owner === recipient && m.state !== 'confirmed')
  )
    throw new Error('This wallet already has an active MitrAI or creation in progress.');
}
export function adoptionRequests(id: string): AdoptionRequest[] {
  return offersFor(id).map((o) => ({ ...o, status: o.status || 'pending' }));
}
export function createRequest(c: Character, from: string, note: string) {
  recipientEligible(c, from);
  const existing = adoptionRequests(c.id).find(
    (r) =>
      r.from === from &&
      r.owner === c.owner &&
      r.epoch === (c.ownershipEpoch || 0) &&
      ['pending', 'accepted'].includes(r.status),
  );
  if (existing) return existing;
  const request: AdoptionRequest = {
    id: crypto.randomUUID(),
    characterId: c.id,
    from,
    note,
    at: Date.now(),
    owner: c.owner,
    epoch: c.ownershipEpoch || 0,
    status: 'pending',
  };
  db.prepare('INSERT INTO offers VALUES(?,?)').run(request.id, JSON.stringify(request));
  return request;
}
export function updateRequest(c: Character, id: string, status: AdoptionRequest['status']) {
  const request = adoptionRequests(c.id).find((r) => r.id === id);
  if (
    !request ||
    request.owner !== c.owner ||
    request.epoch !== (c.ownershipEpoch || 0) ||
    !['pending', 'accepted'].includes(request.status)
  )
    throw new Error('This adoption request is no longer available.');
  const next = { ...request, status };
  db.prepare('UPDATE offers SET body=? WHERE id=?').run(JSON.stringify(next), id);
  return next;
}
export function closeRequests(c: Character, completedId?: string) {
  for (const r of adoptionRequests(c.id))
    if (['pending', 'accepted'].includes(r.status))
      db.prepare('UPDATE offers SET body=? WHERE id=?').run(
        JSON.stringify({ ...r, status: r.id === completedId ? 'completed' : 'closed' }),
        r.id,
      );
}
