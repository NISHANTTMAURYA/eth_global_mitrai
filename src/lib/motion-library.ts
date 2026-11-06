import {
  AnimationClip,
  AnimationMixer,
  Bone,
  LoopOnce,
  Object3D,
  Quaternion,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
  Vector3,
} from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

export const libraryMotions = [
  ['idle-subtle', 'LibraryIdle'],
  ['greeting', 'Wave'],
  ['dance-simple', 'Dance'],
  ['dance-charleston', 'Charleston'],
  ['clapping', 'Clap'],
  ['bow', 'Bow'],
  ['confused', 'Think'],
  ['jump-2', 'Jump'],
  ['dance-arm-pump', 'ArmPump'],
  ['dance-body-roll', 'BodyRoll'],
  ['dance-reach-hip', 'HipDance'],
  ['sitting-enter', 'SitEnter'],
  ['sitting-idle', 'SitIdle'],
  ['sitting-exit', 'SitExit'],
] as const;

const mapping: Record<string, string> = {
  Hips: 'pelvis',
  Spine: 'spine_01',
  Spine1: 'spine_02',
  Spine2: 'spine_03',
  Neck: 'neck_01',
  Head: 'head',
  LeftShoulder: 'clavicle_l',
  RightShoulder: 'clavicle_r',
  LeftArm: 'upperarm_l',
  RightArm: 'upperarm_r',
  LeftForeArm: 'lowerarm_l',
  RightForeArm: 'lowerarm_r',
  LeftHand: 'hand_l',
  RightHand: 'hand_r',
  LeftUpLeg: 'thigh_l',
  RightUpLeg: 'thigh_r',
  LeftLeg: 'calf_l',
  RightLeg: 'calf_r',
  LeftFoot: 'foot_l',
  RightFoot: 'foot_r',
  LeftToeBase: 'ball_l',
  RightToeBase: 'ball_r',
};
for (const [side, suffix] of [
  ['Left', 'l'],
  ['Right', 'r'],
]) {
  for (const finger of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) {
    for (let i = 1; i <= 3; i++)
      mapping[`${side}Hand${finger}${i}`] = `${finger.toLowerCase()}_0${i}_${suffix}`;
  }
}

/** Sample authored source motion and aim target bones in world space.
 * Preserves target limb lengths and avoids assuming compatible local bone axes. */
