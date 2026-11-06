# ENS Subname & Text Record Schema

## 1. Domain Hierarchy
- **Root TLD:** `.eth`
- **Parent Domain:** `mitrai.eth`
- **Companion Subname:** `<slug>.mitrai.eth`

### Derivation Rule:
```typescript
const slug = character.name
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'companion';

const subname = `${slug}.mitrai.eth`;
```

## 2. Cryptographic Node Hash
Computed using standard EIP-137 `namehash`:
```typescript
import { namehash } from 'viem/ens';
const node = namehash('milo.mitrai.eth');
// 0xe726b99446766e9072583e643f08ff792923181509cc1da146ad7d88265a1df7
```

## 3. Standard EIP-2304 Text Records

| Record Key | Description | Example Value |
| :--- | :--- | :--- |
| `arkiv.entity` | Linked Arkiv on-chain entity key for verifiable state & memories | `0xabcdef1234567890abcdef1234567890abcdef12...` |
| `agent.status` | Current mortal lifecycle stage | `Dawn` \| `Bloom` \| `Golden` \| `Legacy` |
| `agent.model` | 3D avatar & skeletal model ID | `fox` \| `robot` \| `human` |
| `agent.guardian` | Wallet address or primary ENS of the current mortal guardian | `0x1111111111111111111111111111111111111111` |
| `agent.epoch` | Ownership epoch count incremented on each handover | `0`, `1`, `2` |
| `agent.lifespan` | Remaining mortal time before immutable Sunset | `14d remaining` |
| `agent.availability` | Adoption status | `showcase` \| `offers` \| `transfer` |
| `description` | Companion introduction and summary tagline | `A little curious. A lot of possibility.` |
| `url` | Interactive profile URL | `https://mitrai.app/characters/milo` |

## 4. Sample Gateway Payload (GET `/api/ens/milo.mitrai.eth`)
```json
{
  "resolved": true,
  "name": "milo.mitrai.eth",
  "parent": "mitrai.eth",
  "node": "0xe726b99446766e9072583e643f08ff792923181509cc1da146ad7d88265a1df7",
  "resolver": "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41",
  "owner": "0x1111111111111111111111111111111111111111",
  "records": {
    "description": "A little curious. A lot of possibility.",
    "arkiv.entity": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "agent.model": "robot",
    "agent.status": "Bloom",
    "agent.guardian": "0x1111111111111111111111111111111111111111",
    "agent.epoch": "0",
    "agent.lifespan": "13d remaining",
    "agent.availability": "transfer",
    "url": "https://mitrai.app/characters/milo"
  },
  "updatedAt": 1793487180206
}
```

