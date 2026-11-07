# Arkiv Developer Experience & Integration Friction Log

**Evaluation Target:** `@arkiv-network/sdk` v1.0.1 on Rabdi Testnet  
**Network:** Arkiv Rabdi Testnet (Chain ID `7794095` / `0x76efef`)  
**Target Track:** **Build on Arkiv (from scratch)** — Developer Feedback (25% Score)  
**Author:** MitrAI Team — ETHGlobal Mumbai 2026

During the design, implementation, and deployment of MitrAI, our team integrated the Arkiv SDK across both browser environments (Next.js 16 App Router Client Components with EIP-1193 injected wallets) and server environments (Node.js API routes and batch CLI scripts).

Below is our candid, detailed developer feedback, technical friction log, and concrete recommendations for the Arkiv engineering team.

---

## 1. What Worked Wonderfully (Praise)

- **Blazing Fast Query Latency:**  
  Reading entities via `arkivPublic().getEntity(key, schema)` or performing selective queries with `client.select().from(schema).where(eq('visibility', 'public')).fetch()` regularly returned under **350ms**. In our `/explore` discovery feed and `npm run query:arkiv` verification script, the responsiveness of the DB-Chain felt like querying an indexed SQLite database rather than a distributed blockchain.
- **Native Wallet Ownership (`$owner`):**  
  Arkiv’s native `$owner` system field and built-in `changeOwnership` / `transfer` methods completely eliminated the need for complex, gas-heavy ERC-721 wrapper contracts to track companion custody. Having the chain natively understand that an entity belongs to an EVM address is a massive advantage for Web3 developers.
- **Declarative Schema Definitions:**  
  Defining schemas like `mitrai.characters.v1` and `mitrai.checkpoints.v1` with typed fields (`str().indexed()`, `bytes()`, `uint()`) provides the type safety and schema predictability of a relational database combined with the immutability of an on-chain ledger.

---

## 2. Technical Friction Encountered & How We Solved It

### A. The `rabdi({ accessKey })` TypeScript Signature & RPC Pitfall
- **The Friction:**  
  When initializing the SDK chain definition, calling `rabdi()` without arguments failed TypeScript compilation because the type definition requires an object with an `accessKey` property: `rabdi(options: { accessKey?: string })`.  
  Furthermore, when developers attempted to pass the RPC URL into the access key field (e.g. `rabdi({ accessKey: process.env.NEXT_PUBLIC_ARKIV_RPC })`), the SDK appended the full URL onto the endpoint string (e.g. `https://rpc.../https://...`), causing all subsequent chain reads to throw obscure network errors.
- **Our Solution:**  
  We implemented a sanitizing helper in `src/lib/arkiv.ts`:
  ```typescript
  function serverAccessKey() {
    const key = process.env.ARKIV_ACCESS_KEY || process.env.NEXT_PUBLIC_ARKIV_ACCESS_KEY || '';
    // An RPC URL is a transport, not an access key. Passing it makes the SDK append it.
    return /^https?:\/\//i.test(key) ? '' : key;
  }

  export function arkivPublic() {
    return createPublicClient({
      chain: rabdi({ accessKey: serverAccessKey() }),
      transport: http(process.env.NEXT_PUBLIC_ARKIV_RPC || undefined),
    });
  }
  ```
- **Recommendation for Arkiv Team:**  
  Allow `rabdi()` to be invoked with zero arguments (`rabdi()`), cleanly defaulting to public testnet defaults. Also, add input validation to throw a clear warning if an `http://` or `https://` string is accidentally passed as the `accessKey`.

---

### B. Injected Browser Wallet (EIP-1193) vs. Node.js Private Key DX
- **The Friction:**  
  The official Arkiv SDK documentation and quickstart examples heavily focus on backend Node.js scripts using `privateKeyToAccount(rawKey)` and `createWalletClient`. However, production dApps require end-users to interact via browser-injected wallets (MetaMask, Rabby, Coinbase Wallet, Brave) via standard EIP-1193 providers (`window.ethereum`).  
  Bridging an EIP-1193 provider to sign Arkiv transactions required deep viem knowledge to correctly wire `transport: custom(provider)` and ensure the wallet was switched to Rabdi (Chain ID `7794095`) before calling `walletClient.executeBatch()`.
- **Our Solution:**  
  We created `ensureRabdi()` in `src/lib/arkiv.ts` which handles `wallet_switchEthereumChain` and gracefully catches error code `4902` to automatically prompt `wallet_addEthereumChain` with the proper Rabdi RPC URL and currency symbol (`tGLM`).
- **Recommendation for Arkiv Team:**  
  Include a dedicated "Frontend / Browser Wallet Integration" guide in the official Arkiv documentation showing how to wire `@arkiv-network/sdk` with Wagmi / RainbowKit / viem.

---

### C. Transaction Receipt Confirmation & Polling Latency
- **The Friction:**  
  After executing a state write or ownership change via `walletClient.executeBatch()`, the method returns a transaction hash immediately. However, calling `client.getTransactionReceipt({ hash })` immediately thereafter threw `TransactionReceiptNotFoundError` because the Rabdi testnet had not yet mined the transaction into a block.
- **Our Solution:**  
  We replaced synchronous receipt fetches with `waitForTransactionReceipt`:
  ```typescript
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 15_000,
  });
  ```
  We also wrapped background receipt logging in `try / catch` blocks to ensure frontend user flows are never blocked if the explorer indexing has a momentary delay.
- **Recommendation for Arkiv Team:**  
  Provide a high-level helper such as `executeBatchAndWait()` or document the recommended confirmation polling pattern directly in the SDK readme.

---

### D. Aggressive 429 Rate Limiting on Public RPC
- **The Friction:**  
  When testing without an API key from the Arkiv Hub (`https://hub.arkiv.network/access-keys`), the public RPC endpoint enforces strict rate limiting. During local React hot-reloading or multi-component rendering, calls to `client.select()` would frequently return HTTP 429 (Too Many Requests), breaking the UI experience.
- **Our Solution:**  
  We implemented an in-memory TTL cache for entity queries in `src/lib/arkiv.ts` and ensured our environment variables are configured with a registered Hub access key.
- **Recommendation for Arkiv Team:**  
  Provide a slightly more generous rate limit window for `localhost` origins during hackathons, or return actionable headers (`Retry-After`) with clear guidance.

---

### E. Query Filter Flexibility & Compound Conditions
- **The Friction:**  
  The current `@arkiv-network/sdk/query` DSL supports basic `eq(field, value)` filters on indexed fields, which works cleanly for simple queries. However, constructing complex compound queries (e.g., `visibility == 'public' AND lifespan > now` or OR conditions) required fetching candidate records and performing secondary filtering in application memory.
- **Recommendation for Arkiv Team:**  
  Expand the query builder to support compound boolean operators (`and()`, `or()`) and numerical comparisons (`gt()`, `lt()`, `between()`) on indexed numeric fields.

---

## 3. Summary & Verdict

Despite minor developer experience hurdles typical of an early-stage cutting-edge SDK, Arkiv is **the most practical, powerful decentralized database for autonomous agents and evolving on-chain personas**. 

Its combination of native EVM wallet ownership, high-speed query capabilities, and customizable expiration leases made features possible in MitrAI that would have been virtually impossible or prohibitively expensive on traditional smart contracts.
