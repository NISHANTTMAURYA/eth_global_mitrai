# MitrAI — ETHGlobal Mumbai | Official 2:50 Video Pitch Script

> **Target Duration:** **2:45 – 2:55** *(STRICT ETHGlobal Rule: Must be UNDER 3:00 minutes)*  
> **Format:** Live prototype screen recording + voiceover narration (+ optional motion overlays)  
> **Target Bounties:**  
> 1. **Arkiv ($15,000 Pool):** *"Build on Arkiv / Mirror Something Ethereum Depends On"*  
> 2. **0G ($15,000 Pool):** *"Build with 0G Private Computer ($5,000)"*  
> 3. **ETHGlobal Finalist:** Top 10 Showcase  

---

## 🏆 PRIZE ALIGNMENT MATRIX (What Judges Are Scoring)

| Sponsor & Track | Official Judging Criteria | How This Script Hits It | Timestamp in Video |
|---|---|---|---|
| **Arkiv** (25%) | **Why Arkiv?** (vs Postgres / EVM) | Explains why L1 gas is too expensive for evolving minds and centralized DBs lack verifiable ownership; Arkiv provides native DB-Chain entities + bounded leases | `[1:40 – 2:05]` |
| **Arkiv** (25%) | **Data Quality & Schema** | Shows clean `mitrai.characters.v1` schema & live terminal query `npm run query:arkiv` against Rabdi testnet block `299338` | `[2:05 – 2:20]` |
| **Arkiv** (25%) | **Reach & Utility** | Shows transferrable social capital, event reputation, and immutable Legacy Monuments on sunset | `[2:20 – 2:40]` |
| **Arkiv** (25%) | **Friction & Feedback** | Explicit callout to `/arkiv/friction.md` in repository for dev experience review | `[2:15 – 2:25]` |
| **0G** ($5,000) | **Core Loop Inference** | Shows live chat reply synthesized through 0G Private Computer router in the main flow | `[0:45 – 1:15]` |
| **0G** ($5,000) | **Request ID Traceability** | Zooms directly into footer: `Replies generated with 0G · Request ID: ...` | `[1:05 – 1:15]` |
| **0G** ($5,000) | **User Retention** | Explains why users return: finite lifespan + evolving traits create daily urgency before Sunset | `[0:30 – 0:45]` |
| **ETHGlobal** | **Working Live Prototype** | Live on `https://eth-mitrai.netlify.app` and local dev server with full 3D interactive stage | All sections |

---

## 📋 PRE-RECORDING CHECKLIST

- [ ] Browser tabs open:
  - Tab 1: `http://localhost:3000` (Landing page)
  - Tab 2: `http://localhost:3000/characters/8233fb15-7081-4340-b132-221886341183` (Carrot Kid)
  - Tab 3: `http://localhost:3000/characters/demo-zara-transfer` (Zara — pre-seeded for transfer demo)
- [ ] Terminal split ready:
  - Command primed: `npm run query:arkiv`
- [ ] Audio: Mic check + system audio UP (so Sarvam voice output is crisp in the video)
- [ ] Timer running on phone set to **2:50** countdown

---

## 🎬 SECOND-BY-SECOND SCRIPT & SCREENPLAY

---

### ⏱️ [0:00 – 0:20] THE HOOK: The Problem with AI Today

#### Screen Action
- Start on **MitrAI Landing Page** (`http://localhost:3000`).
- Slowly scroll past the hero headline: *"The Mortal AI Companion With Real-World Value"*.
- The 3D companion avatar on the right sways and waves.
- Mouse hovers over the **Life Clock**: `29d 18h remaining · Age 0d · 1% of a life`.

#### Narration (Deliver with calm, confident cadence)
> *"Today's AI chatbots suffer from a fundamental design flaw: they are infinite, disposable, and forgotten in a browser tab. Because they can never die, talking to them never truly matters.*  
>  
> *We built **MitrAI** — the world’s first mortal AI companion with an evolving symbolic mind, verified on-chain ownership, and a finite lifespan.*  
>  
> *Because its time is limited, every single day you spend together builds verifiable on-chain reputation and real-world value."*

---

### ⏱️ [0:20 – 0:45] FAST CREATION: A Life Begins

