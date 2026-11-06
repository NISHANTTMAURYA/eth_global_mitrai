export const models = [
  { id: 'robot', name: 'Little robot', file: 'robot-expressive.glb' },
  { id: 'human', name: 'Human explorer', file: 'pixiv-sample.vrm' },
  { id: 'fox', name: 'Fox', file: 'fox.glb' },
  ...[
    '09_CactusBoy', '100_SaintClaus', '15_Nightmare', '19_Wizzir',
    '23_Carrot_Kid', '27_Astrodisco', '30_Bloody', '32_Clown',
    '34_Ghost', '44_Zombie', 'Alien', 'BlueSoldier_Male', 'Casual_Female',
    'Characters_GermanShepherd', 'Characters_Pug', 'character-female-a',
  ].map((id) => ({ id, name: id.replace(/^\d+_/, '').replace(/^Characters_/, '').replaceAll('_', ' '), file: `downloads/${id}.glb` })),
];
export function modelPath(id: string) {
  return `/models/${models.find((m) => m.id === id)?.file || 'robot-expressive.glb'}`;
}
