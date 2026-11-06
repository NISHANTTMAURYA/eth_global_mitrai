# ETHGlobal Mumbai submission checklist

## What to submit

ETHGlobal’s published deadline is **Saturday, 7 November 2026 at 9:00 am IST**. Submit through the [Mumbai Hacker Dashboard](https://ethglobal.com/events/mumbai/info). You can submit as a solo builder; list your own name and contact details where requested. Pick one accurate project description, a public repository URL, a live demo URL, and a 2–3 minute demo video (this fits the event’s 2–4 minute upload rule and the 0G prize’s under-3-minute requirement). Include contract addresses only for contracts you actually deployed. The prize page asks for Telegram and X contact details on the 0G submission form; use your own handles.

The repository is open source and has a README and license. The README must describe the real integrations and setup, not planned features. Disclose AI assistance and accurately explain what existed before the event and what you built during it. ETHGlobal rules warn that undisclosed pre-existing project work can make a submission ineligible. This repo’s first commit is dated 6 November 2026; keep the commit history and confirm that project-specific work began after the official kickoff before selecting any from-scratch prize. An existing-project Arkiv track is limited to approved Continuity participants. Do not claim an approved Continuity track unless ETHGlobal approved you for one.

## Sponsor track readiness

| Track | What the judges need to see | Current project evidence | Still needed before claiming it is demo-ready |
| --- | --- | --- | --- |
| 0G Private Computer | A real 0G inference in the main user flow, its request ID, a working app, and why the app is worse without 0G. A 2–3 minute demo video, live link, public repo, setup instructions, and team contact details. | A direct `reply()` smoke check returned provider `0G` and a request ID; the app’s chat flow can route to 0G. | In the hosted demo, send a fresh owner message and visibly show provider `0G` plus its request ID. Ensure the deployed environment actually has the 0G credentials/model configured. This is the best current sponsor fit. |
| Arkiv — Build from scratch | Actual Rabdi writes with the Arkiv SDK/JSON-RPC, at least one user-visible feature reading those entities, writer wallet addresses, runnable query, `/arkiv/schema.md`, four judging files, public licensed repo, and AI-use disclosure. | Carrot Kid root and a signed app-writer checkpoint have transaction/entity evidence in [`arkiv/README.md`](../arkiv/README.md); the query script and judging files exist. | Run the documented query against the live network and show Explore reading the result. Demonstrate the automatic checkpoint after the stated chat threshold, and a real ownership handover if those are in the final claim. Verify the event’s from-scratch rule applies to this repo. |

Current official prize requirements: [Mumbai prizes](https://ethglobal.com/events/mumbai/prizes). Event eligibility and pre-existing-work rules: [ETHGlobal rules](https://ethglobal.com/rules).

## Simple demo story

1. Create or open the Carrot Kid persona and show its owner wallet.
2. Send a message; show a real 0G request ID in the main chat flow.
3. Show the Arkiv public character in Explore and run the documented query. If the automatic checkpoint has not been captured live, call it planned/implemented but unproven.
4. Show that private chat stays in Supabase and only approved public state is checkpointed.
5. Be candid that paid buy/sell is not live; do not present an unpaid bid as a completed sale.

## Submission fields to prepare

- Project name: **MitrAI**.
- Short description: **A living AI character grows through private conversation; its owner can publish verified public memories to Arkiv, while 0G powers the persona’s replies.**
- Public GitHub repository and `README.md` setup steps.
- Live demo URL, checked in a private/incognito browser.
- Demo video, ideally 2–3 minutes, showing the integration transaction/result and the end-to-end user flow.
- Deployed contract addresses and transaction hashes for the integrations actually shown.
- Your name and solo-builder contact details (Telegram and X) where requested.
- AI-use disclosure and an accurate pre-existing/new-work statement.
