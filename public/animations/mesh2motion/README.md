# Mesh2Motion CC0 motion library

Downloaded 6 November 2026 from the author's repository:
https://github.com/Mesh2Motion/mesh2motion-app/tree/main/static/assets/human/animations

Original filenames: idle-subtle.glb, greeting.glb, dance-simple.glb,
dance-charleston.glb, clapping.glb, bow.glb, confused.glb.
skeleton.glb is an additional reference rig from static/assets/human/skeleton.glb.

The author's README explicitly licenses art assets (models, rigs and animations)
as CC0: https://github.com/Mesh2Motion/mesh2motion-app#licenses
The upstream CC0 licence is preserved in LICENSE-CC0.MD.

Runtime names: LibraryIdle, Wave, Dance, Charleston, Clap, Bow, Think.
Assets use EXT_meshopt_compression; Three.js MeshoptDecoder is configured.
These are authored animation assets, not AI-generated motion.

Additional motions imported 6 November 2026 from the same official CC0 asset directory:
jump-2.glb, sitting-enter.glb, sitting-idle.glb, sitting-exit.glb,
dance-arm-pump.glb, dance-body-roll.glb, dance-reach-hip.glb.
Runtime tools: Jump, Sit (enter → idle → exit), ArmPump, BodyRoll, HipDance.
Vertical pelvis motion is retained for jump and sit; horizontal displacement is suppressed.