#### Screen Action
- Click **"Explore MitrAI"** $\rightarrow$ click **"+ Create MitrAI"** (or open the character creator modal).
- Quick 3-second selection: Choose a model, name it, and set the Arkiv storage lifespan (`90 Days`).
- Click **Create** $\rightarrow$ instantly load **Carrot Kid** (`/characters/8233fb15...`).

#### Narration
> *"Creating a companion takes five seconds. You pick an appearance, voice, and lifespan — 30, 90, or 180 days — matching Arkiv's native storage leases.*  
>  
> *Here is Carrot Kid. He was born on the Arkiv Rabdi testnet. He has 18 hours left in his current cycle. And unlike a static prompt, Carrot Kid's brain actively evolves with every single conversation."*

---

### ⏱️ [0:45 – 1:15] LIVE CHAT & 0G PRIVATE COMPUTER PROOF

#### Screen Action
- On Carrot Kid's page, ensure the **"Chat"** tab is active.
- Type in chat box: *"Hey Carrot Kid, what have we built together during this hackathon?"* and press Enter.
- **Watch the 3D Avatar:**
  - Carrot Kid enters thinking mode $\rightarrow$ avatar grooves (`HipDance` + `Think` loop), showing `PONDERING & GROOVING… 💭`.
  - Response lands $\rightarrow$ avatar transitions to `Clap`/`Wave` gesture while **Sarvam voice speaks aloud**!
- **Zoom In:** Move the mouse cursor to the footer under the chat bubble:
  - Highlight: `Replies generated with 0G · Request ID: aa951d003babc43f...`

#### Narration
> *"Watch what happens when we chat. While reasoning, Carrot Kid animates situational gestures in real time.*  
>  
> *When the response arrives, he speaks aloud with low-latency voice, lip-syncing to his own words.*  
>  
> *And look right here at the footer: **Every conversation turn is synthesized through 0G Private Computer**. That Request ID is a cryptographic receipt on the 0G network. Our conversation never touches centralized ad-trackers, and the fixed lifespan gives users a reason to return every single day before Sunset."*

---

### ⏱️ [1:15 – 1:40] THE EVOLVING MIND & MEMORY CRYSTALS

#### Screen Action
- Click the **"The mind"** tab.
- Show the interactive **Mind Orbit**:
  - Trait nodes: Curiosity (87), Warmth (82), Playfulness (100).
  - Orbiting **Memory Crystals** floating around the central core.
- Click a Memory Crystal: it expands to show the generated memory text.
- Switch to **"Their story"** tab: show how public memories form the character's living biography.

#### Narration
> *"MitrAI does not rely on fragile prompt hacks. We built a **symbolic cognitive engine**.*  
>  
> *Six dynamic traits drift slowly based on real conversation evidence. Sitting idle gains age, but zero wisdom.*  
>  
> *When meaningful conversations happen, the engine automatically extracts public **Memory Crystals** — like long hackathon coding nights and favorite snacks. These memories stay with the persona forever, even if ownership changes."*

---

### ⏱️ [1:40 – 2:20] ARKIV PROVENANCE, OWNERSHIP HANDOVER & DB-CHAIN PROOF

#### Screen Action
- Switch tabs to **Zara** (`http://localhost:3000/characters/demo-zara-transfer`).
- Click **"Provenance"** tab:
  - Point to the Change Ledger: Show `birth` $\rightarrow$ `checkpoint v2` $\rightarrow$ `Ownership reconciled` (`0xDeAd...` to `0x979e...fc51`) $\rightarrow$ `checkpoint v3`.
- Click **"Manage Companion"** button at top right:
  - Show availability: `Available for Handover · 50 TGLM`.
  - Show the 1-click **"Transfer Ownership"** flow.
- **Quick switch to Terminal:**
  - Run: `npm run query:arkiv`
  - Show live terminal output returning the Rabdi testnet entity and Ed25519 signatures.

