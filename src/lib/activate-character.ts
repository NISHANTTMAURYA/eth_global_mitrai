'use client';
import type { Address } from 'viem';
import type { Character } from './domain';
import { api } from './client';
import { getWalletProvider } from './browser-wallet';
import { writeArkiv } from './arkiv';
/** A declined signature leaves a resumable draft. A mined transaction is saved before
 * confirming it with the app, so a lost response cannot mint a second character. */
export async function activateCharacter(c: Character, owner: string): Promise<Character> {
  if (c.demo || c.entityKey) return c;
  const provider = getWalletProvider();
  if (!provider) throw new Error('Reconnect the wallet that owns this draft.');
  const storageKey = `mitrai-activation:${owner}:${c.id}`;
  let receipt: { entityKey: string; txHash: string } | null = null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) receipt = JSON.parse(raw);
  } catch {}
  if (!receipt) {
    const prepared = await api('prepareSnapshot', { id: c.id });
    if (prepared.alreadyOnChain) return prepared.character;
    await api('activationStarted', { id: c.id });
    try {
      receipt = await writeArkiv(
        provider,
        owner as Address,
        prepared.character,
        prepared.proof,
        prepared.verifier,
      );
    } catch (error) {
      let cause = error as { code?: number; name?: string; cause?: unknown },
        rejected = false;
      for (let depth = 0; cause && depth < 10; depth++, cause = cause.cause as typeof cause)
        if (cause.code === 4001 || cause.name === 'UserRejectedRequestError') rejected = true;
      if (rejected) await api('activationRejected', { id: c.id });
      throw error;
    }
    localStorage.setItem(storageKey, JSON.stringify(receipt));
  }
  const result = await api('sync', { id: c.id, ...receipt });
  localStorage.removeItem(storageKey);
  return result.character;
}
