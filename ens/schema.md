# Proposed ENS profile records — not deployed

There is no active ENS schema in production today. The fields below are candidates for a future ENSv2 Permissioned Resolver bundle; they must not be described as live records until written onchain and independently resolved.

| Key | Public meaning |
| --- | --- |
| `description` | Character’s public tagline |
| `url` | Public MitrAI character page |
| `io.mitrai.arkiv.entity` | Public Arkiv root entity key |
| `io.mitrai.owner` | Current public owner wallet |
| `io.mitrai.status` | Public lifecycle state |

Never publish private messages, personal observations, emails, push tokens, or private owner profile data in ENS records. The record writer must resolve the current resolver dynamically and have a narrowly scoped permission.
