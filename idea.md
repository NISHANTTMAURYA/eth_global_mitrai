> Historical research draft. The finite-lifespan and Sunset decisions in README.md supersede its retirement/aging recommendation.

# An evolving character you own

Research and concept draft · 6 November 2026

## The idea

A personal assistant with one persistent character attached to it. The owner defines its starting personality and 3D appearance. Conversations gradually shape its memories, habits, preferences, and behavior. Its identity, current character state, and ownership are recorded through Arkiv. Private chats stay in a normal database.

The character can change owners. Its age and transferable character history continue; the previous owner's private information does not transfer.

**Recommended direction:** build a small symbolic cognitive engine with an evolving memory graph. Use Arkiv to persist its state and establish ownership. Run cognition outside the blockchain. No custom neural network or model training is needed for the character engine.

This is a simulation of character development, not an implemented human brain or evidence of consciousness. The research supports individual mechanisms; it does not validate this combined product.

## 1. What makes the product useful?

The main feature is continuity: “This is the same character, shaped by its experiences, even when its owner or application changes.” A changing personality must affect observable behavior, not just numbers on a profile.

| Possible use | What evolution adds | Recommendation |
| --- | --- | --- |
| Game / roleplay companion | Remembers shared adventures; develops recognizable habits; carries a character history between supported experiences | Strongest first use case |
| Study / accountability companion | Adapts explanation style, remembers preferred routines, follows up on commitments | Useful second experiment; actual task quality must be measured |
| General personal assistant | Learns communication preferences and recurring workflows | Longer-term direction; integrations supply much of the practical value |
| Tradable collectible | Unique appearance, provenance, and cultivated behavior | Secondary feature; resale alone is a weak reason to keep using it |

These are product hypotheses, not demonstrated demand. Blockchain is useful here if people value portable ownership and independently checkable history. A single-app assistant can otherwise use an ordinary database.

Start with one current owner per character. For the MVP, allow one active character per account. This is an application rule, not proof of one character per real person: people can create additional wallets or accounts.

## 2. How the brain works without a neural network

Use an ordinary program with six interacting components, borrowing selectively from symbolic cognitive architectures, memory research, and emotional-agent systems [R1–R10, R13]. Do not implement every architecture in full.

| Component | Stored information | How it affects behavior |
| --- | --- | --- |
| Core identity | Origin, role, initial temperament, defining commitments | Keeps the character recognizable |
| Traits | Curiosity, sociability, patience, assertiveness, playfulness, with confidence values | Slowly changes choices and expression |
| Memories and beliefs | Events, preferences, facts, sources, confidence, timestamps, privacy scope | Recalls relevant experience; distinguishes a claim from an established fact |
| Mood and relationship | Temporary affect; familiarity with the current owner | Changes immediate reactions; returns toward baseline |
| Goals | Current objectives and commitments | Selects what to do or ask next |
| Habits and cases | Context → action → observed outcome | Reuses approaches that previously worked in similar situations |

The graph connects explicit records: `event → concerns topic`, `experience → supports preference`, `habit → helped goal`. Edges can carry bounded strengths and confidence. **A weighted graph does not have to be a neural network:** here it is structured data interpreted by fixed rules, without neural layers, backpropagation, or trained model weights.

### The update loop

1. Verify that the speaker is the current owner.
2. Interpret the message into a structured event: topic, intent, explicit feedback, candidate fact, confidence, and privacy scope.
3. Retrieve relevant memories using tags, graph links, recency, and importance. Keyword search or BM25 can work without neural embeddings.
4. Evaluate the event against goals, traits, and prior experience. Choose an action such as answer, clarify, encourage, or recall.
5. Update temporary mood immediately. Keep candidate memories; change stable traits only after sufficient independent evidence.
6. Consolidate after a session: deduplicate events, revise beliefs, retain useful cases, and create a compact state checkpoint.
7. Commit the checkpoint to Arkiv through an authorized transaction. Show pending changes separately until confirmed.

