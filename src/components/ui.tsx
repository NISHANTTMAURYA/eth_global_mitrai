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
export function MitraiTextLogo({
  height = 28,
  className = '',
  alt = 'MitrAI',
}: {
  height?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src="/brand/mitrai-logo-dark.png?v=2"
      alt={alt}
      height={height}
      className={`mitrai-text-logo ${className}`.trim()}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        height,
        width: 'auto',
        objectFit: 'contain',
      }}
    />
  );
}

export function MitraiLogo({
  size = 32,
  className = '',
  withText = false,
  alt = 'MitrAI',
}: {
  size?: number;
  className?: string;
  withText?: boolean;
  alt?: string;
}) {
  if (withText) {
    return (
      <img
        src="/brand/mitrai-logo-dark.png?v=2"
        alt={alt}
        height={size}
        className={`mitrai-logo-dark ${className}`.trim()}
        style={{
          display: 'inline-block',
          verticalAlign: 'middle',
          height: size,
          width: 'auto',
          objectFit: 'contain',
        }}
      />
    );
  }
  return (
    <img
      src="/brand/mitrai-icon.svg"
      alt={alt}
      width={size}
      height={size}
      className={`mitrai-icon ${className}`.trim()}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        height: size,
        width: size,
        objectFit: 'contain',
      }}
    />
  );
}

export function Flower({ size = 29, className = '' }: { size?: number; className?: string }) {
  return <MitraiLogo size={size} className={className} />;
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
        ? `${days}d ${hours}h remaining`
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
