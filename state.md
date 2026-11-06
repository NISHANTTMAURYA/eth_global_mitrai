# MitrAI implementation state

Updated 6 November 2026. Project: `/Users/nishantmaurya/eth_global_mitrai`.

## Implemented

- Next.js 16 / React 19 local app, cream solid-color light interface, desktop/tablet/mobile media layouts.
- Discovery-first landing/gallery; search, tags, adoption availability and legacy collection.
- Three-step draft → personality → lifetime activation flow, with one active character per account and a ten-minute creation cooldown after handover.
- Two primary rigged bodies: expressive robot and vowel-ready humanoid; optional fox. Embedded robot wave/dance, procedural humanoid wave/head/breathing, real audio-derived greeting cues and approximate dynamic browser speech.
- Durable local SQLite characters, private chats, approved public/private memories, habits and bounded deterministic checkpoints.
- Owner cultivation; isolated public auditions cannot learn or read private memories.
- Publishing, creator-approved highlights, enquiries, demo adoption and wallet handover preparation.
- Fixed 30-day or labeled ten-minute lifespan; server checks Sunset on interactive actions and derives legacy without a background job.
- Browser-wallet sign-in with single-use nonce; server sessions and origin checks.
- Configurable 0G inference with actual provider request IDs; explicit scripted demo when unconfigured.
- Arkiv SDK create/patch/read/query/transfer adapters; Ed25519-signed public snapshots; pinned verifier, birth registry and ownership-epoch checks.
- Source/model/audio licenses, source manifests and sponsor documentation.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 14 unit/domain/signature/configuration/asset tests passed; HTTP tests intentionally run separately.
- `npm run build`: production build passed.
- `npm run test:integration`: two API suites passed against an isolated production server, exercising creation, limits, private/public memory, checkpoint, publishing, audition isolation, enquiries, wallet login, nonce replay rejection, handover, old-owner denial and expired-character denial.
- Model binaries parsed: both primary assets contain skeletons and facial targets; robot has Wave animation. Greeting cue intervals and audio existence validated.
- Browser UI/3D/responsive visual inspection: **blocked**. Browser permission gate reported declined access to localhost. No alternate surface or browser workaround used. Visual quality, actual rendered poses and audible browser speech remain unverified.
- Live Arkiv wallet transaction and 0G inference: **not executed**, credentials/user wallet approval not configured. Do not claim sponsor qualification evidence until a real run is captured.

## Run / resume

`npm ci`, then `npm run dev`; local URL is `http://localhost:3000`. The owned development server is stopped at handoff; restart with `npm run dev`. Use Connect → Try local demo, or configure live integrations as described in README.

`.data/` contains private local runtime state and the persisted signing key. Never commit or share it. Integration tests use an isolated temporary folder. Research PDFs remain local and ignored by Git; their bibliography and download scripts are tracked.

## Outstanding

- Browser/device visual QA and actual audio/render checks after preview access is available.
- Configure 0G and Rabdi access, fund a user-controlled test wallet, record writer addresses/entity keys/transactions and demonstrate second-wallet live handover.
- Hosted durable storage/Postgres migration, multi-instance locks/rate limits, encrypted-at-rest private storage and automated entity renewal/alerts for deployment beyond local demo.
- Optional World/Swarm integrations, actual payment settlement and arbitrary user model uploads remain unimplemented.
- Record real tester feedback; choose a sustainable lifespan and verify buyer interest rather than assuming scarcity creates demand.

## Commit loop

Review README/user flow/technical notes and current Arkiv rules → build → test → commit the passing local MVP. Commit identifier is recorded in Git history; no push or hosted deployment is claimed.

## Configuration follow-up

Corrected the default Arkiv transport to honor the access-key URL constructed by the SDK. Leave the custom RPC override blank unless needed. Added a regression test and `docs/configuration.md`; type checking and all 13 non-HTTP tests passed. No live calls executed.

## Testnet-only configuration

User requires zero real-money setup. Changed 0G default and configuration links to the officially documented testnet router and console. Faucet test 0G funds the testnet compute balance; Arkiv uses separate faucet test tGLM. Existing .env.local overrides must also be updated by the user. No faucet transaction or live inference has been executed.

## 3D loading race fix

