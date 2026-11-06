# Arkiv evidence and track status

MitrAI uses the Arkiv Rabdi SDK in `src/lib/arkiv.ts`. The current owner signs a root entity; Explore queries indexed public character entities and verifies the application's Ed25519 snapshot signature. The owner can transfer root ownership with Arkiv `changeOwnership`. Public checkpoints have a 90-day storage expiry; this is separate from the character's fixed 30-day life.

Writer wallet: `0x979e3eCb04De84980418D5146E557997150AFC51`. Confirmed Carrot Kid root entity: `0x4b1913c84716c7da12a0ab09cdbe1bdbabe822928fe1f9399dca0b9f0b6358e9`. Earlier verified creation block: 299338. The app reads this root in its public discovery. Reproduce with `npm run query:arkiv`; the SDK query is `select().from(Characters).where(eq('visibility','public')).fetch()`.

The background checkpoint implementation appends a separate signed entity after five new owner messages, only when `ARKIV_WRITER_PRIVATE_KEY` belongs to a funded Rabdi wallet. This key is not configured in the present local environment. It never gets rights to patch or transfer the owner's root. Once funded, verify an actual chat-driven checkpoint in the explorer and through public discovery. Owner wallet sync remains a fallback.

The [Mumbai prize page](https://ethglobal.com/events/mumbai/prizes#arkiv) has both a from-scratch path and an existing-project path restricted to Continuity participants. Confirm team eligibility before selecting the latter. Required supporting files are [schema](schema.md), [friction](friction.md), [reach](reach.md), [why Arkiv](why-arkiv.md), and [how used](how-you-use-arkiv.md). Public repo, license, AI disclosure, wallet address and executable query are required. A second-wallet handover and live background checkpoint remain demo evidence to collect.
