# Explore model caching and rendering

6 November 2026

The previous intersection observer condition removed each Canvas when its card left the viewport. On return, it reconstructed the canvas, cloned the skeleton, rebuilt retargeted animations and reframed the model. The per-stage loader instance also prevented normal GLTF cache sharing between non-VRM stages.

Explore now uses one hidden WebGL renderer with Drei View scissor regions. Each visible view is copied at up to 30 FPS into a lightweight 2D canvas physically inside its card. Card CSS clips those pixels and the browser compositor moves them with the card, avoiding the scroll drift of a fixed visible WebGL overlay. Each card initializes once when first approached, remains mounted afterward, and is skipped by the renderer while offscreen. Its animation mixer and procedural frame updates pause offscreen; interval gestures pause as well. This retains visited cards without accumulating a GPU context per card.

New scene initialization is serialized. Cancelled offscreen requests are dropped from the queue, ready scenes release their slot after a short paint opportunity, and failed/unmounted stages release their slot. Non-VRM stages share a GLTF loader and parsed-asset cache; Three's file cache reuses raw model bytes. VRM instances keep independent controllers and poses.

Gallery previews retarget only Dance, Think and Clap, along with their generated idle and wave. They use a lower pixel ratio, omit contact shadows, and measure a single standing-idle frame. Detail pages keep the full motion library, close portrait option and their higher pixel ratio. Cache lifetime is the current browser session; card scenes survive scrolling while explore stays mounted. Filtering a card out removes its scene, although its downloaded asset stays cached.

Validation: browser confirmed one GPU canvas and card-bound 2D previews, three ready card scenes remained mounted but inactive after scrolling down, and those same cards returned active/ready with zero loading indicators after scrolling back. A follow-up down/up scroll test verified clipped card previews after correcting the initial overlay scroll issue. Load-queue tests cover concurrency, cancellation and idempotent release. Existing bounds and retargeting tests pass. No cross-device FPS claim is made.

Primary implementation references:
- https://r3f.docs.pmnd.rs/advanced/scaling-performance
- Installed Drei View implementation, version 10.7.9, node_modules/@react-three/drei/web/View.js