Removed Drei Html from the model Suspense fallback after the reported React synchronous-root-unmount error. Loading text now stays in the existing page DOM outside Canvas; the loaded model signals readiness after commit. Browser reproduction remains unavailable under the earlier preview permission restriction.
### MitrAI Official Brand & Text Logo Integration
- Identified and extracted the dark MitrAI text logo from `notlonely` (`new1.jpg`, `new1.svg`):
  - Created high-resolution transparent dark text logo asset in `public/brand/mitrai-text-logo-dark.png` (3912×991) using deep ink `#003152` letterforms with signature teal/orange accents.
  - Also imported `mitrai-icon.svg` (emblem), `mitrai-logo.svg` (combined), and source masters.
- Added `MitraiTextLogo` component in `src/components/ui.tsx` pointing to the dark logo asset.
- Integrated both the MitrAI emblem and the dark MitrAI text logo in the site header navbar and site footer in `src/components/mitrai-app.tsx`.
- Added responsive styling for `.brand .mitrai-text-logo` in `src/app/globals.css`.
- Configured favicon and app icon at `src/app/icon.svg` and `public/favicon.svg`.

### Google Vertex AI Low-Latency Optimization
- Replaced the previous `gemini-3.8-flash` model with `gemini-3.1-flash-lite` in `src/lib/chat.ts` and `.env.local`.
- Disabled the default internal thinking token generation delay by setting `thinkingConfig: { thinkingBudget: 0 }`. Investigation proved that Gemini 3 flash reasoning defaulted to generating thousands of hidden thoughts, ballooning response times to ~111 seconds (111,465 ms). With `thinkingBudget: 0` and `gemini-3.1-flash-lite`, response latency dropped to ~900ms–1.8s (a ~58x speedup).
- Added client connection pooling via `getVertexClient(project, location)` to keep TLS handshakes and ADC OAuth token authentication warm across conversational turns instead of recreating client instances on each chat request.
- Verified live responses via tsx and integration test suites. Production build, typecheck, and all 25 unit/integration tests continue to pass cleanly.

### Latest implementation

- Google Vertex AI support is implemented in `src/lib/chat.ts` using `@google/genai` in Vertex mode (`gemini-3.8-flash` in `global` location) and is selected first when `GEMINI_USE_VERTEX=true` (or `GOOGLE_GENAI_USE_VERTEXAI=true`) with `GOOGLE_CLOUD_PROJECT`.
- Provider order is Google Vertex AI → optional 0G testnet → clearly labeled scripted demo.
- Authenticates using Google Cloud Application Default Credentials (ADC); Bedrock implementation and `@aws-sdk/client-bedrock-runtime` removed. Live inference verified with actual Vertex request ID.
- Sarvam AI Text-to-Speech (TTS) integration added with `bulbul:v3` model family across distinct speaker personas (`shubh`, `priya`, `simran`, `aditya`, `ishita`, `rohan`).
- Creators can choose their character's voice during creation or accept model-based smart defaults.
- Zero-credit voice preview architecture: pre-generated static audio clips in `public/audio/voices/` allow users to listen to default voice options without incurring API credits.
- Dynamic character speech via `/api/voice` route with local SHA-256 disk and memory caching to prevent credit burn on repeated sentences, falling back smoothly to browser speech synthesis if offline.
### Downloads character expansion

- Copied all 16 skeletal GLB models from Downloads into public/models/downloads; originals preserved.
- All are selectable through the shared model catalog and accepted by the creation API.
- Embedded Idle/idle clips play where available. Named vowel and blink morphs animate on compatible characters. Ten models have no embedded body animation; numeric facial targets require manual mapping.
- File structure, typecheck, tests and production build pass. Visual deformation and redistribution licences for the user-supplied models remain unverified.
- The create picker disables forms already used by current or legacy personas, and the server rejects duplicate model assignments. Studio characters already occupy robot, fox and human forms.
- README records 0G Compute and World ID as future integrations; neither is used by the current application.
## UI reference implementation

Used the two images in ui/ for the blue discovery cards, rounded navigation, landscape backgrounds and warm character/chat panels. Added responsive reference.css and an SVG meadow scene. Existing user changes to globals.css were preserved. Typecheck and production build pass; rendered visual matching remains unverified, and the SVG artwork is an approximation of the reference scenery.
### Character page simplification

Removed the oversized welcome content and starter chips. Reduced visible status/provider banners, retained the voice control and four tabs, and bounded chat height so the composer stays in the panel. Character bio focuses on attribution and lifetime. Build and typecheck pass; browser visual validation remains unavailable.
### Desktop panel proportions

Replaced fixed 610/750px panel sizing on desktop with viewport-sized columns. Left scene flexes above a 116px lifetime card; right conversation flexes above a fixed composer. Page uses 85% centered width and matching aligned column bottoms. Build/typecheck pass; rendered result still requires browser verification.
### Three-card viewport correction

