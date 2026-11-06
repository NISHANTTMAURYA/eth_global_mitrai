'use client';
import Link from 'next/link';
import { ArrowRight, Heart, Clock3, Sparkles } from 'lucide-react';
import { Stage } from './ui';
import type { Character } from '@/lib/domain';
export default function HomeView({ legacy }: { legacy?: Character }) {
  return (
    <div className="page-shell welcome-page">
      {legacy && (
        <div className="note">
          {legacy.name} has reached Sunset.{' '}
          <Link href={`/legacy/${legacy.id}`}>Revisit their Legacy</Link>
        </div>
      )}
      <section className="welcome-hero">
        <div>
          <p className="eyebrow">ONE CHARACTER. A STORY SHAPED TOGETHER.</p>
          <h1>
            Someone to meet.
            <br />
            <em>Someone to grow with.</em>
          </h1>
          <p>
            Choose a unique character, make their personality yours, and watch them grow through
            your conversations.
          </p>
          <div className="button-row">
            <Link href="/create" className="button primary">
              Create my MitrAI <ArrowRight size={17} />
            </Link>
            <Link href="/explore" className="button secondary">
              Explore MitrAI
            </Link>
          </div>
          <small>A wallet gives you ownership. A conversation begins your connection.</small>
        </div>
        <div className="welcome-character">
          <span className="pill">Meet Cactus · a starting template</span>
          <Stage model="download:09_CactusBoy" interactive />
          <p>A little prickly, quietly kind.</p>
        </div>
      </section>
      <section className="welcome-steps">
        <article>
          <Sparkles />
          <h3>Choose their beginning</h3>
          <p>
            A name, a starting personality and a voice are ready. Change as much or as little as you
            like. Each appearance can be created once.
          </p>
        </article>
        <article>
          <Heart />
          <h3>Shape who they become</h3>
          <p>
            Talk, tell stories or explore an idea. They remember meaningful details and adapt
            gradually. Your conversations stay private.
          </p>
        </article>
        <article>
          <Clock3 />
          <h3>Make the time yours</h3>
          <p>
            A MitrAI lives for 30 days. Its age continues even with a new owner. At Sunset, its
            approved story becomes a read-only Legacy.
          </p>
        </article>
      </section>
      <p className="welcome-note">
        Later, you can share their public story or offer them for adoption. You choose what travels
        with them.
      </p>
    </div>
  );
}
