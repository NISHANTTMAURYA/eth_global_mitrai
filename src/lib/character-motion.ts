import { AnimationClip, Bone, Object3D, Quaternion, QuaternionKeyframeTrack, Vector3 } from 'three';

/** Build small, in-place motions using each rig's own rest pose and bone axes. */
export function createCompanionClips(root: Object3D): AnimationClip[] {
  root.updateMatrixWorld(true);
  const bones: Bone[] = [];
  root.traverse((node) => {
    if ((node as Bone).isBone) bones.push(node as Bone);
  });
  const find = (suffix: string) =>
    bones.find((b) => b.name.toLowerCase().endsWith(suffix.toLowerCase()));
  const arm = find('LeftArm');
  const forearm = find('LeftForeArm');
  const other = find('RightArm');
  const head = find('Head');
  const spine = find('Spine2');
  const hand = find('LeftHand');
  if (!arm || !other || !head) return [];
  const worldZ = new Vector3(0, 0, 1);
  function turn(bone: Bone, axis: Vector3, angle: number, base = bone.quaternion) {
    const parent = bone.parent!.getWorldQuaternion(new Quaternion());
    const localAxis = axis.clone().applyQuaternion(parent.invert());
    return new Quaternion()
      .setFromAxisAngle(localAxis.normalize(), angle)
      .multiply(base)
      .normalize();
  }
  function relaxed(bone: Bone) {
    const child = bone.children.find((b) => (b as Bone).isBone);
    if (!child) return bone.quaternion.clone();
    const direction = child
      .getWorldPosition(new Vector3())
      .sub(bone.getWorldPosition(new Vector3()))
      .normalize();
    const target = new Vector3(direction.x > 0 ? 0.25 : -0.25, -1, 0).normalize();
    const parent = bone.parent!.getWorldQuaternion(new Quaternion());
    const delta = new Quaternion().setFromUnitVectors(direction, target);
    return parent
      .clone()
      .invert()
      .multiply(delta)
      .multiply(parent)
      .multiply(bone.quaternion)
      .normalize();
  }
  const leftRest = relaxed(arm),
    rightRest = relaxed(other);
  const times = Array.from({ length: 61 }, (_, i) => i / 15);
  function build(name: string, wave: boolean) {
    const tracks: QuaternionKeyframeTrack[] = [];
    for (const bone of [arm!, other!, head!, spine, hand].filter((b): b is Bone => !!b)) {
      const values: number[] = [];
      for (const t of times) {
        const envelope = wave
          ? Math.sin((Math.PI * Math.min(1, t / 0.65)) / 2) *
            Math.sin((Math.PI * Math.min(1, (4 - t) / 0.65)) / 2)
          : 0;
        let q = bone.quaternion.clone();
        if (bone === arm) {
          const raised = turn(bone, worldZ, 0.45);
          q = leftRest.clone().slerp(raised, envelope);
        } else if (bone === other) q = rightRest;
        else if (bone === hand) q = turn(bone, worldZ, envelope * Math.sin(t * 10) * 0.4);
        else if (bone === head) q = turn(bone, worldZ, Math.sin((t * Math.PI) / 2) * 0.035);
        else q = turn(bone, new Vector3(1, 0, 0), Math.sin((t * Math.PI) / 2) * 0.018);
        values.push(q.x, q.y, q.z, q.w);
      }
      tracks.push(new QuaternionKeyframeTrack(`${bone.uuid}.quaternion`, times, values));
    }
    return new AnimationClip(name, 4, tracks);
  }
  const idle = build('CompanionIdle', false);
  if (!forearm || !hand) return [idle];
  // Solve the greeting from world-space limb directions, including a bent elbow.
  // A fixed rotation of a T-pose arm leaves thin rigs (Carrot) pointing sideways.
  const animated = [arm, forearm, hand, other];
  const original = animated.map((bone) => bone.quaternion.clone());
  const values = animated.map(() => [] as number[]);
  const side =
    Math.sign(arm.getWorldPosition(new Vector3()).x - head.getWorldPosition(new Vector3()).x) || -1;
  function aim(bone: Bone, child: Bone, direction: Vector3) {
    root.updateMatrixWorld(true);
    const from = child
      .getWorldPosition(new Vector3())
      .sub(bone.getWorldPosition(new Vector3()))
      .normalize();
    const parent = bone.parent!.getWorldQuaternion(new Quaternion());
    const rotation = new Quaternion().setFromUnitVectors(from, direction.normalize());
    bone.quaternion.premultiply(parent.clone().invert().multiply(rotation).multiply(parent));
  }
  for (const t of times) {
    animated.forEach((bone, i) => bone.quaternion.copy(original[i]));
    root.updateMatrixWorld(true);
    const envelope = Math.min(1, t / 0.65, (4 - t) / 0.65);
    aim(arm, forearm, new Vector3(side * 0.8, 0.25, 0));
    const raisedArm = arm.quaternion.clone();
    arm.quaternion.copy(leftRest).slerp(raisedArm, envelope);
    aim(forearm, hand, new Vector3(side * (0.15 + Math.sin(t * 9) * 0.2), 1, 0.1));
    const raisedElbow = forearm.quaternion.clone();
    forearm.quaternion.copy(original[1]).slerp(raisedElbow, envelope);
    other.quaternion.copy(rightRest);
    animated.forEach((bone, i) => bone.quaternion.toArray(values[i], values[i].length));
  }
  animated.forEach((bone, i) => bone.quaternion.copy(original[i]));
  root.updateMatrixWorld(true);
  const wave = new AnimationClip(
    'CompanionWave',
    4,
    animated.map(
      (bone, i) => new QuaternionKeyframeTrack(`${bone.uuid}.quaternion`, times, values[i]),
    ),
  );
  return [idle, wave];
}

export function companionAction(names: string[], kind: 'idle' | 'greeting') {
  const preferences =
    kind === 'idle'
      ? ['LibraryIdle', 'CompanionIdle', 'Idle', 'idle', 'Survey']
      : [
          'CompanionWave',
          'Wave',
          'wave',
          'Yes',
          'emote-yes',
          'Victory',
          'Idle_2',
          'walk',
          'Survey',
        ];
  return preferences.find((name) => names.includes(name));
}
