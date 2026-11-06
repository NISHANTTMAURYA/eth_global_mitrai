import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AnimationClip, Bone, BoxGeometry, Float32BufferAttribute, Group, MeshBasicMaterial, PerspectiveCamera, Skeleton, SkinnedMesh, Uint16BufferAttribute, Vector3, VectorKeyframeTrack } from 'three';
import { cameraFitDistance, characterBounds } from '../src/lib/character-framing';

test('framing includes animated skinned vertices and restores the original pose', () => {
  const root = new Group(), bone = new Bone(); bone.name = 'rootBone'; root.add(bone);
  const geometry = new BoxGeometry(1, 1, 1);
  const count = geometry.attributes.position.count;
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(new Uint16Array(count * 4),4));
  const weights = new Float32Array(count * 4); for(let i=0;i<count;i++) weights[i*4]=1;
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(weights,4));
  const mesh = new SkinnedMesh(geometry, new MeshBasicMaterial()); root.add(mesh);
  root.updateMatrixWorld(true); mesh.bind(new Skeleton([bone]));
  // Populate the stale bind-pose box first, as happens in real renderers.
  mesh.computeBoundingBox();
  const clip = new AnimationClip('Wave',1,[new VectorKeyframeTrack('rootBone.position',[0,.5,1],[0,0,0,0,3,0,0,0,0])]);
  const bounds = characterBounds(root,[clip]);
  assert.ok(bounds.max.y > 3.49); assert.ok(bounds.min.y <= -.5);
  assert.equal(bone.position.y,0); assert.equal(mesh.frustumCulled,false);
});

test('portrait, landscape, and short gallery canvases fit full model bounds', () => {
  for(const aspect of [.45,.8,1,2.5,4]) {
    for(const dimensions of [[1,3,1],[4,1,2],[2,2,4]]) {
      const radius = new Vector3(...dimensions as [number,number,number]).length()/2;
      const camera = new PerspectiveCamera(35,aspect,.01,1000);
      camera.position.z = cameraFitDistance(radius,aspect,35); camera.lookAt(0,0,0); camera.updateMatrixWorld(true);
      for(const x of [-1,1]) for(const y of [-1,1]) for(const z of [-1,1]) {
        const p = new Vector3(x*dimensions[0]/2,y*dimensions[1]/2,z*dimensions[2]/2).project(camera);
        assert.ok(Math.abs(p.x)<1 && Math.abs(p.y)<1, `aspect ${aspect}: complete bounds must fit`);
      }
    }
  }
});
