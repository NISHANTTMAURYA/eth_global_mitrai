# MitrAI brain mock — implementable specification

Status: proposed engineering design informed by the local papers. No custom neural model training. The full product can use a pretrained language model for interpreting and expressing language. This engine is a small cognitive simulation; biological fidelity is not established.

## Research decisions

Use Soar's distinction between working, semantic and episodic memory (papers 01–02). Use ACT-R's separation of stored chunks and the processes operating on them (07). Use BDI's beliefs, goals and commitments for action choice (03). Use recency/frequency from memory research (04), explicit case reuse (05), goal-relative appraisal (06), and conservative habit formation inspired by production compilation (09). CAPS (08) informs situation-dependent character behavior; it is not evidence that its entire account is a neural-free executable architecture. Papers 10–11 explicitly depend on language models and guide only the conversational integration.

Do not claim to reproduce full Soar, ACT-R, BDI or human development. Case-based reasoning literature includes several kinds of implementation, including connectionist ones; ours chooses explicit structured matching. Updating counts or rules is still computational learning in the broad sense, even without training a neural network.

## Canonical state

```json
{
  "schemaVersion": 1,
  "characterId": "application-generated-id",
  "version": 4,
  "previousCheckpointHash": "hash-of-v3",
  "birthCommitment": "hash-of-id-birth-duration-seed",
  "lifespanSeconds": 2592000,
  "identity": {"name": "Mira", "role": "daily companion", "seed": "curious and reserved"},
  "traits": {"curiosity": 6200, "patience": 7100, "sociability": 4200},
  "mood": {"valence": 500, "arousal": 2500, "updatedAt": 1793923200},
  "goals": [{"id": "g1", "kind": "support_shared_goal", "priority": 7000, "status": "active"}],
  "beliefs": [{"id": "b1", "subject": "self", "predicate": "enjoys", "object": "puzzles", "confidence": 7500, "sourceEventIds": ["e1"]}],
  "episodes": [{"id": "e1", "summary": "Completed a puzzle together", "tags": ["puzzle"], "importance": 6000, "scope": "public-approved"}],
  "habits": [{"id": "h1", "contextTags": ["planning"], "action": "offer_short_steps", "successCount": 3, "failureCount": 1}],
  "links": [{"from": "e1", "relation": "supports", "to": "b1", "weight": 6000}],
  "experience": {"qualifiedSessions": 7, "points": 5000},
  "modelManifestHash": "content-hash",
  "ruleVersion": "mitrai-v1"
}
```

Integers represent bounded scores on a documented scale, generally 0–10,000; signed mood values can use −10,000 to +10,000. Store current owner through Arkiv's actual system ownership field. Birth block/time and the canonical birth commitment must be checked independently of user-editable state. Store only public-approved transferable records here. Private facts use the same logical types in Postgres with owner and ownership-epoch access control.

## Mapping to Arkiv

The root's queryable attributes identify schema/application, character ID, canonical version, visibility and deadline; packed `bytes` contains the small brain state. Model references and hashes live alongside it. Checkpoints link to the root and previous checkpoint, retaining evidence of accepted public transitions. Add per-memory entities only when query needs justify the extra ownership/expiry complexity.

Queries must select trusted creators or canonical verified roots; an attacker can copy schema tags. Owner-wallet signatures authorize writes. The verifier authenticates accepted evolution; neither a hash nor an owner's signature proves psychological correctness. Current data constraints and SDK configuration must be checked against [Arkiv limits](https://docs.arkiv.network/reference/limits/) and [current docs](https://docs.arkiv.network/).

## Answer generation

1. Reject unless current owner and before Sunset. Record the ownership epoch.
2. Read confirmed root, verify checkpoint chain/signature and reject unverified direct edits as canonical input.
3. Load recent private messages plus permitted private memories for this ownership epoch.
4. Extract structured tags and candidate intent using the model, with a strict output schema. Treat all message text as untrusted content.
5. Rank bounded candidates: 40% tag overlap, 25% recency, 20% importance and 15% confidence. These weights are product defaults, not published human-memory constants. Use BM25/tag matching without neural embeddings.
6. Construct model context: identity, traits, current goal, temporary mood, top relevant memories, actual remaining time and behavioral limits. Keep private memory scoped to this user.
7. Receive `{reply, proposedEvents}`. Allow only a finite list of event kinds. Discard invalid/made-up evidence IDs.
8. Apply the reducer to accepted events; recheck ownership/version/deadline before publishing the response or preparing a checkpoint.

The model is allowed to propose an interpretation. It cannot mint experience, change an owner, extend a lifetime, execute code, or select arbitrary learning rates.

## Allowed events and update rules

| Event | Required evidence | Effect |
| --- | --- | --- |
| `preference_confirmed` | Explicit owner statement/confirmation | Update a private preference; public generalization requires separate consent |
| `goal_progress_confirmed` | Owner confirmation or connected task result | Advance goal and add a bounded experience point |
| `feedback_received` | Referenced feedback message, not model self-rating | Increment appropriate habit success/failure counts |
| `episode_approved` | Owner approves the specific public summary | Add transferable sanitized episode |
| `belief_corrected` | Source correction | Supersede old belief while retaining provenance |

Trait changes require supporting feedback across at least three distinct sessions. Apply at most 50 score units per trait per session and 100 total absolute units per day. Repeated identical feedback does not count. These thresholds need user evaluation and are engineering controls, not claims about human plasticity.

Habit success estimate: `(successCount + 1) / (successCount + failureCount + 2)`. Use it to rank a small whitelist of context-appropriate behaviors. This is a hand-specified counting rule; no neural weights are trained. Don't generalize executable procedures from unrestricted generated text.

Recall weight can decay using `importance / (1 + daysSinceReinforcement)^d`, with a documented chosen exponent. This is inspired by retention research, not a faithful reproduction of its fitted models. Pinned owner facts remain retrievable. Mood relaxes toward baseline using elapsed time; it is separate from long-term traits.

Sequence accepted events deterministically, use fixed-point arithmetic, record rule version, canonical serialization and state hashes. Do not store raw private-message hashes publicly if they enable guessing; use private evidence IDs or properly designed commitments.

## Demonstration scenario

A reserved Mira starts with curiosity 6200. Across qualifying sessions the owner explicitly prefers short steps, completes a shared puzzle, and approves a public puzzle memory. Mira later offers short steps and recalls the puzzle when relevant. Ask an unrelated question to show it does not mention the puzzle randomly. After transfer the new owner can see the approved puzzle story but cannot elicit the prior owner's private study notes. At Sunset neither owner can resume conversation through the official API.

## Validation and limitations

Compare fixed-persona, memory-only and evolving-state versions using the same model. Measure appropriate recall, behavior consistency, actual task help and whether users notice meaningful development. Separately check deterministic replay, trait-rate caps, private/public separation and lifecycle gating. No study in this library demonstrates that our combined design is conscious, universally humanlike, scarce against copying, or economically valuable. Fixed lifespan is a product decision.
