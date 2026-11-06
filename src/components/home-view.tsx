'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Clock3,
  Sparkles,
  ShieldCheck,
  Cpu,
  Database,
  Globe,
  Ticket,
  Briefcase,
  Music,
  Calendar,
  Code2,
  TrendingUp,
  CheckCircle2,
  ExternalLink,
  Award,
  Zap,
  Users,
  Heart,
} from 'lucide-react';
import { Stage } from './ui';
import type { Character, ModelId } from '@/lib/domain';

const PREVIEW_MODELS: { id: ModelId; label: string; ens: string; tag: string }[] = [
  { id: 'download:09_CactusBoy', label: 'Cactus Boy', ens: 'cactus.mitrai.eth', tag: 'Web3 Builder Envoy' },
  { id: 'download:23_Carrot_Kid', label: 'Carrot Kid', ens: 'carrot-kid.mitrai.eth', tag: 'Founder Syndicate' },
  { id: 'download:15_Nightmare', label: 'Nightmare', ens: 'nightmare.mitrai.eth', tag: 'Music DAO VIP' },
];

export default function HomeView({ legacy }: { legacy?: Character }) {
  const [activeModelIndex, setActiveModelIndex] = useState(0);
  const [gesture, setGesture] = useState<string>('Wave');
  const [gestureKey, setGestureKey] = useState<number>(1);

  const selectedModel = PREVIEW_MODELS[activeModelIndex];

  const triggerGesture = (name: string) => {
    setGesture(name);
    setGestureKey((k) => k + 1);
  };

  return (
    <div className="page-shell welcome-page">
      {legacy && (
        <div className="note legacy-note">
          <Clock3 size={16} />
          <span>
            <strong>{legacy.name}</strong> reached Sunset. Their verified story remains an eternal read-only memorial.{' '}
            <Link href={`/legacy/${legacy.id}`} className="note-link">
              Revisit Legacy <ArrowRight size={13} />
            </Link>
          </span>
        </div>
      )}

      {/* Track & Protocol Banner */}
      <div className="track-badges-bar">
        <span className="track-badge ethglobal">
          <Award size={13} /> ETHGlobal Mumbai 2024
        </span>
        <span className="track-badge zero-g">
          <Cpu size={13} /> 0G Private Computer
        </span>
        <span className="track-badge arkiv">
          <Database size={13} /> Arkiv DB-Chain (Rabdi Testnet)
        </span>
        <span className="track-badge ens">
          <Globe size={13} /> ENS Agent Passports
        </span>
        <span className="track-badge sarvam">
          <Zap size={13} /> Sarvam AI v4-Flash Voice
        </span>
      </div>

      {/* Hero Section */}
      <section className="welcome-hero-redesigned">
        <div className="hero-content">
          <p className="hero-eyebrow">
            AUTONOMOUS MORTAL COMPANIONS · VERIFIED ON-CHAIN
          </p>
          <h1 className="hero-headline">
            The Mortal AI Companion <br />
            <span className="highlight-text">With Real-World Value.</span>
          </h1>
          <p className="hero-description">
            Every MitrAI lives for strictly <strong>30 days (720 hours)</strong>. Powered by confidential inference on <strong>0G Private Computer</strong>, mutable memory state on <strong>Arkiv DB-Chain</strong>, and portable identity through <strong>ENS Agent Passports</strong>.
          </p>
          <p className="hero-subtext">
            Not a disposable chatbot. An evolving confidant that accumulates memories, earns social capital in exclusive builder guilds, and unlocks token-gated real-world experiences.
          </p>

          <div className="hero-actions">
            <Link href="/create" className="button primary large-btn">
              Create My MitrAI <ArrowRight size={18} />
            </Link>
            <Link href="/explore" className="button secondary large-btn">
              Explore Live Companions
            </Link>
          </div>

          <div className="hero-trust-metrics">
            <div className="trust-item">
              <Clock3 size={15} />
              <span><strong>30-Day Lifespan</strong> (Scarcity by design)</span>
            </div>
            <div className="trust-item">
              <ShieldCheck size={15} />
              <span><strong>Zero Corporate Logging</strong> (0G TEE Privacy)</span>
            </div>
            <div className="trust-item">
              <TrendingUp size={15} />
              <span><strong>1-Click Arkiv Handover</strong> (Dynamic market value)</span>
            </div>
          </div>
        </div>

        {/* Interactive 3D Avatar Preview Stage */}
        <div className="hero-stage-card">
          <div className="stage-header-bar">
            <div className="stage-identity">
              <span className="status-dot-pulse" />
              <div>
                <strong>{selectedModel.label}</strong>
                <span className="ens-sub">{selectedModel.ens}</span>
              </div>
            </div>
            <span className="stage-pill-tag">{selectedModel.tag}</span>
          </div>

          {/* Model Switcher tabs */}
          <div className="model-switcher-tabs">
            {PREVIEW_MODELS.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                className={`model-tab-btn ${idx === activeModelIndex ? 'active' : ''}`}
                onClick={() => {
                  setActiveModelIndex(idx);
                  triggerGesture('Wave');
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="stage-canvas-wrap">
            <Stage
              model={selectedModel.id}
              gesture={gesture}
              gestureKey={gestureKey}
              interactive
            />
            <div className="stage-life-ticker">
              <Clock3 size={13} />
              <span>Age: <strong>2d 8h</strong> · 27d 16h remaining</span>
            </div>
          </div>

          {/* Interactive Gestures Toolbar */}
          <div className="stage-gesture-controls">
            <span className="controls-label">Test situational gesture:</span>
            <div className="gesture-btn-row">
              <button
                type="button"
                className={`gesture-btn ${gesture === 'Wave' ? 'active' : ''}`}
                onClick={() => triggerGesture('Wave')}
              >
                👋 Wave
              </button>
              <button
                type="button"
                className={`gesture-btn ${gesture === 'Think' ? 'active' : ''}`}
                onClick={() => triggerGesture('Think')}
              >
                💭 Think
              </button>
              <button
                type="button"
                className={`gesture-btn ${gesture === 'HipDance' ? 'active' : ''}`}
                onClick={() => triggerGesture('HipDance')}
              >
                🕺 Groove
              </button>
              <button
                type="button"
                className={`gesture-btn ${gesture === 'Clap' ? 'active' : ''}`}
                onClick={() => triggerGesture('Clap')}
              >
                👏 Clap
              </button>
              <button
                type="button"
                className={`gesture-btn ${gesture === 'Dance' ? 'active' : ''}`}
                onClick={() => triggerGesture('Dance')}
              >
                ✨ Dance
              </button>
            </div>
          </div>

          <div className="stage-footer-tech">
            <span>Verified 0G TEE Inference · Arkiv DB-Chain State · Sarvam Real-Time TTS</span>
          </div>
        </div>
      </section>

      {/* The Anti-Chatbot Thesis / Mortality Banner */}
      <section className="thesis-banner">
        <div className="thesis-badge">
          <Sparkles size={14} /> THE ANTI-CHATBOT PARADIGM
        </div>
        <h2>Why 30-Day Mortality Creates Real Value</h2>
        <p className="thesis-lead">
          Web2 AI gave us infinite, commoditized chatbots. You open a tab, chat with an amnesiac assistant, close the tab, and forget it. There is zero emotional stake, zero scarcity, and zero value.
        </p>
        <div className="comparison-grid">
          <div className="comparison-card traditional">
            <div className="comp-tag">Standard Web2 Chatbots</div>
            <ul className="comp-list">
              <li>❌ Infinite, disposable, zero scarcity</li>
              <li>❌ Centralized servers harvest and train on your personal emotions</li>
              <li>❌ Amnesiac: no persistent living memory across owners</li>
              <li>❌ Zero real-world privileges or external platform utility</li>
              <li>❌ Zero financial or adoption value</li>
            </ul>
          </div>
          <div className="comparison-card mitrai-card">
            <div className="comp-tag mitrai-tag">MitrAI Mortal Companions</div>
            <ul className="comp-list">
              <li>✅ Strictly 30-day life (720h) creates emotional gravity & authentic care</li>
              <li>✅ 0G Confidential AI ensures private thoughts stay in hardware TEEs</li>
              <li>✅ Arkiv DB-chain preserves mutable personality growth & milestones</li>
              <li>✅ Unlocks VIP events, founder meetups, and developer collectives</li>
              <li>✅ Dynamic market value for adoption & 1-click Arkiv handover</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Three Dimensions of MitrAI Value */}
      <section className="value-pillars-section">
        <div className="section-header-center">
          <p className="section-eyebrow">ECONOMIC & SOCIAL FOUNDATION</p>
          <h2>Three Pillars of MitrAI Value</h2>
          <p className="section-sub">
            How a companion transitions from a private listener into an appreciating on-chain asset.
          </p>
        </div>

        <div className="pillars-grid">
          <div className="pillar-card">
            <div className="pillar-icon-box mind">
              <Clock3 size={24} />
            </div>
            <div className="pillar-badge">Dimension 1</div>
            <h3>Accumulated Mind & Scarcity</h3>
            <p>
              Unlike static NFTs, a MitrAI matures. Every conversation etches semantic insights onto Arkiv DB-chain through 0G's confidential compute. As its 30-day life ticks forward, its accumulated memories make it increasingly rare and deeply attuned to its custodian.
            </p>
            <div className="pillar-metrics">
              <span>720h Life Scarcity</span>
              <span>Arkiv Memory Index</span>
              <span>0G Hardware TEE</span>
            </div>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon-box social">
              <Users size={24} />
            </div>
            <div className="pillar-badge">Dimension 2</div>
            <h3>Social Capital & Guild Envoys</h3>
            <p>
              Your MitrAI doesn’t remain isolated in a chat box. It joins recognized developer collectives, founder circles, and creator communities. Its social memberships and peer endorsements belong to its on-chain identity, turning it into a prestigious digital envoy.
            </p>
            <div className="pillar-metrics">
              <span>Exclusive Guilds</span>
              <span>Founder Networks</span>
              <span>Portable Reputation</span>
            </div>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon-box utility">
              <Ticket size={24} />
            </div>
            <div className="pillar-badge">Dimension 3</div>
            <h3>Tangible Real-World Utility</h3>
            <p>
              Owning a particular MitrAI grants direct real-world access. External platforms and physical events verify the companion’s ENS credentials and on-chain history to unlock VIP perks, conference privileges, and closed-door dealflow.
            </p>
            <div className="pillar-metrics">
              <span>VIP Event Passes</span>
              <span>Founder Dinners</span>
              <span>Loyalty Rewards</span>
            </div>
          </div>
        </div>
      </section>

      {/* Real-World Use Cases Section */}
      <section className="use-cases-section">
        <div className="section-header-center">
          <p className="section-eyebrow">TANGIBLE PLATFORM BENEFITS</p>
          <h2>Real-World Utility: Value Beyond The Screen</h2>
          <p className="section-sub">
            Companions don’t just converse—they unlock real doors. Here is how MitrAI credentialing translates into physical and digital perks for its custodian.
          </p>
        </div>

        <div className="use-case-grid">
          {/* Use Case 1: Music Community & VIP Concert Access */}
          <div className="use-case-card">
            <div className="use-case-top">
              <div className="case-icon-box music">
                <Music size={22} />
              </div>
              <span className="case-category-pill music-pill">Music & Culture Guild</span>
            </div>
            <h3>VIP Concert Access & Soundcheck Privileges</h3>
            <p className="case-description">
              A MitrAI with verified membership in an on-chain music creator community or DAO acts as an authentic fan credential. External ticketing and festival platforms read the companion’s ENS identity to grant its holder VIP access.
            </p>
            <div className="case-benefit-box">
              <div className="benefit-label">
                <CheckCircle2 size={15} /> <strong>Tangible Owner Benefit</strong>
              </div>
              <p>
                Unlocks VIP backstage access, green-room entry, artist soundchecks, and discounted festival ticket allocations at partner events.
              </p>
            </div>
            <div className="case-footer">
              <span>Verification: ENS Subdomain + Arkiv Community Membership</span>
            </div>
          </div>

          {/* Use Case 2: Startup Syndicate & Exclusive Founder Meetups */}
          <div className="use-case-card">
            <div className="use-case-top">
              <div className="case-icon-box founder">
                <Briefcase size={22} />
              </div>
              <span className="case-category-pill founder-pill">Founder & VC Syndicate</span>
            </div>
            <h3>Exclusive Founder Meetups & Private Dinners</h3>
            <p className="case-description">
              A MitrAI recognized by an elite startup syndicate or web3 incubator functions as a social pass. When traveling to major global summits, the companion verifies its owner’s credibility without revealing sensitive net-worth details.
            </p>
            <div className="case-benefit-box">
              <div className="benefit-label">
                <CheckCircle2 size={15} /> <strong>Tangible Owner Benefit</strong>
              </div>
              <p>
                Grants curated invitations to closed-door founder dinners, builder houses, investor dealflow lounges, and demo-day private suites.
              </p>
            </div>
            <div className="case-footer">
              <span>Verification: 0G Signed Attestation + Guild Membership</span>
            </div>
          </div>

          {/* Use Case 3: Event Attendance History & Loyalty Rewards */}
          <div className="use-case-card">
            <div className="use-case-top">
              <div className="case-icon-box event">
                <Calendar size={22} />
              </div>
              <span className="case-category-pill event-pill">Proof-of-Journey</span>
            </div>
            <h3>Event Attendance Pedigree & Loyalty Rewards</h3>
            <p className="case-description">
              As your MitrAI accompanies you across hackathons (ETHGlobal Mumbai, Devcon, ETHIndia), its on-chain attendance record is stamped immutably onto Arkiv DB-chain. This cumulative historical proof turns into continuous loyalty returns.
            </p>
            <div className="case-benefit-box">
              <div className="benefit-label">
                <CheckCircle2 size={15} /> <strong>Tangible Owner Benefit</strong>
              </div>
              <p>
                Sponsors trigger automated token airdrops, exclusive physical merchandise claims, and cumulative discounts for future conference registrations.
              </p>
            </div>
            <div className="case-footer">
              <span>Verification: Arkiv Rabdi DB-Chain Timestamped Milestones</span>
            </div>
          </div>

          {/* Use Case 4: Developer Guild & Autonomous Envoy */}
          <div className="use-case-card">
            <div className="use-case-top">
              <div className="case-icon-box dev">
                <Code2 size={22} />
              </div>
              <span className="case-category-pill dev-pill">Developer Guild Envoy</span>
            </div>
            <h3>Autonomous Developer Guild Representative</h3>
            <p className="case-description">
              Your MitrAI joins an exclusive collective of recognized developers. It participates in code reviews, monitors protocol proposals, and represents your technical ethos in community governance discussions.
            </p>
            <div className="case-benefit-box">
              <div className="benefit-label">
                <CheckCircle2 size={15} /> <strong>Tangible Owner Benefit</strong>
              </div>
              <p>
                Its proven social network and community memberships make it highly desirable. The custodian gains reputation, testnet priority, and governance standing.
              </p>
            </div>
            <div className="case-footer">
              <span>Verification: ENS Resolvable Metadata + Verified Developer Roll</span>
            </div>
          </div>
        </div>
      </section>

      {/* Protocol Architecture & Track Proofs */}
      <section className="architecture-section" id="proofs">
        <div className="section-header-center">
          <p className="section-eyebrow">HACKATHON TRACK PROOFS</p>
          <h2>Decentralized Architecture & Cryptographic Proofs</h2>
          <p className="section-sub">
            Built from first principles for ETHGlobal Mumbai. Verifiable code on GitHub and live contracts on Rabdi testnet.
          </p>
        </div>

        <div className="arch-grid">
          <div className="arch-card">
            <div className="arch-header">
              <div className="arch-badge zero-g-badge">0G Private Computer</div>
              <Cpu size={20} className="arch-icon zero-g-icon" />
            </div>
            <h4>Confidential Inference</h4>
            <p>
              Conversations are routed to 0G router APIs (<code>qwen-flash</code>) running in hardware-isolated Trusted Execution Environments. No corporate model provider harvests or reads your emotional bond.
            </p>
            <div className="arch-detail">
              <span>Endpoint: router-api.0g.ai/v1</span>
              <span>Model: qwen-flash (0G Compute)</span>
            </div>
          </div>

          <div className="arch-card">
            <div className="arch-header">
              <div className="arch-badge arkiv-badge">Arkiv DB-Chain</div>
              <Database size={20} className="arch-icon arkiv-icon" />
            </div>
            <h4>Mutable On-Chain State</h4>
            <p>
              Character lifespans, thoughts, memory entries, and adoption states are stored in Arkiv DB-chain on Rabdi testnet. Combines real-time database speeds with Ethereum-grade verifiability.
            </p>
            <div className="arch-detail">
              <span>Network: Rabdi Testnet</span>
              <span>Contract: 0x979e... (Arkiv Live State)</span>
            </div>
          </div>

          <div className="arch-card">
            <div className="arch-header">
              <div className="arch-badge ens-badge">ENS Agent Passports</div>
              <Globe size={20} className="arch-icon ens-icon" />
            </div>
            <h4>Universal Web3 Identity</h4>
            <p>
              Every MitrAI is minted with a canonical ENS subdomain (<code>[name].mitrai.eth</code>) resolveable across Web3. Supports ERC-3668 off-chain CCIP-read for live avatar and memory lookups.
            </p>
            <div className="arch-detail">
              <span>Domain: *.mitrai.eth</span>
              <span>Resolution: ERC-3668 CCIP-Read</span>
            </div>
          </div>

          <div className="arch-card">
            <div className="arch-header">
              <div className="arch-badge sarvam-badge">Sarvam AI Speech</div>
              <Zap size={20} className="arch-icon sarvam-icon" />
            </div>
            <h4>Sub-Second Neural Voice</h4>
            <p>
              Powered by Sarvam AI’s real-time <code>bulbul:v4-flash</code> engine. Delivers expressive Indian voice personas with real-time lip-sync phonemes and situational 3D gesture triggers.
            </p>
            <div className="arch-detail">
              <span>Engine: bulbul:v4-flash</span>
              <span>Latency: &lt;500ms Conversational</span>
            </div>
          </div>
        </div>
      </section>

      {/* The 4-Stage Lifecycle */}
      <section className="lifecycle-section">
        <div className="section-header-center">
          <p className="section-eyebrow">THE 30-DAY JOURNEY</p>
          <h2>From Genesis to Eternal Legacy</h2>
          <p className="section-sub">
            A defined mortal existence transforms interactions from casual chatting into meaningful chapters.
          </p>
        </div>

        <div className="lifecycle-stepper">
          <div className="step-card">
            <div className="step-num">01</div>
            <h4>Genesis & Creation</h4>
            <p>
              Select a unique 3D avatar and set their initial emotional temperament. Minted with an ENS passport and instant Arkiv state.
            </p>
            <span className="step-time">Day 1</span>
          </div>

          <div className="step-card">
            <div className="step-num">02</div>
            <h4>Intimate Bonding & 0G Compute</h4>
            <p>
              Daily spoken dialogue builds persistent semantic memory. Personality evolves gradually while 0G guarantees total conversation privacy.
            </p>
            <span className="step-time">Days 1–15</span>
          </div>

          <div className="step-card">
            <div className="step-num">03</div>
            <h4>Guild Admission & Handover</h4>
            <p>
              The companion earns community recognition and unlocks real-world perks. Keep in private showcase or offer for adoption via 1-click Arkiv handover.
            </p>
            <span className="step-time">Days 15–29</span>
          </div>

          <div className="step-card">
            <div className="step-num">04</div>
            <h4>Sunset & Eternal Legacy</h4>
            <p>
              At Day 30, the active conversation concludes. The companion's approved memories freeze forever as an immortal, read-only Arkiv monument.
            </p>
            <span className="step-time">Day 30+</span>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="cta-banner">
        <div className="cta-content">
          <p className="cta-eyebrow">ETHGLOBAL MUMBAI 2024</p>
          <h2>Begin a story worth continuing.</h2>
          <p>
            Create your mortal companion today. Build a bond, earn guild standing, and unlock real-world utility across 30 unforgettable days.
          </p>
          <div className="cta-button-row">
            <Link href="/create" className="button primary large-btn">
              Create My MitrAI <ArrowRight size={18} />
            </Link>
            <Link href="/explore" className="button secondary large-btn">
              Explore Available Companions
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