Restored the reference stylesheet import removed from layout. Desktop scene and lifetime cards now share the same available viewport height as the chat card, with compact rules for shorter screens. Chat history scrolls inside its card. Build and typecheck pass; browser geometry remains unverified.
### Navigation polish

Straightened the site navbar. Removed character-tab underlines and divider. A shared highlight slides between four equal tabs with press feedback and a brief icon settle; reduced-motion preferences disable movement. Typecheck and production build pass. Browser visual verification remains pending.
### Showcase status correction

Replaced the disabled Showcase only action with a small status badge beside attribution. Showcase personas no longer render an adoption button or payment caption in the lifetime card. Adoption and offers actions remain for available personas.
### Rig animations

Added rest-pose-aware idle/wave quaternion clips to all ten previously unanimated imported humanoids. Mapped existing friendly greeting clips for other models and removed Gobkit attack as greeting. Two targeted tests pass, including mixer playback across all ten real GLB skeletons. Typecheck and isolated build pass (initial build encountered a local SQLite lock). Browser visual playback remains unverified. See docs/character-motion.md.
### Authored motion library

Replaced the simple straight-arm greeting on the ten imported humanoids with seven CC0 Mesh2Motion clips. Added Dance, Charleston, Clap, Bow and Think buttons. Bone-direction retargeting preserves target proportions, and card framing leaves more gesture space. Actual source GLB decode/retarget checks pass across all ten skeletons, as do typecheck and isolated production build. Browser visual validation remains pending.
### Standing pose, larger framing, automatic showcase motion

Imported humanoids now use the stable generated standing idle rather than the retargeted source idle; source/target handedness is corrected and pelvis root rotation is preserved. Camera fitting uses a tight box for idle/current gesture instead of a sphere enclosing all dances. Model-space bounds ignore the existing display parent, preventing repeated scaling errors. Visible living characters cycle through supported nonterminal clips at intervals of at least nine seconds (longest clip plus four seconds), returning to idle; VRM cycles wave/dance/bow. Manual gestures override the current playback. Seven focused checks, typecheck and isolated build pass. Browser visual posture verification remains pending.
### Stable framing during animation

Removed active-motion-driven recentering, rescaling and camera fitting. The standing idle establishes the frame once per model load; animation changes only bone poses. Canvas resize can still refit the camera. This preserves character size and stage placement while gestures cycle.
### Requested size increases and lip-sync research

Gallery camera projection zoom is 1.15; detail zoom is 1.10. Neither depends on current animation. Audited all 24 models: 13 embedded-animation, 10 retargeted humanoid, 1 procedural VRM. Researched primary documentation for Rhubarb, Polly, Azure Speech, TalkingHead, HeadAudio and browser boundary events; saved comparison, capability audit and concrete implementation plan in docs/lip-sync-research.md. No new speech service is configured or claimed integrated.

### Timed speech implementation

Added authenticated `/api/speech`, local eSpeak NG/Sarvam WAV generation, Rhubarb phonetic alignment and MP3 playback. Private temporary files are cleaned up. Face weights use audio.currentTime with smoothing/closures; replaced random vowel and sine-mouth behavior in the precise path. Cancelled generations cannot start stale playback; speech pauses showcase gestures. Verified real local synthesis, cue sampling and authenticated HTTP flow (including wrong-origin and Sunset rejection), plus typecheck and production build. Browser visual/audio and live Sarvam validation remain pending. Configuration in docs/timed-speech-setup.md.

### Private continuity and proactive check-ins — 6 November 2026

Added dated conversation archive plus scoped SQLite full-text retrieval, grounded private observations and gradual communication adaptation requiring independent spaced evidence. Added semantic follow-up proposals, 90-minute inactivity defaults, quiet hours and limits, durable job leases, inbox, Resend outbox/idempotency, web-push service worker and opt-in controls. Pending delivery checks ownership/epoch/Sunset. Owner checkpoints can adopt bounded general trait changes without publishing private evidence. Research and operations are in docs/growing-mind.md and docs/proactive-setup.md. Live Vertex inference tested with an unfamiliar pottery event and correct local-calendar date. Real Resend delivery requires configuration; real web-push permission/delivery remains unverified. Arkiv audit found no entity-linked local characters: code integration exists, live prize proof remains outstanding.

Restored the authored Mesh2Motion greeting located in Git history; its Wave variant keeps torso/legs upright. New VRM avatars now receive authored retargeted clips on their normalized rigs instead of the procedural arm greeting. Standing-plus-greeting bounds establish a stable frame including raised hands.
