# Arkiv schema

Implemented in `src/lib/arkiv.ts` using SDK 1.0.1.

Named schema: `mitrai.characters.v1`. Fields: indexed `characterId` and `visibility`; unindexed `name`, Ed25519 `proof` (base64), `verifier` (SPKI base64) and serialized public `snapshot` bytes. Each root is wallet-owned using Arkiv's system owner field. Creation requests a 90-day storage lifetime. Character lifespan (30 days or labeled 10-minute demo) is independent and fixed by the server birth registry.

Snapshots contain approved public memories, traits, habits, public history, asset model selection and lifecycle information. Private memories, chats and evidence IDs never go to Arkiv. A public checkpoint patches the same entity. Ownership transfer uses SDK `changeOwnership`; it does not transfer application secrets or prior-owner chats.

Live writer wallet: `0x979e3eCb04De84980418D5146E557997150AFC51`. Live Carrot Kid root: `0x4b1913c84716c7da12a0ab09cdbe1bdbabe822928fe1f9399dca0b9f0b6358e9`. The `mitrai.checkpoints.v1` schema indexes `characterId`, `parentKey`, and `version`; it stores a signed public snapshot in a read-only, 90-day entity. The app writer can append these without patching the owner's root when its wallet is configured and funded. The reader selects the highest valid checkpoint matching the live root owner and immutable birth commitment. Renewal automation is not implemented: monitor and extend before expiry.
