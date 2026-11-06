import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Group, Bone, Object3D, Matrix4, AnimationMixer } from 'three';
import { VRMHumanoid, type VRM, type VRMHumanBones } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { retargetVRMMotion } from '../src/lib/vrm-motion';
test('authored greetings bind to both new VRM rigs and leave the torso upright', async () => {
  const bytes = readFileSync('public/animations/mesh2motion/greeting.glb');
  const source = await new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  for (const file of ['vivi', 'fumiriya']) {
    const vrmBytes = readFileSync(`public/models/vrm/${file}.vrm`);
    const doc = JSON.parse(vrmBytes.subarray(20, 20 + vrmBytes.readUInt32LE(12)).toString());
    const nodes: Object3D[] = doc.nodes.map((n: any) => {
      const node = new Bone();
      node.name = n.name || '';
      if (n.matrix)
        new Matrix4().fromArray(n.matrix).decompose(node.position, node.quaternion, node.scale);
      else {
        if (n.translation) node.position.fromArray(n.translation);
        if (n.rotation) node.quaternion.fromArray(n.rotation);
        if (n.scale) node.scale.fromArray(n.scale);
      }
      return node;
    });
    doc.nodes.forEach((n: any, i: number) =>
      n.children?.forEach((child: number) => nodes[i].add(nodes[child])),
    );
    const scene = new Group();
    nodes.filter((n) => !n.parent).forEach((n) => scene.add(n));
    scene.updateMatrixWorld(true);
    const bones = Object.fromEntries(
      doc.extensions.VRM.humanoid.humanBones.map((b: any) => [b.bone, { node: nodes[b.node] }]),
    ) as VRMHumanBones;
    const humanoid = new VRMHumanoid(bones);
    scene.add(humanoid.normalizedHumanBonesRoot);
    scene.updateMatrixWorld(true);
    const clip = retargetVRMMotion({ humanoid } as VRM, source.scene, source.animations[0], 'Wave');
    assert.ok(clip, `${file} has an authored wave`);
    assert.ok(clip.tracks.length >= 4);
    assert.ok(clip.tracks.every((t) => [...t.values].every(Number.isFinite)));
    const spine = humanoid.getNormalizedBoneNode('spine')!,
      before = spine.quaternion.clone();
    const mixer = new AnimationMixer(scene);
    mixer.clipAction(clip).play();
    mixer.update(clip.duration * 0.4);
    assert.equal(spine.quaternion.angleTo(before), 0, 'Wave does not bend the torso');
    const arm = humanoid.getNormalizedBoneNode('leftUpperArm')!;
    assert.ok(
      arm.quaternion.angleTo(arm.quaternion.clone().identity()) > 0.05,
      'Authored arm motion actually plays',
    );
  }
});
