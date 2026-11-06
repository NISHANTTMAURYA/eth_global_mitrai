# ENS status — 6 November 2026

MitrAI currently uses Ethereum ENS for a connected wallet's reverse name lookup (`src/lib/ens.ts`). A character's `<name>.mitrai.eth` is a **preview**, computed with `namehash`; the app's `/api/ens/[name]` is a MitrAI JSON gateway, not an ENS resolver. It now checks Ethereum RPC and returns `registeredOnEns: false` and `resolved: false` when no on-chain address exists. The UI labels previews accordingly.

A live RPC query of `mitrai.eth` returned no address on 6 November 2026. No evidence in this repository shows control of that parent name, an ENSv2 Permissioned Registry or Resolver, or live text records. The older `use-case.md`, `schema.md`, and `how-you-use-ens.md` are design proposals, **not delivered features**. They should not be cited as proof of prize qualification.

The [Mumbai ENS prize](https://ethglobal.com/events/mumbai/prizes#ens) requires functional ENSv2 on Ethereum mainnet or Sepolia for the main track; the existing-project track requires mainnet and Continuity eligibility. A name preview and reverse lookup alone do not meet that bar. The next real step is to obtain a parent name or create a controlled ENSv2 namespace, register actual subnames, write agent records, and verify resolution from a standard ENS client. Until then ENS remains a useful wallet display feature, not a claimed sponsor integration.
