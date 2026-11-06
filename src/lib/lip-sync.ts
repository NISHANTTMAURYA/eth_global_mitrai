export type MouthShape = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X';
export type MouthCue = { start: number; end: number; value: MouthShape };
export type SpeechTrack = { mouthCues: MouthCue[]; duration: number };
export type VisemeWeights = Record<string, number>;

const shapes: Record<MouthShape, VisemeWeights> = {
  A: { pp: 1 }, B: { ih: .65, ss: .2 }, C: { ee: .8 }, D: { aa: .85 },
  E: { oh: .8 }, F: { ou: .85 }, G: { ff: .85 }, H: { nn: .7, aa: .15 }, X: {},
};
export const VRM_VISEMES = ['aa','ih','ou','ee','oh'] as const;

/** Audio-clock evaluation with a short lead into the next shape. Never pulse randomly. */
export function speechWeights(track: SpeechTrack | null, time: number): VisemeWeights {
  if (!track || time < 0 || time >= track.duration) return {};
  const index = track.mouthCues.findIndex((cue) => time >= cue.start && time < cue.end);
  if (index < 0) return {};
  const cue = track.mouthCues[index];
  const current = shapes[cue.value];
  const next = track.mouthCues[index + 1];
  // Preserve a consonant closure; anticipatory blending would open the lips too early.
  if (!next || next.value === 'A' || cue.value === 'A' || cue.value === 'X') return current;
  const transition = Math.min(.055, (cue.end - cue.start) * .3);
  const blend = Math.max(0, Math.min(1, (time - cue.end + transition) / transition));
  const weights: VisemeWeights = {};
  for (const key of new Set([...Object.keys(current), ...Object.keys(shapes[next.value])]))
    weights[key] = (current[key] || 0) * (1 - blend) + (shapes[next.value][key] || 0) * blend;
  return weights;
}

export function vowelWeights(weights: VisemeWeights): VisemeWeights {
  // The five-vowel VRM cannot represent closed consonant/teeth/tongue shapes.
  return Object.fromEntries(VRM_VISEMES.map((key) => [key, weights[key] || 0]));
}

export function validateSpeechTrack(value: unknown): SpeechTrack {
  const doc = value as { metadata?: { duration?: number }; duration?: number; mouthCues?: MouthCue[] };
  const duration = doc?.duration ?? doc?.metadata?.duration;
  if (!Number.isFinite(duration) || duration! <= 0 || duration! > 600 || !Array.isArray(doc.mouthCues))
    throw new Error('Invalid speech timing.');
  let previous = 0;
  for (const cue of doc.mouthCues) {
    if (!Object.hasOwn(shapes, cue.value) || !Number.isFinite(cue.start) || !Number.isFinite(cue.end) ||
      cue.start < previous - .001 || cue.end <= cue.start || cue.end > duration! + .1)
      throw new Error('Invalid mouth cue.');
    previous = cue.end;
  }
  return { duration: duration!, mouthCues: doc.mouthCues };
}
