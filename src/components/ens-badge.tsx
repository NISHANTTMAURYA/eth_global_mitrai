'use client';
import { characterSubname } from '@/lib/ens';
import type { Character } from '@/lib/domain';
import { Globe } from 'lucide-react';

export function EnsBadge({
  character,
  onClick,
  compact = false,
}: {
  character: Pick<Character, 'name'>;
  onClick?: () => void;
  compact?: boolean;
}) {
  const subname = characterSubname(character);

  return (
    <button
      type="button"
      className={`ens-subname-pill ${compact ? 'compact' : ''}`}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      title={`Proposed ENS name (not registered): ${subname}`}
    >
      <Globe size={compact ? 10 : 12} className="ens-subname-icon" />
      <span className="ens-subname-label">ENS preview · {subname}</span>
    </button>
  );
}

