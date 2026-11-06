import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { AnimationMixer, Bone, Group, Matrix4, Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { libraryMotions, retargetLibraryMotion } from '../src/lib/motion-library';

test('CC0 library clips retarget to all ten actual imported skeletons with bent-elbow greeting', async () => {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const sources = await Promise.all(libraryMotions.map(async ([file]) => {
    const bytes = readFileSync(`public/animations/mesh2motion/${file}.glb`);
    return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, '');
  }));
  let checked = 0;
  for (const file of readdirSync('public/models/downloads')) {
    if (!/^\d+_.*\.glb$/.test(file)) continue;
    const bytes = readFileSync(`public/models/downloads/${file}`);
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    const joints = new Set(doc.skins.flatMap((s: {joints: number[]}) => s.joints));
    const nodes: Object3D[] = doc.nodes.map((n: any, i: number) => {
      const node = joints.has(i) ? new Bone() : new Object3D(); node.name = n.name || '';
      if (n.matrix) new Matrix4().fromArray(n.matrix).decompose(node.position, node.quaternion, node.scale);
      else { if(n.translation)node.position.fromArray(n.translation);if(n.rotation)node.quaternion.fromArray(n.rotation);if(n.scale)node.scale.fromArray(n.scale); }
      return node;
    });
    doc.nodes.forEach((n: any,i: number) => n.children?.forEach((c: number) => nodes[i].add(nodes[c])));
    const root = new Group(); nodes.filter((n) => !n.parent).forEach((n) => root.add(n));
    let bent = false;
    for (let i = 0; i < sources.length; i++) {
      const clip = retargetLibraryMotion(root,sources[i].scene,sources[i].animations[0],libraryMotions[i][1]);
      assert.ok(clip && clip.tracks.length >= 15, file);
      assert.ok(clip.tracks.every((t) => [...t.values].every(Number.isFinite)), file);
      const mixer = new AnimationMixer(root); mixer.clipAction(clip).play();
      for (const fraction of [.2,.4,.6,.8]) {
        mixer.setTime(clip.duration * fraction); root.updateMatrixWorld(true);
        if (clip.name === 'Wave') for (const side of ['Left','Right']) {
          const a = nodes.find((n) => n.name.endsWith(`${side}Arm`))!;
          const e = nodes.find((n) => n.name.endsWith(`${side}ForeArm`))!;
          const h = nodes.find((n) => n.name.endsWith(`${side}Hand`))!;
          const upper = e.getWorldPosition(new Vector3()).sub(a.getWorldPosition(new Vector3()));
          const lower = h.getWorldPosition(new Vector3()).sub(e.getWorldPosition(new Vector3()));
          if (upper.angleTo(lower) > .7) bent = true;
        }
      }
      mixer.stopAllAction(); mixer.uncacheRoot(root);
    }
    assert.ok(bent, `${file}: greeting must bend an elbow`); checked++;
  }
  assert.equal(checked, 10);
});
