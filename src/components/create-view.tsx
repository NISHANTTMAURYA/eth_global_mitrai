'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Sparkles,
  ArrowLeft,
  Check,
  Hand,
  Clock3,
  Loader2,
  Sun,
  Play,
  Square,
  Volume2,
} from 'lucide-react';
import { type Character, type ModelId } from '@/lib/domain';
import { api } from '@/lib/client';
import { Stage, Flower } from './ui';
import { models } from '@/lib/models';
import { VOICES, defaultVoiceForModel } from '@/lib/voices';
import { activateCharacter } from '@/lib/activate-character';
import { templates, type PersonaTemplate } from '@/lib/templates';
import { useTemplates } from '@/lib/use-templates';
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
  const { items: availability, error: availabilityError } = useTemplates();
  const starter = templates.find((t) => t.model === 'robot')!;
  const applyTemplate = (t: PersonaTemplate) => {
    setModel(t.model);
    setName(t.name);
    setTagline(t.tagline);
    setDescription(t.description);
    setBehavior(t.behavior);
    setTraits(t.traits);
    setTags(t.tags.join(', '));
    if (!userChoseVoice.current) setVoice(t.voice);
  };
  const [step, setStep] = useState(0);
  const [model, setModel] = useState<ModelId>('robot');
  const [voice, setVoice] = useState<string>('shubh');
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const previewAudio = useRef<HTMLAudioElement | null>(null);
  const userChoseVoice = useRef(false);
  const [name, setName] = useState(starter.name);
  const [tagline, setTagline] = useState(starter.tagline);
  const [description, setDescription] = useState(starter.description);
  const [behavior, setBehavior] = useState(starter.behavior);
  const [tags, setTags] = useState(starter.tags.join(', '));
  const [traits, setTraits] = useState(starter.traits);
  const [shortLife, setShortLife] = useState(false);
  const [agree, setAgree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gesture, setGesture] = useState(0);

  useEffect(() => {
    return () => {
      previewAudio.current?.pause();
    };
  }, []);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('mitrai-draft');
      if (saved) {
        const d = JSON.parse(saved);
        setName(d.name || starter.name);
        setTagline(d.tagline || starter.tagline);
        setDescription(d.description || starter.description);
        setBehavior(d.behavior || behavior);
        const m = d.model || 'robot';
        setModel(m);
        setVoice(d.voice || defaultVoiceForModel(m));
        if (d.voice) userChoseVoice.current = true;
        setTags(d.tags || tags);
      }
    } catch {}
    const chosen = new URLSearchParams(window.location.search).get('form');
    if (chosen && models.some((m) => m.id === chosen)) {
      applyTemplate(templates.find((t) => t.model === chosen)!);
    }
  }, []);
  useEffect(() => {
    sessionStorage.setItem(
      'mitrai-draft',
      JSON.stringify({ name, tagline, description, behavior, model, voice, tags }),
    );
  }, [name, tagline, description, behavior, model, voice, tags]);

  const toggleVoicePreview = (id: string, previewUrl: string) => {
    if (playingVoice === id) {
      previewAudio.current?.pause();
      setPlayingVoice(null);
      return;
    }
    if (previewAudio.current) {
      previewAudio.current.pause();
    }
    const player = new Audio(previewUrl);
    previewAudio.current = player;
    player.onended = () => setPlayingVoice(null);
    player.onerror = () => setPlayingVoice(null);
    player.play().catch(() => setPlayingVoice(null));
    setPlayingVoice(id);
  };
  const next = () => {
    if (
      step === 0 &&
      availability.find((t) => t.model === model)?.status !== 'available' &&
      !owner?.startsWith('demo:')
    ) {
      notify('Choose an available character to continue.');
      return;
    }
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
    if (
      !owner.startsWith('demo:') &&
      availability.find((t) => t.model === model)?.status !== 'available'
    ) {
      notify('This template is unavailable. Choose an available character.');
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
        voice,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 5),
        shortLife,
        traits,
      });
      await activateCharacter(r.character, owner);
      sessionStorage.removeItem('mitrai-draft');
      await refresh();
      router.push(`/companion/${r.character.id}`);
      notify('A new little life has begun.');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Creation failed.');
      await refresh();
    } finally {
      setSaving(false);
    }
  };
  if (mine && !mine.demo && !mine.entityKey && mine.activation !== 'cancelled')
    return (
      <div className="page-shell create-page">
        <div className="create-heading">
          <p className="eyebrow">A BEGINNING WAITING FOR YOU</p>
          <h1>Bring {mine.name} to life.</h1>
          <p>Your draft is saved. Approve its first Arkiv record to begin.</p>
        </div>
        <div className="activation-card">
          <div style={{ height: 350 }}>
            <Stage model={mine.model} interactive={false} />
          </div>
          <p className="muted">
            Your wallet will create the character’s identity and first brain checkpoint on Rabdi
            testnet. Its private conversations stay off chain.
          </p>
          <button
            className="button primary"
            disabled={saving}
            onClick={async () => {
              if (!owner) {
                connect();
                return;
              }
              setSaving(true);
              try {
                await activateCharacter(mine, owner);
                sessionStorage.removeItem('mitrai-draft');
                await refresh();
                router.push(`/companion/${mine.id}`);
                notify(`${mine.name} is confirmed on Arkiv.`);
              } catch (e) {
                notify(e instanceof Error ? e.message : 'Could not activate.');
                await refresh();
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}{' '}
            {saving ? 'Waiting for your wallet…' : 'Create on Arkiv'}
          </button>
          <button
            className="text-link"
            disabled={saving}
            onClick={async () => {
              try {
                await api('cancelDraft', { id: mine.id });
                await refresh();
                notify('Draft cancelled. Its appearance is available again.');
                router.replace('/create');
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            Cancel unsigned draft
          </button>
        </div>
      </div>
    );
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
        <p>A starting personality is ready. You decide who they become.</p>
      </div>
      <div className="creation-layout">
        <div className="creation-form">
          <div className="stepper">
            {['Choose your character', 'Make it yours', 'Begin their story'].map((s, i) => (
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
              <h2>Choose a beginning.</h2>
              <p className="muted">
                Every character comes with a name and starting personality. Make them yours below.
              </p>
              {availabilityError && <p role="alert">{availabilityError}</p>}
              <div className="model-options">
                {templates.map((t) => {
                  const state = availability.find((a) => a.model === t.model);
                  const unavailable = !state || state.status !== 'available';
                  return (
                    <button
                      key={t.model}
                      disabled={unavailable}
                      className={`${model === t.model ? 'chosen' : ''} ${unavailable ? 'model-taken' : ''}`}
                      onClick={() => applyTemplate(t)}
                    >
                      <strong>{t.name}</strong>
                      <small>
                        {!state
                          ? 'Checking…'
                          : state.status === 'created'
                            ? 'Already created'
                            : state.status === 'reserved'
                              ? 'Reserved'
                              : t.tagline}
                      </small>
                    </button>
                  );
                })}
              </div>

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
              <details className="more-customization">
                <summary>Fine-tune their starting traits</summary>
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
              </details>
              <label>
                Choose their voice
                <small>
                  Listen to a sample and choose the voice you like. Voices can be used by more than
                  one MitrAI.
                </small>
              </label>
              <div className="voice-options">
                {VOICES.map((v) => (
                  <div
                    key={v.id}
                    className={`voice-card ${voice === v.id ? 'chosen' : ''}`}
                    onClick={() => {
                      userChoseVoice.current = true;
                      setVoice(v.id);
                    }}
                  >
                    <div className="voice-card-top">
                      <span className="voice-card-name">{v.name}</span>
                      <span className="voice-card-tag">{v.tag}</span>
                      <button
                        type="button"
                        className={`voice-play-btn ${playingVoice === v.id ? 'playing' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVoicePreview(v.id, v.previewUrl);
                        }}
                        aria-label={
                          playingVoice === v.id ? `Stop ${v.name}` : `Listen to ${v.name}`
                        }
                        title={`Listen to sample (${v.name})`}
                      >
                        {playingVoice === v.id ? (
                          <Square size={11} fill="currentColor" />
                        ) : (
                          <Play size={11} fill="currentColor" />
                        )}
                      </button>
                    </div>
                    <p className="voice-card-desc">{v.description}</p>
                  </div>
                ))}
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
                Their 30-day life starts when creation is confirmed. Reviewing this draft takes no
                time from their life.
              </p>
              <div className="lifetime-options">
                <button className={!shortLife ? 'chosen' : ''} onClick={() => setShortLife(false)}>
                  <Sun size={21} />
                  <strong>30 days together</strong>
                  <small>The initial product lifespan</small>
                </button>
                {owner?.startsWith('demo:') && (
                  <button className={shortLife ? 'chosen' : ''} onClick={() => setShortLife(true)}>
                    <Clock3 size={21} />
                    <strong>10-minute demo</strong>
                    <small>See the whole life cycle</small>
                  </button>
                )}
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
                  Your character starts unlisted. Private chats stay off chain.
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
                {saving
                  ? 'Waiting for your wallet…'
                  : owner
                    ? owner.startsWith('demo:')
                      ? 'Begin their story'
                      : 'Create on Arkiv'
                    : 'Connect wallet to begin'}
              </button>
              <p className="form-caption">
                {owner?.startsWith('demo:')
                  ? 'Local demo activation · no blockchain transaction'
                  : 'Approve the Rabdi transaction in your wallet. Your draft stays saved if you cancel.'}
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
