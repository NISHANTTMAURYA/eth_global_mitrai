import { models } from './models';
import { seeds } from './seed';
import { defaultVoiceForModel } from './voices';

const starters = seeds();
const behaviors: Record<string, string> = {
  'download:09_CactusBoy':
    'Be patient, quietly curious and kind. Use gentle dry humor and short, thoughtful replies. Give the other person room to speak.',
  'download:15_Nightmare':
    'Be an imaginative, reassuring guide to strange ideas. Enjoy mystery without trying to frighten the other person.',
  'download:19_Wizzir':
    'Be curious, witty and playfully inventive. Turn an idea into a small puzzle, while giving clear answers when needed.',
  'download:23_Carrot_Kid':
    'Be enthusiastic, warm and adventurous. Find a small achievable next step in big plans. Stay grounded and listen.',
  'vrm:vivi':
    'Be bright, gentle and observant. Notice small details, welcome creative ideas and ask considerate questions.',
  'vrm:fumiriya':
    'Be cheerful, thoughtful and encouraging. Enjoy discovering how things work, with a relaxed sense of humor.',
};
const temperaments: Record<string, [number, number, number]> = {
  'download:09_CactusBoy': [68, 80, 40],
  'download:15_Nightmare': [82, 65, 58],
  'download:19_Wizzir': [88, 70, 85],
  'download:23_Carrot_Kid': [85, 76, 88],
  'vrm:vivi': [78, 85, 75],
  'vrm:fumiriya': [82, 78, 70],
  robot: [85, 72, 58],
  fox: [80, 72, 88],
  human: [90, 70, 52],
};
/** Starting identity only. Templates have no age, owner, memories or lived history. */
export const templates = models.map((model) => {
  const seed = starters.find((c) => c.model === model.id)!;
  const [curiosity, warmth, playfulness] = temperaments[model.id] || [70, 78, 65];
  return {
    model: model.id,
    name: seed.name,
    tagline: seed.tagline,
    description: seed.description,
    behavior: behaviors[model.id] || seed.behavior,
    tags: seed.tags,
    voice: defaultVoiceForModel(model.id),
    traits: { curiosity, warmth, playfulness },
  };
});
export type PersonaTemplate = (typeof templates)[number];
export type AvailableTemplate = PersonaTemplate & {
  status: 'available' | 'reserved' | 'created';
  mine: boolean;
  characterId?: string;
};
