# Implemented product flow

6 November 2026. This revision implements the clarified template-first experience. Real wallet connection has been reported working by the owner. The revised creation, renewal and transfer transaction paths still need a deliberate live signing run; automated tests use isolated records and never consume a production template.

## Journey

1. A new visitor opens `/` and sees the concept, Create my MitrAI and Explore MitrAI. A returning owner goes directly to their active companion, or resumes a saved activation. A previous Legacy is linked from home.
2. Choose an available named template. Each template has editable identity, starting behavior, traits and suggested voice. These are authored defaults, not learned experiences. Voices are reusable.
3. Customize identity, behavior and voice. Detailed trait sliders are optional. The ordinary lifespan is 30 days; the accelerated lifetime appears only in local demo mode.
4. Review and approve creation in the connected wallet. An unsigned server draft holds its model for 15 minutes. A started transaction holds it until resolved; it is never recycled merely because time passed. Rejected signatures return to a cancellable reservation. A confirmed model claim persists through transfer and Sunset.
5. Creation mints a root and immutable initial public checkpoint. New identities have a `createdAt: 0` placeholder until chain metadata is available: lifecycle uses the root's immutable `$createdAt` block timestamp cached as `birth.at`, never the draft timestamp. Subsequent checkpoints cannot reset that anchor.
6. Open the companion, talk and observe grounded learning. The Mind view distinguishes dated private observations, stable personality changes and confirmed public checkpoints. Manual animations remain available under Expressions.
7. Publish approved state. Community discovery reads signed canonical Arkiv entities. A visitor first sees a short public-state spoken introduction; optional isolated preview chat neither learns nor accesses private memories.
8. Request free adoption. The owner can decline or accept, then review the recipient and approve handover. Recipient eligibility is checked before requesting a transaction. Completion closes competing requests and seals earlier owner profiles/chats. A preview or enquiry cannot execute a payment.
9. At Sunset, interaction and ordinary mutation end. Provenance offers an approved-story download and wallet-approved 90-day storage renewal, including after Sunset. New roots/checkpoints permit others to extend public storage without editing it. Some older checkpoints still require their original owner to renew them.

## Data and enforcement

`src/lib/templates.ts` separates initial settings from living state. `model_claims` in SQLite has a primary key on model and a unique character ID. Reservation and character registration use `BEGIN IMMEDIATE`; simultaneous processes cannot reserve the same model. Confirmed entity keys define the canonical claim; old signed snapshots minted under a different key are not accepted as new canonical personas. This is official-service uniqueness, not a claim that third-party copies of public model art are impossible.

Availability is returned by `/api/templates` without exposing private owner data. The wallet signs Arkiv writes through the provider selected in the header. Confirmation verifies state, signature, owner and claim. Personal profiles, conversations and learning evidence remain in SQLite, isolated by character/wallet/ownership epoch.

Adoption requests have stable IDs, owner/epoch binding and pending/accepted/declined/completed/closed states. Old requests do not become the new owner's inbox. A separate transaction confirmation is necessary before an accepted request is marked completed.

## Limits kept explicit

- Paid settlement is not implemented or advertised as a working Buy action. Current adoption is free. A real payment/escrow design must precede priced selling.
- Storage can be checked and renewed with the wallet, but automatic renewal is not implemented. Do not promise permanent retention without funded renewal and backups.
- The native Arkiv owner can transfer outside the app. One active persona per account is an application rule; it cannot prevent arbitrary external on-chain transfers.
- Legacy lifecycle rules are enforced by the official API, not by an independently deployed mortality contract.
- Production hosting, encrypted-at-rest private storage, mobile WalletConnect and the proposed full mood/maturity system remain separate work.
- All 14 authored animation source clips remain; available gestures depend on rig capability.
