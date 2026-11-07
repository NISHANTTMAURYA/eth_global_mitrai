'use client';
import BrainObservatory from './brain-observatory';
import CommunityPanel from './community-panel';
import PreservationPanel from './preservation-panel';
import type { AdoptionRequest } from '@/lib/adoption';
import { getWalletProvider } from '@/lib/browser-wallet';
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
  Sliders,
  UserCheck,
} from 'lucide-react';
import { lifecycle, shortAddress, type Character, type Message } from '@/lib/domain';
import { api } from '@/lib/client';
import { Stage, Flower, TimeLeft, LifecyclePill, Modal } from './ui';
import { writeArkiv, transferArkiv } from '@/lib/arkiv';
import { isVrmModel } from '@/lib/models';
import { getVoice, defaultVoiceForModel } from '@/lib/voices';
import { messageBatch } from '@/lib/message-batch';
import { availableGestures, speechSegments } from '@/lib/conversation';
import { validateSpeechTrack, type SpeechTrack } from '@/lib/lip-sync';
import type { Address, Hex } from 'viem';
import { getMonologue } from '@/lib/monologue';
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
  const [queuedCount, setQueuedCount] = useState(0);
  const queuedChars = useRef(0);
  const batchRef = useRef<ReturnType<typeof messageBatch<Message>> | null>(null);
  const deliverRef = useRef<(items: Message[]) => Promise<void>>(async () => {});
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [speaking, setSpeaking] = useState(false);
  const [speech, setSpeech] = useState<{
    audio: { currentTime: number; paused: boolean; ended: boolean };
    track: SpeechTrack;
  } | null>(null);
  const [speechLoading, setSpeechLoading] = useState(false);
  const [voice, setVoice] = useState(true);
  const [gesture, setGesture] = useState('Idle');
  const [gestureKey, setGestureKey] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [manageModal, setManageModal] = useState(autoPublish ?? false);
  const [transfer, setTransfer] = useState(autoTransfer);
  const [offer, setOffer] = useState(false);
  const [auditionOpen, setAuditionOpen] = useState(false);
  const [introduction, setIntroduction] = useState(() => getMonologue(c));
  const [memory, setMemory] = useState(false);
  const [memoryText, setMemoryText] = useState('');
  const [scope, setScope] = useState<'private' | 'public'>('private');
  const [highlights, setHighlights] = useState(c.highlights.join('\n'));
  const [availability, setAvailability] = useState(c.availability);
  const [askingPriceTglm, setAskingPriceTglm] = useState(c.askingPriceTglm || '');
  const [recipient, setRecipient] = useState('');
  const [requestId, setRequestId] = useState<string | undefined>();
  const [offerNote, setOfferNote] = useState('');
  const [bidTglm, setBidTglm] = useState('');
  const [incoming, setIncoming] = useState<AdoptionRequest[]>([]);
  const [provider, setProvider] = useState('Scripted demo');
  const [backgroundCheckpointing, setBackgroundCheckpointing] = useState(false);
  const [checkpointProgress, setCheckpointProgress] = useState(0);
  const [actionBusy, setActionBusy] = useState(false);
  const [portrait, setPortrait] = useState(true);
  const [greeting, setGreeting] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const finishGesture = useRef<(() => void) | null>(null);
  const completeGesture = useCallback(() => {
    finishGesture.current?.();
    finishGesture.current = null;
  }, []);
  const finishPlayback = useRef<(() => void) | null>(null);
  const deliverySequence = useRef(0);
  const voiceEnabled = useRef(true);
  const [directedCue, setDirectedCue] = useState(false);
  const unlockAudio = () => {
    audioContext.current ??= new AudioContext();
    void audioContext.current.resume().catch(() => {});
  };
  const animation = useRef<number>(0);
  const speechTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechRequest = useRef<AbortController | null>(null);
  const speechSequence = useRef(0);
  useEffect(() => {
    const saved = localStorage.getItem('mitrai-spoken-replies');
    voiceEnabled.current = saved !== 'off';
    setVoice(saved !== 'off');
  }, []);
  useEffect(() => {
    localStorage.setItem('mitrai-spoken-replies', voice ? 'on' : 'off');
  }, [voice]);
  useEffect(() => {
    const queue = messageBatch<Message>({
      deliver: (items) => deliverRef.current(items),
      changed: setQueuedCount,
    });
    batchRef.current = queue;
    return () => {
      queue.dispose();
      batchRef.current = null;
      queuedChars.current = 0;
    };
  }, [c.id, owner]);
  useEffect(() => {
    if (!(pending || queuedCount > 0)) return;
    const avail = availableGestures(c.model);
    const hasThink = avail.includes('Think');
    const funGestures = ['HipDance', 'Charleston', 'Dance', 'Wave'].filter((g) => avail.includes(g));
    const thinkingCycle = hasThink ? ['Think', ...(funGestures.length ? [funGestures[0]] : [])] : (avail.length ? [avail[0]] : ['Idle']);

    let step = 0;
    setGesture(thinkingCycle[0]);
    setGestureKey((n) => n + 1);

    const timer = setInterval(() => {
      step = (step + 1) % thinkingCycle.length;
      setGesture(thinkingCycle[step]);
      setGestureKey((n) => n + 1);
    }, 3500);

    return () => {
      clearInterval(timer);
      setGesture('Idle');
      setGestureKey((n) => n + 1);
    };
  }, [pending, queuedCount > 0, c.model]);
  const l = lifecycle(c, now);
  useEffect(() => {
    fetch(`/api/app?id=${c.id}`)
      .then((r) => r.json())
      .then((d) => {
        setChat(d.messages || []);
        setIncoming(d.offers || []);
        setProvider(d.provider || 'Scripted demo');
        setBackgroundCheckpointing(Boolean(d.backgroundCheckpointing));
        setCheckpointProgress(Number(d.checkpointProgress || 0));
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
  useEffect(() => {
    if (!own || !owner) return;
    const timer = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const r = await fetch(`/api/app?id=${encodeURIComponent(c.id)}`);
        if (!r.ok) return;
        const data = await r.json();
        setIncoming(data.offers || []);
        setBackgroundCheckpointing(Boolean(data.backgroundCheckpointing));
        setCheckpointProgress(Number(data.checkpointProgress || 0));
        setChat((items) => {
          const fresh = (data.messages || []).filter(
            (m: Message) => m.proactive && !items.some((item) => item.id === m.id),
          );
          return fresh.length ? [...items, ...fresh] : items;
        });
      } catch {
        // A temporary network outage should not become an unhandled rejection.
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [own, owner, c.id]);
  const stopSpeech = useCallback(() => {
    speechSequence.current++;
    speechRequest.current?.abort();
    window.speechSynthesis?.cancel();
    finishGesture.current?.();
    finishGesture.current = null;
    source.current?.stop();
    source.current = null;
    finishPlayback.current?.();
    finishPlayback.current = null;
    setDirectedCue(false);
    setGesture('Idle');
    setGestureKey((n) => n + 1);
    cancelAnimationFrame(animation.current);
    if (speechTimeout.current) clearTimeout(speechTimeout.current);
    setSpeaking(false);
    setGreeting(false);
    setSpeech(null);
    setSpeechLoading(false);
  }, []);
  useEffect(
    () => () => {
      deliverySequence.current++;
      stopSpeech();
      void audioContext.current?.close();
      audioContext.current = null;
    },
    [stopSpeech, c.id],
  );
  useEffect(() => {
    if (!l.alive) stopSpeech();
  }, [l.alive, stopSpeech]);
  const speak = async (
    text: string,
    gesture?: Message['gesture'],
    onStarted?: () => void,
    supplied?: SpeechTrack & { audio: string },
  ) => {
    stopSpeech();
    const sequence = speechSequence.current;
    const controller = new AbortController();
    speechRequest.current = controller;
    setSpeechLoading(true);
    let revealed = false;
    const reveal = () => {
      if (!revealed) {
        revealed = true;
        onStarted?.();
      }
    };
    try {
      const segments = speechSegments({ text, gesture });
      // Prepare segments in parallel so speech starts with minimal latency
      const prepared = await Promise.all(
        segments.map(async (segment) => {
          const res = supplied
            ? null
            : await fetch('/api/speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: segment.text, id: c.id }),
                signal: controller.signal,
              });
          const data = supplied || (await res!.json());
          if (res && !res.ok) throw new Error(data.error || 'Could not prepare speech.');
          let context = audioContext.current;
          if (!context) {
            context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            audioContext.current = context;
          }
          if (context.state === 'suspended') {
            await context.resume().catch(() => {});
          }
          const bytes = Uint8Array.from(atob(data.audio.split(',')[1]), (ch) => ch.charCodeAt(0));
          const buffer = await context.decodeAudioData(bytes.buffer);
          return { buffer, track: validateSpeechTrack(data), animation: segment.animation };
        }),
      );
      for (const part of prepared) {
        if (sequence !== speechSequence.current) return;
        const context = audioContext.current!;
        if (context.state === 'suspended') {
          await context.resume().catch(() => {});
        }
        const player = context.createBufferSource();
        player.buffer = part.buffer;
        player.connect(context.destination);
        source.current = player;
        const started = context.currentTime;
        const clock = {
          get currentTime() {
            return context.currentTime - started;
          },
          paused: false,
          ended: false,
        };
        setSpeech({ audio: clock, track: part.track });
        setSpeaking(true);
        setSpeechLoading(false);
        const gestureDone = part.animation
          ? new Promise<void>((resolve) => {
              finishGesture.current = resolve;
            })
          : Promise.resolve();
        setDirectedCue(!!part.animation);
        setGesture(part.animation || 'Idle');
        setGestureKey((n) => n + 1);
        const audioDone = new Promise<void>((resolve) => {
          finishPlayback.current = resolve;
          player.onended = () => {
            clock.ended = true;
            clock.paused = true;
            player.disconnect();
            resolve();
          };
          player.start();
          reveal();
        });
        await audioDone;
        if (sequence !== speechSequence.current) return;
        // Mouth closes when audio ends; keep the gesture running until the mixer finishes.
        setSpeaking(false);
        await gestureDone;
      }
      if (sequence === speechSequence.current) stopSpeech();
    } catch (error) {
      if (sequence !== speechSequence.current) return;
      stopSpeech();
      reveal();
      notify(error instanceof Error ? error.message : 'Could not prepare voice.');
    }
  };
  const playGreeting = async () => {
    if (!ensure()) return;
    unlockAudio();
    await speak(
      `Hello, I'm ${c.name}. A little conversation can start a new adventure. What shall we explore together?`,
    );
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
  const send = (text = input) => {
    if (!ensure() || !text.trim() || !batchRef.current) return;
    if (!l.alive) {
      notify('Sunset has arrived. This legacy is read-only.');
      return;
    }
    const value = text.trim();
    if (queuedChars.current + value.length + (batchRef.current.size ? 2 : 0) > 1500) {
      notify('This message burst is full (1500 characters). Please wait for it to send.');
      return;
    }
    queuedChars.current += value.length + (batchRef.current.size ? 2 : 0);
    stopSpeech();
    const available = availableGestures(c.model);
    const funThinkingGestures = ['Think', 'HipDance', 'Charleston', 'BodyRoll', 'ArmPump', 'Dance'].filter((g) =>
      available.includes(g),
    );
    const chosenThinking =
      funThinkingGestures[Math.floor(Math.random() * funThinkingGestures.length)] || 'Think';
    if (available.includes(chosenThinking)) {
      setGesture(chosenThinking);
      setGestureKey((n) => n + 1);
    }
    ++deliverySequence.current;
    if (voiceEnabled.current) unlockAudio();
    const message: Message = { id: crypto.randomUUID(), role: 'user', text: value, at: Date.now() };
    setChat((items) => [...items, message]);
    setInput('');
    batchRef.current.add(message);
  };
  deliverRef.current = async (batch: Message[]) => {
    queuedChars.current = 0;
    const message = { ...batch[0], text: batch.map((item) => item.text).join('\n\n') };
    const delivery = deliverySequence.current;
    setPending(true);
    try {
      const result = await api('chat', { id: c.id, text: message.text, audition: !own });
      if (own && backgroundCheckpointing)
        setCheckpointProgress((value) => Math.min(5, value + 1));
      const replies: Message[] = result.messages || [result.message];
      setPending(false);
      for (const reply of replies) {
        if (delivery !== deliverySequence.current) {
          setChat((items) => [
            ...items,
            ...replies.filter((reply) => !items.some((item) => item.id === reply.id)),
          ]);
          return;
        }
        const show = () =>
          setChat((items) =>
            items.some((item) => item.id === reply.id) ? items : [...items, reply],
          );
        // Reveal text bubble immediately so the user can read right away
        show();
        if (voiceEnabled.current) {
          await speak(reply.text, reply.gesture, () => {});
        } else {
          if (reply.gesture) {
            const finished = new Promise<void>((resolve) => {
              finishGesture.current = resolve;
            });
            setDirectedCue(true);
            setGesture(reply.gesture.animation);
            setGestureKey((n) => n + 1);
            await finished;
            setDirectedCue(false);
            setGesture('Idle');
            setGestureKey((n) => n + 1);
          } else
            await new Promise((resolve) =>
              setTimeout(resolve, Math.min(1500, 400 + reply.text.length * 12)),
            );
        }
      }
    } catch (e) {
      // Keep the visible user messages on failure so the burst is never silently lost.
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
      const walletProvider = getWalletProvider();
      if (!walletProvider) throw new Error('Reconnect your browser wallet.');
      const prepared = await api('prepareSnapshot', { id: c.id });
      const result = await writeArkiv(
        walletProvider,
        owner as Address,
        prepared.character,
        prepared.proof,
        prepared.verifier,
      );
      await api('sync', { id: c.id, ...result });
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
            <button className="button primary small-button" onClick={() => setManageModal(true)}>
              <Sliders size={14} />
              Manage Companion
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
              {pending ? (
                <span className="eyebrow" style={{ color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                  <Sparkles className="spin" size={12} />
                  PONDERING & GROOVING…
                </span>
              ) : (
                <span className="eyebrow">ONE LITTLE LIFE</span>
              )}
            </div>
            <Stage
              model={c.model}
              modelZoom={1.1}
              portrait={portrait}
              directed={directedCue}
              onGestureComplete={completeGesture}
              directedCue={directedCue}
              speaking={speaking || directedCue}
              speech={speech}
              gesture={gesture}
              gestureKey={gestureKey}
              legacy={!l.alive}
            />
            {l.alive && (
              <details className="expressions-control">
                <summary>Expressions</summary>
                <div className="gesture-toolbar">
                  {isVrmModel(c.model) && (
                    <button
                      onClick={() => setPortrait((value) => !value)}
                      aria-label={portrait ? 'Show full body' : 'Show face close up'}
                      title={portrait ? 'Show full body' : 'Show face close up'}
                    >
                      <span>{portrait ? 'Full body' : 'Face view'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setGesture('Wave');
                      setGestureKey((n) => n + 1);
                    }}
                    aria-label="Wave"
                  >
                    <Hand size={18} />
                  </button>
                  {availableGestures(c.model).includes('Dance') && (
                    <button
                      onClick={() => {
                        setGesture('Dance');
                        setGestureKey((n) => n + 1);
                      }}
                      aria-label="Dance"
                      title="Dance"
                    >
                      <Music2 size={18} />
                    </button>
                  )}
                  {(/^download:\d+_/.test(c.model) || isVrmModel(c.model)) &&
                    [
                      { name: 'Charleston', label: 'Charleston dance', icon: Music2 },
                      { name: 'Clap', label: 'Clap', icon: Hand },
                      { name: 'Bow', label: 'Take a bow', icon: Heart },
                      { name: 'Think', label: 'Thinking', icon: Brain },
                      { name: 'Jump', label: 'Jump', icon: Sparkles },
                      { name: 'Sit', label: 'Sit down and stand up', icon: Heart },
                      { name: 'ArmPump', label: 'Arm pump dance', icon: Music2 },
                      { name: 'BodyRoll', label: 'Body roll dance', icon: Music2 },
                      { name: 'HipDance', label: 'Hip dance', icon: Music2 },
                    ].map((motion) => (
                      <button
                        key={motion.name}
                        title={motion.label}
                        aria-label={motion.label}
                        onClick={() => {
                          setGesture(motion.name);
                          setGestureKey((n) => n + 1);
                        }}
                      >
                        <motion.icon size={18} />
                        <span className="motion-label">{motion.name}</span>
                      </button>
                    ))}
                  <button
                    onClick={greeting ? stopSpeech : playGreeting}
                    aria-label={greeting ? 'Stop greeting' : 'Play timed voice greeting'}
                  >
                    {greeting ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                </div>
              </details>
            )}
          </div>
          <div className="character-bio">
            <div className="ownership-header">
              <span className="owner-badge-pill">
                <UserCheck size={13} />
                <span>{own ? 'Your MitrAI' : c.owner === 'studio' ? 'MitrAI Studio (Unclaimed)' : `Owner: ${shortAddress(c.owner)}`}</span>
              </span>
              {c.availability === 'showcase' && l.alive && (
                <span className="showcase-status">Showcase only</span>
              )}
              {c.availability === 'transfer' && l.alive && (
                <span className="showcase-status adoptable">Open to adoption</span>
              )}
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
              <span
                className="voice-tag-pill"
                title={`Sarvam AI Voice: ${getVoice(c.voice || defaultVoiceForModel(c.model)).description}`}
                style={{ cursor: 'pointer' }}
                onClick={() => playGreeting()}
              >
                <Volume2 size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                {getVoice(c.voice || defaultVoiceForModel(c.model)).name} Voice
              </span>
            </div>
            <div className="lifetime-meter">
              <div>
                <span>
                  <Clock3 size={14} />
                  <TimeLeft character={c} />
                </span>
                <small>
                  Age{' '}
                  {Math.floor(Math.max(0, Date.now() - (c.birth?.at ?? c.createdAt)) / 86400000)}d ·{' '}
                  {Math.round(l.progress * 100)}% of a life
                </small>
              </div>
              <div className="meter">
                <i style={{ width: `${l.progress * 100}%` }} />
              </div>
              <small>
                Sunset ·{' '}
                {new Date((c.birth?.at ?? c.createdAt) + c.lifespan).toLocaleString([], {
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
              <div className="marketplace-action-box">
                <div className="marketplace-box-header">
                  <div>
                    <span className="marketplace-badge">
                      {c.availability === 'transfer'
                        ? '🟢 Ready for Adoption'
                        : c.availability === 'offers'
                          ? '🤝 Open to Offers'
                          : '🏛️ Private Showcase'}
                    </span>
                    <h4 style={{ margin: '4px 0 0', fontSize: 14 }}>Ownership & Adoption</h4>
                  </div>
                  {c.askingPriceTglm ? (
                    <div className="price-tag-wrap" style={{ textAlign: 'right' }}>
                      <small style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Asking Price</small>
                      <strong style={{ fontSize: 14, color: '#0f172a' }}>{c.askingPriceTglm} tGLM</strong>
                    </div>
                  ) : null}
                </div>
                <p className="marketplace-box-desc" style={{ fontSize: 12, color: '#475569', margin: '8px 0 12px' }}>
                  {c.availability === 'transfer'
                    ? 'The custodian is ready to hand over this companion’s public history and remaining life.'
                    : c.availability === 'offers'
                      ? 'The custodian is reviewing adoption requests and bids in test tGLM / ETH.'
                      : 'Currently in private showcase. You can propose an unsolicited buy offer or adoption bid to the custodian.'}
                </p>
                <button
                  type="button"
                  className="button primary full"
                  disabled={actionBusy}
                  onClick={() => {
                    if (!ensure()) return;
                    if (c.availability === 'transfer' && c.owner === 'studio' && c.demo) {
                      action(async () => {
                        const result = await api('adopt', { id: c.id });
                        router.push(`/companion/${result.character.id}`);
                        notify('This story is yours to continue. Its original Sunset stays the same.');
                      });
                    } else {
                      setOffer(true);
                    }
                  }}
                >
                  {actionBusy ? <Loader2 className="spin" size={16} /> : <Heart size={16} />}{' '}
                  {c.availability === 'transfer' && c.owner === 'studio' && c.demo
                    ? 'Adopt in Demo'
                    : 'Send Buy Request / Propose Bid'}
                </button>
                <small className="form-caption" style={{ display: 'block', fontSize: 10, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>
                  {c.availability === 'transfer' && c.owner === 'studio'
                    ? 'Free studio adoption. Transfers companion identity to your connected wallet.'
                    : 'Propose an adoption bid in test tGLM. The custodian can accept and execute 1-click Arkiv handover.'}
                </small>
              </div>
            )}
            {own && l.alive && (
              <button
                className="button secondary full"
                style={{ marginTop: 12 }}
                onClick={() => setManageModal(true)}
              >
                <Sliders size={14} />
                Manage Listing & Handover
              </button>
            )}
          </div>
        </aside>
        <section className="character-workspace">
          <div
            className="workspace-tabs"
            role="group"
            aria-label="Character sections"
            style={
              {
                '--selected-tab': Math.max(
                  0,
                  ['conversation', 'mind', 'story', 'community', 'history'].indexOf(tab),
                ),
              } as CSSProperties
            }
          >
            {[
              { id: 'conversation', label: 'Chat', icon: Heart, badge: 0 },
              { id: 'mind', label: 'The mind', icon: Brain, badge: 0 },
              {
                id: 'story',
                label: 'Their story',
                icon: BookOpen,
                badge: own
                  ? incoming.filter((r) => ['pending', 'accepted'].includes(r.status)).length
                  : 0,
              },
              { id: 'community', label: 'Community', icon: Globe2, badge: 0 },
              { id: 'history', label: 'Provenance', icon: History, badge: 0 },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={tab === t.id}
                onClick={() => setTab(t.id)}
                className={tab === t.id ? 'active' : ''}
              >
                <t.icon size={16} />
                <span>{t.label}</span>
                {t.badge > 0 && (
                  <span
                    className="tab-pill-badge"
                    title={`${t.badge} pending adoption request${t.badge > 1 ? 's' : ''}`}
                  >
                    {t.badge}
                  </span>
                )}
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
                    voiceEnabled.current = !voice;
                    setVoice(!voice);
                    if (voice) stopSpeech();
                    else unlockAudio();
                  }}
                  aria-label={voice ? 'Mute spoken replies' : 'Enable spoken replies'}
                >
                  {speechLoading ? (
                    <Loader2 className="spin" size={18} />
                  ) : voice ? (
                    <Volume2 size={18} />
                  ) : (
                    <VolumeX size={18} />
                  )}
                </button>
              </div>
              {!own && l.alive && (
                <div className="audition-notice">
                  <LockKeyhole size={14} />
                  Explore their public story. Private conversations stay with their owner.
                </div>
              )}
              {!own && l.alive && (
                <section className="public-introduction">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Sparkles size={16} color="#d97706" />
                    <h3 style={{ margin: 0 }}>Inner Monologue · Spoken Soliloquy</h3>
                  </div>
                  <p>{introduction || getMonologue(c)}</p>
                  <button
                    className="button secondary"
                    disabled={speechLoading || speaking}
                    onClick={async () => {
                      unlockAudio();
                      setSpeechLoading(true);
                      try {
                        const r = await fetch('/api/introduction', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: c.id }),
                        });
                        const d = await r.json();
                        if (!r.ok) throw new Error(d.error);
                        setIntroduction(d.text);
                        await speak(d.text, undefined, undefined, d.speech);
                      } catch (e) {
                        notify((e as Error).message);
                      } finally {
                        setSpeechLoading(false);
                      }
                    }}
                  >
                    <Volume2 size={16} />
                    {speechLoading ? 'Preparing voice…' : speaking ? 'Speaking…' : 'Listen to Inner Monologue'}
                  </button>
                  <button className="text-link" onClick={() => setAuditionOpen((v) => !v)}>
                    {auditionOpen ? 'Close audition chat' : 'Try a short preview chat'}
                  </button>
                  <small>Visitors experience the persona's reflection. Private memories stay locked with their owner.</small>
                </section>
              )}
              <div role="status" aria-live="polite" className="speech-status">
                {queuedCount
                  ? `${queuedCount} message${queuedCount > 1 ? 's' : ''} queued · sends 8 seconds after your last send`
                  : pending
                    ? 'Thinking…'
                    : speechLoading
                      ? 'Preparing voice…'
                      : speaking
                        ? 'Speaking…'
                        : directedCue
                          ? 'Finishing gesture…'
                          : ''}
              </div>
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
                        <button
                          onClick={() => {
                            unlockAudio();
                            void speak(m.text, m.gesture);
                          }}
                          aria-label="Read this reply aloud"
                        >
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
              {(own || auditionOpen) && (
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
                    disabled={!l.alive}
                  />
                  <button
                    type="submit"
                    className="send-button"
                    disabled={!l.alive || !input.trim()}
                    aria-label="Send message"
                  >
                    {pending ? <Loader2 className="spin" size={18} /> : <ArrowRight size={20} />}
                  </button>
                </form>
              )}
              <div className="chat-caption">
                {provider === 'Scripted demo'
                  ? 'Scripted rehearsal, not live AI inference. Configure live AI in settings for open-ended conversation.'
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
              <BrainObservatory c={c} own={own} />
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
                    <strong>Public brain checkpoint</strong>
                    <p>
                      {c.entityKey
                        ? `Linked to ${c.entityKey.slice(0, 16)}… · chain version ${c.chainVersion}`
                        : 'Private chats stay here. Only approved public character state goes to Arkiv.'}
                    </p>
                    <p>
                      {backgroundCheckpointing
                        ? checkpointProgress >= 5
                          ? 'Your next public checkpoint is being confirmed automatically.'
                          : `${checkpointProgress} of 5 new conversation turns gathered for the next automatic checkpoint.`
                        : 'Automatic publishing is unavailable in this deployment. You can sign a public snapshot manually.'}
                    </p>
                  </div>
                  {!backgroundCheckpointing && (
                    <button className="button secondary" onClick={sync} disabled={actionBusy}>
                      {actionBusy ? <Loader2 className="spin" size={15} /> : <Globe2 size={15} />}
                      Publish snapshot
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {tab === 'community' && <CommunityPanel character={c} owner={owner} />}
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
                  <h3 className="spaced-heading">Adoption requests</h3>
                  {incoming.map((o, i) => (
                    <div key={i} className="memory-card">
                      <strong>{shortAddress(o.from)}</strong>
                      <p>{o.note}</p>
                      {o.bidTglm && <p>Proposed bid: {o.bidTglm} tGLM (unpaid)</p>}
                      <small>
                        {new Date(o.at).toLocaleString()} · {o.status || 'pending'}
                      </small>
                      {l.alive && ['pending', 'accepted'].includes(o.status || 'pending') && (
                        <div className="button-row">
                          <button
                            className="button secondary"
                            onClick={() => {
                              setRecipient(o.from);
                              setRequestId(o.id);
                              setTransfer(true);
                            }}
                          >
                            Accept &amp; hand over
                          </button>
                          <button
                            className="text-link"
                            onClick={() =>
                              action(async () => {
                                await api('declineRequest', { id: c.id, requestId: o.id });
                                setIncoming((rows) =>
                                  rows.map((r) =>
                                    r.id === o.id ? { ...r, status: 'declined' } : r,
                                  ),
                                );
                              })
                            }
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
          {tab === 'history' && (
            <div className="tab-content">
              <BrainObservatory c={c} own={own} historyOnly />
              {own && c.entityKey && <PreservationPanel c={c} notify={notify} />}
            </div>
          )}
        </section>
      </div>
      {manageModal && (
        <Modal title={`Manage ${c.name}`} close={() => setManageModal(false)}>
          <p className="muted" style={{ marginBottom: 14 }}>
            Control visibility on Explore, adoption listing, and ownership handover.
          </p>

          <label className="form-label" style={{ fontWeight: 600 }}>
            Marketplace & Discovery Status
          </label>
          <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 8,
                border: availability === 'showcase' ? '1.5px solid #1e2d3d' : '1px solid #e5e7eb',
                background: availability === 'showcase' ? '#f8fafc' : '#ffffff',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="availability"
                checked={availability === 'showcase'}
                onChange={() => setAvailability('showcase')}
                style={{ marginTop: 3 }}
              />
              <div>
                <strong style={{ display: 'block', fontSize: 13, color: '#0f172a' }}>🏛️ Showcase Only</strong>
                <small style={{ color: '#64748b', fontSize: 11 }}>
                  Your companion lives with you. Appears in showcase on Explore; visitors can listen to its Inner Monologue and propose unsolicited adoption bids.
                </small>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 8,
                border: availability === 'offers' ? '1.5px solid #1e2d3d' : '1px solid #e5e7eb',
                background: availability === 'offers' ? '#f8fafc' : '#ffffff',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="availability"
                checked={availability === 'offers'}
                onChange={() => setAvailability('offers')}
                style={{ marginTop: 3 }}
              />
              <div>
                <strong style={{ display: 'block', fontSize: 13, color: '#0f172a' }}>🤝 Open to Adoption & Offers</strong>
                <small style={{ color: '#64748b', fontSize: 11 }}>
                  Listed in "Available to Adopt" on Explore. Prospective adopters can send buy proposals with an offer amount.
                </small>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 8,
                border: availability === 'transfer' ? '1.5px solid #1e2d3d' : '1px solid #e5e7eb',
                background: availability === 'transfer' ? '#f8fafc' : '#ffffff',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="availability"
                checked={availability === 'transfer'}
                onChange={() => setAvailability('transfer')}
                style={{ marginTop: 3 }}
              />
              <div>
                <strong style={{ display: 'block', fontSize: 13, color: '#0f172a' }}>📦 Available for Handover</strong>
                <small style={{ color: '#64748b', fontSize: 11 }}>
                  Ready for direct transfer to an adopter or specific recipient wallet.
                </small>
              </div>
            </label>
          </div>

          {availability !== 'showcase' && (
            <label className="form-label" style={{ marginBottom: 16 }}>
              Asking Price (Optional)
              <input
                inputMode="decimal"
                value={askingPriceTglm}
                onChange={(e) => setAskingPriceTglm(e.target.value)}
                placeholder="e.g. 2.5 tGLM or 0.05 ETH"
              />
              <small>Suggested adoption fee on testnet. Offers remain proposals until you accept handover.</small>
            </label>
          )}

          {/* Pending Requests */}
          {incoming.filter((r) => r.status === 'pending').length > 0 && (
            <div style={{ marginTop: 14, marginBottom: 16, padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1' }}>
              <strong style={{ display: 'block', fontSize: 12, marginBottom: 8, color: '#0f172a' }}>
                📬 Pending Adoption Requests ({incoming.filter((r) => r.status === 'pending').length})
              </strong>
              {incoming.filter((r) => r.status === 'pending').map((req) => (
                <div key={req.id} style={{ padding: 10, borderRadius: 6, background: '#fff', marginBottom: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{shortAddress(req.from)}</strong>
                    <span style={{ fontWeight: 600, color: '#2563eb' }}>{req.bidTglm ? `${req.bidTglm} tGLM` : 'Free Adoption'}</span>
                  </div>
                  {req.note && <p style={{ fontSize: 12, color: '#475569', margin: '4px 0' }}>"{req.note}"</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      className="button primary small-button"
                      disabled={actionBusy}
                      onClick={() =>
                        action(async () => {
                          const prepared = await api('prepareTransfer', { id: c.id, recipient: req.from, requestId: req.id });
                          let txHash: string | undefined;
                          if (c.entityKey) {
                            try {
                              const walletProvider = getWalletProvider();
                              if (walletProvider && owner?.startsWith('0x')) {
                                const receipt = await transferArkiv(
                                  walletProvider,
                                  owner as Address,
                                  c.entityKey as Hex,
                                  req.from as Address,
                                );
                                txHash = receipt.txHash;
                              }
                            } catch (walletErr) {
                              console.warn('Arkiv on-chain transfer notice:', walletErr);
                            }
                          }
                          await api('transfer', { id: c.id, recipient: req.from, txHash, requestId: req.id });
                          setManageModal(false);
                          setIncoming((list) => list.filter((item) => item.id !== req.id));
                          notify('Ownership handed over on Arkiv! Your companion has found a new guardian.');
                          window.location.href = '/explore';
                        })
                      }
                    >
                      Accept & Handover
                    </button>
                    <button
                      className="button secondary small-button"
                      disabled={actionBusy}
                      onClick={() =>
                        action(async () => {
                          await api('declineRequest', { id: c.id, requestId: req.id });
                          setIncoming((list) => list.map((item) => (item.id === req.id ? { ...item, status: 'declined' } : item)));
                          notify('Request declined.');
                        })
                      }
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Direct Handover */}
          <details style={{ marginTop: 10, marginBottom: 16 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: '#64748b', fontWeight: 500 }}>
              Direct Transfer to another Wallet Address
            </summary>
            <div style={{ marginTop: 8 }}>
              <label className="form-label">
                Recipient Wallet Address
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x…"
                />
              </label>
              <button
                className="button secondary full"
                disabled={actionBusy || !recipient.startsWith('0x')}
                onClick={() =>
                  action(async () => {
                    const prepared = await api('prepareTransfer', { id: c.id, recipient });
                    let txHash: string | undefined;
                    if (c.entityKey) {
                      try {
                        const walletProvider = getWalletProvider();
                        if (walletProvider && owner?.startsWith('0x')) {
                          const receipt = await transferArkiv(
                            walletProvider,
                            owner as Address,
                            c.entityKey as Hex,
                            recipient as Address,
                          );
                          txHash = receipt.txHash;
                        }
                      } catch (walletErr) {
                        console.warn('Arkiv direct transfer notice:', walletErr);
                      }
                    }
                    await api('transfer', { id: c.id, recipient, txHash });
                    setManageModal(false);
                    router.push('/explore');
                    notify('Ownership handed over to recipient.');
                  })
                }
              >
                Confirm Direct Handover
              </button>
            </div>
          </details>

          <button
            className="button primary full"
            disabled={actionBusy}
            onClick={() =>
              action(async () => {
                await api('publish', {
                  id: c.id,
                  availability,
                  askingPriceTglm: askingPriceTglm.trim() || undefined,
                  highlights: c.highlights || [],
                });
                setManageModal(false);
                notify('Companion status updated.');
              })
            }
          >
            Save Changes
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
              readOnly={!!requestId}
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
                const prepared = await api('prepareTransfer', { id: c.id, recipient, requestId });
                if (prepared.recipient !== recipient.toLowerCase())
                  throw new Error('The recipient changed. Review the adoption request again.');
                let txHash: string | undefined;
                if (c.entityKey) {
                  const walletProvider = getWalletProvider();
                  if (!walletProvider || !owner?.startsWith('0x'))
                    throw new Error('Connect the owner wallet first.');
                  const receipt = await transferArkiv(
                    walletProvider,
                    owner as Address,
                    c.entityKey as Hex,
                    recipient as Address,
                  );
                  txHash = receipt.txHash;
                }
                await api('transfer', { id: c.id, recipient, txHash, requestId });
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
            Tell the owner why you want to continue this story. You can suggest a testnet price. This form does not transfer tokens or ownership.
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
          <label className="form-label">
            Your bid in test tGLM (optional)
            <input inputMode="decimal" value={bidTglm} onChange={(e) => setBidTglm(e.target.value)} placeholder={c.askingPriceTglm || 'Example: 2.5'} />
          </label>
          <button
            className="button primary full"
            disabled={actionBusy || offerNote.trim().length < 5}
            onClick={() =>
              action(async () => {
                await api('offer', { id: c.id, note: offerNote, bidTglm: bidTglm.trim() || undefined });
                setOffer(false);
                notify('Your offer is with the owner. No payment has been made.');
              })
            }
          >
            Send offer
            <ArrowRight size={16} />
          </button>
        </Modal>
      )}
    </div>
  );
}