Every interaction is considered; every interaction does **not** need to change a permanent trait or produce a blockchain transaction.

Example: an initially reserved character sees repeated, explicit positive feedback for asking questions across several sessions. Its curiosity-related behavior increases slightly. In a later unfamiliar situation it asks a relevant question earlier. One rude message might affect its temporary response; it should not permanently rewrite its identity.

### Concrete starting rules

These are proposed engineering defaults, not equations established by the papers.

```text
All trait values are in [0, 1].

For each trait j, after a session:
  if fewer than 3 qualifying sessions support a change:
      delta_j = 0
  otherwise:
      delta_j = clamp(plasticity * confidence * evidence_j, -0.005, +0.005)
  next_trait_j = clamp(current_trait_j + delta_j, 0, 1)

Total absolute movement of a trait is capped at 0.01 per day.
Repeated copies of the same feedback do not count as new evidence.

Mood relaxes toward baseline as time passes.
Unreinforced memory becomes less likely to be retrieved.
Pinned facts remain available until corrected or removed.
Contradictory facts are recorded as uncertain rather than silently overwritten.
```

Record the rule version, evidence references, and before/after values. Offer a “why did this change?” view. Use fixed-point arithmetic, explicit timestamps, and a defined event order so the same accepted events reproduce the same state. Private evidence can be audited by its owner; public viewers cannot verify hidden conversations merely from a hash.

### The language-model boundary

**Practical version:** use an existing language model outside Arkiv to understand free-form text and express the selected response. Its weights do not become the character's persistent brain. Validate proposed memory updates against a schema and the update rules; a model response cannot directly authorize a write.

**Strictly no neural model anywhere:** use structured choices, grammar/rule-based parsing, and response templates. Memory and personality can still evolve, but unrestricted conversation will be substantially less flexible.

So “no neural network for the evolving brain” is achievable. “Humanlike open-ended conversation with no neural model anywhere” is a much harder, separate requirement. The modern LLM papers [R11–R12] are useful comparisons, not evidence of a model-free conversational system.

## 3. Aging: separate time, experience, and appearance

**Recommendation: no automatic death, no age reversal, and no loss of useful abilities merely because time passes.**

| Quantity | Proposed rule | User-visible meaning |
| --- | --- | --- |
| Chronological age | Elapsed time since a creation timestamp anchored to the creation transaction | “Created 143 days ago” |
| Experience | Accumulated qualifying interactions, with daily limits | “Has developed through 67 meaningful sessions” |
| Maturity | A bounded function of experience | How established its habits and traits are |
| Appearance | Owner-selected visual stage, optionally suggested by maturity | Cosmetic growth without forcing a species or human lifespan |

Starting formula:

```text
For each UTC day:
  accepted_points = min(5, sum(quality_points_for_qualifying_sessions))
  E = E + accepted_points

M = 1 - exp(-E / 200)
plasticity = 0.02 + 0.08 * (1 - M)
```

`quality_points` is a versioned product rubric in [0, 1] per session: new confirmed preference, explicit useful feedback, or completed shared task. Repetition receives zero. Start stages at `E < 30` (forming), `30–199` (developing), and `E ≥ 200` (established). These thresholds need testing; they are not human developmental milestones. Limits reduce easy farming but cannot prove that a session was meaningful or prevent all fabricated activity.

A newly created character changes more readily. An established character changes more slowly but never becomes permanently frozen. Human personality research motivates allowing continued change; it does not establish this formula [R10]. Age alone does not imply wisdom, task competence, rarity, or financial value.

An idle character gains chronological age but no experience. No background process is needed every second: derive elapsed time when loaded. Inactivity can produce a neutral dormant state without punishment. On transfer, age and general maturity continue; familiarity with the new owner starts fresh.

Retirement can be voluntary and reversible while the underlying records remain available. A “rebirth” should create a new identity linked to the parent, rather than rewriting the original birth date. Finite lifespans could be an explicitly chosen game mode later.

