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
