'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Clock3,
  ShieldCheck,
  Cpu,
  Database,
  Briefcase,
  Music,
  Calendar,
  Code2,
  TrendingUp,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { Stage } from './ui';
import type { Character, ModelId } from '@/lib/domain';

const PREVIEW_MODELS: { id: ModelId; label: string; tag: string }[] = [
  { id: 'download:23_Carrot_Kid', label: 'Carrot Kid', tag: 'Small hero, enormous plans' },
  { id: 'download:09_CactusBoy', label: 'Cactus Boy', tag: 'A quiet, prickly friend' },
  { id: 'download:15_Nightmare', label: 'Nightmare', tag: 'A guide through strange dreams' },
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

      {/* Track & Protocol Banner (Official ETHGlobal Tracks Only) */}
      <div className="track-badges-bar">
        <span className="track-badge ethglobal">
          <Award size={13} /> ETHGlobal Mumbai 2026
        </span>
        <span className="track-badge zero-g">
          <Cpu size={13} /> 0G Private Computer
        </span>
        <span className="track-badge arkiv">
          <Database size={13} /> Arkiv DB-Chain (Rabdi Testnet)
        </span>
      </div>

      {/* Hero Section */}
      <section className="welcome-hero-redesigned">
        <div className="hero-content">
          <p className="hero-eyebrow">
            A SMALL LIFE, A GROWING STORY
          </p>
          <h1 className="hero-headline">
            An AI character <br />
            <span className="highlight-text">that grows with you.</span>
          </h1>
          <p className="hero-description">
            Each MitrAI gets one character form, grows through private conversations, and can share approved memories publicly. Arkiv anchors its public identity; 0G can power replies.
          </p>
          <p className="hero-subtext">
            A character with its own starting traits, private conversations, approved public memories, and a finite life you can follow over time.
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
              <span><strong>Finite lifetime</strong> shown on each character</span>
            </div>
            <div className="trust-item">
              <ShieldCheck size={15} />
              <span><strong>Private chats</strong> stay in the app database</span>
            </div>
            <div className="trust-item">
              <TrendingUp size={15} />
              <span><strong>Public ownership</strong> can be verified on Arkiv</span>
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
            <span>0G replies · Arkiv public history</span>
          </div>
        </div>
      </section>

      {/* Real-World Use Cases Section (Clean 2x2 Grid) */}
      <section className="use-cases-section">
        <div className="section-header-center">
          <p className="section-eyebrow">A CHARACTER’S LIFE</p>
          <h2>Create, grow, share, and pass on their story</h2>
          <p className="section-sub">
            A mortal companion that accumulates real-world value, community memory, and sovereign reputation over time.
          </p>
        </div>

        <div className="use-case-grid">
          {/* Use Case 1: Music Community & VIP Concert Access */}
          <div className="use-case-card">
            <div className="use-case-top">
              <div className="case-icon-box music">
                <Music size={22} />
              </div>
              <span className="case-category-pill music-pill">Community</span>
            </div>
            <h3>Meet people who care about this character</h3>
            <p className="case-description">
              Visitors can join the character’s public community and post about it.
            </p>
            <div className="case-benefit-box">
              <div className="benefit-label">
                <CheckCircle2 size={15} /> <strong>What this makes possible</strong>
              </div>
              <p>
                A shared place for people who enjoy the character to meet and contribute.
              </p>
            </div>
            <div className="case-footer">
              <span>Available now: public character community</span>
            </div>
          </div>

          {/* Use Case 2: Startup Syndicate & Exclusive Founder Meetups */}
          <div className="use-case-card">
            <div className="use-case-top">
              <div className="case-icon-box founder">
                <Briefcase size={22} />
              </div>
              <span className="case-category-pill founder-pill">Private growth</span>
            </div>
            <h3>Help the character grow over time</h3>
            <p className="case-description">
              The owner can chat privately with their character and review proposed changes to its traits and mind over time. Private chats are kept in the app database.
            </p>
            <div className="case-benefit-box">
              <div className="benefit-label">
                <CheckCircle2 size={15} /> <strong>What this makes possible</strong>
              </div>
              <p>
                The character can gradually reflect shared interests while keeping private conversation separate from its public profile.
              </p>
            </div>
            <div className="case-footer">
              <span>Available now: private chat and owner-scoped mind</span>
            </div>
          </div>

          {/* Use Case 3: Event Attendance History & Loyalty Rewards */}
          <div className="use-case-card">
            <div className="use-case-top">
              <div className="case-icon-box event">
                <Calendar size={22} />
              </div>
              <span className="case-category-pill event-pill">Public story</span>
            </div>
            <h3>Share selected memories with others</h3>
            <p className="case-description">
              The owner may share approved memories as public Arkiv checkpoints. The app does not currently track conference attendance or issue loyalty rewards.
            </p>
            <div className="case-benefit-box">
              <div className="benefit-label">
                <CheckCircle2 size={15} /> <strong>What this makes possible</strong>
              </div>
              <p>
                Visitors can inspect the public character story without seeing private chats.
              </p>
            </div>
            <div className="case-footer">
              <span>Available now: approved public Arkiv snapshots</span>
            </div>
          </div>

          {/* Use Case 4: Developer Guild & Autonomous Envoy */}
          <div className="use-case-card">
            <div className="use-case-top">
              <div className="case-icon-box dev">
                <Code2 size={22} />
              </div>
              <span className="case-category-pill dev-pill">Story handover</span>
            </div>
            <h3>Invite someone to continue the story</h3>
            <p className="case-description">
              Owners can receive interest requests and testnet-price bids from people who want to continue a character’s story. This does not transfer money.
            </p>
            <div className="case-benefit-box">
              <div className="benefit-label">
                <CheckCircle2 size={15} /> <strong>What this makes possible</strong>
              </div>
              <p>
                An owner may choose to hand over the Arkiv root. There is no payment or escrow contract, so a bid is not a completed sale.
              </p>
            </div>
            <div className="case-footer">
              <span>Available now: unpaid bids and owner-approved handover</span>
            </div>
          </div>
        </div>
      </section>

      {/* Protocol Architecture & Track Proofs (Balanced 2-Column Grid) */}
      <section className="architecture-section" id="proofs">
        <div className="section-header-center">
          <p className="section-eyebrow">HOW IT WORKS</p>
          <h2>Private conversation, public proof</h2>
          <p className="section-sub">
            Decentralized private AI inference paired with sovereign, queryable on-chain memory.
          </p>
        </div>

        <div className="arch-grid-two">
          <div className="arch-card">
            <div className="arch-header">
              <div className="arch-badge zero-g-badge">0G Private Computer</div>
              <Cpu size={20} className="arch-icon zero-g-icon" />
            </div>
            <h4>Verifiable Private Compute</h4>
            <p>
              Character dialogue is synthesized through 0G Private Computer, providing verifiable decentralized inference with cryptographic Request IDs attached to each reply.
            </p>
            <div className="arch-detail">
              <span>Execution: 0G Private Computer</span>
              <span>Verification: Request ID on every response</span>
            </div>
          </div>

          <div className="arch-card">
            <div className="arch-header">
              <div className="arch-badge arkiv-badge">Arkiv · Rabdi testnet</div>
              <Database size={20} className="arch-icon arkiv-icon" />
            </div>
            <h4>Sovereign On-Chain Mind</h4>
            <p>
              The owner-controlled Arkiv root stores public character traits, memory crystals, and lifespan leases on Rabdi testnet, enabling 1-click sovereign ownership handover.
            </p>
            <div className="arch-detail">
              <span>Network: Rabdi Testnet (Chain ID 60138)</span>
              <span>Ownership: Sovereign on-chain transfer</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="cta-banner">
        <div className="cta-content">
          <p className="cta-eyebrow">ETHGLOBAL MUMBAI 2026</p>
          <h2>Give a character a beginning.</h2>
          <p>
            Create a character, talk with them, and see how their story changes over time.
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
