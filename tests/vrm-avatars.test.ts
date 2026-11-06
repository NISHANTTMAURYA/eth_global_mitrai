import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { models, isVrmModel, lipSyncRank } from '../src/lib/models';
import { seeds } from '../src/lib/seed';
import { defaultVoiceForModel } from '../src/lib/voices';

test('new girl and boy avatars have redistributable licenses, humanoid bones and five actual speech morph bindings', () => {
  for (const id of ['vrm:vivi', 'vrm:fumiriya']) {
    const model = models.find((m) => m.id === id)!;
    const bytes = readFileSync(`public/models/${model.file}`);
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    const vrm = doc.extensions.VRM;
    assert.equal(vrm.meta.licenseName, 'CC0');
    assert.equal(vrm.meta.commercialUssageName, 'Allow');
    const bones = vrm.humanoid.humanBones.map((b: { bone: string }) => b.bone);
    for (const bone of [
      'hips',
      'head',
      'leftUpperArm',
      'leftLowerArm',
      'rightUpperArm',
      'leftUpperLeg',
      'rightUpperLeg',
    ])
      assert.ok(bones.includes(bone), `${id}: ${bone}`);
    for (const vowel of ['a', 'i', 'u', 'e', 'o']) {
      const shape = vrm.blendShapeMaster.blendShapeGroups.find(
        (g: { presetName: string }) => g.presetName === vowel,
      );
      assert.ok(shape?.binds.length, `${id}: ${vowel} is bound to facial geometry`);
    }
    assert.ok(isVrmModel(id));
    assert.equal(lipSyncRank(id), 1);
    assert.ok(
      seeds().some((c) => c.model === id && c.published && c.voice === defaultVoiceForModel(id)),
    );
  }
});
