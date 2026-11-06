# Configure live MitrAI

Checked against source and official docs on 6 November 2026. Demo flow is implemented and tested; live wallet writes/inference remain unverified until credentials are configured.

1. In the project folder, copy `.env.example` to `.env.local`.
2. Open https://pc.0g.ai/dashboard/api-keys, sign in and create an API key. Ensure the account has compute credit; use the sponsor-provided hackathon credits if available. Pick a fast text model supporting Chat Completions at https://pc.0g.ai/models and copy its exact API model ID. Set `OG_API_KEY` and `OG_MODEL`; retain `OG_API_URL=https://router-api.0g.ai/v1`. Reference: https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/overview.
3. Open https://hub.arkiv.network/access-keys, connect a browser EVM wallet, and obtain an access key. Set `NEXT_PUBLIC_ARKIV_ACCESS_KEY`. For the command-line query script, also set `ARKIV_ACCESS_KEY` to the same value in its shell environment. Arkiv RPC access keys are public app configuration, not wallet keys; apply supported restrictions following Hub guidance.
4. Leave `NEXT_PUBLIC_ARKIV_RPC` empty for normal Rabdi setup. The SDK builds the keyed endpoint automatically. A custom explicit RPC overrides that URL and must carry its own correct authentication.
5. Open https://hub.arkiv.network/faucet with the same wallet and claim test tGLM. No mainnet funds or wallet private key are required by this application.
6. Run `npm run dev` and open http://localhost:3000. Restart after editing environment variables. Sign in with **Connect browser wallet**, not the demo identity. Create a fresh character under the wallet session; demo identities cannot turn demo records into real chain records.
7. Send a message. A configured real call should display `0G` and a provider request ID. If it fails, record the error; configuration presence alone does not prove inference success.
8. Publish the character, then open **The mind → Sync to Arkiv**. Approve the requested testnet write in the wallet. Record the entity key, transaction hash and writer address. **Discover on Arkiv** queries and imports approved snapshots; existing local records are not overwritten.

Minimum `.env.local` entries:

```dotenv
OG_API_URL=https://router-api.0g.ai/v1
OG_API_KEY=YOUR_0G_API_KEY
OG_MODEL=EXACT_CHAT_MODEL_ID_FROM_0G
NEXT_PUBLIC_ARKIV_ACCESS_KEY=YOUR_ARKIV_ACCESS_KEY
NEXT_PUBLIC_ARKIV_RPC=
APP_ORIGIN=http://localhost:3000
```

Never paste wallet private keys into the application or chat. Keep the 0G key server-only. Do not commit `.env.local` or `.data/`. No external database setup, paid voice API, World or Swarm configuration is needed for the current local implementation. The local database and Ed25519 verifier are initialized automatically; preserve `.data/` for continuity. Deployment beyond the local server needs durable storage and a matching `APP_ORIGIN`.

Outstanding for hackathon submission: a real 0G request, a real Arkiv write/read/transfer, recorded evidence and hosted trial URL. Sponsor eligibility is not established by installing or configuring an SDK.
