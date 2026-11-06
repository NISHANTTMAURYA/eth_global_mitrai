# ENS code map and verification

- `src/lib/ens.ts`: generates an unregistered preview name and performs Ethereum mainnet reverse lookup for wallet display.
- `src/components/ens-badge.tsx`, `src/components/ens-passport-modal.tsx`, and `src/components/create-view.tsx`: display preview-only names.
- `src/app/api/ens/[name]/route.ts`: returns application-side preview data and checks the mainnet resolver for an address; it is not an ENS resolver or CCIP Read endpoint.
- Homepage architecture copy must state that ENSv2 records are not deployed.

To verify a future implementation, register/write records on the configured ENSv2 network, query the same name using the official Universal Resolver or an independent ENS client, and compare the returned owner, resolver, and text records with the transaction. Do not treat local previews, namehashes, or API responses as proof of ENS registration.
