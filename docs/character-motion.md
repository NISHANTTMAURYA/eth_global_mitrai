# Character motion

## Current library integration

Refinement: the default idle is the upright local CompanionIdle rather than the transferred source idle. Pelvis rotation is excluded from motion transfer, and source/target left-right facing is aligned. All visible living models periodically showcase their supported nonterminal animations, then return to idle; the interval is at least nine seconds and includes at least four seconds beyond the longest clip. Manual controls interrupt. Legacy playback remains stopped. VRM characters cycle procedural wave, dance sway and bow. Framing uses an aspect-aware box for idle/current gesture, measured in model space, to avoid shrinking characters to accommodate every animation at once.

The ten Mixamo-style imported humanoids now use authored Mesh2Motion CC0 clips: idle-subtle, greeting, dance-simple, dance-charleston, clapping, bow and confused. Local GLBs and the upstream licence live in public/animations/mesh2motion. This replaces the earlier simple generated greeting for those rigs. Quaternius Universal Animation Library was also researched; Mesh2Motion provides direct GLBs and explicit CC0 licensing for this integration.

Bone mappings connect Mixamo suffixes to Mesh2Motion's skeleton. The retargeter samples the source animation, transfers bone directions in world space and reconstructs target-local quaternions, preserving target limb lengths and omitting root translation. It covers arms, elbows, hands, fingers, spine, head and legs. This direction-based transfer does not reproduce every axial twist of full motion capture; different proportions can still need visual tuning.

Use the character toolbar for Hi, Dance, Charleston, Clap, Bow and Think. Other models retain their embedded or VRM gestures. Card scale leaves additional gesture margin. The shared motion loader caches downloads and uses MeshoptDecoder.

Tests decode the actual compressed source GLBs and retarget all seven clips onto all ten imported skeletons, checking finite tracks, playback and bent elbows during greeting. An isolated build and typecheck pass. Rendered motion remains unverified under the existing browser preview restriction.

Rigging gives a mesh joints and weights; it still needs motion tracks. Three.js stores those in AnimationClips and plays/blends them with AnimationMixer.

The ten imported Mixamo-style humanoids without clips now receive locally authored `CompanionIdle` and `CompanionWave` clips at load time. Tracks are generated against the cloned rig's actual bone UUIDs and rest quaternions. World directions are converted into each parent's local space. Arms relax from T-pose; the head/chest have small repeating movement; greeting raises the left arm and moves its wrist, then returns to idle. Original GLB files remain unchanged.

Models with embedded animations keep those animations. Greeting resolves to Wave, Yes, emote-yes, Victory, Idle_2, walk or Survey, depending on the available clips. Animals play a body greeting rather than a human wave. Attack/death are never substituted for greeting. The VRM humanoid keeps its normalized-bone gesture code. Legacy characters remain motionless.

Research:
- [Three.js animation system](https://threejs.org/manual/pages/animation-system.html): clips, bone tracks, blending and mixers.
- [QuaternionKeyframeTrack](https://threejs.org/docs/pages/QuaternionKeyframeTrack.html): quaternion animation tracks used here.
- [SkeletonUtils](https://threejs.org/docs/pages/module-SkeletonUtils): safe skeleton cloning and retargetClip. Retargeting an external motion requires mapping source/target bones and matching rest poses; it is not automatic for arbitrary rigs.

Verification: actual GLB node hierarchies from all ten static humanoids are reconstructed in tests; mixer playback moves the arm, yields finite tracks and returns to idle. Greeting selection excludes combat clips. Typecheck and an isolated production build pass. Visual deformation and motion quality in browser remain unverified.
