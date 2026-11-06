export interface VoiceOption {
  id: string;
  name: string;
  gender: 'female' | 'male';
  tag: string;
  description: string;
  previewUrl: string;
}

export const VOICES: VoiceOption[] = [
  {
    id: 'shubh',
    name: 'Shubh',
    gender: 'male',
    tag: 'Warm & Curious',
    description: 'Deep, calm tone with a gentle inquisitive presence.',
    previewUrl: '/audio/voices/shubh.mp3',
  },
  {
    id: 'priya',
    name: 'Priya',
    gender: 'female',
    tag: 'Warm & Thoughtful',
    description: 'Friendly, empathetic tone that listens closely.',
    previewUrl: '/audio/voices/priya.mp3',
  },
  {
    id: 'simran',
    name: 'Simran',
    gender: 'female',
    tag: 'Playful & Whimsical',
    description: 'Bright, cheerful cadence full of lively imagination.',
    previewUrl: '/audio/voices/simran.mp3',
  },
  {
    id: 'aditya',
    name: 'Aditya',
    gender: 'male',
    tag: 'Youthful & Energetic',
    description: 'Enthusiastic and clear, ready for spontaneous quests.',
    previewUrl: '/audio/voices/aditya.mp3',
  },
  {
    id: 'ishita',
    name: 'Ishita',
    gender: 'female',
    tag: 'Gentle & Expressive',
    description: 'Poetic, reassuring storytelling voice with soft pacing.',
    previewUrl: '/audio/voices/ishita.mp3',
  },
  {
    id: 'rohan',
    name: 'Rohan',
    gender: 'male',
    tag: 'Crisp & Adventurous',
    description: 'Sharp, articulate narrator voice for exploring ideas.',
    previewUrl: '/audio/voices/rohan.mp3',
  },
];

export const DEFAULT_VOICE_ID = 'shubh';

export function defaultVoiceForModel(modelId: string): string {
  if (modelId === 'fox') return 'simran';
  if (modelId === 'vrm:fumiriya') return 'aditya';
  if (modelId === 'vrm:vivi') return 'simran';
  if (modelId === 'human') return 'priya';
  if (modelId === 'robot') return 'shubh';
  if (modelId.includes('Female') || modelId.includes('female')) return 'ishita';
  if (modelId.includes('Corgi') || modelId.includes('corgi') || modelId.includes('chick'))
    return 'simran';
  if (modelId.includes('Ghost') || modelId.includes('Wizzir') || modelId.includes('Alien'))
    return 'aditya';
  return 'shubh';
}

export function getVoice(voiceId?: string): VoiceOption {
  return VOICES.find((v) => v.id === voiceId) || VOICES[0];
}
