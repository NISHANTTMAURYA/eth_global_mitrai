# Arkiv Integration Report & Track Evidence

**Submission Track:** **Build on Arkiv (from scratch)** — $8,000 Bounty ($15,000 Total Arkiv Prize Pool)  
**Event:** ETHGlobal Mumbai 2026  
**Network:** Arkiv Rabdi Testnet (Chain ID `7794095` / `0x76efef`)  
**Explorer:** [https://rabdi.explorer.arkiv.network](https://rabdi.explorer.arkiv.network)  
**SDK:** `@arkiv-network/sdk` v1.0.1  

MitrAI integrates the official Arkiv SDK natively on the **Rabdi testnet**. Every MitrAI companion is an on-chain Arkiv entity whose root ownership belongs directly to the user's EVM wallet (`$owner`).

---

## 🏆 Official Prize Criteria Documentation Map

The Arkiv track at ETHGlobal Mumbai judges submissions across four core pillars (worth 25% each). MitrAI provides comprehensive, dedicated documentation for all four criteria:

| Scoring Pillar | Weight | Dedicated Document | Core Topics Covered |
| :--- | :---: | :--- | :--- |
| **Schema & Entities** | **25%** | [**`arkiv/schema.md`**](schema.md) | Entity specifications, indexed query fields, TypeScript definitions, wallet ownership model, and storage expiration leases. |
| **Developer Friction** | **25%** | [**`arkiv/friction.md`**](friction.md) | Honest DX review, SDK praise, TypeScript `rabdi({ accessKey })` quirks, browser wallet EIP-1193 integration, receipt polling, and feature requests. |
| **Reach & Viability** | **25%** | [**`arkiv/reach.md`**](reach.md) | Target personas (collectors, DAOs, game devs), finite lifespan economics, adoption marketplace, and post-hackathon roadmap (atomic escrow contracts). |
| **Why Arkiv?** | **25%** | [**`arkiv/why-arkiv.md`**](why-arkiv.md) | Architectural defense: why Postgres, IPFS, and standard EVM smart contracts fail for stateful AI companions, and why Arkiv is the ideal solution. |

---

## 1. Verified Live On-Chain Evidence on Rabdi Testnet

All entities below are active, verified, and queryable on the live Arkiv Rabdi testnet:

- **Network:** Arkiv Rabdi Testnet (Chain ID `7794095` / `0x76efef`)
- **Primary Creator / Custodian Wallet:** `0x979e3eCb04De84980418D5146E557997150AFC51`
- **Verified Root Entity 1 (Carrot Kid):**  
  `0x4b1913c84716c7da12a0ab09cdbe1bdbabe822928fe1f9399dca0b9f0b6358e9`  
  - **Genesis Block:** `299338`  
  - **Current Owner:** `0x3333333333333333333333333333333333333333` (Demonstrated live wallet transfer)  
  - **Explorer Link:** [Inspect Carrot Kid on Rabdi Explorer](https://rabdi.explorer.arkiv.network)
- **Verified Root Entity 2 (Nightmare):**  
  `0x60409a1733c1ab24bdd4d2f79adba20ee3fd82b0f48c2dc38f8cc79fd2561c34`  
  - **Current Owner:** `0x979e3eCb04De84980418D5146E557997150AFC51`  
  - **Explorer Link:** [Inspect Nightmare on Rabdi Explorer](https://rabdi.explorer.arkiv.network)
- **Application Checkpoint Writer Wallet:** `0x2c38f3866086521f8C278D4f26567D59246ABD74` (Funded with testnet `tGLM`)
- **Verified Cognitive Checkpoint Transaction:**  
  `0xe554e3818ab1717c302b69cd52770284b90fc1b8d737a14f98f6381913f57c4f`  
  - **Created Checkpoint Entity:** `0xf9e694f237133d7d4dd8c9e6016e11fa29a25ceeb012af2a45bdffe742305e9c`

---

## 2. Reproducible Terminal Query Verification

Judges can test live queries against the Arkiv Rabdi testnet directly from the repository:

```bash
npm run query:arkiv
```

This script connects via `@arkiv-network/sdk`, queries the `mitrai.characters.v1` schema with `where(eq('visibility', 'public'))`, verifies the engine's Ed25519 signatures, and outputs the decoded companion state.

---

## 3. Privacy & Ownership Architecture

MitrAI maintains a strict privacy and custody boundary:

| Layer | Storage Location | Functionality |
| :--- | :--- | :--- |
| **Root Arkiv Entity** | Arkiv Rabdi Testnet | Wallet-owned anchor containing canonical identity, public traits, lifespan clock, 3D model reference, and engine signature. |
| **Arkiv Checkpoint Entities** | Arkiv Rabdi Testnet | Append-only public state checkpoints (`mitrai.checkpoints.v1`) written in the background by the app writer. |
| **Private Chat Transcripts** | Supabase PostgreSQL | Sensitive conversations, raw prompts, and private emotional memories remain sealed with the current custodian. |
| **Custody Handover** | Arkiv Native Transfer | When an owner executes `arkiv.transfer(entityKey, newOwner)`, root ownership rotates on-chain, public memories transfer, and previous-owner private chats are cryptographically locked. |

---

## 4. Storage Term vs. Companion Mortal Lifespan

Arkiv entities are provisioned with up to a **180-day storage lease** (matching Rabdi's 7,884,000 blocks limit). MitrAI offers customizable lifespans:
- **30 Days:** Standard seasonal companion.
- **90 Days:** Extended quarter-length journey.
- **180 Days:** Full journey matching the maximum single-term Arkiv entity lease.
- **10 Minutes:** Rapid test mode for hackathon judging and sunset demonstrations (`MITRAI_DEMO_MODE=1`).

At Sunset, the companion transitions into an immutable, read-only **Arkiv Legacy Monument** that remains publicly accessible and queryable on the DB-Chain.

---

## 5. Supporting Guides & References

- [How MitrAI Uses Arkiv](how-you-use-arkiv.md): Detailed code walkthrough of SDK client initialization, batch writes, queries, and wallet transitions.
- [Status & Verification History](status-2026-11-06.md): Log of initial genesis entity creation and on-chain block confirmations.
