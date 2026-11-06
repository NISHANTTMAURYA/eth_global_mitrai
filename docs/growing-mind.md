# MitrAI: a curious, gradually developing mind

Research and implementation review · 6 November 2026

The product should feel like a continuing relationship with a recognizable character: it remembers what mattered, asks about the world it actually has evidence for, changes a little through repeated shared experiences, and sometimes starts a useful conversation. Its job is not to maximize how many messages the user sends. Character identity and agency are simulated by explicit state and rules; this work does not establish biological fidelity or consciousness.

## What the research supports

**Generative Agents** combines recorded experiences, retrieval, reflection and planning to produce believable behavior in a sandbox. That motivates a dated memory stream and a plan that survives the last reply. It does not demonstrate that an always-on companion should constantly interrupt users. This implementation borrows a subset of the architecture, not its full simulation or evaluation. [Park et al., 2023](https://arxiv.org/abs/2304.03442).

**CoALA** separates memory, the available actions and the process that selects them. For MitrAI, a reply, a private observation, an adaptation proposal and a planned check-in are separate outputs. A model proposal is validated by application code before any stored change or delivery. The language model expresses the character; its model weights are not the persistent character identity. [Sumers et al., 2024](https://arxiv.org/abs/2309.02427).

**LongMemEval** tests cross-session recall, temporal reasoning, changing knowledge and knowing when evidence is insufficient. Keeping a longer prompt alone does not establish reliable memory. MitrAI now retains dated original messages, searchable evidence and keyed observations, and instructs the model to respect corrections and uncertainty. These are design choices informed by the benchmark; no LongMemEval score is claimed. [Wu et al., ICLR 2025](https://arxiv.org/abs/2410.10813).

**Redefining Proactivity for Information Seeking Dialogue** studies relevant additional information and follow-up questions as forms of initiative. A good opening is grounded in the current topic; repeating a generic question at the end of every message is a poor product interpretation. We combine this conversational initiative with a separate, user-controlled scheduler. That scheduler and its timing defaults are engineering choices, not results validated by the paper. [Lee et al., 2024](https://arxiv.org/abs/2410.15297).

The existing library's Soar, ACT-R, BDI, appraisal, case-based reasoning and CAPS readings remain useful: separate durable memories from immediate context, represent commitments, reuse supported experiences, and let behavior vary with the situation without rewriting identity. The original `idea.md` and `docs/brain-spec.md` already argue for this symbolic-engine boundary. Relevant extracted passages were reviewed; this is not a systematic review of every page. The library now contains 13 downloaded papers.

## Implemented interaction loop

1. Authenticate the current owner and ownership epoch. Public auditions remain isolated and do not cultivate private state.
2. Archive the accepted conversation with timestamps. Retrieve scoped full-text evidence and relevant private observations, together with the recent window, original traits, habits, open check-in subjects and an explicit local calendar.
3. Ask the configured model for short message bubbles and a bounded private proposal: observations, supported communication preferences, and reasons/times to check back.
4. Require each proposal to quote the current user's actual words. Reject invalid structures and ungrounded source references. A matching quote supports provenance; it is not mathematical proof that a paraphrase is correct.
5. Save useful keyed observations. An updated key supersedes the current belief while the original dated conversation stays in the archive. The Mind panel lets the owner inspect the evidence.
6. Apply gradual adaptation only after independent spaced evidence. At least three distinct 30-minute sessions spanning 24 hours must support a direction. Each accepted change is at most 0.5 points; total movement is capped at one point per UTC day, and each style axis stays within 15 points of its starting identity and the 0–100 range. Repeated copies do not count. These defaults require product evaluation.
7. Schedule grounded future events and one quiet-conversation reconnection. Model semantics choose a meaningful reason; there is no `if interview`, `if exam` or `if sad` scheduling regex.
8. A durable worker checks timing, quiet hours, frequency, current owner, ownership epoch and Sunset, generates a fresh contextual opening, then writes the private inbox/message and channel outbox. It rechecks activity after generation so a newly active conversation suppresses a stale check-in.

The current adaptation axes are curiosity, warmth, playfulness and brevity. User-specific evidence remains private. Saving a character checkpoint can adopt general trait changes; publishing still needs the owner's signed Arkiv sync. Personal facts and evidence quotes are never automatically published. The character grows in communication and shared interests while retaining its creator-defined identity; it does not simply copy every opinion, mood or habit of its owner.

## A contextual example

The live Vertex validation used an unfamiliar event: a pottery showcase tomorrow from 14:00 to 16:00. The model recorded the event and nervousness with exact source quotes and proposed checking back at 16:30 the following day. An initial run exposed a relative-date error; the prompt now supplies the authoritative local date, tomorrow's date and clock, and the application rejects invalid, past or post-Sunset schedules. This improves grounding but does not guarantee all natural-language dates are interpreted correctly. Ambiguous times should produce a clarifying question.

An actual owner might later receive: “How did the showcase go? Was there one piece you were especially happy to share?” Its content is generated at delivery using the character and stored conversation. The app does not assume success, failure or a changed mood.

## Proactive delivery

Default: one reconnection after 90 minutes, configurable to 60–120 minutes; at most two check-ins per rolling day; quiet from 22:00 to 08:00 in the configured timezone. One unanswered inactivity check-in does not rearm itself. A later event can still justify a separate check-in within the limit. Users can disable proactive behavior, change timing, cancel a plan, or request that it stop. The explicit preference toggle is reliable even if the model misses natural-language cancellation.

A Check-ins inbox is available across the app, and private check-ins appear in the owner's conversation without synthesizing a fake user message. Browser push uses the Push API, a service worker and user-granted permission. Resend email uses an opted-in recipient, a verified sender and a durable retry/idempotency outbox. External notifications contain a generic private-inbox notice rather than sensitive event or mood details. [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API), [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

The worker runs each minute while a persistent Node server is alive, or through the standalone worker/secured cron endpoint. Persistence does not keep a stopped server running. Email credentials and sender are not configured in this workspace, so real email delivery has not occurred. Real browser push delivery also needs permission and platform testing. See `docs/proactive-setup.md` for operations.

## Storage: the exact answer

The active local database is `.data/mitrai.sqlite` under the application repository, or the same filename in `MITRAI_DATA_DIR`. It uses Node's `node:sqlite` with WAL mode. The `messages` table retains the latest 100 messages for display. New `conversation_events` and scoped `conversation_search` tables preserve and retrieve future accepted history beyond that window. `private_minds` stores observations, evidence and style development. Other new tables hold preferences, leased jobs, notifications, delivery outboxes and push subscriptions.

The database is not encrypted at rest. Application owner/session checks isolate users, but the server administrator can read the file. Backups must remain private. Older messages discarded before the archive was introduced cannot be recovered. Private state is not stored on Arkiv; changing wallets does not grant the new owner access to the previous ownership epoch.

## Arkiv: implemented code, incomplete live proof

The existing SDK integration supports wallet-signed create/patch, public discovery queries, verified snapshots and ownership transfer. The local audit found zero characters with an entity key and no configured access key. There is no live writer address, transaction receipt or demonstrated user-visible chain read to cite yet.

For the Mumbai prize, the final demo needs a real current-testnet write and a user-facing read, plus writer addresses, a reproducible query, schema and criterion files, a public licensed repository and AI-use disclosure. Those evidence requirements remain outstanding even though the code paths and documentation exist. [ETHGlobal's Arkiv criteria](https://ethglobal.com/events/mumbai/prizes#arkiv).

Arkiv should carry portable public identity, approved general development, ownership and a lifetime checkpoint. Private relationship context and delivery scheduling belong off chain. This is a growing character whose approved public state can live on Arkiv; cognition does not run inside the blockchain. Storage expiry and the character's finite Sunset remain separate.

## Useful character-agent directions

| Direction | What the continuing mind adds | Possible initiative |
|---|---|---|
| Learning companion | Learns explanation preferences and recalls the learner's own progress | Ask about a practice attempt or revisit an unresolved concept |
| Creative collaborator | Remembers a project's direction and the user's recurring interests | Ask how a sketch, piece or story developed |
| Career rehearsal partner | Remembers a user-stated goal and preferred feedback style | Offer a short rehearsal, then ask how the event went |
| Reflective journal companion | Recalls user-reported context without inventing a diagnosis | A gentle, optional check-in after a difficult conversation |
| Character/world-building companion | Develops shared lore while separating fictional and real facts | Start a scene linked to an unfinished adventure |

These are potential uses of the same semantic planner, not hardcoded product categories. Autonomous inbox management, sending mail to third parties, live web/news feeds, financial actions and externally verified goal completion are not implemented by this check-in engine. Broader mood dynamics, independent reflective planning and user studies remain further work.

## What to evaluate next

Compare fixed persona, memory-only and evolving-memory versions using the same inference model. Measure correct recall and corrections, dated event interpretation, whether adaptation is recognizable without losing identity, useful task progress, welcome versus unwanted outreach, cancellations, and return latency. Test changing ownership and Sunset separately. A longer chat or more notifications alone does not show that the product is better.

## Verified implementation run

A disposable production-server test exercised real Vertex inference, authenticated private chat, archived observation/planning persistence, and a real generated check-in after advancing only the fixture clock. The resulting notification appeared in both the private inbox and chat. Evidence: request ID `Ur3taqPOLMWo7PkP2euBoAY`; one recorded observation, one dated terrarium event plan, one proactive message, zero external deliveries. The disposable test database was removed afterward. This is functional evidence, not a user study or a live Arkiv transaction.

The authored greeting was restored from the Git implementation at `96fec7e`. Its current Wave variant excludes torso, leg, neck and head tracks, keeping the character upright while retaining authored arm/hand movement. New VRM characters use authored clips through their normalized rigs. Greeting reach is included in the stable initial camera frame. Browser checks covered the upright Cactus greeting and the Check-ins controls; automated tests cover both new VRM rigs.
