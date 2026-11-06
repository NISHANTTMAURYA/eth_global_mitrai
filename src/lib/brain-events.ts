import { publicCharacter, type Character } from './domain';
export type BrainEvent = {
  id: string;
  characterId: string;
  owner: string;
  epoch: number;
  at: number;
  kind:
    'birth' | 'ownership' | 'checkpoint' | 'memory' | 'profile' | 'learning' | 'style' | 'chain';
  title: string;
  source: 'application' | 'private' | 'chain';
  changes: { field: string; before?: unknown; after?: unknown }[];
  txHash?: string;
  blockNumber?: string;
  sourceId?: string;
};
export function characterChanges(before: Character, after: Character): BrainEvent['changes'] {
  const a = publicCharacter(before),
    b = publicCharacter(after);
  const fields = [
    'owner',
    'published',
    'availability',
    'behavior',
    'description',
    'tags',
    'highlights',
    'voice',
    'brain.traits',
    'brain.habits',
    'brain.memories',
    'brain.sessions',
    'brain.version',
  ] as const;
  const read = (c: Character, path: string): unknown =>
    path.split('.').reduce((v: any, k) => v?.[k], c);
  return fields.flatMap((field) =>
    JSON.stringify(read(a, field)) === JSON.stringify(read(b, field))
      ? []
      : [{ field, before: read(a, field), after: read(b, field) }],
  );
}
export function samePublicState(a: Character, b: Character) {
  const fields = [
    'id',
    'name',
    'tagline',
    'description',
    'behavior',
    'model',
    'voice',
    'tags',
    'owner',
    'creator',
    'createdAt',
    'lifespan',
    'published',
    'availability',
    'brain',
    'highlights',
    'ownershipEpoch',
  ] as const;
  const first = publicCharacter(a),
    second = publicCharacter(b);
  return fields.every((field) => JSON.stringify(first[field]) === JSON.stringify(second[field]));
}
