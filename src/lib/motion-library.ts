import { AnimationClip, AnimationMixer, Bone, LoopOnce, Object3D, Quaternion, QuaternionKeyframeTrack, Vector3 } from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

export const libraryMotions = [
  ['idle-subtle', 'LibraryIdle'], ['greeting', 'Wave'],
  ['dance-simple', 'Dance'], ['dance-charleston', 'Charleston'],
  ['clapping', 'Clap'], ['bow', 'Bow'], ['confused', 'Think'],
] as const;

const mapping: Record<string, string> = {
  Hips: 'pelvis', Spine: 'spine_01', Spine1: 'spine_02', Spine2: 'spine_03',
  Neck: 'neck_01', Head: 'head', LeftShoulder: 'clavicle_l', RightShoulder: 'clavicle_r',
  LeftArm: 'upperarm_l', RightArm: 'upperarm_r', LeftForeArm: 'lowerarm_l', RightForeArm: 'lowerarm_r',
  LeftHand: 'hand_l', RightHand: 'hand_r', LeftUpLeg: 'thigh_l', RightUpLeg: 'thigh_r',
  LeftLeg: 'calf_l', RightLeg: 'calf_r', LeftFoot: 'foot_l', RightFoot: 'foot_r',
  LeftToeBase: 'ball_l', RightToeBase: 'ball_r',
};
for (const [side, suffix] of [['Left','l'], ['Right','r']]) {
  for (const finger of ['Thumb','Index','Middle','Ring','Pinky']) {
    for (let i = 1; i <= 3; i++) mapping[`${side}Hand${finger}${i}`] = `${finger.toLowerCase()}_0${i}_${suffix}`;
  }
}

/** Sample authored source motion and aim target bones in world space.
 * Preserves target limb lengths and avoids assuming compatible local bone axes. */
export function retargetLibraryMotion(target: Object3D, source: Object3D, clip: AnimationClip, name: string) {
  const working = clone(target);
  const sourceCopy = source.clone(true);
  const pairs: { target: Bone; original: Object3D; source: Object3D; child: Object3D; sourceChild: Object3D; rest: Quaternion; values: number[] }[] = [];
  const boneMap = new Map<string, Bone>();
  working.traverse((node) => {
    if (!(node as Bone).isBone) return;
    const key = Object.keys(mapping).find((suffix) => node.name.endsWith(suffix));
    if (key) boneMap.set(key, node as Bone);
  });
  working.traverse((node) => {
    const key = [...boneMap].find(([, bone]) => bone === node)?.[0];
    if (!key) return;
    const s = sourceCopy.getObjectByName(mapping[key]);
    const child = node.children.find((child) => [...boneMap.values()].includes(child as Bone));
    const childKey = [...boneMap].find(([, bone]) => bone === child)?.[0];
    const sc = childKey ? sourceCopy.getObjectByName(mapping[childKey]) : undefined;
    const original = target.getObjectByName(node.name);
    if (s && child && sc && original) pairs.push({target: node as Bone, original, source: s, child, sourceChild: sc, rest: node.quaternion.clone(), values: []});
  });
  if (pairs.length < 10) return undefined;
  const mixer = new AnimationMixer(sourceCopy);
  const action = mixer.clipAction(clip).setLoop(LoopOnce, 1);
  action.clampWhenFinished = true; action.play();
  const samples = Math.max(2, Math.ceil(clip.duration * 24));
  const times: number[] = [];
  const from = new Vector3(), to = new Vector3(), origin = new Vector3();
  const delta = new Quaternion(), parent = new Quaternion();
  for (let frame = 0; frame <= samples; frame++) {
    const time = Math.min(clip.duration - .00001, frame * clip.duration / samples);
    times.push(Math.max(0, time)); mixer.setTime(Math.max(0, time)); sourceCopy.updateMatrixWorld(true);
    for (const pair of pairs) pair.target.quaternion.copy(pair.rest);
    working.updateMatrixWorld(true);
    for (const pair of pairs) {
      pair.target.getWorldPosition(origin);
      from.copy(pair.child.getWorldPosition(from)).sub(origin).normalize();
      pair.source.getWorldPosition(origin);
      to.copy(pair.sourceChild.getWorldPosition(to)).sub(origin).normalize();
      if (from.lengthSq() && to.lengthSq()) {
        delta.setFromUnitVectors(from, to);
        pair.target.parent!.getWorldQuaternion(parent).normalize();
        pair.target.quaternion.copy(parent.clone().invert().multiply(delta).multiply(parent).multiply(pair.rest)).normalize();
        pair.target.updateWorldMatrix(false, true);
      }
      pair.target.quaternion.toArray(pair.values, pair.values.length);
    }
  }
  mixer.stopAllAction(); mixer.uncacheRoot(sourceCopy);
  return new AnimationClip(name, clip.duration, pairs.map((pair) => new QuaternionKeyframeTrack(`${pair.original.uuid}.quaternion`, times, pair.values)));
}
