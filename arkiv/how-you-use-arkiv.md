# How MitrAI Uses Arkiv

**Submission Track:** Build on Arkiv (Rabdi Testnet) — ETHGlobal Mumbai 2026

MitrAI leverages the Arkiv Rabdi testnet for decentralized identity, tamper-evident cognitive checkpoints, and trustless custodianship transfer.

---

## 1. Codebase Integration Points

1. **`src/lib/arkiv.ts`:**
   - Defines the named Arkiv schemas: `mitrai.characters.v1` and `mitrai.checkpoints.v1`.
   - Implements `writeArkiv`: wallet-signed initial entity creation on Rabdi testnet.
   - Implements `writeAppCheckpoint`: app-funded background checkpointing via dedicated writer wallet (`0x2c38...bd74`).
   - Implements `transferArkiv`: native wallet-signed ownership transfer using `arkiv.transfer(entityKey, newOwner)`.
   - Implements public discovery queries via `arkivPublic().getEntity()` and `fetch()`.

2. **`scripts/query-arkiv.ts`:**
   - Standalone executable query script: run `npm run query:arkiv`.
   - Connects to Rabdi RPC via `@arkiv-network/sdk`, queries all public characters, parses Ed25519 engine signatures, and displays verified live state.

3. **`src/app/api/app/route.ts`:**
   - Handles snapshot signing with Ed25519 verifier.
   - Enforces ownership checks against live Rabdi entity `$owner`.
   - Manages the adoption marketplace (`action: 'offer'`, `'prepareTransfer'`, and `'transfer'`).
   - Orchestrates automatic background checkpointing via `autoCheckpoint()`.

4. **`src/components/character-view.tsx` & `src/components/brain-observatory.tsx`:**
   - Displays real-time on-chain confirmation status: `Rabdi · confirmed checkpoint X · owner 0x...`.
   - Links every blockchain event directly to the Rabdi block explorer (`https://rabdi.explorer.arkiv.network/tx/...`).
   - Powers the 1-click **"Accept & Handover"** modal where owners sign the Arkiv transfer.

---

## 2. On-Chain Data Flow

```
[ User Chat ] ──> [ 0G Compute Inference ]
                        │
                        ▼
            [ Symbolic Mind Reducer ]
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
    [ Private Memories ]    [ Public Trait Checkpoint ]
   (Supabase PostgreSQL)            │
                            (Ed25519 Signed)
                                    │
                                    ▼
                         [ Arkiv Rabdi Testnet ]
                         - Root: 0x4b1913c8...
                         - Checkpoint: 0xf9e694f2...
```

---

## 3. Custodianship Handover (Buy / Sell / Adoption)

Arkiv provides native entity ownership transfer:
1. An interested buyer proposes an adoption bid on `/explore` with an offer in `tGLM`.
2. The current owner inspects the bid in **"Manage Companion"**.
3. Clicking **"Accept & Handover"** prompts the owner's browser wallet to execute `transferArkiv(walletProvider, owner, entityKey, buyerAddress)`.
4. Once confirmed on Rabdi:
   - On-chain ownership changes to the buyer's address.
   - Public traits, memory crystals, and remaining days continue uninterrupted.
   - The seller's private chat transcripts are cryptographically locked and inaccessible to the buyer.
