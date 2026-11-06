'use client';
import { useState } from 'react';
import Link from 'next/link';
import GalleryRenderer from './gallery-renderer';
import TemplateGallery from './template-gallery';

import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  Sparkles,
  Hand,
  Heart,
  Globe2,
  Clock3,
  Loader2,
  Sun,
} from 'lucide-react';
import { lifecycle, shortAddress, type Character } from '@/lib/domain';
import { api } from '@/lib/client';
import { lipSyncRank, models } from '@/lib/models';
import { Stage, Flower, TimeLeft, LifecyclePill } from './ui';
import { EnsBadge } from './ens-badge';
import EnsPassportModal from './ens-passport-modal';
export default function ExploreView({
  characters,
  loading,
  legacyOnly,
  home,
  owner,
  refresh,
  notify,
}: {
  characters: Character[];
  loading: boolean;
  legacyOnly: boolean;
  home: boolean;
  owner: string | null;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [ensCharacter, setEnsCharacter] = useState<Character | null>(null);
  const templatesOnly = !legacyOnly && !characters.some((c) => c.published && lifecycle(c).alive);
  const [filter, setFilter] = useState('All characters');
  const [syncing, setSyncing] = useState(false);
  const [heroGesture, setHeroGesture] = useState(0);
  const featured = characters.find((c) => c.id === 'milo');
  const filters = ['All characters', ...(owner ? ['Owned by me'] : []), 'Open to offers', 'Curious', 'Imaginative', 'Creative'];
  const visible = characters
    .filter((c) => c.published && (legacyOnly ? !lifecycle(c).alive : lifecycle(c).alive))
    .filter((c) =>
      `${c.name} ${c.tagline} ${c.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()),
    )
    .filter(
      (c) =>
        filter === 'All characters' ||
        (filter === 'Owned by me' && c.owner.toLowerCase() === owner?.toLowerCase()) ||
        (filter === 'Open to offers' && ['offers', 'transfer'].includes(c.availability)) ||
        c.tags.some((t) => t.toLowerCase() === filter.toLowerCase()),
    )
    .sort((a, b) => lipSyncRank(a.model) - lipSyncRank(b.model));
  return (
    <GalleryRenderer>
      <div className="page-shell">
        {home && (
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">A COLLECTION OF POSSIBILITIES</div>
              <h1>
                Find a story
                <br />
                <em>worth continuing.</em>
              </h1>
              <p>
                Distinct personalities, shared experiences, and a little room for what comes next.
              </p>
              <div className="button-row">
                <Link href="/create" className="button primary">
                  Create a character <Plus size={17} />
                </Link>
                <a href="#discover" className="text-link">
                  Find your someone <ArrowUpRight size={17} />
                </a>
              </div>
              <div className="hero-footnote">
                <span className="mini-orbits">
                  <b>M</b>
                  <b>F</b>
                  <b>O</b>
                </span>
                <span>One character. A lifetime of becoming.</span>
              </div>
            </div>
            <div className="hero-world">
              <span className="hero-stamp">A STORY STILL UNFOLDING</span>
              <div className="orbital-ring" />
              <div className="hero-character">
                <Stage model="robot" gesture="Wave" gestureKey={heroGesture} />
              </div>
              <button className="hero-wave" onClick={() => setHeroGesture((g) => g + 1)}>
                <Hand size={18} />
                Say hello
              </button>
              <div className="floating-note note-one">
                <Sparkles size={17} />
                <span>A little curiosity</span>
                <i>↗</i>
              </div>
              <div className="floating-note note-two">
                <span className="tiny-heart">♡</span>
                <div>
                  <strong>Made of moments</strong>
                  <small>Shaped by you, over time.</small>
                </div>
              </div>
              <div className="hero-name">
                <div>
                  <span className="online-dot" />
                  Preview · Little robot
                </div>
                <small>Curious by nature. Unique by experience.</small>
              </div>
              <span className="world-coordinate">01 / A LITTLE BEGINNING</span>
            </div>
          </section>
        )}
        {!home && (
          <div className="collection-intro">
            <p className="eyebrow">
              {legacyOnly
                ? 'EVERY LIFE LEAVES A LITTLE SOMETHING'
                : 'A COLLECTION OF POSSIBILITIES'}
            </p>
            <h1>
              {legacyOnly ? (
                <>
                  The stories
                  <br />
                  <em>that stay.</em>
                </>
              ) : (
                <>
                  Find a story
                  <br />
                  <em>worth continuing.</em>
                </>
              )}
            </h1>
            <p>
              {legacyOnly
                ? 'Their time together ended. What they became is still here.'
                : 'Choose a one-of-a-kind character. Conversation shapes its mind. Others can join its community or ask to carry its story forward.'}
            </p>
            {!legacyOnly && <p className="muted">Age counts up from its first Arkiv birth. Time left counts down through one 30-day life. At Sunset, its public story remains as a read-only legacy.</p>}
          </div>
        )}
        {home && (
          <div className="principles-strip">
            <span>
              <Flower size={18} />
              Created with a spark
            </span>
            <span>
              <Heart size={18} />
              Shaped by experience
            </span>
            <span>
              <Globe2 size={18} />A story you can own
            </span>
            <span>
              <Sun size={18} />
              One meaningful lifetime
            </span>
          </div>
        )}
        <section className="discovery" id="discover">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {legacyOnly ? 'THE LEGACY COLLECTION' : 'MEET YOUR NEXT CHAPTER'}
              </p>
              <h2>
                {legacyOnly
                  ? 'Lives that left a mark.'
                  : templatesOnly
                    ? 'Available beginnings.'
                    : 'Meet the community.'}
              </h2>
            </div>
            <span className="collection-count">
              {templatesOnly
                ? 'Each appearance can begin one story.'
                : `${visible.length} ${legacyOnly ? 'legacies' : 'personas'} to discover`}
            </span>
          </div>
          <div className="discover-controls">
            <div className="filter-tabs">
              {(templatesOnly ? ['Available templates'] : legacyOnly ? filters.slice(0, owner ? 2 : 1) : filters).map(
                (f) => (
                  <button
                    key={f}
                    className={templatesOnly || f === filter ? 'selected' : ''}
                    onClick={() => setFilter(templatesOnly ? 'All characters' : f)}
                  >
                    {f}
                  </button>
                ),
              )}
            </div>
            <label className="search-field">
              <Search size={17} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a personality…"
                aria-label="Search characters"
              />
              <span>⌘ K</span>
            </label>
          </div>
          {loading ? (
            <div className="empty">
              <Loader2 className="spin" />
              Meeting the collection…
            </div>
          ) : visible.length ? (
            <div className="character-grid">
              {visible.map((c, i) => (
                <CharacterCard
                  key={c.id}
                  c={c}
                  mine={!!owner && c.owner.toLowerCase() === owner.toLowerCase()}
                  index={i}
                  onOpenEns={(char) => setEnsCharacter(char)}
                />
              ))}
            </div>
          ) : !legacyOnly && !characters.some((c) => c.entityKey && !c.demo) ? (
            <TemplateGallery query={query} />
          ) : (
            <div className="empty">
              <Search />
              <h3>No little lives found.</h3>
              <p>Try another word or clear the filter.</p>
              <button
                className="text-button"
                onClick={() => {
                  setQuery('');
                  setFilter('All characters');
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          <div className="discovery-caption">
            <span>
              <span className="status-dot" /> Character forms have no learned history. Published
              characters show their actual Arkiv state.
            </span>
            <button
              className="text-link"
              disabled={syncing}
              onClick={async () => {
                if (!owner) {
                  notify('Connect a session first to query live Arkiv records.');
                  return;
                }
                setSyncing(true);
                try {
                  const r = await api('discover');
                  await refresh();
                  notify(
                    `Loaded ${r.imported} public character snapshots from Arkiv. Public records are not skill endorsements.`,
                  );
                } catch (e) {
                  notify(e instanceof Error ? e.message : 'Arkiv query failed.');
                } finally {
                  setSyncing(false);
                }
              }}
            >
              {syncing ? 'Querying Arkiv…' : 'Discover on Arkiv'} <ArrowUpRight size={14} />
            </button>
          </div>
        </section>
        {home && (
          <section className="bottom-callout">
            <div className="callout-symbol">
              <Flower size={56} />
            </div>
            <div>
              <p className="eyebrow">A SPARK IS ONLY THE BEGINNING</p>
              <h2>What will yours become?</h2>
              <p>A storyteller. A sparring partner. Something we haven’t imagined yet.</p>
            </div>
            <Link className="button primary" href="/create">
              Make a little room <ArrowRight size={17} />
            </Link>
          </section>
        )}
      </div>
      {ensCharacter && (
        <EnsPassportModal character={ensCharacter} close={() => setEnsCharacter(null)} />
      )}
    </GalleryRenderer>
  );
}
function CharacterCard({
  c,
  mine,
  index,
  onOpenEns,
}: {
  c: Character;
  mine: boolean;
  index: number;
  onOpenEns?: (char: Character) => void;
}) {
  return (
    <article className="character-card">
      <Link
        href={`/characters/${c.id}`}
        className={`card-visual palette-${index % 4}`}
        aria-label={`Meet ${c.name}`}
      >
        <div className="card-top">
          <LifecyclePill c={c} />
          <span className="sample-label">
            {mine ? 'YOUR MITRAI' : c.demo ? 'STUDIO DEMO' : c.entityKey ? 'ARKIV' : 'LOCAL'}
          </span>
        </div>
        <Stage model={c.model} interactive={false} compact legacy={!lifecycle(c).alive} />
        <span className="card-open">
          <ArrowUpRight size={19} />
        </span>
        <div className="card-life">
          <Clock3 size={12} />
          <TimeLeft character={c} />
        </div>
      </Link>
      <div className="card-copy">
        <div className="card-name-row">
          <Link href={`/characters/${c.id}`}>
            <h3>{c.name}</h3>
          </Link>
          <span className={`availability ${c.availability === 'transfer' ? 'adoptable' : ''}`}>
            <i />
            {!lifecycle(c).alive
              ? 'Legacy'
              : c.availability === 'transfer'
                ? 'Open to adoption'
                : c.availability === 'offers'
                  ? 'Open to offers'
                  : 'Growing'}
          </span>
        </div>
        <p>{c.tagline}</p>
        {c.askingPriceTglm && lifecycle(c).alive && c.availability !== 'showcase' && (
          <p className="muted">Owner asks {c.askingPriceTglm} test tGLM · bids are unpaid</p>
        )}
        <div className="tags">
          <EnsBadge character={c} compact onClick={() => onOpenEns?.(c)} />
          {c.tags.slice(0, 2).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="card-bottom">
          <span>
            {mine ? 'Owned by you' : `Current owner ${shortAddress(c.owner)}`}
          </span>
          <span>
            <Sparkles size={12} />
            {c.brain.sessions} moments
          </span>
        </div>
      </div>
    </article>
  );
}
