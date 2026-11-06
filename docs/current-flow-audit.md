# Documented flow compared with implementation

Reviewed 6 November 2026 against idea.md, README.md and the current source. This is an implementation audit, not evidence of completed live transactions.

## Expected journey

Returning owner opens / and immediately sees their active companion. A new visitor sees Create a Character and Explore Characters. Creation selects appearance, personality and voice, connects a wallet and creates an Arkiv identity. Private conversations gradually develop the character; the owner reviews changes and signs public checkpoints. Publishing exposes approved state on /explore. Visitors inspect public mind/history and listen to an inner monologue, send a priced buy request, and the owner accepts and hands over. The new owner starts a separate private relationship. Original age continues until Sunset, then a lasting read-only Legacy remains.

The documents conflict on visitor interaction: their simplified flow prohibits visitor chat and specifies a monologue, while README's later Discovery section permits isolated auditions. The current app implements isolated auditions. Choose a single policy before claiming the simplified journey is complete.

## Current state

| Area | Current behavior | Gap |
| --- | --- | --- |
| Home | / displays the discovery/marketing view. /my-character opens the owner's companion or creation prompt. | Owner-aware routing at / and a focused two-choice newcomer landing are missing. |
| Wallet | Header picker discovers browser extensions using EIP-6963, authenticates with a signed challenge, shows Rabdi balance/network and faucet link. | Mobile QR/WalletConnect is not implemented. |
| Creation | Three steps configure identity, personality/model/voice and finite lifetime. Wallet signs Arkiv creation with an immutable initial checkpoint. Cancelled transactions retain a resumable draft. | Live browser signing, read-back and recovery still need end-to-end evidence. Birth time is assigned when the server creates the draft, not derived from the mined block. |
| Conversation | Multiple reply bubbles, audio playback, timed gestures, an eight-second user-message batch window and waiting/thinking motion. | Autoplay and per-rig visual quality still need real-browser coverage. |
| Brain | Grounded dated observations, interests and preferences; spaced evidence gates trait changes. Interactive constellation, before/after ledger and immutable checkpoint replay are implemented. | A full cognitive graph, explicit temporary mood decay, outcome-based habit learning and the proposed experience/maturity formulas are not implemented. |
| Private data | SQLite archive, search, learning, profiles and schedules are scoped by character, wallet and ownership epoch. Earlier owners' profiles remain sealed. | Hosted durable deployment and encryption at rest are not implemented. |
| Proactive behavior | Durable event/inactivity check-ins, in-app inbox, quiet hours, opt-in email and web push code. | Actual Resend delivery needs configured credentials and sender; real external delivery remains unverified. |
| Discovery | Queries signed public Arkiv roots automatically; uncreated models are labeled character forms. | No live character write has been demonstrated yet. |
| Publishing | Owner chooses availability/highlights and signs an Arkiv update. | No asking-price/currency/expiry fields or paid settlement. |
| Visitor experience | Isolated public audition, public memories/traits, brain view and provenance. | No dedicated 15–20 second inner-monologue experience; constellation is in the Mind tab, not orbiting the 3D stage. |
| Requests and adoption | Note-only enquiries and a separate owner-signed recipient transfer. Ownership checks revoke prior-owner access to the current epoch. | No offer amount, request acceptance/rejection workflow, or Accept & Handover action tied to a request. Transfer is not a payment. |
| Sunset | Exact server-side deadline checks stop interaction, saves and transfer. Legacy viewing exists; handover does not reset age. | Permanent storage is not guaranteed: Arkiv entities expire after 90 days and automated renewal/archival is absent. Protocol-wide immutability is not enforced by the application alone. |
| Animation | All 14 authored source clips remain, including five dances and sit enter/idle/exit. Conversational torso motion is stabilized. | Available gestures depend on rig support. |

## Recommended implementation order

1. Finish owner-aware home routing and settle visitor monologue versus audition policy.
2. Verify one normal wallet creation, checkpoint, publishing read and second-wallet transfer on Rabdi; retain actual receipts and query evidence.
3. Add structured requests and Accept & Handover. Treat priced settlement as a separate feature requiring explicit implementation.
4. Add the selected visitor preview experience, then refine the brain graph and maturity mechanics.
5. Add storage renewal/Legacy durability, configure external notification delivery, and test the deployed app.
6. Reconcile stale documentation and record an honest hackathon demonstration. Keep World ID, 0G and Swarm as optional roadmap work until implemented.

Validation for this revision: production build passed; 46 unit tests passed with 5 conditional skips; 3 HTTP integration tests passed. These tests do not establish a successful wallet-signed live Arkiv write.
