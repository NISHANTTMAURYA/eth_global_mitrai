'use client';
import { useState } from 'react';
import { getWalletProvider } from '@/lib/browser-wallet';
import { renewArkiv } from '@/lib/arkiv';
import { publicCharacter, type Character } from '@/lib/domain';
import type { Address, Hex } from 'viem';
export default function PreservationPanel({
  c,
  notify,
}: {
  c: Character;
  notify: (text: string) => void;
}) {
  const [records, setRecords] = useState<
      { key: Hex; expiresAt: string; blocksRemaining: string; canExtend: boolean }[] | null
    >(null),
    [busy, setBusy] = useState(false);
  const check = async () => {
    const r = await fetch(`/api/preservation?id=${encodeURIComponent(c.id)}`);
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setRecords(d.records);
    return d.records as NonNullable<typeof records>;
  };
  return (
    <details className="preservation-panel">
      <summary>Keep their story available</summary>
      <p className="muted">
        Their lifetime and storage are separate. Arkiv records need renewal to keep the story
        readable after Sunset. Renewal never adds time to their life.
      </p>
      <div className="button-row">
        <button
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await check();
            } catch (e) {
              notify((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Check storage
        </button>
        <button
          className="text-link"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(publicCharacter(c), null, 2)], { type: 'application/json' }),
            );
            const a = document.createElement('a');
            a.href = url;
            a.download = `${c.name}-public-story.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download approved story
        </button>
      </div>
      {records && (
        <>
          <p className="small-text">
            {records.length} records checked. Earliest storage expiry: block{' '}
            {records.reduce(
              (a, r) => (BigInt(r.expiresAt) < BigInt(a) ? r.expiresAt : a),
              records[0].expiresAt,
            )}
            .
          </p>
          <button
            className="button secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const rows = await check(),
                  provider = getWalletProvider();
                if (!provider) throw new Error('Reconnect your wallet.');
                const result = await renewArkiv(
                  provider,
                  c.owner as Address,
                  rows.filter((r) => r.canExtend).map((r) => r.key),
                );
                await check();
                notify(`Storage renewed for 90 days · ${result.txHash.slice(0, 12)}…`);
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Waiting for wallet…' : 'Renew storage for 90 days'}
          </button>
          {records.some((r) => !r.canExtend) && (
            <p className="muted small-text">
              Some older checkpoints require their original owner to renew them. Keep an
              approved-story backup.
            </p>
          )}
        </>
      )}
    </details>
  );
}
