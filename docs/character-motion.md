# Character motion

Rigging gives a mesh joints and weights; it still needs motion tracks. Three.js stores those in AnimationClips and plays/blends them with AnimationMixer.

The ten imported Mixamo-style humanoids without clips now receive locally authored `CompanionIdle` and `CompanionWave` clips at load time. Tracks are generated against the cloned rig's actual bone UUIDs and rest quaternions. World directions are converted into each parent's local space. Arms relax from T-pose; the head/chest have small repeating movement; greeting raises the left arm and moves its wrist, then returns to idle. Original GLB files remain unchanged.

Models with embedded animations keep those animations. Greeting resolves to Wave, Yes, emote-yes, Victory, Idle_2, walk or Survey, depending on the available clips. Animals play a body greeting rather than a human wave. Attack/death are never substituted for greeting. The VRM humanoid keeps its normalized-bone gesture code. Legacy characters remain motionless.

Research:
- [Three.js animation system](https://threejs.org/manual/pages/animation-system.html): clips, bone tracks, blending and mixers.
- [QuaternionKeyframeTrack](https://threejs.org/docs/pages/QuaternionKeyframeTrack.html): quaternion animation tracks used here.
- [SkeletonUtils](https://threejs.org/docs/pages/module-SkeletonUtils): safe skeleton cloning and retargetClip. Retargeting an external motion requires mapping source/target bones and matching rest poses; it is not automatic for arbitrary rigs.

Verification: actual GLB node hierarchies from all ten static humanoids are reconstructed in tests; mixer playback moves the arm, yields finite tracks and returns to idle. Greeting selection excludes combat clips. Typecheck and an isolated production build pass. Visual deformation and motion quality in browser remain unverified.