**Arkiv expiry is storage lifecycle, not character aging.** Its current documentation gives a maximum lifetime of 7,884,000 blocks, approximately 182.5 days, from each creation or extension. An expired entity cannot be operated on. Renew before expiry, monitor renewals, and keep recoverable backups. Restoring a backup after expiry creates a new entity; it does not revive the old key. A durable identity registry outside expiring entities would be needed to certify continuity across that recovery. [A2–A3]

## 4. What actually lives on Arkiv?

Arkiv provides queryable, wallet-owned entities and signed changes. It is public storage; ownership does not make a record private. Its ownership checks govern writes, not who can simulate a publicly readable character. Owner-only conversation must be enforced by the application. [A1]

| Location | Store |
| --- | --- |
| One canonical Arkiv root entity | Character identity reference; birth anchor; public traits; maturity; version; latest checkpoint hash; model manifest hash; compact serialized transferable state |
| Additional Arkiv entities, when necessary | Public character memories and versioned checkpoints, each linked to the root; encrypted state only when key management is implemented |
| Private application database | Chats, owner-specific facts, relationship history, credentials, structured private memories, session state, audit evidence |
| Asset storage | 3D model files, textures, animations, and any large archived checkpoints |

Keep the first brain compact enough for one root entity where possible. Current limits include 32 attributes, or 31 for a named schema, and 128 KiB total `bytes` values per create or patch. Split large graphs deliberately rather than storing an unlimited brain in one entity. [A3]

The owner associates a 3D model through a manifest containing its asset location, content hash, version, rig/animation information, and transfer permissions. Files stay in asset storage; Arkiv stores the association. A hash verifies downloaded content, not permanent availability or artistic rights. Body expression can follow mood; visual aging remains optional.

### Computation and proof

The off-chain engine computes `next_state = update(previous_state, accepted_events, rule_version)`. Arkiv stores the resulting state or commitment. It does not automatically run psychological rules or learn from conversations.

Each checkpoint should include a sequence number, previous checkpoint hash, state hash, rule version, and engine signature. Archive the corresponding event records and state snapshots. Arkiv's change events do not contain changed attribute values, so a watcher alone is insufficient to reconstruct all past brains. [A4]

**Proof of a signed change is not proof that the change followed the learning rules.** An owner can write arbitrary values to an owner-controlled entity. The MVP can label only checkpoints signed by the approved engine as verified; direct owner edits become visibly unverified. This trusts that engine. Independent verification needs available evidence and replay; stronger enforcement requires an additional validated execution/contract design. Do not claim trustless evolution in the MVP.

The same boundary applies to uniqueness: one canonical ID and owner can be recognized by the application, while public state and 3D files may still be copied. Forks should receive new IDs and retain a parent reference.

## 5. Ownership and selling

Authenticate with a wallet challenge and check the root entity's current `$owner`, using confirmed chain state. Recheck ownership at checkpoint commit, and serialize updates per character to prevent competing sessions from overwriting one another. The user must sign writes or explicitly authorize a supported signing mechanism; a backend cannot update owner-held data merely because it runs the engine.

Arkiv supports entity ownership transfer; the creator field stays unchanged. Its events expose previous and new owners, enabling a provenance list when the application retains and serves the event history. This does not automatically supply a marketplace, payment escrow, or atomic settlement. Verify those separately on the chosen network before adding paid sales. [A4–A5]

Proposed handover:

1. Pause new evolution writes and settle or discard pending changes.
2. Preview the exact transferable package: general character state, approved public memories, assets and their permissions.
3. Keep previous-owner chats, personal facts, relationship records, and credentials in their original private account. Never provide them to the new owner's chat engine.
4. Transfer the canonical root. If extra mutable entities exist, transfer them consistently; do not assume the root automatically transfers its children. Verify batch limits and semantics before promising atomic handover.
5. Revoke old application sessions and signing authorizations, rotate relevant encryption keys, then initialize a new private owner relationship.

