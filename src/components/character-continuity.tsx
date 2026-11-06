'use client';
import { useEffect, useState } from 'react';
import type { PrivateMind } from '@/lib/private-mind';
type Plan = { id: string; due_at: number; body: string };
export default function CharacterContinuity({ id }: { id: string }) {
  const [mind, setMind] = useState<PrivateMind | null>(null),
    [jobs, setJobs] = useState<Plan[]>([]);
  const refresh = async () => {
    const r = await fetch(`/api/proactive?character=${encodeURIComponent(id)}`);
    if (r.ok) {
      const data = await r.json();
      setMind(data.mind);
      setJobs(data.jobs);
    }
  };
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => clearInterval(timer);
  }, [id]);
  if (!mind) return null;
  return (
    <section className="continuity-panel">
      <h3>Growing through our conversations</h3>
      <p className="muted">
        Private to this ownership. Dated experiences shape curiosity and communication gradually;
        details stay private. Save checkpoint applies the general trait changes to your character;
        only an owner-signed Arkiv sync publishes those general traits.
      </p>
      <div className="trait-cards">
        {Object.entries(mind.style).map(([name, value]) => (
          <div key={name}>
            <span>{name}</span>
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
      {mind.changes.slice(-3).map((change, i) => (
        <p key={i}>
          {change.axis}: {change.from} → {change.to}. {change.why}
        </p>
      ))}
      <h4>Things we’re learning about</h4>
      {!mind.observations.length ? (
        <p className="muted">Meaningful details will appear after private conversations.</p>
      ) : (
        mind.observations
          .slice(-8)
          .reverse()
          .map((o) => (
            <article className="memory-card" key={o.key}>
              <span className="pill">{o.kind}</span>
              <p>{o.summary}</p>
              <small>
                {new Date(o.at).toLocaleString()} · “{o.sourceQuote}”
              </small>
            </article>
          ))
      )}
      <h4>Reasons to check back</h4>
      {!jobs.length ? (
        <p className="muted">No planned check-ins.</p>
      ) : (
        jobs.map((job) => {
          const plan = JSON.parse(job.body);
          return (
            <article className="memory-card" key={job.id}>
              <p>{plan.reason}</p>
              <small>{new Date(job.due_at).toLocaleString()}</small>
              <button
                className="text-link"
                onClick={async () => {
                  await fetch('/api/proactive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'cancel', id: job.id }),
                  });
                  void refresh();
                }}
              >
                Cancel this check-in
              </button>
            </article>
          );
        })
      )}
    </section>
  );
}
