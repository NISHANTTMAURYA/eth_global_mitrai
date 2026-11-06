'use client';
import { useEffect, useState } from 'react';
import { Brain, ExternalLink, LockKeyhole, RefreshCw } from 'lucide-react';
import { shortAddress, type Character } from '@/lib/domain';
import type { BrainEvent } from '@/lib/brain-events';
import type { PrivateMind } from '@/lib/private-mind';
type Data = {
  events: BrainEvent[];
  mind: PrivateMind | null;
  profiles: {
    owner: string;
    epoch: number;
    started_at: number;
    ended_at: number | null;
    profile: null | {
      updatedAt: number;
      interests: { key: string; summary: string; at: number }[];
      context: { key: string; summary: string; at: number }[];
      communication?: { axis: string; direction: number; sourceQuote: string; at: number }[];
    };
  }[];
  jobs: { id: string; due_at: number; body: string }[];
  chain: null | { owner: string; entityKey: string; version: number; checkedAt: number };
  chainError: string | null;
  checkpoints: {
    key: string;
    blockNumber: string;
    at: number;
    version: number;
    traits: unknown;
    memories: unknown;
    habits: unknown;
    owner: string;
  }[];
  coverage: string;
};
const format = (value: unknown) =>
  typeof value === 'string' ? value : JSON.stringify(value, null, 2);