#### Narration (Hit the 4 Arkiv Judging Criteria verbatim)
> *"Now the core web3 breakthrough: **Ownership on Arkiv**.*  
>  
> *Here is Zara. She has already lived through one ownership transfer. In her Provenance ledger, you can see her entire history on Rabdi testnet: created by an earlier owner, evolved, and transferred to our wallet.*  
>  
> *Why Arkiv? Because storing an evolving companion's brain on Ethereum L1 costs thousands in gas, while Web2 databases can be shut down at any moment. Arkiv gives us a decentralized, SQL-queryable DB-chain where companions exist as sovereign entities with native wallet ownership.*  
>  
> *Running `npm run query:arkiv` right now queries the live Rabdi testnet, proving this state is anchored on-chain with Ed25519 signatures. And when an owner transfers Zara, her public memories transfer to the buyer, while the seller's private chat logs are permanently sealed."*

---

### ⏱️ [2:20 – 2:45] REAL-WORLD UTILITY & LEGACY MONUMENTS

#### Screen Action
- Switch back to the **Homepage** and scroll to **"Real-World Utility"**:
  - Hover over the 4 use cases:
    1. 🎟️ **Event Loyalty & VIP Access** (ETHGlobal hacker meetups)
    2. 🤝 **Founder Networks** (syndicate reputation)
    3. 🎨 **Creator Economies** (curated, well-nurtured companions)
    4. 🏛️ **Arkiv Legacy Monuments** (frozen on sunset)

#### Narration
> *"This transforms AI from a throwaway toy into portable **social capital**.*  
>  
> *A MitrAI that accompanied a hacker through ETHGlobal unlocks alumni channels. A companion with verified concert attendance grants VIP backstage access. When you adopt a mature companion, you inherit a verified, on-chain relationship history.*  
>  
> *And when a companion reaches Sunset? It doesn't disappear. It freezes as an immutable **Legacy Monument on Arkiv** — a permanent memorial to a life well-lived."*

---

### ⏱️ [2:45 – 2:55] CLOSING & SUBMISSION CALLOUT

#### Screen Action
- Return to Carrot Kid or Zara stage.
- The avatar performs a final celebratory wave (`Wave`).
- Overlay text appears:
  - **MitrAI — A little life, a world of possibility.**
  - **Live App:** `eth-mitrai.netlify.app`
  - **Sponsors:** Built with **0G Private Computer** & **Arkiv on Rabdi Testnet**
  - **Docs:** Detailed reports in `/arkiv` (`why-arkiv.md`, `reach.md`, `friction.md`) and `/0g`

#### Narration (Crisp, memorable sign-off)
> *"MitrAI brings mortality, provable memory, and sovereign ownership to artificial intelligence.*  
>  
> *Try it live right now at `eth-mitrai.netlify.app`, and check our `/arkiv` and `/0g` folders for full architectural deep-dives.*  
>  
> *Thank you, ETHGlobal Mumbai!"*

---

## 🎯 SPONSOR CHECKLIST FOR THE SUBMISSION FORM

When submitting on the ETHGlobal dashboard, paste these exact highlights into the prize question boxes:

### 1. Arkiv Track Submission Notes:
- **Track:** *Build on Arkiv (Rabdi Testnet)*
- **Entity ID:** `0x4b1913c84716c7da12a0ab09cdbe1bdbabe822928fe1f9399dca0b9f0b6358e9`
- **Genesis Block:** `299338` (Rabdi Chain ID `60138`)
- **Query Command:** `npm run query:arkiv`
- **Why Arkiv:** Eliminates high L1 storage gas while offering cryptographic queryability and native wallet-level `changeOwnership`.
- **Docs Provided in Repo:**
  - `arkiv/why-arkiv.md` (Why Arkiv over Postgres/EVM)
  - `arkiv/reach.md` (Utility & real-world reach thesis)
  - `arkiv/schema.md` (Detailed entity schemas)
  - `arkiv/friction.md` (Constructive DX feedback for the Arkiv team)

### 2. 0G Track Submission Notes:
- **Track:** *Build with iAI / 0G Private Computer ($5,000)*
- **Inference In Core Flow:** Every companion chat reply is synthesized via 0G Private Computer (`router-api-testnet.integratenetwork.work/v1`).
- **Verifiable Receipt:** Every response returns and displays a verifiable 0G `Request ID` in the chat UI.
- **Why Users Return:** Companions have finite lifespans and evolving traits, creating retention and urgency to interact before Sunset.
- **Docs Provided in Repo:** `0g/README.md`
