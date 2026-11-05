# How the app uses Arkiv

- `src/lib/arkiv.ts`: schema, read, public visibility query, signed create/patch and ownership transfer.
- `scripts/query-arkiv.ts`: executable public query, optionally constrained to `ARKIV_OWNER`.
- `src/app/api/app/route.ts`: engine-signing preparation, chain receipt/state verification, import and current-owner reconciliation.
- `src/components/mitrai-app.tsx`: Discover on Arkiv, Mind → Sync to Arkiv, wallet login and handover.

`characterId` associates snapshots with the app identity. `visibility` filters public discovery. The system owner determines who signs edits; a user-defined owner string is never sufficient authorization. Imported snapshots must be signed by the configured app verifier, and imports cannot overwrite the local birth registry or private state.

Storage expiry is set to 90 days on entity creation; automatic renewal and expiry alerts are outstanding. Sunset instead uses the character's registered fixed duration and is checked by the API. Public queries alone do not certify claims of ability.

Before judging: run a real write, read it in the visible UI, preserve wallet/entity/transaction evidence and demonstrate a second-wallet transfer. No live-chain success is claimed yet.
