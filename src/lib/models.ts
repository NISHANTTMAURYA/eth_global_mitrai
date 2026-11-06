/** Current renderer support, not an unverified visual-quality score. Lower comes first. */
export function lipSyncRank(model: string): number {
  if (
    [
      'download:09_CactusBoy',
      'download:15_Nightmare',
      'download:19_Wizzir',
      'download:23_Carrot_Kid',
    ].includes(model)
  )
    return 0;
  if (model === 'human' || model.startsWith('vrm:')) return 1;
  if (model === 'robot') return 2;
  // Numeric morph targets are not mapped by the renderer yet.
  if (
    [
      'download:100_SaintClaus',
      'download:27_Astrodisco',
      'download:30_Bloody',
      'download:32_Clown',
      'download:34_Ghost',
      'download:44_Zombie',
    ].includes(model)
  )
    return 3;
  return 4;
}

export const models = [
  { id: 'vrm:vivi', name: 'Vivi · girl', file: 'vrm/vivi.vrm' },
  { id: 'vrm:fumiriya', name: 'Fumiriya · boy', file: 'vrm/fumiriya.vrm' },
  { id: 'robot', name: 'Little robot', file: 'robot-expressive.glb' },
  { id: 'human', name: 'Human explorer', file: 'pixiv-sample.vrm' },
  { id: 'fox', name: 'Fox', file: 'fox.glb' },
  { id: 'gobkit:corgi', name: 'Corgi', file: 'gobkit/corgi.glb' },
  { id: 'gobkit:duck', name: 'Duck', file: 'gobkit/duck.glb' },
  { id: 'gobkit:hippo', name: 'Hippo', file: 'gobkit/hippo.glb' },
  { id: 'gobkit:chick', name: 'Chick', file: 'gobkit/chick.glb' },
  { id: 'gobkit:hare', name: 'Hare', file: 'gobkit/hare.glb' },
  ...[
    '09_CactusBoy',
    '100_SaintClaus',
    '15_Nightmare',
    '19_Wizzir',
    '23_Carrot_Kid',
    '27_Astrodisco',
    '30_Bloody',
    '32_Clown',
    '34_Ghost',
    '44_Zombie',
    'Alien',
    'BlueSoldier_Male',
    'Casual_Female',
    'Characters_GermanShepherd',
    'Characters_Pug',
    'character-female-a',
  ].map((id) => ({
    id: `download:${id}`,
    name: id
      .replace(/^\d+_/, '')
      .replace(/^Characters_/, '')
      .replaceAll('_', ' '),
    file: `downloads/${id}.glb`,
  })),
].sort((a, b) => lipSyncRank(a.id) - lipSyncRank(b.id));
export const showcaseModelIds = new Set([
  'download:09_CactusBoy',
  'download:19_Wizzir',
  'download:23_Carrot_Kid',
  'download:34_Ghost',
]);
export function modelPath(id: string) {
  return `/models/${models.find((m) => m.id === id)?.file || 'robot-expressive.glb'}`;
}

export function isVrmModel(id: string) {
  return models.some((model) => model.id === id && model.file.endsWith('.vrm'));
}
