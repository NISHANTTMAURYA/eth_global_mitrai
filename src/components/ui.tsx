'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { lifecycle, type Character } from '@/lib/domain';
export const Stage = dynamic(() => import('./character-stage'), {
  ssr: false,
  loading: () => (
    <div className="character-stage">
      <span className="loading-dot">A little life is loading…</span>
    </div>
  ),
});
export function Flower({ size = 29 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse
          key={a}
          cx="16"
          cy="8.4"
          rx="4.3"
          ry="7"
          fill="currentColor"
          transform={`rotate(${a} 16 16)`}
        />
      ))}
      <circle cx="16" cy="16" r="4" fill="#f8f5ec" />
    </svg>
  );
}
export function TimeLeft({ character }: { character: Character }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const l = lifecycle(character, now);
  if (!l.alive) return <>A life well lived</>;
  const days = Math.floor(l.remaining / 86400000),
    hours = Math.floor(l.remaining / 3600000) % 24,
    mins = Math.floor(l.remaining / 60000) % 60,
    secs = Math.floor(l.remaining / 1000) % 60;
  return (
    <>
      {days > 0
        ? `${days}d ${hours}h together`
        : `${hours ? hours + 'h ' : ''}${mins}m ${secs}s remaining`}
    </>
  );
}
export function LifecyclePill({ c }: { c: Character }) {
  const l = lifecycle(c);
  return (
    <span className={`pill life ${l.stage.toLowerCase()}`}>
      <i />
      {l.stage}
    </span>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-top">
        <h2>{title}</h2>
        <button className="icon-button" onClick={close} aria-label="Close dialog">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