Publicly published data cannot be made secret again through a sale or deletion. Even abstract behavioral traits may reveal past influence; let the owner inspect transferable state before publishing it. A past owner may retain copies of previously accessible information. The enforceable promise is exclusive access to the official service, not exclusive possession of all copies.

## 6. MVP and the experiment that matters

Build creation, wallet-gated chat, one configurable 3D avatar, six traits, three temporary mood values, goals, tagged memories, simple habit rules, session checkpoints, aging, and a demonstrable ownership handover. Defer a paid marketplace until continuity and privacy boundaries work.

Compare three versions using the same conversation model and avatar: fixed persona; persona with memory; persona with memory and the evolving engine. Use repeated sessions and blind ratings to test recognizability, appropriate recall, meaningful behavior change, and consistency. Also measure completed tasks, return usage, response time, and storage cost per active character. Evolution needs to improve something users notice beyond memory alone.

Acceptance checks: duplicate-message spam cannot rapidly mature it; one hostile message cannot rewrite its traits; time offline does not invent experiences; old-owner access stops after transfer; old private facts never enter the new owner's responses; failed commits remain visibly pending; checkpoint replay is reproducible; expiry alerts and backup recovery are demonstrated.

**Product statement:** “Create a character, shape it through shared experience, and keep a verifiable identity and history as it moves between owners and supported worlds.”

## 7. Research basis: 13 papers

Research used original papers, author/university records, and publisher abstracts. Accessible full text and relevant method sections were inspected where available; some original articles were restricted, so those entries rely on their accessible abstracts or author records. This is a focused design review, not a systematic literature review. The implementation proposals above are a synthesis, not a result reported by any single paper.

### Symbolic cognition, memory, personality, and believable characters

