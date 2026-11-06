# MitrAI

A character begins once, learns gradually, and lives for a fixed time. Choose one available 3D form, give it a name and personality, connect a wallet, and confirm its birth on Arkiv. Chat shapes its private understanding and occasional public brain checkpoints. Others can visit its page and join its public community. An owner can invite requests to continue its story. At Sunset, conversation and transfer stop; its public story remains readable.

## The simple journey

1. **Create:** select a unique form, edit the starting character and reusable voice, connect a wallet, and sign its Arkiv birth. A form is reserved in Postgres and checked again before birth; one form supports one canonical character in this app.
2. **Grow:** chat with the owner. Conversation, personal observations and check-in plans stay private in Supabase Postgres. The persona proposes gradual changes; the application validates and records evidence. Speaking, lip sync and available gestures accompany replies.
3. **Share:** publish approved memories and highlights to the wallet-owned Arkiv root. Explore reads and verifies signed public state. Each published character has a public community where connected visitors can join and post.
4. **Continue:** the owner can show an optional asking price in **test tGLM**; visitors can make an unpaid bid or adoption request. The owner can accept and transfer the Arkiv root. **There is no payment or escrow contract yet. A bid is not a completed purchase.** Private chats and the old owner's personal profile do not transfer.
5. **Remember:** chronological age increases from confirmed Arkiv birth; remaining time decreases. The standard life is 30 days. Chat can deepen maturity but never extend or reset the clock. At Sunset the character and community become read-only Legacy.

Explore states this flow and offers an “Owned by me” filter. Visitors can audition a public character without changing its mind. See [the product flow](docs/product-flow.md) and [the original idea](idea.md).

## Run locally

Node 22.13+ is required. Copy `.env.example` to `.env.local` and configure `DATABASE_URL` with a Supabase Postgres transaction pooler URL. Set an Arkiv Rabdi access key for reliable reads. Configure `OG_API_KEY` and `OG_MODEL` for 0G Private Computer; otherwise Vertex AI can be selected with its listed variables. Keep keys server-side.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

Open `http://localhost:3000`. Connect a wallet holding Rabdi test tGLM, select an unused form, and sign the birth transaction. Published real personas appear in Explore. `MITRAI_DEMO_MODE=1` enables clearly local rehearsal records and a 10-minute demo lifespan; leave it off for sponsor judging.

The app runs its idempotent schema SQL from `supabase/migrations/202611060001_initial.sql`. For an isolated HTTP integration run, set `TEST_DATABASE_URL` to a separate test database and use `npm run test:integration`.

## Sponsor integrations and evidence

| Sponsor | Product use | Verified state | Remaining work |
| --- | --- | --- | --- |
| Arkiv Rabdi | Owner-controlled root, public discovery, signed checkpoints, ownership transfer | Carrot Kid’s root belongs to `0x979e3eCb04De84980418D5146E557997150AFC51`; a separately funded app wallet created and read back a signed checkpoint; see [Arkiv evidence](arkiv/README.md) | Demonstrate a chat-triggered checkpoint and second-wallet transfer |
| 0G Private Computer | Persona reply generation in the main chat flow | A direct test call returned provider `0G` and request ID; see [0G evidence](0g/README.md) | Judge should try a live owner conversation and inspect request IDs |

The [ETHGlobal Mumbai prize page](https://ethglobal.com/events/mumbai/prizes) lists 0G Private Computer and Arkiv from-scratch and Continuity-only existing-project paths. We cannot claim a Continuity-only prize without confirmed eligibility. Judge the working integrations, not proposed labels. See the concrete readiness matrix and video outline in [the submission checklist](docs/submission-checklist.md).

Arkiv query: `npm run query:arkiv`. The local app writer `0x2c38f3866086521f8C278D4f26567D59246ABD74` is configured and funded; its independent checkpoint write and signed readback succeeded on Rabdi. After five new owner messages, the app schedules a public checkpoint without another wallet popup. That chat trigger has not yet been demonstrated live. The writer cannot patch or transfer the user's root. Owner wallet sync remains a fallback. A checkpoint contains approved public state, never raw private chat. Arkiv entity expiry is 90 days, separate from the 30-day character life. A global Arkiv event watcher is disabled by default because it previously exhausted the small Supabase connection pool; explicit receipts and owner checks remain active.

## Value and transfer

There is no objective algorithmic value for a developing personality. The owner sets an ask; visitors bid based on remaining lifetime, public history, personal interest and evidence they can inspect. This is price discovery, not an appraisal. Auction research supports letting participants reveal value through bids; NFT research finds observable characteristics matter, but prices are contextual ([Cramton 1998](https://www.sciencedirect.com/science/article/pii/S0014292197001220), [Horky et al. 2022](https://www.sciencedirect.com/science/article/pii/S1544612322002495)). A real paid buy/sell flow requires atomic payment and Arkiv ownership settlement or escrow. This repository does not yet have one.

## Privacy, limits and AI use

Supabase Postgres holds private messages, owner-scoped mind profiles, public community posts, offers, sessions, and scheduled check-ins. A new owner gets a new private epoch. The app's Ed25519 key signs sanitized public snapshots; the owner's wallet controls the root. Community posts are public. Resend email and web push require configured opt-in credentials.

The app was developed with AI assistance for architecture, code, documentation, and testing. Humans must review source licenses for imported 3D models before public redistribution. See [LICENSE](LICENSE), [Arkiv judging files](arkiv/), and [0G notes](0g/). No paid marketplace claim is made.
