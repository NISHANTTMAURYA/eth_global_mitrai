import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Character } from './domain';

export const mindProposalSchema = z.object({
  observations: z
    .array(
      z.object({
        key: z.string().min(1).max(60),
        kind: z.enum(['fact', 'interest', 'goal', 'reflection']),
        summary: z.string().min(1).max(240),
        sourceQuote: z.string().min(3).max(300),
      }),
    )
    .max(4),
  adaptations: z
    .array(
      z.object({
        axis: z.enum(['curiosity', 'warmth', 'playfulness', 'brevity']),
        direction: z.union([z.literal(-1), z.literal(1)]),
        sourceQuote: z.string().min(3).max(300),
      }),
    )
    .max(3),
  followUps: z
    .array(
      z.object({
        subject: z.string().min(1).max(80),
        reason: z.string().min(3).max(240),
        sourceQuote: z.string().min(3).max(300),
        dueAt: z.string().max(40),
        action: z.enum(['schedule', 'cancel']),
      }),
    )
    .max(2),
});
export type MindProposal = z.infer<typeof mindProposalSchema>;
export const emptyProposal: MindProposal = { observations: [], adaptations: [], followUps: [] };
const str = { type: 'string' };
export const mindResponseSchema = {
  type: 'object',
  properties: {
    observations: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          key: str,
          kind: { type: 'string', enum: ['fact', 'interest', 'goal', 'reflection'] },
          summary: str,
          sourceQuote: str,
        },
        required: ['key', 'kind', 'summary', 'sourceQuote'],
      },
    },
    adaptations: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          axis: { type: 'string', enum: ['curiosity', 'warmth', 'playfulness', 'brevity'] },
          direction: { type: 'integer', description: 'Exactly 1 or -1' },
          sourceQuote: str,
        },
        required: ['axis', 'direction', 'sourceQuote'],
      },
    },
    followUps: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        properties: {
          subject: str,
          reason: str,
          sourceQuote: str,
          dueAt: str,
          action: { type: 'string', enum: ['schedule', 'cancel'] },
        },
        required: ['subject', 'reason', 'sourceQuote', 'dueAt', 'action'],
      },
    },
  },
  required: ['observations', 'adaptations', 'followUps'],
};
export type PrivateMind = {
  observations: {
    key: string;
    kind: string;
    summary: string;
    sourceQuote: string;
    sourceId: string;
    at: number;
  }[];
  seed: Record<string, number>;
  style: Record<string, number>;
  evidence: { id: string; axis: string; direction: number; session: number; at: number }[];
  preferences?: {
    axis: string;
    direction: number;
    sourceQuote: string;
    sourceId: string;
    at: number;
  }[];
  changes: { axis: string; from: number; to: number; at: number; why: string }[];
  processed: string[];
  lastMovementDay?: string;
  dailyMovement: number;
  lastUserAt: number;
};
export const conversationScope = (id: string, owner: string, epoch = 0) =>
  JSON.stringify([id, owner, epoch]);
export function initialPrivateMind(c: Character): PrivateMind {
  const seed = { ...c.brain.traits, brevity: 50 };
  return {
    observations: [],
    seed,
    style: { ...seed },
    evidence: [],
    changes: [],
    processed: [],
    dailyMovement: 0,
    lastUserAt: 0,
  };
}
export function groundedProposal(raw: unknown, text: string): MindProposal {
  const parsed = mindProposalSchema.safeParse(raw);
  if (!parsed.success) return emptyProposal;
  const grounded = (item: { sourceQuote: string }) => text.includes(item.sourceQuote);
  return {
    observations: parsed.data.observations.filter(grounded),
    adaptations: parsed.data.adaptations.filter(grounded),
    followUps: parsed.data.followUps.filter(grounded),
  };
}
/** A single encounter changes context, not identity. Independent spaced evidence gates personality. */
export function developMind(
  mind: PrivateMind,
  proposal: MindProposal,
  sourceId: string,
  text: string,
  now: number,
): PrivateMind {
  if (mind.processed.includes(sourceId)) return mind;
  const next = structuredClone(mind);
  next.lastUserAt = now;
  next.processed = [...next.processed, sourceId].slice(-500);
  for (const observation of proposal.observations) {
    next.observations = next.observations.filter((o) => o.key !== observation.key);
    next.observations.push({ ...observation, sourceId, at: now });
  }
  next.observations = next.observations.slice(-200);
  const day = new Date(now).toISOString().slice(0, 10);
  if (next.lastMovementDay !== day) {
    next.lastMovementDay = day;
    next.dailyMovement = 0;
  }
  const session = Math.floor(now / (30 * 60000));
  const contentId = createHash('sha256')
    .update(
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim(),
    )
    .digest('hex');
  for (const vote of proposal.adaptations) {
    next.preferences = [
      ...(next.preferences || []).filter((p) => p.axis !== vote.axis),
      { ...vote, sourceId, at: now },
    ].slice(-20);
    const id = `${vote.axis}:${contentId}`;
    if (next.evidence.some((e) => e.id === id || (e.axis === vote.axis && e.session === session)))
      continue;
    next.evidence.push({ id, axis: vote.axis, direction: vote.direction, session, at: now });
    const supporting = next.evidence.filter(
      (e) => e.axis === vote.axis && e.direction === vote.direction,
    );
    if (
      supporting.length < 3 ||
      now - Math.min(...supporting.map((e) => e.at)) < 86400000 ||
      next.dailyMovement >= 1
    )
      continue;
    const from = next.style[vote.axis];
    const to = Math.max(
      next.seed[vote.axis] - 15,
      Math.min(next.seed[vote.axis] + 15, Math.max(0, Math.min(100, from + vote.direction * 0.5))),
    );
    if (from !== to) {
      next.style[vote.axis] = to;
      next.dailyMovement += Math.abs(to - from);
      next.changes.push({
        axis: vote.axis,
        from,
        to,
        at: now,
        why: 'Repeated grounded communication preferences across at least three sessions and 24 hours.',
      });
    }
  }
  next.evidence = next.evidence.slice(-500);
  next.changes = next.changes.slice(-100);
  return next;
}
export function privateContext(mind: PrivateMind, query: string, now = Date.now()) {
  const tokens = query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [];
  const ranked = [...mind.observations].sort((a, b) => score(b) - score(a)).slice(0, 10);
  function score(o: PrivateMind['observations'][0]) {
    return (
      tokens.filter((t) => o.summary.toLowerCase().includes(t)).length * 5 +
      1 / (1 + Math.max(0, now - o.at) / 86400000)
    );
  }
  return JSON.stringify({
    privateOnly: true,
    gradualStyle: mind.style,
    datedExperiences: ranked.map((o) => ({ ...o, at: new Date(o.at).toISOString() })),
    recentGrowth: mind.changes.slice(-3),
  });
}