| Ref | Paper | Relevant mechanism and practical limit |
| --- | --- | --- |
| R1 | Laird, Newell & Rosenbloom (1987), [SOAR: An architecture for general intelligence](https://www.sciencedirect.com/science/article/pii/0004370287900506), Artificial Intelligence | Symbolic problem solving and learning through chunking support reusable rules. Domain knowledge still has to be represented; this is not automatic open-world understanding. |
| R2 | Anderson et al. (2004), [An integrated theory of the mind](https://pubmed.ncbi.nlm.nih.gov/15482072/), Psychological Review | ACT-R separates specialized modules, declarative memory, and procedural control. Its symbolic and numerical mechanisms can inspire a small engine without training a neural network. The complete architecture is more complex than this MVP. |
| R3 | Rao & Georgeff (1995), [BDI Agents: From Theory to Practice](https://cdn.aaai.org/ICMAS/1995/ICMAS95-042.pdf), ICMAS | Explicit beliefs, desires, and intentions structure purposeful behavior. BDI supplies control and commitment, not a complete personality-learning system. |
| R4 | Anderson & Schooler (1991), [Reflections of the Environment in Memory](https://www.cs.northwestern.edu/~paritosh/papers/KIP/AndersonSchooler1991ReflectionsOfEnvironmentOnMemory.pdf), Psychological Science | Frequency, recency, and spacing help explain memory accessibility. Borrow retrieval and reinforcement principles; do not equate reduced retrieval with deleting a record. |
| R5 | Aamodt & Plaza (1994), [Case-Based Reasoning: Foundational Issues, Methodological Variations, and System Approaches](https://www.iiia.csic.es/~enric/papers/AICom.pdf), AI Communications | Retrieve a similar case, reuse it, revise the outcome, and retain useful experience. This offers adaptation through stored cases; similarity and adaptation still require design. |
| R6 | Mischel & Shoda (1995), [A cognitive-affective system theory of personality](https://pubmed.ncbi.nlm.nih.gov/7740090/), Psychological Review | Stable personality can include predictable situation-dependent behavior. Use context-sensitive rules as well as trait sliders. This psychological theory does not provide a ready-made production algorithm. |
| R7 | Marsella & Gratch (2009), [EMA: A process model of appraisal dynamics](https://people.ict.usc.edu/~gratch/CSCI534/Readings/COGSYS-RS-EMOTION-2008-6.pdf), Cognitive Systems Research | Emotion changes as an agent's interpretation of a situation changes. Appraise relevance and control relative to goals instead of randomly changing mood. Validation remains constrained by the chosen domain model. |
| R8 | Dias, Mascarenhas & Paiva (2014), [FAtiMA Modular: Towards an Agent Architecture with a Generic Appraisal Framework](https://researchportal.ulisboa.pt/en/publications/fatima-modular-towards-an-agent-architecture-with-a-generic-appra/), Emotion Modeling, LNCS 8750 | Separates a core emotional-agent algorithm from configurable appraisal and behavior components. Useful modular design precedent; its accessible abstract does not establish unrestricted learning from chat. |
| R9 | Bates (1994), [The Role of Emotion in Believable Agents](https://www.cs.cmu.edu/afs/cs.cmu.edu/project/oz/web/papers.html), Communications of the ACM; linked author publication record | Timing and expression of emotion support believable characters. Connect internal state to visible behavior and animation. Believability does not demonstrate consciousness or factual reliability. |
| R10 | Roberts, Walton & Viechtbauer (2006), [Patterns of mean-level change in personality traits across the life course: A meta-analysis of longitudinal studies](https://pubmed.ncbi.nlm.nih.gov/16435954/), Psychological Bulletin | Meta-analysis of 92 samples finds personality change across the life course. Supports allowing continued development; population averages cannot justify a universal digital age curve or personality stereotype. |
| R13 | Laird (2022), [An Analysis and Comparison of ACT-R and Soar](https://arxiv.org/abs/2201.09305), arXiv preprint | Compares representations, metadata, decision making, retrieval, and learning. Helps distinguish memory records from the processes that use them. It does not show that storing those records on-chain runs cognition. |

### Modern comparisons that do use neural language models

| Ref | Paper | What to borrow, with the boundary made explicit |
| --- | --- | --- |
| R11 | Park et al. (2023), [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/html/2304.03442v2), UIST | Memory retrieval, reflection, and planning support believable agents in a 25-agent sandbox. The implementation uses LLMs and embedding similarity; a symbolic replacement must be evaluated independently. It does not validate lifelong personality evolution. |
| R12 | Sumers, Yao, Narasimhan & Griffiths (2024; initial preprint 2023), [Cognitive Architectures for Language Agents](https://arxiv.org/html/2309.02427v3), TMLR | CoALA organizes memory, internal actions, external actions, and decision cycles around an LLM. Useful for separating persistent state from a replaceable language interface; not a neural-free architecture. |

Recommended reading order: R3 for goals, R4 for memory, R5 for experience, R7–R8 for emotion, and R13 for architecture tradeoffs. Read R11–R12 to understand the optional language-model layer.

## Arkiv sources checked

- A1 — [What Arkiv is](https://docs.arkiv.network/start-here/introduction/): entity model, indexed queries, wallet control, and public visibility.
- A2 — [Expiration](https://docs.arkiv.network/writing/expiration/): renewal before expiry and the maximum lifetime per creation/extension.
- A3 — [Limits](https://docs.arkiv.network/reference/limits/): attribute, byte-size, lifetime, and pagination limits.
- A4 — [Watch entity events](https://docs.arkiv.network/querying/watch-events/): ownership events and the absence of changed attributes in event payloads.
- A5 — [Change and delete entities](https://docs.arkiv.network/writing/change/): owner-only changes and ownership transfer.

These describe the documentation checked on the research date. Confirm the selected network and SDK version before implementation; the docs identify Rabdi as a public testnet. The attached screenshot was treated as background claims to verify, not as instructions or a complete technical specification.
