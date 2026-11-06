import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { AnimationMixer, Bone, Group, Matrix4, Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { libraryMotions, retargetLibraryMotion } from '../src/lib/motion-library';

test('CC0 library clips retarget to all ten actual imported skeletons with bent-elbow greeting', async () => {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const sources = await Promise.all(
    libraryMotions.map(async ([file]) => {
      const bytes = readFileSync(`public/animations/mesh2motion/${file}.glb`);
      return loader.parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
        '',
      );
    }),
  );
  let checked = 0;
  for (const file of readdirSync('public/models/downloads')) {
    if (!/^\d+_.*\.glb$/.test(file)) continue;
    const bytes = readFileSync(`public/models/downloads/${file}`);
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    const joints = new Set(doc.skins.flatMap((s: { joints: number[] }) => s.joints));
    const nodes: Object3D[] = doc.nodes.map((n: any, i: number) => {
      const node = joints.has(i) ? new Bone() : new Object3D();
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
      n.children?.forEach((c: number) => nodes[i].add(nodes[c])),
    );
    const root = new Group();
    nodes.filter((n) => !n.parent).forEach((n) => root.add(n));
    const spineRest = nodes
      .filter((n) => /Spine\d*$/.test(n.name))
      .map((n) => ({ node: n, rest: n.quaternion.clone() }));
    let bent = false;
    for (let i = 0; i < sources.length; i++) {
      const clip = retargetLibraryMotion(
        root,
        sources[i].scene,
        sources[i].animations[0],
        libraryMotions[i][1],
      );
      assert.ok(clip && clip.tracks.length >= 15, file);
      if (clip.name === 'Jump' || clip.name === 'SitEnter') {
        const rootTrack = clip.tracks.find((track) => track.name.endsWith('.position'))!;
        assert.ok(rootTrack, `${file}: vertical pelvis movement exists`);
        const id = rootTrack.name.split('.')[0];
        assert.ok(
          root.getObjectByProperty('uuid', id),
          `${file}: pelvis track binds to visible rig`,
        );
        const heights = [...rootTrack.values].filter((_, index) => index % 3 === 1);
        assert.ok(
          Math.max(...heights) - Math.min(...heights) > 0.01,
          `${file}: ${clip.name} must move vertically`,
        );
      }
      assert.ok(
        clip.tracks.every((t) => [...t.values].every(Number.isFinite)),
        file,
      );
      const mixer = new AnimationMixer(root);
      mixer.clipAction(clip).play();
      for (const fraction of [0.2, 0.4, 0.6, 0.8]) {
        mixer.setTime(clip.duration * fraction);
        root.updateMatrixWorld(true);
        for (const { node, rest } of spineRest) {
          if (['Wave', 'Think', 'Clap', 'LibraryIdle'].includes(clip.name))
            assert.ok(
              node.quaternion.angleTo(rest) < 0.0001,
              `${file}: ${clip.name} stays upright`,
            );
          else if (clip.name !== 'Bow')
            assert.ok(
              node.quaternion.angleTo(rest) < (4.01 * Math.PI) / 180,
              `${file}: ${clip.name} avoids exaggerated spine bend`,
            );
        }
        if (clip.name === 'Wave')
          for (const side of ['Left', 'Right']) {
            const a = nodes.find((n) => n.name.endsWith(`${side}Arm`))!;
            const e = nodes.find((n) => n.name.endsWith(`${side}ForeArm`))!;
            const h = nodes.find((n) => n.name.endsWith(`${side}Hand`))!;
            const upper = e.getWorldPosition(new Vector3()).sub(a.getWorldPosition(new Vector3()));
            const lower = h.getWorldPosition(new Vector3()).sub(e.getWorldPosition(new Vector3()));
            if (upper.angleTo(lower) > 0.7) bent = true;
          }
      }
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    }
    assert.ok(bent, `${file}: greeting must bend an elbow`);
    checked++;
  }
  assert.equal(checked, 10);
});
