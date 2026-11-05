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
