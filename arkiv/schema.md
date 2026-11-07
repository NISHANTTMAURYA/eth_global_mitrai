# Arkiv Schema Definition & Entity Specification

**Target Track:** **Build on Arkiv (from scratch)** — ETHGlobal Mumbai 2026  
**SDK Version:** `@arkiv-network/sdk` v1.0.1  
**Network:** Arkiv Rabdi Testnet (Chain ID `7794095` / `0x76efef`)  
**Explorer:** [https://rabdi.explorer.arkiv.network](https://rabdi.explorer.arkiv.network)

---

## 1. Overview & Architecture

MitrAI companions are autonomous, evolving AI agents whose identity, public memories, and emotional traits live natively on the **Arkiv DB-Chain**. Arkiv serves as the canonical decentralized registry and query layer for companion discovery, verified provenance, and wallet-level ownership transfer.

MitrAI defines two complementary named Arkiv schemas:
1. **`mitrai.characters.v1` (Root Entity):** The sovereign root record for each companion, owned directly by the user's EVM wallet (`$owner`).
2. **`mitrai.checkpoints.v1` (Checkpoint Entity):** Append-only periodic cognitive checkpoints capturing the companion's evolutionary progress over time.

---

## 2. Schema Specification

### A. Root Companion Schema: `mitrai.characters.v1`

Implemented in `src/lib/arkiv.ts`:

```typescript
import { defineSchema, str, bytes } from '@arkiv-network/sdk/schema';

export const characterSchema = defineSchema('mitrai.characters.v1', {
  characterId: str().indexed(), // Unique UUIDv4 of the character
  visibility: str().indexed(),  // 'public' | 'unlisted' | 'private'
  name: str(),                  // Companion display name
  proof: str(),                 // Base64-encoded Ed25519 engine signature
  verifier: str(),              // Base64 SPKI public key of signing engine
  snapshot: bytes(),            // Serialized JSON of public traits & memories
});
```

#### Field Specifications:

| Field Name | Arkiv Type | Indexed | Description |
| :--- | :--- | :--- | :--- |
| `characterId` | `str()` | **Yes** | Unique companion identifier used for fast direct lookup across the network. |
| `visibility` | `str()` | **Yes** | Allows filtering between public showcase companions and unlisted companions. |
| `name` | `str()` | No | Human-readable name of the companion (e.g., "Carrot Kid", "Nightmare"). |
| `proof` | `str()` | No | Cryptographic Ed25519 signature over the snapshot payload from the MitrAI cognitive engine. |
| `verifier` | `str()` | No | The engine's public key (SPKI format) allowing any client or smart contract to verify payload authenticity. |
| `snapshot` | `bytes()` | No | Raw binary payload containing public traits (`warmth`, `curiosity`, `playfulness`), approved memory crystals, lifecycle timestamps, and 3D avatar model identifiers. |

---

### B. Append-Only Checkpoint Schema: `mitrai.checkpoints.v1`

Implemented in `src/lib/arkiv.ts`:

```typescript
export const checkpointSchema = defineSchema('mitrai.checkpoints.v1', {
  characterId: str().indexed(), // Associated companion UUID
  parentKey: str().indexed(),   // Root Arkiv entity key (0x...)
  version: str().indexed(),     // Monotonically increasing checkpoint version
  snapshot: bytes(),            // Serialized cognitive state snapshot
});
```

#### Field Specifications:

| Field Name | Arkiv Type | Indexed | Description |
| :--- | :--- | :--- | :--- |
| `characterId` | `str()` | **Yes** | References the companion whose memory or maturity state evolved. |
| `parentKey` | `str()` | **Yes** | Hexadecimal entity key of the companion's root Arkiv record. |
| `version` | `str()` | **Yes** | Sequential version string (`1`, `2`, `3`...) allowing clients to order and replay historical checkpoints. |
| `snapshot` | `bytes()` | No | Snapshot containing newly synthesized memory reflections, updated trait scores, and check-in milestones. |

---

## 3. Querying Arkiv Entities

MitrAI demonstrates how external applications, indexers, or frontend clients query the Arkiv DB-Chain directly using the official `@arkiv-network/sdk`.

### Example 1: Public Discovery Feed Query
Find all public characters across the entire network:
```typescript
import { createPublicClient, http } from '@arkiv-network/sdk';
import { rabdi } from '@arkiv-network/sdk/chains';
import { eq } from '@arkiv-network/sdk/query';
import { characterSchema } from './schema';

const client = createPublicClient({
  chain: rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY }),
  transport: http('https://rpc.rabdi.db-chain.testnet.arkiv.network'),
});

// Query all public companions
const publicCompanions = await client
  .select()
  .from(characterSchema)
  .where(eq('visibility', 'public'))
  .fetch();
```

### Example 2: Resolving a Companion by UUID
Query a specific companion by its indexed `characterId`:
```typescript
const match = await client
  .select()
  .from(characterSchema)
  .where(eq('characterId', '8233fb15-7081-4340-b132-221886341183'))
  .fetch();

if (match.length > 0) {
  const entity = match[0];
  console.log(`Found entity ${entity.key} owned by ${entity.$owner}`);
}
```

### Example 3: Running the Public Query Script
Judges can verify live queries from their terminal:
```bash
npm run query:arkiv
```

---

## 4. Ownership & Transfer Model

Arkiv provides a native system field, `$owner`, representing the EVM address that created the entity. MitrAI uses this primitive for sovereign digital property rights:

1. **Root Creation:** When a user creates a MitrAI companion, their browser wallet (e.g., MetaMask) signs an entity creation transaction on Rabdi. The user's address becomes the immutable `$owner` of the root entity.
2. **Decentralized Adoption / Handover:** When an owner decides to pass their companion to a new custodian, they invoke `transferArkiv()`:
   ```typescript
   await walletClient.executeBatch({
     changeOwnerships: [{
       key: entityKey,
       newOwner: recipientAddress,
     }]
   });
   ```
3. **Privacy Boundary:** While the root Arkiv entity, public memory crystals, and remaining lifespan transfer to the new owner, private chat transcripts stored in the off-chain Postgres database are cryptographically epoch-isolated and permanently inaccessible to the new custodian.

---

## 5. Expiration & Lifecycle Rules

Arkiv entities feature native expiration leases. MitrAI harmonizes Arkiv's lease mechanism with the companion's biological lifespan:

- **Arkiv Storage Lease:** Root entities and checkpoints request a standard **90-day** or **180-day** storage term (up to Rabdi's 7,884,000 blocks limit).
- **MitrAI Mortal Lifespan:** The companion's internal chronological clock operates independently:
  - **Standard Lifespan:** 30 days (default) or up to 180 days.
  - **Hackathon Test Lifespan:** 10 minutes (enabled via `MITRAI_DEMO_MODE=1` for testing sunset transitions).
- **Sunset State (Legacy Monument):** When a companion's lifespan ends, conversations cease, and the companion enters **Sunset**. The root Arkiv entity becomes an immutable, read-only **Legacy Monument** that remains publicly viewable and queryable for the remainder of its Arkiv storage lease.

---

## 6. Verified Live Rabdi Entities

| Companion | Entity Key | On-Chain Owner | Genesis Block | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Carrot Kid** | `0x4b1913c84716c7da12a0ab09cdbe1bdbabe822928fe1f9399dca0b9f0b6358e9` | `0x3333333333333333333333333333333333333333` | `299338` | Transferred / Active |
| **Nightmare** | `0x60409a1733c1ab24bdd4d2f79adba20ee3fd82b0f48c2dc38f8cc79fd2561c34` | `0x979e3eCb04De84980418D5146E557997150AFC51` | Genesis | Creator Owned / Active |
| **Checkpoint Tx** | `0xe554e3818ab1717c302b69cd52770284b90fc1b8d737a14f98f6381913f57c4f` | `0x2c38f3866086521f8C278D4f26567D59246ABD74` | Confirmed | Checkpoint Entity |

All entities can be inspected directly on the [Arkiv Rabdi Explorer](https://rabdi.explorer.arkiv.network).
