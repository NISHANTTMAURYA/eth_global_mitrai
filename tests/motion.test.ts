import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { AnimationMixer, Bone, Group, Matrix4, Object3D } from 'three';
import { createCompanionClips, companionAction } from '../src/lib/character-motion';

test('all ten unanimated imported rigs accept idle/wave tracks and return to idle', () => {
  let checked = 0;
  for (const file of readdirSync('public/models/downloads')) {
    if (!file.endsWith('.glb')) continue;
    const bytes = readFileSync(`public/models/downloads/${file}`);
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    if (doc.animations?.length) continue;
    const joints = new Set<number>(doc.skins.flatMap((s: {joints: number[]}) => s.joints));
    const nodes: Object3D[] = doc.nodes.map((n: any, i: number) => {
      const node = joints.has(i) ? new Bone() : new Object3D();
      node.name = n.name || '';
      if (n.matrix) new Matrix4().fromArray(n.matrix).decompose(node.position, node.quaternion, node.scale);
      else {
        if (n.translation) node.position.fromArray(n.translation);
        if (n.rotation) node.quaternion.fromArray(n.rotation);
        if (n.scale) node.scale.fromArray(n.scale);
      }
      return node;
    });
    doc.nodes.forEach((n: any, i: number) => n.children?.forEach((child: number) => nodes[i].add(nodes[child])));
    const root = new Group();
    nodes.filter((node) => !node.parent).forEach((node) => root.add(node));
    const clips = createCompanionClips(root);
    assert.deepEqual(clips.map((c) => c.name), ['CompanionIdle', 'CompanionWave'], file);
    const arm = nodes.find((node) => node.name.endsWith('LeftArm'))!;
    const mixer = new AnimationMixer(root);
    const idle = mixer.clipAction(clips[0]).play();
    mixer.update(.5);
    const relaxed = arm.quaternion.clone();
    idle.stop();
    mixer.clipAction(clips[1]).play();
    mixer.update(1.25);
    assert.ok(arm.quaternion.angleTo(relaxed) > .1, `${file}: arm must actually move`);
    mixer.stopAllAction(); idle.reset().play(); mixer.update(.5);
    assert.ok(arm.quaternion.clone().normalize().angleTo(relaxed.normalize()) < .0001, `${file}: returns to rest`);
    for (const track of clips.flatMap((c) => c.tracks)) assert.ok([...track.values].every(Number.isFinite));
    checked++;
  }
  assert.equal(checked, 10);
});

test('greetings select friendly clips rather than attack or death', () => {
  assert.equal(companionAction(['Idle','Yes','Bite_Front'], 'greeting'), 'Yes');
  assert.equal(companionAction(['idle','attack','dead','walk'], 'greeting'), 'walk');
  assert.equal(companionAction(['Idle','Idle_2','Attack'], 'greeting'), 'Idle_2');
});
