# Conversational character experience

Implemented November 6, 2026.

## Behaviour

Automatic speech starts enabled and remembers an explicit mute choice. Sending a message resumes a Web Audio context during the user interaction; generated audio uses that context, rather than relying on delayed HTML media autoplay. Playback failure is visible and text remains available.

Vertex returns a schema-constrained turn of one to three message bubbles. The prompt calls for concise, character-specific language, at most one follow-up question per turn, optional personality-appropriate emojis, and no invented memories or physical observations. Emojis remain visible but are removed from speech. Output is validated again on the server. Unavailable gestures and invalid word indices are discarded. Public audition privacy and lifecycle checks remain intact.

Each bubble is delivered in order. Speech and the optional gesture both finish before the following bubble appears. A new user message cancels the current performance. A mute stops current audio; subsequent messages still arrive. Owner history stores all bubbles and their validated gesture metadata.

The AI receives only the supported animation names for the model family. Imported numbered humanoids expose Wave, Dance, Charleston, Clap, Bow and Think; VRM exposes its procedural Wave, Dance and Bow; robot exposes its embedded emotes. Other models currently have no AI gesture tools. Unsupported animations never substitute arbitrary movement.

Conversation stages do not run showcase animation cycles. Speech without a directed cue uses a quiet idle with lip sync. An explicit cue starts a one-shot gesture; imported humanoids use an upright generated wave, rather than the greeting asset's torso lean. Completion comes from the animation mixer's finished event, followed by the fade back to idle. Offscreen/unloaded stages skip the animation wait to keep chat progressing.

## Word timing choice and limitation

Rhubarb's JSON contains mouth cues, not word timestamps. Rather than pretend those are word alignment, split speech at the selected whitespace word index, synthesize both pieces, and trigger the gesture when playback of the second piece starts. This anchors the gesture at that segment's audio boundary; provider leading silence can still offset the audible word. Speech splitting can introduce a prosody break. True seamless word-level gestures need a TTS provider with word boundary events or a forced word aligner. One optional cue per bubble keeps the current implementation bounded.

The turn is generated before bubble delivery; this is paced delivery, not token streaming. Each bubble's speech is buffered before playback. These limitations should be addressed with sentence streaming, measured synthesis latency, and prefetching before adding more visual effects.

## Next product work

1. Measure submit-to-first-bubble, submit-to-first-audio, synthesis errors and cancellation correctness without logging private transcripts.
2. Add streaming inference plus sentence audio prefetch, preserving ordered playback and cancellation.
3. Evaluate natural voice output and word-aligned gestures in each supported language. Do not assume English Rhubarb timings validate multilingual articulation.
4. Review every gesture on each skeleton for posture, feet sliding and clipping. Supported model families still require visual QA, particularly energetic dance motions.
5. Evaluate personality consistency over longer conversations with user-approved memories, minimal repetitive questions, and controllable voice/animation intensity.

## Primary sources researched

- Chrome autoplay policy: https://developer.chrome.com/blog/autoplay — user activation and resumed AudioContext design.
- Vertex structured output: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output — response MIME type and response schema.
- Rhubarb implementation and output documentation: https://github.com/DanielSWolf/rhubarb-lip-sync — mouth-cue timestamps and transcript-assisted analysis; no word timing contract.
- Three.js AnimationMixer events: https://threejs.org/docs/#api/en/animation/AnimationMixer — one-shot completion events rather than guessed durations.

## Verification

Live Vertex request returned two short bubbles and Wave on the greeting word. Reply validation, unavailable-animation rejection, speech segmentation, local audio generation and lip cue tests passed. Authenticated API journey and private speech endpoint integration passed. Production build and TypeScript passed using an isolated build database (the live shared SQLite database locked during the first build attempt). Browser tests on Cactus displayed two distinct replies with automatic speech enabled. The upright generated wave was visually checked. An isolated production preview using local speech completed the short two-message greeting without a playback error. The configured live voice service returned a fetch failure in the development session, so natural-provider reliability/quality remains unverified. All rigs/languages are not exhaustively verified. SQLite initialization can race across build workers; verification used a pre-initialized isolated database, and a busy timeout now tolerates ordinary writer contention.
