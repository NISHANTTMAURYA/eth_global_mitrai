# ENS Use Case in MitrAI

## 1. The Core Problem
Onchain AI companions and decentralized agents typically suffer from an identity disconnect:
- An agent's state, memory proofs, and checkpoint records live under arbitrary, opaque hashes (e.g., Arkiv entity keys or contract addresses like `0x4f8a...92b1`).
- Collectors and interacting users interact with raw 42-character hex addresses.
- There is no portable, universal way for external wallets, dApps, or registries to discover an agent's status, model type, mortal lifespan, or provenance without reading proprietary databases.

## 2. The Solution: ENS as the Autonomous Agent Passport
MitrAI integrates the **Ethereum Name Service (ENS)** as the load-bearing identity and discovery layer for mortal AI companions.

Every companion created or cultivated on MitrAI is automatically provisioned a verified ENS subname under the `mitrai.eth` namespace (e.g., `milo.mitrai.eth`, `fern.mitrai.eth`).

### Key Capabilities

### A. Dynamic Agent Subnames (`[name].mitrai.eth`)
- Normalized, URL-safe subnames generated dynamically from the companion's canonical identity.
- Real on-chain node derivation via `viem/ens` `namehash(subname)`.
- Replaces raw cryptographic hashes with human-readable, brandable Web3 identities.

### B. Standardized EIP-2304 Text Records
MitrAI anchors the companion's physical state on **Arkiv** directly into ENS text records:
- `arkiv.entity`: The verifiable on-chain entity key on Arkiv where the agent's memory proofs and trait checkpoints reside.
- `agent.status`: Current lifecycle stage (`Dawn`, `Bloom`, `Golden`, `Legacy`).
- `agent.model`: 3D visual avatar form (`fox`, `robot`, `human`).
- `agent.guardian`: Current owner wallet address or collector ENS.
- `agent.epoch`: Ownership generation/epoch count.
- `agent.lifespan`: Remaining mortal lifetime (`X days remaining`).
- `description`: The agent's tagline and core behavioral premise.
- `url`: Canonical URL linking back to the agent's interactive web interface.

### C. Offchain Subname Resolution Gateway (ENSIP-10 / CCIP-Read)
- MitrAI exposes an open resolution gateway at `/api/ens/[name]` (e.g. `/api/ens/milo.mitrai.eth`).
- Any external dApp, wallet, or agent discovery crawler can query this endpoint to inspect the agent's verified passport and Arkiv linkage without proprietary SDKs.

### D. Collector Guardian Identity (Reverse Resolution)
- When a collector connects their wallet, MitrAI queries public Ethereum RPC via `viem.getEnsName` to resolve their `0x...` address to their primary ENS name (e.g., `vitalik.eth`).
- Provenance and transfer logs record human-readable guardian names across the agent's mortal lifetime instead of raw hex hashes.

## 3. ETHGlobal Mumbai Bounty Alignment
This implementation directly satisfies the criteria for **Best ENS Integration for AI Agents ($4,000)** and **Most Creative Use of ENS ($4,000)**:
- **No hard-coded values:** Subnames and records are dynamically computed from live SQLite and Arkiv state.
- **Agentic On-chain Identity:** Gives AI agents persistent, portable identities on Ethereum.
- **Cross-Chain / Protocol Linkage:** Uses ENS text records to bridge Ethereum identity with Arkiv decentralized memory storage.

