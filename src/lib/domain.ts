export type ModelId = string;
export type Memory = { id: string; text: string; scope: 'private' | 'public'; createdAt: number };
export type Brain = {
  traits: { curiosity: number; warmth: number; playfulness: number };
  memories: Memory[];
  habits: { context: string; action: string; successes: number }[];
  sessions: number;
  evidence: string[];
  lastTraitDay?: string;
  dailyTraitMovement?: number;
  version: number;
};
export type Character = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  behavior: string;
  model: ModelId;
  voice?: string;
  tags: string[];
  owner: string;
  creator: string;
  createdAt: number;
  lifespan: number;
  published: boolean;
  availability: 'showcase' | 'offers' | 'transfer';
  askingPriceTglm?: string;
  brain: Brain;
  highlights: string[];
  history: { at: number; text: string; by?: string }[];
  demo: boolean;
  ownershipEpoch?: number;
  entityKey?: string;
  checkpointKey?: string;
  chainVersion?: number;
  activation?: 'draft' | 'submitted' | 'active' | 'cancelled';
  birth?: { at: number; blockNumber: string };
  draftAt?: number;
};
export type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: number;
  proactive?: boolean;
  gesture?: import('./conversation').GestureCue;
  provider?: string;
  requestId?: string;
};
export function lifecycle(
  c: Pick<Character, 'createdAt' | 'lifespan' | 'activation' | 'birth' | 'entityKey'>,
  now = Date.now(),
) {
  const pending = !!c.activation && !c.entityKey;
  const born = c.birth?.at ?? c.createdAt;
  const progress = pending ? 0 : Math.max(0, Math.min(1, (now - born) / c.lifespan));
  return {
    progress,
    remaining: pending ? c.lifespan : Math.max(0, born + c.lifespan - now),
    stage: pending
      ? 'Draft'
      : progress >= 1
        ? 'Legacy'
        : progress >= 0.75
          ? 'Golden'
          : progress >= 0.2
            ? 'Bloom'
            : 'Dawn',
    alive: !pending && progress < 1,
  };
}
export function initialBrain(traits?: Brain['traits']): Brain {
  return {
    traits: traits ?? { curiosity: 62, warmth: 72, playfulness: 55 },
    memories: [],
    habits: [],
    sessions: 0,
    evidence: [],
    version: 1,
  };
}
export const bornAt = (c: Pick<Character, 'createdAt' | 'birth'>) => c.birth?.at ?? c.createdAt;
export const sunsetAt = (c: Pick<Character, 'createdAt' | 'birth' | 'lifespan'>) =>
  bornAt(c) + c.lifespan;
export function publicCharacter(c: Character): Character {
  return {
    ...c,
    brain: {
      ...c.brain,
      memories: c.brain.memories.filter((m) => m.scope === 'public'),
      evidence: [],
    },
  };
}
export function assertOwner(c: Character, owner: string) {
  if (c.owner.toLowerCase() !== owner.toLowerCase())
    throw new Error('Only the current owner can do this.');
}
export function assertAlive(c: Character, now = Date.now()) {
  if (!lifecycle(c, now).alive)
    throw new Error('This character has reached Sunset. Its legacy is read-only.');
}
export function evolve(brain: Brain, text: string, eventId: string, now = Date.now()): Brain {
  if (brain.evidence.includes(eventId)) return brain;
  const next = structuredClone(brain);
  next.version++;
  next.sessions++;
  next.evidence = [...next.evidence, eventId].slice(-100);
  if (/short|concise|brief/i.test(text) && /prefer|please|like|keep/i.test(text)) {
    const h = next.habits.find((h) => h.context === 'explanations');
    if (h) h.successes++;
    else
      next.habits.push({
        context: 'explanations',
        action: 'Offer short, clear steps',
        successes: 1,
      });
  }
  // Stable traits require independent explicit feedback, not message volume.
  const feedback = text
    .match(/i (?:like|prefer|appreciate)[^\n.!?]*question[^\n.!?]*/i)?.[0]
    ?.toLowerCase()
    .replace(/\W+/g, ' ')
    .trim();
  if (feedback && !next.evidence.includes(`feedback:${feedback}`)) {
    next.evidence.push(`feedback:${feedback}`);
    const h = next.habits.find((h) => h.context === 'feedback:questions');
    if (h) h.successes++;
    else
      next.habits.push({
        context: 'feedback:questions',
        action: 'Ask thoughtful questions',
        successes: 1,
      });
    const count = next.habits.find((h) => h.context === 'feedback:questions')!.successes;
    const day = new Date(now).toISOString().slice(0, 10);
    if (next.lastTraitDay !== day) {
      next.lastTraitDay = day;
      next.dailyTraitMovement = 0;
    }
    const movement = Math.min(0.5, 1 - (next.dailyTraitMovement || 0));
    if (count >= 3 && movement > 0) {
      next.traits.curiosity = Math.min(100, next.traits.curiosity + movement);
      next.dailyTraitMovement = (next.dailyTraitMovement || 0) + movement;
    }
  }
  return next;
}
export function retrieve(brain: Brain, query: string): Memory[] {
  const tags = query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);
  return [...brain.memories].sort((a, b) => score(b) - score(a)).slice(0, 4);
  function score(m: Memory) {
    return tags.filter((t) => m.text.toLowerCase().includes(t)).length * 10 + m.createdAt / 1e13;
  }
}
export function handover(c: Character, recipient: string, now = Date.now()): Character {
  assertAlive(c, now);
  if (recipient.toLowerCase() === c.owner.toLowerCase())
    throw new Error('Choose a different owner.');
  return {
    ...c,
    owner: recipient,
    ownershipEpoch: (c.ownershipEpoch || 0) + 1,
    published: false,
    availability: 'showcase',
    askingPriceTglm: undefined,
    brain: {
      ...c.brain,
      memories: c.brain.memories.filter((m) => m.scope === 'public'),
      evidence: [],
      version: c.brain.version + 1,
    },
    history: [
      ...c.history,
      { at: now, text: `Ownership transferred to ${recipient}`, by: c.owner },
    ],
  };
}
export function shortAddress(s: string) {
  return s.startsWith('0x')
    ? `${s.slice(0, 6)}…${s.slice(-4)}`
    : s.startsWith('demo:')
      ? 'Demo collector'
      : s;
}

export function creationBlockReason(
  characters: Character[],
  owner: string,
  now = Date.now(),
): string | null {
  if (characters.some((c) => c.owner === owner && lifecycle(c, now).alive))
    return 'You already have an active character. Cultivate the one you have.';
  const lastAction = Math.max(
    0,
    ...characters.flatMap((c) => [
      c.creator === owner && c.activation !== 'cancelled' ? (c.birth?.at ?? c.createdAt) : 0,
      ...c.history
        .filter((h) => h.by === owner && /transferred|ownership change/i.test(h.text))
        .map((h) => h.at),
    ]),
  );
  if (lastAction && now - lastAction < 600000)
    return 'Give this story a little time. Creation has a ten-minute cooldown after handover.';
  return null;
}
