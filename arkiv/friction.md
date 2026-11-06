# Arkiv Developer Experience & Integration Feedback

**Evaluation Target:** `@arkiv-network/sdk` v1.0.1 on Rabdi Testnet  
**Author:** MitrAI Team — ETHGlobal Mumbai 2026

During the design, implementation, and deployment of MitrAI, our team extensively worked with the Arkiv SDK across browser environments (Next.js 16 Client Components with EIP-1193 injected wallets) and server environments (Node.js App Router API routes).

Here is our honest technical feedback and developer friction log:

---

## 1. What Worked Wonderfully (Praise)

- **High-Performance Querying:** Reading entities via `arkivPublic().getEntity(key, schema)` is remarkably fast. For our `/explore` and `npm run query:arkiv` endpoints, querying on-chain public snapshots takes under 400ms.
- **Native Ownership Support:** Arkiv's built-in `$owner` attribute and `changeOwnership` / `transfer` methods make building on-chain companion adoption and marketplaces trivial compared to custom ERC-721 escrows.
- **Named Schema System:** Defining schemas like `mitrai.characters.v1` and `mitrai.checkpoints.v1` with typed fields (`string`, `bytes`, `uint`) provides clean contract-like predictability without Solidity deployment overhead.

---

## 2. Technical Friction Encountered & Solutions

### A. The `rabdi({ accessKey })` Requirement
- **Friction:** Initial calls to `rabdi()` failed TypeScript compilation because `rabdi` requires an object parameter `{ accessKey: string }`. Calling `rabdi({})` or omitting arguments threw runtime errors.
- **Solution:** We updated our chain configuration to explicitly provide `{ accessKey: process.env.NEXT_PUBLIC_ARKIV_ACCESS_KEY || '' }`.
- **Recommendation:** Allow `rabdi()` to default cleanly to an empty string or standard testnet options if no access key is passed.

### B. Injected Wallet (EIP-1193) vs. Private Key DX
- **Friction:** The official Arkiv documentation examples heavily emphasize Node.js scripts using `privateKeyToAccount(rawKey)`. However, Web3 user-facing applications require end-users to sign via MetaMask, Brave Wallet, or Coinbase Wallet via EIP-1193 providers (`window.ethereum`).
- **Solution:** We wrapped `createWalletClient({ chain: rabdi({ accessKey }), transport: custom(walletProvider) })` to bridge browser wallets into Arkiv transaction executions.
- **Recommendation:** Add a prominent section in Arkiv quickstarts demonstrating browser wallet integrations with viem / Wagmi.

### C. Rate Limits on Public RPC
- **Friction:** Without an explicit access key from the Arkiv Hub (`https://hub.arkiv.network/access-keys`), public RPC calls hit aggressive 429 rate limits when querying during rapid development or multiple component re-renders.
- **Solution:** We implemented local in-memory caching and pass an access key in `.env.local`.

---

## 3. Summary
Arkiv is uniquely suited for evolving, stateful Web3 applications like MitrAI where persistent, queryable data needs wallet ownership without the gas and storage limitations of traditional smart contracts.
