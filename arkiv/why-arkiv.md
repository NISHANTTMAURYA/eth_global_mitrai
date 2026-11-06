# Why Arkiv

Implemented public character snapshots are wallet-controlled records that the UI can query and owners can patch or transfer through signed transactions. A conventional app database alone would give a buyer no independently queryable wallet ownership or transaction trail. Public SDK queries permit another client to inspect character state without access to our private database.

Arkiv is used in `src/lib/arkiv.ts`, `/api/app` (prepareSnapshot/sync/discover/transfer), and the Mind tab and discovery page. This is more than unread logging: imported public snapshots can appear in discovery, and current entity ownership is rechecked before private owner access.

Chats, personal memories, login sessions and the canonical birth registry remain in Supabase Postgres because public chain records are not private. The engine's public snapshots carry Ed25519 signatures; the official app trusts its own verifier. This limits tampering but does not provide trustless psychological evolution, copying resistance or protocol-enforced Sunset. No exclusivity of public model art is promised.
