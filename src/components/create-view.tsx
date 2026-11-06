'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, ArrowLeft, Check, Hand, Clock3, Loader2, Sun } from 'lucide-react';
import { type Character, type ModelId } from '@/lib/domain';
import { api } from '@/lib/client';
import { Stage, Flower } from './ui';
import { models } from '@/lib/models';
export default function CreateView({
  owner,
  mine,
  characters,
  connect,
  refresh,
  notify,
}: {
  owner: string | null;
  mine?: Character;
  characters: Character[];
  connect: () => void;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [model, setModel] = useState<ModelId>('robot');
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [behavior, setBehavior] = useState(
    'Curious, warm, and a little playful. Ask thoughtful questions.',
  );
  const [tags, setTags] = useState('Curious, Creative');
  const [traits, setTraits] = useState({ curiosity: 62, warmth: 72, playfulness: 55 });
  const [shortLife, setShortLife] = useState(false);
  const [agree, setAgree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gesture, setGesture] = useState(0);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('mitrai-draft');
      if (saved) {
        const d = JSON.parse(saved);
        setName(d.name || '');
        setTagline(d.tagline || '');
        setDescription(d.description || '');
        setBehavior(d.behavior || behavior);
        setModel(d.model || 'robot');
        setTags(d.tags || tags);
      }
    } catch {}
  }, []);
  useEffect(() => {
    sessionStorage.setItem(
      'mitrai-draft',
      JSON.stringify({ name, tagline, description, behavior, model, tags }),
    );
  }, [name, tagline, description, behavior, model, tags]);
  const next = () => {
    if (
      step === 0 &&
      (name.trim().length < 2 || tagline.trim().length < 4 || description.trim().length < 12)
    ) {
      notify('Give your character a name, a tagline, and a little more of its story.');
      return;
    }
    setStep((s) => s + 1);
  };
  const create = async () => {
    if (!owner) {
      connect();
      return;
    }
    if (!agree) {
      notify('Review and accept the lifetime before activation.');
      return;
    }
    setSaving(true);
    try {
      const r = await api('create', {
        name,
        tagline,
        description,
        behavior,
        model,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 5),
        shortLife,
        traits,
      });
      sessionStorage.removeItem('mitrai-draft');
      await refresh();
      router.push(`/companion/${r.character.id}`);
      notify('A new little life has begun.');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Creation failed.');
    } finally {
      setSaving(false);
    }
  };
  if (mine)
    return (
      <div className="empty-page">
        <Flower size={60} />
        <h1>
          One little life.
          <br />
          Your full attention.
        </h1>
        <p>You already have an active character. Keep shaping its story.</p>
        <Link className="button primary" href={`/companion/${mine.id}`}>
          Return to {mine.name}
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  return (
    <div className="page-shell create-page">
      <Link href="/explore" className="back-link">
        <ArrowLeft size={16} />
        Back to discovery
      </Link>
      <div className="create-heading">
        <p className="eyebrow">A LITTLE BEGINNING</p>
        <h1>
          Who will <em>yours be?</em>
        </h1>
        <p>Start with a spark. Let your time together shape the rest.</p>
      </div>
      <div className="creation-layout">
        <div className="creation-form">
          <div className="stepper">
            {['The spark', 'The personality', 'The beginning'].map((s, i) => (
              <button
                key={s}
                className={i === step ? 'current' : i < step ? 'complete' : ''}
                onClick={() => {
                  if (i < step) setStep(i);
                }}
              >
                <span>{i < step ? <Check size={13} /> : i + 1}</span>
                {s}
              </button>
            ))}
          </div>
          {step === 0 && (
            <div className="form-step">
              <h2>Every story starts with someone.</h2>
              <label>
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={32}
                  placeholder="Something that feels like them"
                />
              </label>
              <label>
                A little introduction
                <input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  maxLength={100}
                  placeholder="A wild imagination. A soft place to land."
                />
              </label>
              <label>
                Who is this being?
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder="Their world, their quirks, what makes them different. There’s no right kind of character."
                />
              </label>
              <label>
                Discovery tags<small>Separate with commas. Up to five.</small>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Storytelling, Curious, Unexpected"
                />
              </label>
              <button className="button primary full" onClick={next}>
                Give them a personality
                <ArrowRight size={16} />
              </button>
            </div>
          )}
          {step === 1 && (
            <div className="form-step">
              <h2>A starting point, not a script.</h2>
              <label>
                How do they behave?
                <textarea
                  value={behavior}
                  onChange={(e) => setBehavior(e.target.value)}
                  rows={3}
                  maxLength={1000}
                />
              </label>
              <div className="trait-sliders">
                {Object.entries(traits).map(([key, value]) => (
                  <label key={key}>
                    <span>
                      {key}
                      <b>{value}%</b>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={value}
                      onChange={(e) => setTraits({ ...traits, [key]: Number(e.target.value) })}
                    />
                  </label>
                ))}
              </div>
              <label>
                Choose their form
                <small>Choose a body for the character you cultivate.</small>
              </label>
              <div className="model-options">
                {models.map((option) => {
                  const occupied = characters.some((character) => character.model === option.id);
                  return (
                    <button key={option.id} disabled={occupied} className={`${model === option.id ? 'chosen' : ''} ${occupied ? 'model-taken' : ''}`} onClick={() => setModel(option.id)}>
                      <span>✧</span>{option.name}{occupied && <small>Already in use</small>}
                    </button>
                  );
                })}
              </div>
              <button
                className="button primary full"
                onClick={() => {
                  if (behavior.trim().length < 5) notify('Describe how your character behaves.');
                  else next();
                }}
              >
                Review their beginning
                <ArrowRight size={16} />
              </button>
            </div>
          )}
          {step === 2 && (
            <div className="form-step">
              <h2>A lifetime worth making.</h2>
              <p className="muted">
                Their clock starts when you activate. Every day matters, even while you’re away.
              </p>
              <div className="lifetime-options">
                <button className={!shortLife ? 'chosen' : ''} onClick={() => setShortLife(false)}>
                  <Sun size={21} />
                  <strong>30 days together</strong>
                  <small>The initial product lifespan</small>
                </button>
                <button className={shortLife ? 'chosen' : ''} onClick={() => setShortLife(true)}>
                  <Clock3 size={21} />
                  <strong>10-minute demo</strong>
                  <small>See the whole life cycle</small>
                </button>
              </div>
              <div className="review-list">
                <span>
                  <Check size={15} />
                  Publishing and transfer never reset the clock
                </span>
                <span>
                  <Check size={15} />
                  Private chats stay with their original owner
                </span>
                <span>
                  <Check size={15} />
                  At Sunset, a read-only legacy remains
                </span>
                <span>
                  <Check size={15} />
                  Your draft becomes a private character first
                </span>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <span>
                  I understand this lifetime is finite, and public character state can be read by
                  others.
                </span>
              </label>
              <button className="button primary full" disabled={saving || !agree} onClick={create}>
                {saving ? <Loader2 className="spin" size={17} /> : <Sparkles size={17} />}{' '}
                {owner ? 'Begin their story' : 'Connect to begin'}
              </button>
              <p className="form-caption">
                {owner?.startsWith('demo:')
                  ? 'Local demo activation · no blockchain transaction'
                  : 'Activation is local first. Sync the public checkpoint to Arkiv with your wallet.'}
              </p>
            </div>
          )}
        </div>
        <aside className="creation-preview">
          <div className="preview-stage palette-1">
            <span className="preview-label">LIVE CHARACTER PREVIEW</span>
            <Stage model={model} gesture="Wave" gestureKey={gesture} />
            <button
              className="preview-wave button secondary"
              onClick={() => setGesture((g) => g + 1)}
            >
              <Hand size={15} />
              Say hello
            </button>
          </div>
          <div className="preview-caption">
            <span className="pill">A spark, for now</span>
            <h2>{name || 'Someone new'}</h2>
            <p>{tagline || 'Their story hasn’t been written yet.'}</p>
            <small>Your draft has no ticking clock. Take your time.</small>
          </div>
        </aside>
      </div>
    </div>
  );
}
