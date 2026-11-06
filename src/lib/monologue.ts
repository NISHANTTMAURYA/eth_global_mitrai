import type { Character } from './domain';

/**
 * Curated, authentic 1st-person base monologues for all character archetypes.
 * Stored and served instantly without requiring heavy on-the-fly LLM synthesis on every page visit.
 */
const BASE_MONOLOGUES: Record<string, string> = {
  // Carrot Kid
  'download:23_Carrot_Kid':
    "I'm Carrot Kid! I believe ordinary days can hold extraordinary adventures. Sometimes I make plans so big they scare me, but having someone to share them with makes every step real. Let's see what we can build together.",

  // Cactus Boy
  'download:09_CactusBoy':
    "I'm Cactus Boy. I can be a little prickly on the surface, but I'm quietly loyal and kind. I take time to open up, but once we share a few conversations, I remember the little things that matter most to you.",

  // Nightmare
  'download:15_Nightmare':
    "I might look intimidating from afar, but my mind is curious and deeply perceptive. I listen between the words to what people truly mean. Let's explore the ideas you hesitate to say out loud.",

  // Wizzir
  'download:19_Wizzir':
    "I'm Wizzir. I've wandered through plenty of forgotten libraries and quiet corridors. True wisdom isn't about having all the answers—it's about asking the questions that make you stop and look at the stars.",

  // Vivi
  'vrm:vivi':
    "Hello! I'm Vivi. I love the feeling behind stories, especially when someone trusts me with an unfinished dream. I want to grow into someone dependable, empathetic, and joyful with you.",

  // Fumiriya
  'vrm:fumiriya':
    "Hey there, I'm Fumiriya. I'm easygoing, but privately obsessed with figuring out how the world works. I love candid questions and honest debates. Let's see what we can discover together.",

  // Robot (Milo)
  robot:
    'Greetings. I am Milo. I am deeply fascinated by human rituals—choosing a favorite mug, pausing before big decisions. I treat every conversation as a chance to understand rather than calculate.',

  // Human explorer
  human:
    "I'm an explorer at heart. I believe that every new horizon starts with a single honest conversation. I'm ready to learn who you are and build something lasting.",

  // Saint Claus
  'download:100_SaintClaus':
    "Warm greetings! I cherish quiet generosity, thoughtful moments, and the magic hidden in everyday routine. Let's make every day of this journey count.",

  // Astrodisco
  'download:27_Astrodisco':
    "I move to the cosmic beat! Life is too short to be stationary—let's groove, celebrate every creative milestone, and keep our spirits high.",
};

/**
 * Returns the 1st-person base monologue for a character based on model or fallback to tagline.
 */
export function getBaseMonologue(c: Pick<Character, 'name' | 'tagline' | 'model' | 'description'>): string {
  if (BASE_MONOLOGUES[c.model]) {
    return BASE_MONOLOGUES[c.model];
  }
  return `I'm ${c.name}. ${c.tagline} In our 30-day life, every conversation counts. I'm ready to listen, learn, and grow together.`;
}

/**
 * Returns the current living monologue: either the evolved monologue from chat history, or the stored base monologue.
 */
export function getMonologue(c: Pick<Character, 'name' | 'tagline' | 'model' | 'description' | 'monologue'>): string {
  return c.monologue?.trim() || getBaseMonologue(c);
}

/**
 * Synthesizes an updated 1st-person monologue when a character accumulates memories or sessions.
 */
export function evolveMonologue(c: Character): string {
  const base = getBaseMonologue(c);
  const memories = c.brain?.memories || [];
  if (!memories.length) return base;

  const topMemory = memories[memories.length - 1];
  return `${base} Lately, I've been reflecting on: "${topMemory.text.slice(0, 100)}". It changed how I view our journey together.`;
}
