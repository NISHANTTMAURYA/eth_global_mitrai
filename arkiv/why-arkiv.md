# Why Arkiv?

**Project:** MitrAI — The Evolving Mortal AI Companion  
**ETHGlobal Mumbai 2026**

---

## The Problem With Traditional Web3 & Web2 Architectures

When designing an autonomous, evolving AI companion that users genuinely own, developers typically face two flawed extremes:

1. **The Web2 Database Approach (Supabase / MongoDB):**
   - The user has an account, but no true digital property rights.
   - If the company shuts down or bans an account, the companion and its lifetime of memories evaporate.
   - Secondary sales and transfers require centralized server trust.

2. **The Traditional Smart Contract Approach (Ethereum / Polygon / Arbitrum):**
   - Storing dynamic memory arrays, traits, and serialized cognitive states in standard EVM contracts incurs exorbitant gas fees.
   - ERC-721 NFTs are fundamentally static token pointers (`tokenURI`), meaning character state is usually hosted on centralized IPFS gateways without on-chain queryability.

---

## Why Arkiv Is The Ideal Solution

Arkiv provides the exact missing primitive for stateful Web3 companions:

1. **Wallet-Owned Persistent State:**
   - MitrAI companions are actual **Arkiv Entities** whose canonical root belongs to the user's EVM wallet address (`$owner`).
   - Ownership transfers happen natively via signed transactions without intermediary marketplace contracts.

2. **Decentralized Queryability Without Custom Indexers:**
   - Any external developer or client application can query MitrAI characters directly using `@arkiv-network/sdk`:
     ```typescript
     await arkivClient.select().from(Characters).where(eq('visibility', 'public')).fetch();
     ```
   - No need to maintain fragile The Graph subgraphs or custom indexers.

3. **Append-Only Cognitive Provenance:**
   - MitrAI appends immutable checkpoints (`mitrai.checkpoints.v1`) to Arkiv. This creates an auditable provenance trail of the companion’s evolution over its mortal lifespan.

4. **Engine Integrity With Tamper-Proof Signatures:**
   - Public snapshots written to Arkiv carry Ed25519 cryptographic signatures from the MitrAI cognitive engine, ensuring that traits and memories represent genuine conversational history rather than arbitrary user spoofing.
