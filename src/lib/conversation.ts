/** Shared, bounded contract between inference, persistence, and playback. */
export type GestureCue = { animation: string; wordIndex: number };
export type ReplyBubble = { text: string; gesture?: GestureCue };
export function availableGestures(model: string): string[] {
  if (/^download:(?:\d+_)/.test(model))
    return [
      'Wave',
      'Dance',
      'Charleston',
      'Clap',
      'Bow',
      'Think',
      'Jump',
      'Sit',
      'ArmPump',
      'BodyRoll',
      'HipDance',
    ];
  if (model === 'human' || model.startsWith('vrm:'))
    return [
      'Wave',
      'Dance',
      'Bow',
      'Think',
      'Clap',
      'Charleston',
      'Jump',
      'Sit',
      'ArmPump',
      'BodyRoll',
      'HipDance',
    ];
  if (model === 'robot') return ['Wave', 'Dance', 'Yes', 'No', 'ThumbsUp'];
  return []; // Never substitute an unrelated clip for an unavailable gesture.
}
export const replySchema = {
  type: 'object',
  properties: {
    messages: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          animation: {
            type: 'string',
            description: 'An available animation name, or empty string for none',
          },
          wordIndex: {
            type: 'integer',
            description: 'Zero-based whitespace word index where animation begins; 0 if none',
          },
        },
        required: ['text', 'animation', 'wordIndex'],
      },
    },
  },
  required: ['messages'],
};
export function parseReply(raw: string, model: string): ReplyBubble[] {
  const doc = JSON.parse(raw);
  if (!Array.isArray(doc?.messages) || doc.messages.length < 1 || doc.messages.length > 3)
    throw new Error('Character returned an invalid conversation. Please retry.');
  let total = 0;
  return doc.messages.map((item: { text?: unknown; animation?: unknown; wordIndex?: unknown }) => {
    if (typeof item.text !== 'string' || !item.text.trim() || item.text.length > 900)
      throw new Error('Character returned an invalid message. Please retry.');
    const text = item.text.trim();
    total += text.length;
    if (total > 2400) throw new Error('Character reply was too long. Please retry.');
    const valid =
      typeof item.animation === 'string' &&
      availableGestures(model).includes(item.animation) &&
      Number.isInteger(item.wordIndex) &&
      Number(item.wordIndex) >= 0 &&
      Number(item.wordIndex) < text.split(/\s+/u).length;
    return {
      text,
      ...(valid
        ? { gesture: { animation: item.animation as string, wordIndex: Number(item.wordIndex) } }
        : {}),
    };
  });
}
export function spokenText(text: string) {
  // Keep emojis in chat, but do not read emoji names aloud.
  return text.replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D]/gu, '').trim();
}
export function speechSegments(bubble: ReplyBubble): { text: string; animation?: string }[] {
  const words = bubble.text.split(/\s+/u);
  const index = bubble.gesture?.wordIndex ?? 0;
  const before = spokenText(words.slice(0, index).join(' '));
  const after = spokenText(words.slice(index).join(' '));
  return [
    ...(before ? [{ text: before }] : []),
    ...(after ? [{ text: after, animation: bubble.gesture?.animation }] : []),
  ];
}
