# How the App Uses ENS

## Code Architecture

- **`src/lib/ens.ts`**: Core ENS subname derivation, `namehash` node calculation, standard EIP-2304 text record serialization, and public Ethereum RPC reverse lookup via `viem`.
- **`src/app/api/ens/[name]/route.ts`**: Dynamic HTTP resolution gateway returning full ENS passport records for any companion subname (`/api/ens/<name>`).
- **`src/components/ens-badge.tsx`**: Reusable interactive ENS subname pill (`⟐ milo.mitrai.eth`) displayed on discovery cards and character views.
- **`src/components/ens-passport-modal.tsx`**: Visual ENS Agent Passport modal displaying on-chain node hash, linked Arkiv entity, live text records, copyable EIP-2304 JSON, and direct links to `app.ens.domains`.
- **`src/components/character-view.tsx`**: Integrated ENS badge in character header and tags; launches the ENS Passport modal.
- **`src/components/explore-view.tsx`**: Card-level ENS badges allowing direct passport inspection from discovery.
- **`src/components/create-view.tsx`**: Live preview of the assigned ENS subname during character creation.
- **`src/components/mitrai-app.tsx`**: Automatic reverse ENS resolution for connected collector wallets in the app navbar (`0x...` → `name.eth`).
- **`tests/ens.test.ts`**: Automated unit tests for subname normalization, parent hierarchy, namehash derivation, and text record consistency.

## Live Verification & Demonstration

1. **Card & Detail Badges:**
   - Open `http://localhost:3000/explore`
   - Observe the `⟐ milo.mitrai.eth` badge on Milo's card.
   - Click to open the **ENS Agent Passport** modal.

2. **Subname Gateway Resolution:**
   ```bash
   curl -s http://localhost:3000/api/ens/milo.mitrai.eth | jq .
   ```
   Inspect the dynamically returned EIP-2304 text records and `namehash`.

3. **Creation Preview:**
   - Go to `http://localhost:3000/create`
   - Type a companion name (e.g. `Aurora`) and observe the real-time subname preview: `aurora.mitrai.eth`.

4. **Collector Reverse Lookup:**
   - Connect any wallet with a registered mainnet/Sepolia ENS name; the top-right header automatically renders their `.eth` name instead of a truncated hex address.

