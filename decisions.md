# Implementation decisions

## 2026-11-06
- Local repository implementation; no hosting publication requested at this stage.
- Next.js/TypeScript with custom responsive cream CSS and React Three Fiber.
- Use a durable local SQLite store for the runnable hackathon build; Postgres remains a production migration. No private chat on Arkiv.
- Separate an explicit browser-local demo identity from wallet-authenticated live identity. Never represent demo records as on-chain records.
- Core loop prioritizes character quality and discovery over creation volume.
- Public auditions use only public checkpoint state and never evolve a character.
- Lifetimes are anchored at activation and cannot be reset by publishing or transfer. Default 30 days is an adjustable product hypothesis; ten-minute demo is visibly marked.
- Real wallet writes require wallet signature; no custodial backend key.
- Browser speech can provide an accessible no-key voice preview; mouth motion must be labeled approximate where phoneme timing is unavailable.

## Implemented refinements
- Direct EIP-1193 browser wallet login/write integration replaces the initially proposed RainbowKit stack for this MVP; signatures are verified server-side with expiring single-use nonces.
- 0G's documented OpenAI-compatible router is configurable via server environment. Demo responses are explicitly scripted; provider errors do not fall back to fabricated AI output.
- Use Ed25519 signatures on sanitized public snapshots. Trust is pinned to the persisted app verifier, and immutable local birth anchors prevent signed or unsigned imports from resetting official lifetimes.
- Recheck actual Arkiv ownership before private access and after model calls. Private messages are keyed by ownership epoch so returning owners cannot inherit a previous session's relationship.
- Two primary licensed rigs: RobotExpressive and pixiv VRM sample. Fox is a bonus creature. Third-party model art remains nonexclusive and separately licensed.
- Audio-derived Rhubarb cues drive the fixed greetings. Dynamic browser speech uses approximate word/vowel cues; robot has expression morphs rather than full visemes.
- Isolate HTTP integration tests in a disposable temporary database and verifier directory.
- Browser preview access was declined by the browser permission gate. No alternate browser surface or automation workaround was used; visual/rendered responsive QA remains unverified.

- Default Arkiv transport must inherit the SDK-generated keyed URL. An explicit custom RPC is optional and overrides that authentication path.

- Testnet only: default 0G endpoint is the separate testnet router. Do not direct the user to buy real tokens or paid credits for hackathon testing.

- Keep loading overlays in ordinary page DOM. Use a null Canvas Suspense fallback instead of Drei Html so model resolution cannot synchronously unmount a nested DOM root.
### AI provider order (2026-11-06)

- Amazon Bedrock is the primary live conversation provider because the team already has an AWS path and can keep credentials server-side.
- 0G remains an optional ETHGlobal sponsor integration/fallback: it demonstrates testnet decentralized compute when Bedrock is disabled, but it is not required for local demo mode.
- The persistent brain remains the deterministic state reducer in the app. Bedrock/0G only interpret the current state; neither provider writes memory directly.
- The shared MitrAI system prompt explicitly prevents private-memory leakage, invented memories, hidden-context disclosure, and post-Sunset learning.
### User-supplied character catalog

Use the 16 skeletal models supplied in Downloads through a shared catalog. Preserve source files by copying. Exclude the three object-animated animals without skeletal skins. Enable existing clips and named speech morphs without guessing numeric morph meanings. User-supplied licences need verification before public redistribution.

Each model is a unique persona form. Enforce availability in both the creator UI and server create action; keep forms reserved after Sunset because each body's Legacy remains discoverable.
## Reference visual direction

Use ui/image.png and ui/image copy.png as visual targets. Keep interactive 3D and real conversation state; do not render a full-page screenshot as the website or fabricate the reference's example messages. Discovery uses blue landscape cards; character detail uses a warm scene and large chat workspace.
Character chat should follow the supplied clean reference: scene and lifetime on the left; tabs, conversation and composer on the right. Keep model-provider metadata out of the main conversational hierarchy.
Use a single CSS-transformed tab highlight with a spring-like easing curve, following MDN transition guidance, rather than adding an animation dependency. Keep selected state available via aria-pressed and preserve keyboard focus visibility.
Use rig-specific authored quaternion tracks for clipless humanoids and preserve embedded clips for other characters. Derive relaxed arm poses from each rig's rest directions. Do not substitute attack/death for friendly gestures or assume arbitrary external clips fit every skeleton.
Use Mesh2Motion's authored CC0 motion assets for the ten imported Mixamo rigs instead of the initial minimal wave generator. Preserve licence and local source GLBs. Transfer bone directions to avoid assuming matching local bone axes; omit source root movement to keep characters inside the stage. Treat visual tuning as pending until rendered playback is observed.
Fit characters using posed mesh bounds and actual canvas aspect ratio rather than model height with a shared camera distance. Keep the canvas inside the visible card and reserve separate title/control space in detail views. Sample animation bounds once at load to avoid camera pumping during playback.
Use a stable upright idle with original pelvis/leg transforms. Retargeted source idles must not redefine default posture. Fit the active gesture rather than reserving space for every motion simultaneously. Run nonterminal showcase motions periodically, with idle breaks and manual override; Sunset remains motionless.
Keep framing fixed from the standing idle throughout animation playback. Do not include the current gesture in framing dependencies, since that makes the same character grow, shrink and shift when clips change.
Apply the requested 15% gallery and 10% detail size changes via fixed perspective projection zoom, so animation changes do not trigger reframing. For good lip sync, prioritize timestamped speech cues and verified facial morph mappings; preserve the current browser voice as an approximate fallback until real audio and alignment are integrated.
