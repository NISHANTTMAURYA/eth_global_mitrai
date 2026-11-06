# Implemented product flow

6 November 2026. This revision implements the clarified template-first experience. Real wallet connection and one Arkiv birth have been confirmed for Carrot Kid. Renewal and second-wallet transfer still need a deliberate live signing run; automated tests must use an isolated test database and never consume a production template.

## Journey

1. A new visitor opens `/` and sees the concept, Create my MitrAI and Explore MitrAI. A returning owner goes directly to their active companion, or resumes a saved activation. A previous Legacy is linked from home.
2. Choose an available named template. Each template has editable identity, starting behavior, traits and suggested voice. These are authored defaults, not learned experiences. Voices are reusable.
3. Customize identity, behavior and voice. Detailed trait sliders are optional. The ordinary lifespan is 30 days; the accelerated lifetime appears only in local demo mode.
4. Review and approve creation in the connected wallet. An unsigned server draft holds its model for 15 minutes. A started transaction holds it until resolved; it is never recycled merely because time passed. Rejected signatures return to a cancellable reservation. A confirmed model claim persists through transfer and Sunset.
5. Creation mints a root and immutable initial public checkpoint. New identities have a `createdAt: 0` placeholder until chain metadata is available: lifecycle uses the root's immutable `$createdAt` block timestamp cached as `birth.at`, never the draft timestamp. Subsequent checkpoints cannot reset that anchor.
6. Open the companion, talk and observe grounded learning. The Mind view distinguishes dated private observations, stable personality changes and confirmed public checkpoints. With a funded app writer configured, five new owner messages trigger an automatic append-only public checkpoint; otherwise the owner can still sign a manual Sync. Manual animations remain available under Expressions.
7. Publish approved state. Community discovery reads signed canonical Arkiv entities. A visitor first sees a short public-state spoken introduction; optional isolated preview chat neither learns nor accesses private memories.
8. Join a published character's public community with a connected wallet and post short public messages. Private chat remains owner-only. Community becomes read-only at Sunset.
9. Request adoption or submit a nonbinding bid in test tGLM. The owner can set an optional ask, decline or accept, then review the recipient and approve handover. Recipient eligibility is checked before requesting a transaction. Completion closes competing requests and seals earlier owner profiles/chats. A bid does not execute payment.
10. At Sunset, interaction and ordinary mutation end. Provenance offers an approved-story download and wallet-approved 90-day storage renewal, including after Sunset. New roots/checkpoints permit others to extend public storage without editing it. Some older checkpoints still require their original owner to renew them.

## Data and enforcement

`src/lib/templates.ts` separates initial settings from living state. `model_claims` in Supabase Postgres has a primary key on model and a unique character ID. Reservation and character registration run in one Postgres transaction; simultaneous processes cannot reserve the same model. Confirmed entity keys define the canonical claim; old signed snapshots minted under a different key are not accepted as new canonical personas. This is official-service uniqueness, not a claim that third-party copies of public model art are impossible.

Availability is returned by `/api/templates` without exposing private owner data. The wallet signs Arkiv writes through the provider selected in the header. Confirmation verifies state, signature, owner and claim. Personal profiles, conversations and learning evidence remain in Supabase Postgres, isolated by character/wallet/ownership epoch.

Adoption requests have stable IDs, owner/epoch binding and pending/accepted/declined/completed/closed states. Old requests do not become the new owner's inbox. A separate transaction confirmation is necessary before an accepted request is marked completed.

## Limits kept explicit

- Paid settlement is not implemented or advertised as a working Buy action. Asking prices and bids are nonbinding price discovery. A real payment/escrow design must precede paid selling.
- Storage can be checked and renewed with the wallet, but automatic renewal is not implemented. Do not promise permanent retention without funded renewal and backups.
- The native Arkiv owner can transfer outside the app. One active persona per account is an application rule; it cannot prevent arbitrary external on-chain transfers.
- Legacy lifecycle rules are enforced by the official API, not by an independently deployed mortality contract.
- Production hosting, encrypted-at-rest private storage, mobile WalletConnect and the proposed full mood/maturity system remain separate work.
- All 14 authored animation source clips remain; available gestures depend on rig capability.
