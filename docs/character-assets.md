# Character asset sources and animation integration

Downloaded 6 November 2026. Two primary rigged characters plus one optional animal were downloaded from upstream repositories, and their GLB JSON chunks were inspected. Exact sources, sizes, SHA-256 digests, skins, animations, morphs and joints are in `public/models/manifest.json`; a compact integration map is in `public/models/integration.json`.

## Primary 1 — RobotExpressive

- File: `public/models/robot-expressive.glb` (463,988 bytes).
- Source: [three.js original model](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/RobotExpressive).
- Model by Tomás Laulhé (Quaternius); facial morphs/conversion and material cleanup by Don McCurdy. CC0 1.0, verified in the upstream README and [official animation example](https://threejs.org/examples/webgl_animation_skinning_morph.html).
- 2 skinned meshes reference 43-joint skeletons. Includes hand/finger joints and 14 clips: Dance, Death, Idle, Jump, No, Punch, Running, Sitting, Standing, ThumbsUp, Walking, WalkJump, Wave, Yes.
- Three facial morphs: `Angry`, `Surprised`, `Sad` on the Head mesh. These are expressions, not a phoneme/viseme set.
- Recommended: loop Idle; crossfade to Wave or ThumbsUp once and return to Idle; Dance can loop while explicitly selected. Keep facial values independent of body clips.
- Speech can drive a restrained Surprised envelope and head movement. This is approximate expressive speaking motion, not accurate lip sync. Do not label it phoneme-accurate.

## Primary 2 — pixiv VRM 1.0 sample

- File: `public/models/pixiv-sample.vrm` (10,776,032 bytes). VRM is binary glTF with VRM extensions.
- Source: [official VRM Consortium sample](https://github.com/vrm-c/vrm-specification/tree/master/samples/VRM1_Constraint_Twist_Sample).
- Copyright 2022 pixiv Inc.; [VRM Public License 1.0](https://vrm.dev/licenses/1.0/) with embedded settings. The file permits avatar use by everyone, commercial use including corporations, redistribution, modification and modified redistribution. It disallows antisocial/hate usage. Full embedded settings retained in `public/models/licenses/pixiv-meta.json`; license page and source README retained alongside it. Do not relabel this model MIT/CC0 or claim exclusive rights to its appearance.
- Full humanoid skeleton with finger joints; no embedded body animation clips.
- Head: `J_Bip_C_Head`; neck: `J_Bip_C_Neck`; arms: `J_Bip_L_UpperArm`, `J_Bip_L_LowerArm`, `J_Bip_L_Hand` and matching `_R_` names.
- Face morphs include actual vowel shapes `Face_Blendshape.Fcl_MTH_A`, `_I`, `_U`, `_E`, `_O`. Face mesh has 57 targets. VRM presets map aa→36, ih→37, ou→38, ee→39, oh→40, blink→12. Prefer lookup by morph name rather than hard-coding indices.
- Recommended body animation: save bind-pose rotations, then procedurally apply a relaxed arm pose, breathing, gentle head movement and bounded hand wave. Restore baseline rotations when state changes so offsets never accumulate.
- For full VRM rendering use `@pixiv/three-vrm`'s GLTFLoader plugin, `vrm.expressionManager.setValue('aa', value)` and `vrm.update(delta)`. See [official expression manager](https://pixiv.github.io/three-vrm/docs/classes/three-vrm.VRMExpressionManager.html). Look-at, springbones and MToon require the VRM runtime rather than plain GLTFLoader.
- Plain GLTFLoader can access the skeleton and morphs directly, but ignores VRM behaviors/material extensions. Test visible materials and orientation before shipping; normalize the model's bounds with a parent group rather than rewriting bone bind transforms. SkeletonUtils cloning is required for independent simultaneous skinned instances.

## Optional — Fox

- File: `public/models/fox.glb` (162,852 bytes).
- Source: [Khronos Fox](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox).
- Model by PixelMannen, CC0; rigging/animation by tomkranis and glTF conversion by AsoboStudio/scurest, CC BY 4.0. Preserve these credits and license link in app credits.
- One 24-joint rig, clips `Survey`, `Walk`, `Run`; head `b_Head_05`, neck `b_Neck_04`, tail `b_Tail01_012` etc.
- No jaw bone and no face/mouth morphs. It can gesture with head/tail and animate its body, but it cannot support mouth lip sync without additional authored geometry/rigging. Use as optional creature, not a substitute for the vowel-ready humanoid.

## Speech timing and hand motion research

- [Three.js skinning/morph example](https://threejs.org/examples/webgl_animation_skinning_morph.html): separate looping state clips from one-shot actions, with crossfades and independent morph weights.
- [Three.js animation system](https://threejs.org/docs/#api/en/animation/AnimationMixer): one mixer per independently animated instance; update by frame delta and release listeners/actions on unmount. Finish events should return a one-shot gesture to idle.
- [Web Speech boundary event](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/boundary_event): word/sentence boundary callbacks can align approximate vowel animation with speech, but support is limited across browsers. Handle start/end/error/cancel and reset mouth weights. Word timing is not phoneme timing.
- [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync): produces timed mouth-shape cues from prerecorded speech. For a future audio-returning TTS path, translate those cues to the humanoid vowel/mouth targets and sample against audio playback time. It is not automatically a runtime browser feature.

For this MVP, label browser-speech vowel estimation as approximate. Exact phoneme lip sync needs appropriate cue generation and authored viseme mappings. Do not use a fake microphone/audio analysis value or claim model playback that did not occur.

## Asset and marketplace boundary

Persona state can be transferred in the app, but these bundled meshes remain third-party licensed, non-exclusive assets. A purchaser does not gain exclusive copyright over a public sample model. Retain upstream notices and comply with each model's own terms independently from the application code license.
