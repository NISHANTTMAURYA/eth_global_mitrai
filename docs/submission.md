# Submission handoff

Status: planning only; no deployments, users or integrations claimed.

Primary target: Arkiv Build on Arkiv, from scratch if eligible. Optional partners: 0G Private Computer and World IDKit. Swarm bonus optional within Arkiv. Verify current selections in the submission dashboard; consult [Mumbai information](https://ethglobal.com/events/mumbai/info).

Before submitting:

- Publish real implementation in a public repository with an open-source license and meaningful commit history.
- Disclose prior materials, this planning package and AI-assisted research/design/code/assets accurately.
- Supply live URL, setup commands, environment example, chain configuration, writer wallet addresses, working query and demo entity keys.
- Populate every Arkiv evidence draft with real observations. Do not present hypothetical users, performance, costs or sponsor friction as measured.
- Capture actual 0G request IDs, working response flow and the consequence of removing inference.
- If World is included, document successful and failed verification and demonstrate that backend enforcement protects creation.
- Record a human-narrated demo under three minutes to satisfy 0G's published limit, while checking all event video rules in the participant dashboard.
- Include team/contact details and any actual deployed contract addresses. An application that only uses Arkiv entities should say no custom contracts deployed.
- Preserve publicly available papers for local reference; public repo distribution must respect each paper's license. Link papers rather than assuming every PDF can be republished under the code license.

Outstanding: implementation, actual chain configuration, sponsor credentials, integration evidence, user feedback and final eligibility confirmation.

## Current implementation evidence

The local MVP and automated API tests now exist; see `state.md` for exact passing checks and limits. Public snapshots have pinned-verifier Ed25519 proofs, and local demo data is clearly labeled. Run `npm run query:arkiv` to reproduce the public SDK query after live records are written. Wallet writer addresses, live entity/transaction keys, live 0G request IDs, hosted demo URL and actual tester evidence are still pending. Browser visual QA was blocked by denied preview access. Do not claim these outstanding items were completed.