const date = (at: number) => new Date(at).toLocaleString();
export default function BrainObservatory({
  c,
  own,
  historyOnly = false,
}: {
  c: Character;
  own: boolean;
  historyOnly?: boolean;
}) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(''),
    [selected, setSelected] = useState('all'),
    [expanded, setExpanded] = useState<string | null>(null);
  const [revision, setRevision] = useState('current');
  const refresh = async () => {
    try {
      const r = await fetch(`/api/brain?id=${encodeURIComponent(c.id)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the brain.');
    }
  };
  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 30000);
    return () => clearInterval(t);
  }, [c.id]);
  const memories = c.brain.memories.length,
    interests = data?.mind?.observations.filter((o) => o.kind === 'interest') || [];
  const owners = [
    ...new Set([
      c.owner,
      ...(data?.events || [])
        .filter((e) => e.kind === 'ownership')
        .flatMap((e) =>
          e.changes
            .filter((v) => v.field === 'owner')
            .flatMap((v) => [v.before, v.after].filter(Boolean).map(String)),
        ),
    ]),
  ];
  const nodes = [
    {
      id: 'style',
      label: 'Personality',
      value: `${Object.keys(data?.mind?.style || c.brain.traits).length} traits`,
      x: 265,
      y: 64,
    },
    { id: 'memory', label: 'Memories', value: String(memories), x: 440, y: 126 },
    {
      id: 'learning',
      label: 'Interests',
      value: data?.mind ? String(interests.length) : 'Private',
      x: 439,
      y: 285,
    },
    { id: 'ownership', label: 'Owners', value: String(owners.length), x: 265, y: 353 },
    { id: 'checkpoint', label: 'Habits', value: String(c.brain.habits.length), x: 91, y: 285 },
    {
      id: 'chain',
      label: 'On chain',
      value: data?.chain ? `v${data.chain.version}` : 'Pending',
      x: 91,
      y: 126,
    },
  ];
  const events = (data?.events || []).filter(
    (e) =>
      selected === 'all' ||
      e.kind === selected ||
      (selected === 'ownership' && (e.kind === 'ownership' || e.kind === 'birth')) ||
      (selected === 'memory' && (e.changes.some((v) => v.field === 'brain.memories') || e.kind === 'learning')),
  );
  const past = data?.checkpoints.find((p) => p.key === revision);
  return (
    <section className="brain-observatory">
      <div className="brain-heading">
        <div>
          <p className="eyebrow">{historyOnly ? 'AN ACCOUNT OF A LIFE' : 'THE MIND OBSERVATORY'}</p>
          <h2>{historyOnly ? 'Every change has a source.' : 'A mind you can look inside.'}</h2>
        </div>
        <button
          type="button"
          className="brain-refresh"
          aria-label="Refresh brain history"
          onClick={() => void refresh()}
        >
          <RefreshCw size={17} />
        </button>
      </div>
      <div className={`brain-chain-status ${data?.chain ? 'confirmed' : ''}`}>
        <i />
        {data?.chain ? (
          <>
            Rabdi · confirmed checkpoint {data.chain.version} · owner{' '}
            {shortAddress(data.chain.owner)}
          </>
        ) : c.entityKey ? (
          'Checking Rabdi…'
        ) : (
          'Local draft · awaiting its first chain write'
        )}
      </div>
      {error && (
        <p role="alert" className="note">
          {error}
        </p>
      )}
      {data?.chainError && (
        <p role="alert" className="note">
          {data.chain
            ? 'Some checkpoint history could not be loaded.'
            : 'Could not verify current chain state. Private details are hidden until verification succeeds.'}
        </p>
      )}
      {!historyOnly && (
        <>
          <div className="mind-constellation">
            <svg
              viewBox="0 0 530 416"
              role="group"
              aria-label="Explore the character’s recorded mind"
            >
              <defs>
                <radialGradient id="mind-glow">
                  <stop stopColor="#e6ebd9" />
                  <stop offset="1" stopColor="#f7f7ef" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="265" cy="208" r="170" fill="url(#mind-glow)" />
              <circle cx="265" cy="208" r="146" className="mind-orbit" />
              {nodes.map((n) => (
                <path
                  key={n.id}
                  d={`M265 208 Q${n.x} 208 ${n.x} ${n.y}`}
                  className={`mind-edge ${selected === n.id ? 'selected' : ''}`}
                />
              ))}
              <circle cx="265" cy="208" r="54" className="mind-core" />
              <Brain x="248" y="174" size={34} strokeWidth={1.3} />
              <text x="265" y="227" textAnchor="middle" className="mind-core-name">
                {c.name}
              </text>
              <text x="265" y="245" textAnchor="middle" className="mind-value">
                {c.brain.sessions} checkpoints of learning
              </text>
              {nodes.map((n) => (
                <g
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${n.label}: ${n.value}. Filter history.`}
                  onClick={() => setSelected(selected === n.id ? 'all' : n.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(selected === n.id ? 'all' : n.id);
                    }
                  }}
                  className={`mind-node ${selected === n.id ? 'selected' : ''}`}
                >
                  <circle cx={n.x} cy={n.y} r="43" />
                  <text x={n.x} y={n.y - 5} textAnchor="middle">
                    {n.label}
                  </text>
                  <text x={n.x} y={n.y + 15} textAnchor="middle" className="mind-value">
                    {n.value}
                  </text>
                </g>
              ))}
            </svg>
            <p className="mind-map-caption">Select a part of the mind to follow its changes.</p>
          </div>
          <div className="brain-traits">
            {Object.entries(data?.mind?.style || c.brain.traits).map(([axis, value]) => (
              <div key={axis}>
                <span>{axis}</span>
                <strong>
                  {value}
                  <small>/100</small>
                </strong>
                <div className="meter">
                  <i style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
          {own && data?.mind && (
            <div className="owner-imprint">
              <div className="subheading">
                <h3>Your chapter in this mind</h3>
                <span className="pill">
                  <LockKeyhole size={11} /> Private
                </span>
              </div>
              <p className="muted">
                Interests and context are grounded in your conversations. Every ownership has a
                separate profile; previous owners’ private details stay sealed.
              </p>
              {data.profiles.map((p) => (
                <article key={`${p.owner}:${p.epoch}`} className="owner-chapter">
                  <strong>
                    {shortAddress(p.owner)} · chapter {p.epoch + 1}
                  </strong>
                  <small>
                    First recorded {date(p.started_at)}
                    {p.ended_at ? ` · ended ${date(p.ended_at)}` : ''}
                  </small>
                  {p.profile ? (
                    <>
                      {[...p.profile.interests, ...p.profile.context].map((v) => (
                        <p key={v.key}>
                          {v.summary}
                          <small>{date(v.at)}</small>
                        </p>
                      ))}
                      {p.profile.communication?.map((v) => (
                        <p key={v.axis}>
                          Prefers {v.direction > 0 ? 'more' : 'less'} {v.axis}
                          <small>
                            “{v.sourceQuote}” · {date(v.at)}
                          </small>
                        </p>
                      ))}
                    </>
                  ) : (
                    <p className="muted">Private profile retained for this previous ownership.</p>
                  )}
                </article>
              ))}
              {!data.profiles.length && (
                <p className="muted">No owner profile has been learned yet.</p>
              )}
            </div>
          )}
          {!!data?.jobs.length && (
            <div className="brain-plans">
              <h3>Open threads</h3>
              {data.jobs.map((j) => (
                <article key={j.id}>
                  <p>{JSON.parse(j.body).reason}</p>
                  <small>Check back {date(j.due_at)}</small>
                  <button
                    className="text-link"
                    onClick={async () => {
                      await fetch('/api/proactive', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'cancel', id: j.id }),
                      });
                      void refresh();
                    }}
                  >
                    Cancel
                  </button>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {!!data?.checkpoints.length && (
        <div className="brain-replay">
          <label htmlFor={`revision-${c.id}`}>Revisit a confirmed brain</label>
          <select
            id={`revision-${c.id}`}
            value={revision}
            onChange={(e) => setRevision(e.target.value)}
          >
            <option value="current">Current state</option>
            {data.checkpoints.map((p) => (
              <option key={p.key} value={p.key}>
                v{p.version} · {date(p.at)} · block {p.blockNumber}
              </option>
            ))}
          </select>
          {past && (
            <article>
              <p>
                Checkpoint {past.version} · {date(past.at)}
              </p>
              <dl>
                <dt>Personality</dt>
                <dd>
                  <pre>{format(past.traits)}</pre>
                </dd>
                <dt>Approved memories</dt>
                <dd>
                  <pre>{format(past.memories)}</pre>
                </dd>
                <dt>Habits</dt>
                <dd>
                  <pre>{format(past.habits)}</pre>
                </dd>
              </dl>
              <small>Read from immutable Arkiv entity {shortAddress(past.key)}</small>
            </article>
          )}
        </div>
      )}
      <div className="subheading">
        <h3>
          Change ledger <span>{events.length}</span>
        </h3>
        <span className="pill">Dated · evidence linked</span>
      </div>
      <div className="brain-filters" aria-label="Filter brain events">
        {['all', 'learning', 'style', 'ownership', 'chain', 'checkpoint'].map((k) => (
          <button key={k} className={selected === k ? 'active' : ''} onClick={() => setSelected(k)}>
            {k === 'all'
              ? 'All changes'
              : k === 'style'
                ? 'Personality'
                : k === 'chain'
                  ? 'Blockchain'
                  : k}
          </button>
        ))}
      </div>
      {!data ? (
        <p className="muted">Loading recorded changes…</p>
      ) : !events.length ? (
        <p className="soft-empty">No recorded changes in this category yet.</p>
      ) : (
        <ol className="brain-ledger">
          {events.map((e) => (
            <li key={e.id} className={e.source}>
              <button
                className="brain-event"
                aria-expanded={expanded === e.id}
                onClick={() => setExpanded(expanded === e.id ? null : e.id)}
              >
                <time dateTime={new Date(e.at).toISOString()}>{date(e.at)}</time>
                <strong>
                  {e.kind === 'birth' && selected === 'ownership'
                    ? `Genesis Custodianship · ${shortAddress(e.owner)}`
                    : e.title}
                </strong>
                <span>
                  {e.source === 'chain'
                    ? `Rabdi · block ${e.blockNumber}`
                    : e.source === 'private'
                      ? 'Private · conversation evidence'
                      : 'Application · pending chain proof'}
                </span>
              </button>
              {expanded === e.id && (
                <div className="brain-event-detail">
                  {e.changes.map((v, i) => (
                    <div key={i}>
                      <h4>{v.field}</h4>
                      {v.before !== undefined && <pre className="before">{format(v.before)}</pre>}
                      {v.after !== undefined && <pre className="after">{format(v.after)}</pre>}
                    </div>
                  ))}
                  {!e.changes.length && (
                    <p>
                      {e.kind === 'birth'
                        ? `Genesis registration on Arkiv. Custodianship anchored to ${shortAddress(e.owner)}.`
                        : 'Initial registration. No earlier state is recorded.'}
                    </p>
                  )}
                  {e.sourceId && <small>Source message: {e.sourceId}</small>}
                  {e.txHash && (
                    <a
                      href={`https://rabdi.explorer.arkiv.network/tx/${e.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link"
                    >
                      Verify transaction <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      <p className="muted small-text">
        {data?.coverage} Private learning is stored on this server. Only approved public state is
        written to Arkiv.
      </p>
    </section>
  );
}
