'use client';
import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Sparkles,
  ArrowLeft,
  Check,
  X,
  Send,
  Volume2,
  VolumeX,
  Hand,
  Music2,
  Heart,
  Globe2,
  LockKeyhole,
  Clock3,
  Loader2,
  ExternalLink,
  BookOpen,
  Brain,
  History,
  Save,
  Info,
} from 'lucide-react';
import { lifecycle, shortAddress, type Character, type Message } from '@/lib/domain';
import { api } from '@/lib/client';
import { Stage, Flower, TimeLeft, LifecyclePill, Modal } from './ui';
import { writeArkiv, transferArkiv } from '@/lib/arkiv';
import type { Address, Hex } from 'viem';
export default function CharacterView({
  c,
  owner,
  refresh,
  notify,
  ensure,
  initialTab = 'conversation',
  autoPublish = false,
  autoTransfer = false,
}: {
  c: Character;
  owner: string | null;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
  ensure: () => boolean;
  initialTab?: string;
  autoPublish?: boolean;
  autoTransfer?: boolean;
}) {
  const router = useRouter();
  const own = c.owner === owner;
  const [tab, setTab] = useState(initialTab);
  const [chat, setChat] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [speaking, setSpeaking] = useState(false);
  const [vowel, setVowel] = useState(0);
  const [voice, setVoice] = useState(false);
  const [gesture, setGesture] = useState('Wave');
  const [gestureKey, setGestureKey] = useState(0);
  const [publishing, setPublishing] = useState(autoPublish);
  const [transfer, setTransfer] = useState(autoTransfer);
  const [offer, setOffer] = useState(false);
  const [memory, setMemory] = useState(false);
  const [memoryText, setMemoryText] = useState('');
  const [scope, setScope] = useState<'private' | 'public'>('private');
  const [highlights, setHighlights] = useState(c.highlights.join('\n'));
  const [availability, setAvailability] = useState(c.availability);
  const [recipient, setRecipient] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [incoming, setIncoming] = useState<{ from: string; note: string; at: number }[]>([]);
  const [provider, setProvider] = useState('Scripted demo');
  const [actionBusy, setActionBusy] = useState(false);
  const [greeting, setGreeting] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const animation = useRef<number>(0);
  const speechTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const l = lifecycle(c, now);
  useEffect(() => {
    fetch(`/api/app?id=${c.id}`)
      .then((r) => r.json())
      .then((d) => {
        setChat(d.messages || []);
        setIncoming(d.offers || []);
        setProvider(d.provider || 'Scripted demo');
      })
      .catch(() => {});
  }, [c.id, owner]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chat, pending]);
  const stopSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    audio.current?.pause();
    cancelAnimationFrame(animation.current);
    if (speechTimeout.current) clearTimeout(speechTimeout.current);
    setSpeaking(false);
    setGreeting(false);
  }, []);
  useEffect(() => () => stopSpeech(), [stopSpeech]);
  useEffect(() => {
    if (!l.alive) stopSpeech();
  }, [l.alive, stopSpeech]);
  const speak = (text: string) => {
    stopSpeech();
    if (!window.speechSynthesis) {
      notify('Speech is not available in this browser.');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onstart = () => setSpeaking(true);
    utterance.onboundary = (e) => {
      const word = text.slice(e.charIndex, e.charIndex + (e.charLength || 5)).toLowerCase();
      const found = word.match(/[aiueo]/)?.[0] || 'a';
      setVowel('aiueo'.indexOf(found));
    };
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    speechTimeout.current = setTimeout(() => {
      setSpeaking(false);
    }, 60000);
  };
  const playGreeting = async () => {
    stopSpeech();
    try {
      const name = c.model === 'human' ? 'mira' : 'milo';
      const cues = await fetch(`/audio/${name}-greeting.json`).then((r) => r.json());
      const player = new Audio(`/audio/${name}-greeting.mp3`);
      audio.current = player;
      const map: Record<string, number> = { B: 1, C: 3, D: 0, E: 4, F: 2, G: 3, H: 0 };
      player.onended = stopSpeech;
      player.onerror = () => {
        stopSpeech();
        notify('Could not play the greeting.');
      };
      await player.play();
      setGreeting(true);
      const tick = () => {
        const cue = cues.mouthCues.find(
          (cue: { start: number; end: number }) =>
            player.currentTime >= cue.start && player.currentTime < cue.end,
        );
        setSpeaking(!!cue && !['A', 'X'].includes(cue.value));
        setVowel(map[cue?.value] ?? 0);
        if (!player.paused && !player.ended) animation.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not play greeting.');
    }
  };
  const action = async (fn: () => Promise<void>) => {
    if (!ensure()) return;
    setActionBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setActionBusy(false);
    }
  };
  const send = async (text = input) => {
    if (!ensure() || !text.trim() || pending) return;
    if (!l.alive) {
      notify('Sunset has arrived. This legacy is read-only.');
      return;
    }
    setPending(true);
    const message: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: text.trim(),
      at: Date.now(),
    };
    setChat((items) => [...items, message]);
    setInput('');
    try {
      const result = await api('chat', { id: c.id, text: message.text, audition: !own });
      setChat((items) => [...items, result.message]);
      if (voice) speak(result.message.text);
    } catch (e) {
      setChat((items) => items.filter((m) => m.id !== message.id));
      setInput(message.text);
      notify(e instanceof Error ? e.message : 'Conversation failed.');
    } finally {
      setPending(false);
    }
  };
  const sync = () =>
    action(async () => {
      if (!owner?.startsWith('0x'))
        throw new Error('Connect a wallet to write real Arkiv state. Demo characters stay local.');
      if (!window.ethereum) throw new Error('A browser wallet is required.');
      const prepared = await api('prepareSnapshot', { id: c.id });
      const result = await writeArkiv(
        window.ethereum,
        owner as Address,
        prepared.character,
        prepared.proof,
        prepared.verifier,
      );
      await api('sync', { id: c.id, entityKey: result.entityKey });
      notify(`Arkiv checkpoint confirmed: ${result.txHash.slice(0, 12)}…`);
    });
  return (
    <div className="page-shell detail-page">
      <div className="detail-topbar">
        <Link href="/explore" className="back-link">
          <ArrowLeft size={16} />
          Back to discovery
        </Link>
        <div className="button-row">
          {own && l.alive && (
            <button className="button secondary small-button" onClick={() => setPublishing(true)}>
              <Globe2 size={14} />
              {c.published ? 'Edit public profile' : 'Introduce to the world'}
            </button>
          )}
          <span className="pill">
            {c.demo
              ? 'Local demo character'
              : c.entityKey
                ? 'Arkiv linked'
                : 'Local · not yet on Arkiv'}
          </span>
        </div>
      </div>
      <div className="detail-layout">
        <aside className="character-aside">
          <div className={`detail-stage ${c.model === 'fox' ? 'palette-1' : 'palette-0'}`}>
            <div className="stage-title">
              <h1>{c.name}</h1>
              <p>{c.tagline}</p>
            </div>
            <div className="stage-top">
              <LifecyclePill c={c} />
              <span className="eyebrow">ONE LITTLE LIFE</span>
            </div>
            <Stage
              model={c.model}
              speaking={speaking}
              vowel={vowel}
              gesture={gesture}
              gestureKey={gestureKey}
              legacy={!l.alive}
            />
            {l.alive && (
              <div className="gesture-toolbar">
                <button
                  onClick={() => {
                    setGesture('Wave');
                    setGestureKey((n) => n + 1);
                  }}
                  aria-label="Wave"
                >
                  <Hand size={18} />
                </button>
                {c.model === 'robot' && (
                  <button
                    onClick={() => {
                      setGesture('Dance');
                      setGestureKey((n) => n + 1);
                    }}
                    aria-label="Dance"
                  >
                    <Music2 size={18} />
                  </button>
                )}
                <button
                  onClick={greeting ? stopSpeech : playGreeting}
                  aria-label={greeting ? 'Stop greeting' : 'Play prerecorded voice sample'}
                >
                  {greeting ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              </div>
            )}
          </div>
          <div className="character-bio">
            <div className="eyebrow">
              {own
                ? 'YOUR LITTLE SOMEONE'
                : `CULTIVATED BY ${c.creator === 'MitrAI studio' ? 'MITRAI STUDIO' : shortAddress(c.creator)}`}
            </div>
            <h1>
              {c.name}
              <span>✳</span>
            </h1>
            <p>{c.tagline}</p>
            <div className="tags">
              {c.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="lifetime-meter">
              <div>
                <span>
                  <Clock3 size={14} />
                  <TimeLeft character={c} />
                </span>
                <small>{Math.round(l.progress * 100)}% of a life</small>
              </div>
              <div className="meter">
                <i style={{ width: `${l.progress * 100}%` }} />
              </div>
              <small>
                Sunset ·{' '}
                {new Date(c.createdAt + c.lifespan).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </small>
            </div>
            {c.lifespan === 600000 && (
              <div className="note">Ten-minute demo lifespan. This clock is real.</div>
            )}
            <p className="bio-description">{c.description}</p>
            {!own && l.alive && (
              <>
                <button
                  className="button primary full"
                  disabled={actionBusy || c.availability === 'showcase'}
                  onClick={() => {
                    if (!ensure()) return;
                    if (c.availability === 'transfer' && c.owner === 'studio' && c.demo)
                      action(async () => {
                        const result = await api('adopt', { id: c.id });
                        router.push(`/companion/${result.character.id}`);
                        notify(
                          'This story is yours to continue. Its original Sunset stays the same.',
                        );
                      });
                    else setOffer(true);
                  }}
                >
                  {actionBusy ? <Loader2 className="spin" size={16} /> : <Heart size={16} />}{' '}
                  {c.availability === 'transfer'
                    ? c.owner === 'studio' && c.demo
                      ? 'Adopt in demo'
                      : 'Request handover'
                    : c.availability === 'offers'
                      ? 'Start a conversation about adoption'
                      : 'Showcase only'}
                </button>
                <small className="form-caption">
                  {c.availability === 'transfer' && c.owner === 'studio'
                    ? 'Free local demo adoption. No payment or blockchain sale.'
                    : 'No payments are collected in this build.'}
                </small>
              </>
            )}
            {own && l.alive && (
              <button className="text-link" onClick={() => setTransfer(true)}>
                Pass on their story <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        </aside>
        <section className="character-workspace">
          <div
            className="workspace-tabs"
            role="group"
            aria-label="Character sections"
            style={{ '--selected-tab': Math.max(0, ['conversation', 'mind', 'story', 'history'].indexOf(tab)) } as CSSProperties}
          >
            {[
              { id: 'conversation', label: 'Chat', icon: Heart },
              { id: 'mind', label: 'The mind', icon: Brain },
              { id: 'story', label: 'Their story', icon: BookOpen },
              { id: 'history', label: 'Provenance', icon: History },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={tab === t.id}
                onClick={() => setTab(t.id)}
                className={tab === t.id ? 'active' : ''}
              >
                <t.icon size={16} />
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'conversation' && (
            <div className="chat-panel">
              <div className="chat-top">
                <div>
                  <span className="online-dot" />
                  <strong>
                    {l.alive
                      ? own
                        ? 'A little time together'
                        : 'An isolated introduction'
                      : 'A story, complete'}
                  </strong>
                  <small title={provider}>
                    {l.alive
                      ? `${provider} · ${own ? 'private conversation' : 'public state only'}`
                      : 'Sunset has arrived · read-only legacy'}
                  </small>
                </div>
                <button
                  className={`icon-button ${voice ? 'voice-on' : ''}`}
                  onClick={() => {
                    setVoice(!voice);
                    if (voice) stopSpeech();
                  }}
                  aria-label={voice ? 'Mute spoken replies' : 'Enable spoken replies'}
                >
                  {voice ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
              </div>
              {!own && l.alive && (
                <div className="audition-notice">
                  <LockKeyhole size={14} />
                  This audition leaves no memories and never changes the character.
                </div>
              )}
              <div className="messages">
                {!chat.length && (
                  <div className="chat-welcome">
                    <p>
                      {l.alive
                        ? `Say hello to ${c.name}.`
                        : c.highlights.at(-1) ||
                          'Their public history and approved memories remain in the story and mind tabs.'}
                    </p>
                  </div>
                )}
                {chat.map((m) => (
                  <div key={m.id} className={`message ${m.role}`}>
                    <span className="message-label">
                      {m.role === 'user' ? 'YOU' : c.name.toUpperCase()}
                    </span>
                    <p>{m.text}</p>
                    {m.provider && (
                      <small>
                        {m.provider}
                        {m.requestId ? ` · ${m.requestId}` : ''}
                        <button onClick={() => speak(m.text)} aria-label="Read this reply aloud">
                          <Volume2 size={12} />
                        </button>
                      </small>
                    )}
                  </div>
                ))}
                {pending && (
                  <div className="message assistant thinking">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
                <div ref={end} />
              </div>
              <form
                className="chat-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <textarea
                  aria-label="Message your character"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  maxLength={1500}
                  rows={1}
                  placeholder={
                    l.alive ? `Say something to ${c.name}…` : 'This character has reached Sunset'
                  }
                  disabled={!l.alive || pending}
                />
                <button
                  type="submit"
                  className="send-button"
                  disabled={!l.alive || pending || !input.trim()}
                  aria-label="Send message"
                >
                  {pending ? <Loader2 className="spin" size={18} /> : <ArrowRight size={20} />}
                </button>
              </form>
              <div className="chat-caption">
                {provider === 'Scripted demo'
                  ? 'Scripted rehearsal, not live AI inference. Configure Bedrock for open-ended conversation.'
                  : `Replies generated with ${provider}. Verify important claims.`}
              </div>
              {own && l.alive && (
                <div className="checkpoint-bar">
                  <span>
                    <Sparkles size={14} />
                    Turn moments into a little growth.
                  </span>
                  <button
                    className="text-link"
                    disabled={actionBusy}
                    onClick={() =>
                      action(async () => {
                        await api('checkpoint', { id: c.id });
                        notify('Conversation consolidated into a local checkpoint.');
                      })
                    }
                  >
                    <Save size={14} />
                    Save checkpoint
                  </button>
                </div>
              )}
            </div>
          )}
          {tab === 'mind' && (
            <div className="tab-content">
              <p className="eyebrow">A SMALL MIND, ALWAYS BECOMING</p>
              <h2>Made of little moments.</h2>
              <p className="muted">
                A structured memory, a few growing habits, and a personality that changes slowly.
              </p>
              <div className="trait-cards">
                {Object.entries(c.brain.traits).map(([k, v]) => (
                  <div key={k}>
                    <span>{k}</span>
                    <strong>
                      {v}
                      <small>/100</small>
                    </strong>
                    <div className="meter">
                      <i style={{ width: `${v}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="subheading">
                <h3>
                  Memories <span>{c.brain.memories.length}</span>
                </h3>
                {own && l.alive && (
                  <button className="text-link" onClick={() => setMemory(true)}>
                    <Plus size={14} />
                    Add a memory
                  </button>
                )}
              </div>
              {!c.brain.memories.length ? (
                <div className="soft-empty">
                  <Brain size={24} />
                  <p>A little room for something worth remembering.</p>
                </div>
              ) : (
                c.brain.memories.map((m) => (
                  <div className="memory-card" key={m.id}>
                    <span className="pill">
                      {m.scope === 'private' ? <LockKeyhole size={11} /> : <Globe2 size={11} />}{' '}
                      {m.scope}
                    </span>
                    <p>{m.text}</p>
                    <small>{new Date(m.createdAt).toLocaleDateString()}</small>
                  </div>
                ))
              )}
              <div className="subheading">
                <h3>Growing habits</h3>
                <span className="pill">Checkpoint {c.brain.version}</span>
              </div>
              {c.brain.habits.length ? (
                c.brain.habits.map((h) => (
                  <div className="habit-card" key={h.context}>
                    <Sparkles size={18} />
                    <div>
                      <strong>{h.action}</strong>
                      <small>
                        {h.successes} explicit feedback events · {h.context}
                      </small>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">
                  Repeated, explicit feedback can form a habit. One conversation won’t rewrite a
                  personality.
                </p>
              )}{' '}
              {own && l.alive && (
                <div className="chain-box">
                  <div>
                    <strong>Give this mind a public checkpoint.</strong>
                    <p>
                      {c.entityKey
                        ? `Linked to ${c.entityKey.slice(0, 16)}… · chain version ${c.chainVersion}`
                        : 'Private chats stay here. Only approved public character state goes to Arkiv.'}
                    </p>
                  </div>
                  <button className="button secondary" onClick={sync} disabled={actionBusy}>
                    {actionBusy ? <Loader2 className="spin" size={15} /> : <Globe2 size={15} />}Sync
                    to Arkiv
                  </button>
                </div>
              )}
            </div>
          )}
          {tab === 'story' && (
            <div className="tab-content">
              <p className="eyebrow">A STORY WORTH CONTINUING</p>
              <h2>
                What makes {c.name}, {c.name}.
              </h2>
              <p className="story-description">{c.description}</p>
              <div className="subheading">
                <h3>Selected moments</h3>
                <span className="pill">Creator-approved</span>
              </div>
              {c.highlights.length ? (
                c.highlights.map((h, i) => (
                  <div className="highlight" key={i}>
                    <span>0{i + 1}</span>
                    <p>{h}</p>
                    <Sparkles size={16} />
                  </div>
                ))
              ) : (
                <div className="soft-empty">
                  <BookOpen size={24} />
                  <p>This chapter is still being written.</p>
                </div>
              )}
              <div className="note">
                <Info size={16} />
                These are creator descriptions and examples, not independently verified skill
                ratings.
              </div>
              <h3 className="spaced-heading">What travels with them?</h3>
              <div className="review-list">
                <span>
                  <Check size={15} />
                  Public personality, approved memories and habits
                </span>
                <span>
                  <Check size={15} />
                  Documented history and remaining lifetime
                </span>
                <span>
                  <LockKeyhole size={15} />
                  Private chats and personal facts stay with the old owner
                </span>
              </div>
              {own && incoming.length > 0 && (
                <>
                  <h3 className="spaced-heading">Adoption enquiries</h3>
                  {incoming.map((o, i) => (
                    <div key={i} className="memory-card">
                      <strong>{shortAddress(o.from)}</strong>
                      <p>{o.note}</p>
                      <small>{new Date(o.at).toLocaleString()}</small>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
          {tab === 'history' && (
            <div className="tab-content">
              <p className="eyebrow">THE LITTLE THINGS THAT LED HERE</p>
              <h2>A life with a history.</h2>
              <div className="provenance-summary">
                <div>
                  <span>Created by</span>
                  <strong>{shortAddress(c.creator)}</strong>
                </div>
                <div>
                  <span>Current owner</span>
                  <strong>{shortAddress(c.owner)}</strong>
                </div>
                <div>
                  <span>Born</span>
                  <strong>{new Date(c.createdAt).toLocaleDateString()}</strong>
                </div>
                <div>
                  <span>Source</span>
                  <strong>{c.entityKey ? 'Arkiv linked' : 'Local rehearsal'}</strong>
                </div>
              </div>
              <div className="timeline">
                {[...c.history].reverse().map((h, i) => (
                  <div key={`${h.at}-${i}`}>
                    <i />
                    <small>{new Date(h.at).toLocaleString()}</small>
                    <p>{h.text}</p>
                  </div>
                ))}
              </div>
              {c.entityKey && (
                <a
                  className="text-link"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://rabdi.explorer.arkiv.network`}
                >
                  Open Rabdi explorer
                  <ExternalLink size={14} />
                </a>
              )}
              <p className="muted small-text">
                Local history is application-maintained. A signed chain write proves a transaction,
                not that a skill claim is true.
              </p>
            </div>
          )}
        </section>
      </div>
      {publishing && (
        <Modal title="Introduce a little someone" close={() => setPublishing(false)}>
          <p className="muted">
            Choose what the world sees. Private memories and chats are excluded.
          </p>
          <label className="form-label">
            Selected moments
            <small>One demonstration or approved highlight per line, up to four.</small>
            <textarea
              rows={4}
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              placeholder="What makes this character worth meeting?"
            />
          </label>
          <label className="form-label">
            Availability
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as Character['availability'])}
            >
              <option value="showcase">Showcase only</option>
              <option value="offers">Open to offers</option>
              <option value="transfer">Available for handover</option>
            </select>
          </label>
          <div className="note">
            <Globe2 size={16} />
            Publishing makes your selected character state public. No payment is collected.
          </div>
          <button
            className="button primary full"
            disabled={actionBusy}
            onClick={() =>
              action(async () => {
                await api('publish', {
                  id: c.id,
                  availability,
                  highlights: highlights
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .slice(0, 4),
                });
                setPublishing(false);
                notify(
                  'Public profile published to the local gallery. Sync to Arkiv from the Mind tab when ready.',
                );
              })
            }
          >
            Publish profile
            <ArrowUpRight size={16} />
          </button>
        </Modal>
      )}
      {memory && (
        <Modal title="Something worth remembering" close={() => setMemory(false)}>
          <label className="form-label">
            Memory
            <textarea
              rows={4}
              value={memoryText}
              onChange={(e) => setMemoryText(e.target.value)}
              maxLength={500}
              placeholder="A preference, a shared experience, a little piece of their world…"
            />
          </label>
          <div className="segmented">
            <button
              className={scope === 'private' ? 'active' : ''}
              onClick={() => setScope('private')}
            >
              <LockKeyhole size={14} />
              Private
            </button>
            <button
              className={scope === 'public' ? 'active' : ''}
              onClick={() => setScope('public')}
            >
              <Globe2 size={14} />
              Public & transferable
            </button>
          </div>
          <p className="muted small-text">
            {scope === 'private'
              ? 'Only your ownership session can use this memory.'
              : 'This memory can appear in public auditions and travel to a new owner.'}
          </p>
          <button
            className="button primary full"
            disabled={actionBusy || memoryText.trim().length < 3}
            onClick={() =>
              action(async () => {
                await api('memory', { id: c.id, text: memoryText, scope });
                setMemory(false);
                setMemoryText('');
                notify('Memory saved with your chosen visibility.');
              })
            }
          >
            Keep this memory
            <Check size={16} />
          </button>
        </Modal>
      )}
      {transfer && (
        <Modal title="Pass on their story" close={() => setTransfer(false)}>
          <p className="muted">
            A new owner, the same lifetime. Review the recipient carefully. Private memories and
            chats will not travel.
          </p>
          <label className="form-label">
            Recipient wallet
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x…"
            />
          </label>
          <div className="note">
            <Clock3 size={16} />
            <TimeLeft character={c} />. Transfer never resets Sunset.
          </div>
          <button
            className="button primary full"
            disabled={actionBusy || !recipient}
            onClick={() =>
              action(async () => {
                if (c.entityKey) {
                  if (!window.ethereum || !owner?.startsWith('0x'))
                    throw new Error('Connect the owner wallet first.');
                  await transferArkiv(
                    window.ethereum,
                    owner as Address,
                    c.entityKey as Hex,
                    recipient as Address,
                  );
                }
                await api('transfer', { id: c.id, recipient });
                setTransfer(false);
                router.push('/explore');
                notify('Ownership handed over. Old owner access has ended.');
              })
            }
          >
            {actionBusy ? <Loader2 className="spin" size={16} /> : <ArrowRight size={16} />}Confirm
            handover
          </button>
        </Modal>
      )}
      {offer && (
        <Modal title={`Continue ${c.name}’s story`} close={() => setOffer(false)}>
          <p className="muted">
            Tell the owner what you’d like to explore together. This is an enquiry, not a purchase.
          </p>
          <label className="form-label">
            Your note
            <textarea
              rows={4}
              value={offerNote}
              onChange={(e) => setOfferNote(e.target.value)}
              maxLength={500}
            />
          </label>
          <button
            className="button primary full"
            disabled={actionBusy || offerNote.trim().length < 5}
            onClick={() =>
              action(async () => {
                await api('offer', { id: c.id, note: offerNote });
                setOffer(false);
                notify('Your enquiry is saved for the owner. No payment was made.');
              })
            }
          >
            Send enquiry
            <ArrowRight size={16} />
          </button>
        </Modal>
      )}
    </div>
  );
}