export function retargetLibraryMotion(
  target: Object3D,
  source: Object3D,
  clip: AnimationClip,
  name: string,
) {
  const working = clone(target);
  const sourceCopy = source.clone(true);
  const pairs: {
    key: string;
    target: Bone;
    original: Object3D;
    source: Object3D;
    child: Object3D;
    sourceChild: Object3D;
    rest: Quaternion;
    values: number[];
  }[] = [];
  const boneMap = new Map<string, Bone>();
  working.traverse((node) => {
    if (!(node as Bone).isBone) return;
    const key = Object.keys(mapping).find((suffix) => node.name.endsWith(suffix));
    if (key) boneMap.set(key, node as Bone);
  });
  working.traverse((node) => {
    const key = [...boneMap].find(([, bone]) => bone === node)?.[0];
    if (!key || key === 'Hips') return; // Keep the character's stable, forward-facing root.
    const s = sourceCopy.getObjectByName(mapping[key]);
    const child = node.children.find((child) => [...boneMap.values()].includes(child as Bone));
    const childKey = [...boneMap].find(([, bone]) => bone === child)?.[0];
    const sc = childKey ? sourceCopy.getObjectByName(mapping[childKey]) : undefined;
    const original = target.getObjectByName(node.name);
    if (s && child && sc && original)
      pairs.push({
        key,
        target: node as Bone,
        original,
        source: s,
        child,
        sourceChild: sc,
        rest: node.quaternion.clone(),
        values: [],
      });
  });
  if (pairs.length < 10) return undefined;
  const mixer = new AnimationMixer(sourceCopy);
  const action = mixer.clipAction(clip).setLoop(LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  const rootBone = boneMap.get('Hips');
  const sourceRoot = sourceCopy.getObjectByName('pelvis');
  const restPosition = rootBone?.position.clone();
  const sourceRest = sourceRoot?.getWorldPosition(new Vector3());
  const rootPositions: number[] = [];
  const heightRatio =
    rootBone && sourceRoot
      ? Math.max(0.01, Math.abs(rootBone.getWorldPosition(new Vector3()).y)) /
        Math.max(0.01, Math.abs(sourceRoot.getWorldPosition(new Vector3()).y))
      : 1;
  const samples = Math.max(2, Math.ceil(clip.duration * 24));
  const times: number[] = [];
  const from = new Vector3(),
    to = new Vector3(),
    origin = new Vector3();
  const delta = new Quaternion(),
    parent = new Quaternion();
  working.updateMatrixWorld(true);
  sourceCopy.updateMatrixWorld(true);
  const targetLeft = boneMap.get('LeftArm')?.getWorldPosition(new Vector3()).x || -1;
  const sourceLeft =
    sourceCopy.getObjectByName('upperarm_l')?.getWorldPosition(new Vector3()).x || 1;
  const facing = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    targetLeft * sourceLeft < 0 ? Math.PI : 0,
  );
  for (let frame = 0; frame <= samples; frame++) {
    const time = Math.min(clip.duration - 0.00001, (frame * clip.duration) / samples);
    times.push(Math.max(0, time));
    mixer.setTime(Math.max(0, time));
    sourceCopy.updateMatrixWorld(true);
    if (rootBone && sourceRoot && restPosition && sourceRest) {
      const rise = (sourceRoot.getWorldPosition(new Vector3()).y - sourceRest.y) * heightRatio;
      const position = rootBone.getWorldPosition(new Vector3()).add(new Vector3(0, rise, 0));
      rootBone.parent!.worldToLocal(position);
      // World-space vertical displacement survives differently oriented source rigs.
      rootPositions.push(position.x, position.y, position.z);
    }
    for (const pair of pairs) pair.target.quaternion.copy(pair.rest);
    working.updateMatrixWorld(true);
    for (const pair of pairs) {
      // Stabilize the torso before solving the arms. Dropping spine tracks afterwards
      // leaves arm rotations compensated for a torso pose that never actually plays.
      const spine = /^Spine/.test(pair.key);
      const limit = spine
        ? ((['Wave', 'Think', 'Clap', 'LibraryIdle'].includes(name) ? 0 : name === 'Bow' ? 25 : 4) *
            Math.PI) /
          180
        : Infinity;
      if (limit === 0) {
        pair.target.quaternion.toArray(pair.values, pair.values.length);
        continue;
      }
      pair.target.getWorldPosition(origin);
      from.copy(pair.child.getWorldPosition(from)).sub(origin).normalize();
      pair.source.getWorldPosition(origin);
      to.copy(pair.sourceChild.getWorldPosition(to))
        .sub(origin)
        .normalize()
        .applyQuaternion(facing);
      if (from.lengthSq() && to.lengthSq()) {
        delta.setFromUnitVectors(from, to);
        pair.target.parent!.getWorldQuaternion(parent).normalize();
        pair.target.quaternion
          .copy(parent.clone().invert().multiply(delta).multiply(parent).multiply(pair.rest))
          .normalize();
        if (spine) {
          const angle = pair.rest.angleTo(pair.target.quaternion);
          if (angle > limit)
            pair.target.quaternion.copy(
              pair.rest.clone().slerp(pair.target.quaternion, limit / angle),
            );
        }
        pair.target.updateWorldMatrix(false, true);
      }
      pair.target.quaternion.toArray(pair.values, pair.values.length);
    }
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(sourceCopy);
  const tracks = pairs
    .filter((pair) => name !== 'Wave' || /Arm|Hand|Shoulder/.test(pair.original.name))
    .map(
      (pair) => new QuaternionKeyframeTrack(`${pair.original.uuid}.quaternion`, times, pair.values),
    );
  return new AnimationClip(name, clip.duration, [
    ...tracks,
    ...(rootBone &&
    rootPositions.length &&
    ['Jump', 'SitEnter', 'SitIdle', 'SitExit'].includes(name)
      ? [
          new VectorKeyframeTrack(
            `${target.getObjectByName(rootBone.name)!.uuid}.position`,
            times,
            rootPositions,
          ),
        ]
      : []),
  ]);
}

/** One complete sit-down, short seated pause, and stand-up performance. */
export function seatedSequence(clips: AnimationClip[]): AnimationClip | undefined {
  const parts = ['SitEnter', 'SitIdle', 'SitExit'].map((name) =>
    clips.find((c) => c.name === name),
  );
  if (parts.some((part) => !part)) return;
  const combined = new Map<
    string,
    { track: import('three').KeyframeTrack; times: number[]; values: number[] }
  >();
  let offset = 0;
  for (const part of parts) {
    for (const track of part!.tracks) {
      const entry = combined.get(track.name) || { track, times: [], values: [] };
      for (let i = 0; i < track.times.length; i++) {
        const time = offset + track.times[i];
        if (entry.times.length && time <= entry.times.at(-1)!) continue;
        entry.times.push(time);
        entry.values.push(
          ...track.values.slice(i * track.getValueSize(), (i + 1) * track.getValueSize()),
        );
      }
      combined.set(track.name, entry);
    }
    offset += part!.duration;
  }
  return new AnimationClip(
    'Sit',
    offset,
    [...combined.values()].map(({ track, times, values }) =>
      track instanceof VectorKeyframeTrack
        ? new VectorKeyframeTrack(track.name, times, values)
        : new QuaternionKeyframeTrack(track.name, times, values),
    ),
  );
}
