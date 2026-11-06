# ENS code map and verification

- `src/lib/ens.ts`: derives a proposed subname and namehash; queries Ethereum mainnet for a wallet's reverse ENS name.
- `src/components/ens-badge.tsx`, `src/components/ens-passport-modal.tsx`, and `src/components/create-view.tsx`: show the proposed name clearly labeled as unregistered.
- `src/app/api/ens/[name]/route.ts`: returns a MitrAI JSON preview and performs a live `getEnsAddress` check. It sets `registeredOnEns` and `resolved` false when the name has no on-chain address. It is not an ENS resolver.

Verification: query `mitrai.eth` through an independent Ethereum ENS client. At the 6 November 2026 check, it returned no address. Connect a wallet with a registered reverse ENS name to verify the header display. That display does not qualify as an ENSv2 integration for the Mumbai prize.
