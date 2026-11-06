'use client';
import Link from 'next/link';
import { Plus, ArrowUpRight } from 'lucide-react';
import { useTemplates } from '@/lib/use-templates';
import { Stage } from './ui';
export default function TemplateGallery({ query = '' }: { query?: string }) {
  const { items, error } = useTemplates();
  const visible = items.filter((t) =>
    `${t.name} ${t.tagline}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="template-section">
      <div className="template-intro">
        <p className="eyebrow">YOUR STORY STARTS HERE</p>
        <h2>Choose someone to become yours.</h2>
        <p className="muted">
          Each appearance belongs to one MitrAI, ever. Start with their name and personality, then
          make them your own. Voices can be shared.
        </p>
      </div>
      {error && <p role="alert">{error}</p>}
      {!items.length && !error && <p className="muted">Checking available characters…</p>}
      <div className="character-grid">
        {visible.map((t, i) => (
          <article className="character-card" key={t.model}>
            <div className={`card-visual palette-${i % 4}`}>
              <div className="card-top">
                <span className="sample-label">
                  {t.status === 'available'
                    ? 'AVAILABLE TEMPLATE'
                    : t.status === 'created'
                      ? 'ALREADY CREATED'
                      : t.mine
                        ? 'YOUR SAVED DRAFT'
                        : 'RESERVED'}
                </span>
              </div>
              <Stage model={t.model} compact interactive={false} />
            </div>
            <div className="card-copy">
              <h3>{t.name}</h3>
              <p>{t.tagline}</p>
              <div className="tags">
                {t.tags.slice(0, 2).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              {t.status === 'available' ? (
                <Link className="text-link" href={`/create?form=${encodeURIComponent(t.model)}`}>
                  Choose {t.name} <Plus size={14} />
                </Link>
              ) : t.characterId ? (
                <Link
                  className="text-link"
                  href={
                    t.mine && t.status === 'reserved' ? '/create' : `/characters/${t.characterId}`
                  }
                >
                  {t.mine ? 'Continue their story' : 'Meet this MitrAI'}
                  <ArrowUpRight size={14} />
                </Link>
              ) : (
                <p className="muted small-text">
                  {t.status === 'created'
                    ? 'This appearance has its own story.'
                    : 'Someone is creating this character.'}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
      {!!items.length && !visible.length && (
        <p className="soft-empty">No matching templates. Try another name.</p>
      )}
    </section>
  );
}
