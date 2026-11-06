# Proposed character ENS records

No records in this table are currently written to ENS. `src/lib/ens.ts` generates a **preview JSON document** with a computed namehash and these fields:

| Key | Intended meaning |
| --- | --- |
| `description` | Public tagline |
| `arkiv.entity` | Arkiv root entity key |
| `agent.model` | Character form identifier |
| `agent.status` | Current life stage |
| `agent.guardian` | Current owner wallet |
| `agent.epoch` | Ownership handover count |
| `agent.lifespan` | Remaining life |
| `agent.availability` | Showcase or handover status |
| `url` | Character page |

The proposed `mitrai.eth` parent did not resolve in a live Ethereum RPC check on 6 November 2026. The app must first control a real parent namespace and use an ENSv2 registry/resolver before claiming on-chain records.
