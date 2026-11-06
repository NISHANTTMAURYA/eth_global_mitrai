import {
  AnimationClip,
  AnimationMixer,
  Box3,
  LoopOnce,
  Object3D,
  SkinnedMesh,
  Vector3,
} from 'three';

/** Measure deformed vertices, not cached bind-pose boxes, including gesture extremes. */
export function characterBounds(object: Object3D, clips: AnimationClip[], samples = 8) {
  // Measure in model space even when React has already attached a scaled parent.
  const originalParent = object.parent;
  object.parent = null;
  const saved: {
    node: Object3D;
    position: Vector3;
    quaternion: Object3D['quaternion'];
    scale: Vector3;
  }[] = [];
  object.traverse((node) =>
    saved.push({
      node,
      position: node.position.clone(),
      quaternion: node.quaternion.clone(),
      scale: node.scale.clone(),
    }),
  );
  const bounds = new Box3();
  const capture = () => {
    object.updateMatrixWorld(true);
    object.traverse((node) => {
      if ((node as SkinnedMesh).isSkinnedMesh) {
        (node as SkinnedMesh).skeleton.update();
        // Animated limbs can leave their initial frustum-culling sphere.
        node.frustumCulled = false;
      }
    });
    bounds.union(new Box3().setFromObject(object, true));
  };
  const mixer = new AnimationMixer(object);
  try {
    if (!clips.length) capture();
    for (const clip of clips) {
      const action = mixer.clipAction(clip).setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      action.reset().play();
      for (let frame = 0; frame <= samples; frame++) {
        mixer.setTime(Math.max(0, (clip.duration * frame) / Math.max(1, samples) - 0.00001));
        capture();
      }
      mixer.stopAllAction();
    }
  } finally {
    mixer.stopAllAction();
    mixer.uncacheRoot(object);
    for (const s of saved) {
      s.node.position.copy(s.position);
      s.node.quaternion.copy(s.quaternion);
      s.node.scale.copy(s.scale);
    }
    object.parent = originalParent;
    object.updateWorldMatrix(true, true);
    object.traverse((node) => {
      if ((node as SkinnedMesh).isSkinnedMesh) (node as SkinnedMesh).skeleton.update();
    });
  }
  if (bounds.isEmpty()) bounds.set(new Vector3(-0.5, -1, -0.5), new Vector3(0.5, 1, 0.5));
  return bounds;
}

export function cameraFitDistance(radius: number, aspect: number, fov: number) {
  const vertical = (fov * Math.PI) / 360;
  const horizontal = Math.atan(Math.tan(vertical) * Math.max(0.1, aspect));
  return (radius * 1.12) / Math.sin(Math.min(vertical, horizontal));
}

export function boxFitDistance(size: Vector3, aspect: number, fov: number) {
  const tangent = Math.tan((fov * Math.PI) / 360);
  return (
    Math.max(size.y / (2 * tangent), size.x / (2 * tangent * Math.max(0.1, aspect))) * 1.1 +
    size.z / 2
  );
}
