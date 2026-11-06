import {
  Bone,
  Group,
  Object3D,
  AnimationClip,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
} from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { retargetLibraryMotion } from './motion-library';
const names: Record<string, string> = {
  hips: 'Hips',
  spine: 'Spine',
  chest: 'Spine1',
  upperChest: 'Spine2',
  neck: 'Neck',
  head: 'Head',
  leftShoulder: 'LeftShoulder',
  rightShoulder: 'RightShoulder',
  leftUpperArm: 'LeftArm',
  rightUpperArm: 'RightArm',
  leftLowerArm: 'LeftForeArm',
  rightLowerArm: 'RightForeArm',
  leftHand: 'LeftHand',
  rightHand: 'RightHand',
  leftUpperLeg: 'LeftUpLeg',
  rightUpperLeg: 'RightUpLeg',
  leftLowerLeg: 'LeftLeg',
  rightLowerLeg: 'RightLeg',
  leftFoot: 'LeftFoot',
  rightFoot: 'RightFoot',
  leftToes: 'LeftToeBase',
  rightToes: 'RightToeBase',
};
/** Drive the VRM's normalized rig with authored library motion, never a guessed arm rotation. */
export function retargetVRMMotion(vrm: VRM, source: Object3D, clip: AnimationClip, name: string) {
  const root = new Group();
  const aliases = new Map<Object3D, string>();
  for (const [role, bone] of Object.entries(vrm.humanoid.normalizedHumanBones))
    if (names[role] && bone) aliases.set(bone.node, names[role]);
  const targets = new Map<string, Object3D>();
  function copy(node: Object3D): Object3D {
    const alias = aliases.get(node);
    const result = alias ? new Bone() : new Object3D();
    result.name = alias ? `mixamorig${alias}` : node.name;
    result.position.copy(node.position);
    result.quaternion.copy(node.quaternion);
    result.scale.copy(node.scale);
    if (alias) targets.set(result.name, node);
    for (const child of node.children) result.add(copy(child));
    return result;
  }
  const normalizedRoot = vrm.humanoid.normalizedHumanBonesRoot;
  normalizedRoot.updateWorldMatrix(true, true);
  const skeleton = copy(normalizedRoot);
  if (normalizedRoot.parent)
    normalizedRoot.parent.matrixWorld.decompose(root.position, root.quaternion, root.scale);
  root.add(skeleton);
  const retargeted = retargetLibraryMotion(root, source, clip, name);
  if (!retargeted) return;
  const tracks = retargeted.tracks.flatMap((track) => {
    const [id, property] = track.name.split('.');
    const proxy = root.getObjectByProperty('uuid', id);
    const actual = proxy && targets.get(proxy.name);
    if (!actual) return [];
    return [
      property === 'position'
        ? new VectorKeyframeTrack(`${actual.uuid}.position`, track.times, track.values)
        : new QuaternionKeyframeTrack(`${actual.uuid}.quaternion`, track.times, track.values),
    ];
  });
  return new AnimationClip(name, retargeted.duration, tracks);
}
