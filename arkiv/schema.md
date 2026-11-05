# Arkiv schema

Implemented in `src/lib/arkiv.ts` using SDK 1.0.1.

Named schema: `mitrai.characters.v1`. Fields: indexed `characterId` and `visibility`; unindexed `name`, Ed25519 `proof` (base64), `verifier` (SPKI base64) and serialized public `snapshot` bytes. Each root is wallet-owned using Arkiv's system owner field. Creation requests a 90-day storage lifetime. Character lifespan (30 days or labeled 10-minute demo) is independent and fixed by the server birth registry.

Snapshots contain approved public memories, traits, habits, public history, asset model selection and lifecycle information. Private memories, chats and evidence IDs never go to Arkiv. A public checkpoint patches the same entity. Ownership transfer uses SDK `changeOwnership`; it does not transfer application secrets or prior-owner chats.

No live entity keys yet. Before submitting supply writer wallet(s), entity keys, transaction receipts and expiry evidence. Storage renewal automation is not implemented: monitor/extend before expiry. A full append-only on-chain checkpoint archive is future work; current historical entries are part of the signed snapshot and local database.
