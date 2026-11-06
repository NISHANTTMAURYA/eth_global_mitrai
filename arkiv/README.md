# Arkiv Track Evidence and Integration Report

**Target Track:** **Build on Arkiv** (Rabdi Testnet) — ETHGlobal Mumbai 2026

MitrAI integrates the official `@arkiv-network/sdk` (v1.0.1) on the **Rabdi testnet** (`https://rabdi.explorer.arkiv.network`). Every MitrAI companion is an on-chain Arkiv entity whose root ownership belongs directly to the user's EVM wallet. 

---

## 1. Verified Live On-Chain Evidence

- **Network:** Arkiv Rabdi Testnet (Chain ID `60138`)
- **Primary Custodian / Writer Wallet:** `0x979e3eCb04De84980418D5146E557997150AFC51`
- **Confirmed Root Entity (Carrot Kid):**  
  `0x4b1913c84716c7da12a0ab09cdbe1bdbabe822928fe1f9399dca0b9f0b6358e9`  
  - **Genesis Creation Block:** `299338`  
  - **Explorer URL:** [https://rabdi.explorer.arkiv.network](https://rabdi.explorer.arkiv.network)
- **App Checkpoint Writer Wallet:** `0x2c38f3866086521f8C278D4f26567D59246ABD74` (Funded with testnet tGLM)
- **Verified Background Checkpoint Tx:**  
  `0xe554e3818ab1717c302b69cd52770284b90fc1b8d737a14f98f6381913f57c4f`  
  - **Created Checkpoint Entity:** `0xf9e694f237133d7d4dd8c9e6016e11fa29a25ceeb012af2a45bdffe742305e9c`
- **Reproducible Public Query:**  
  ```bash
  npm run query:arkiv
  ```
  This command uses the Arkiv SDK to execute `select().from(Characters).where(eq('visibility', 'public')).fetch()` against the live Rabdi testnet and outputs verified entity state and Ed25519 verifier signatures.

---

## 2. Architecture & Data Boundary

MitrAI maintains a strict privacy and ownership boundary:

| Layer | Storage | Description |
| :--- | :--- | :--- |
| **Root Arkiv Entity** | Rabdi Testnet | Wallet-owned canonical anchor containing public identity, traits, remaining lifespan, model reference, and engine signature. |
| **Arkiv Checkpoint Entities** | Rabdi Testnet | Append-only public state checkpoints (`mitrai.checkpoints.v1`) written every few conversation sessions or on manual consolidation. |
| **Private Chat Transcripts** | Supabase PostgreSQL | Chat logs, user-specific emotional context, and private memories stay encrypted/sealed with the current custodian. |
| **Handover Isolation** | Smart Contract | When an owner executes `arkiv.transfer(entityKey, newOwner)`, the on-chain ownership rotates, public memories and lifespan transfer, while previous-owner private chats are permanently purged from the new custodian. |

---

## 3. Storage Term vs. Companion Lifespan

Arkiv entities are provisioned with up to a **180-day storage lease** (matching Rabdi's maximum 7,884,000 blocks). MitrAI gives users configurable lifespans:
- **30 Days:** Fast seasonal companion.
- **90 Days (Recommended):** Full quarterly journey.
- **180 Days:** Extended journey matching the maximum single-term Arkiv entity lease.
- **10 Minutes:** Rapid test mode for hackathon judging and testing.

At Sunset, the companion gracefully transitions into an immutable read-only **Arkiv Legacy Monument**.

---

## 4. Required Supporting Documentation

1. [Schema Definition](schema.md): Detailed schemas for `mitrai.characters.v1` and `mitrai.checkpoints.v1`.
2. [How MitrAI Uses Arkiv](how-you-use-arkiv.md): Complete architectural breakdown of SDK calls, queries, and ownership transfers.
3. [Why Arkiv](why-arkiv.md): Strategic rationale for choosing Arkiv over traditional L1/L2 smart contracts and Web2 databases.
4. [Developer Friction & Feedback](friction.md): Actionable technical feedback and DX observations for the Arkiv team.
5. [Reach & User Impact](reach.md): Target audiences, creator economy, and real-world utility thesis.
