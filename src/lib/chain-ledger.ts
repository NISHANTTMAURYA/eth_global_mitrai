import { decodeEventLog, type Hex } from 'viem';
import { ENTITY_EVENTS_ABI } from '@arkiv-network/sdk';
import { arkivPublic } from './arkiv';
import { allCharacters, appendBrainEvent } from './store';
import type { BrainEvent } from './brain-events';
const receipts = new Map<
  string,
  Promise<{
    receipt: Awaited<ReturnType<ReturnType<typeof arkivPublic>['getTransactionReceipt']>>;
    at: number;
  }>
>();

export async function recordArkivReceipt(characterId: string, entityKey: Hex, txHash: Hex) {
  const client = arkivPublic();
  let pending = receipts.get(txHash);
  if (!pending) {
    pending = (async () => {
      const receipt = await client.getTransactionReceipt({ hash: txHash });
      const block = await client.getBlock({ blockNumber: receipt.blockNumber });
      return { receipt, at: Number(block.timestamp) * 1000 };
    })();
    receipts.set(txHash, pending);
    if (receipts.size > 100) receipts.delete(receipts.keys().next().value!);
    pending.catch(() => receipts.delete(txHash));
  }
  const { receipt, at } = await pending;
  if (receipt.status !== 'success') throw new Error('Arkiv transaction did not succeed.');
  let found = false;
  for (const log of receipt.logs) {
    // Arkiv's operation precompile is the only accepted event emitter.
    if (log.address.toLowerCase() !== '0x4400000000000000000000000000000000000044') continue;
    try {
      const decoded = decodeEventLog({
        abi: ENTITY_EVENTS_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.args.entityKey.toLowerCase() !== entityKey.toLowerCase()) continue;
      const a = decoded.args as Record<string, unknown>;
      const ownership = decoded.eventName === 'OwnershipTransferred';
      const changes: BrainEvent['changes'] = ownership
        ? [{ field: 'owner', before: a.previousOwner, after: a.newOwner }]
        : [{ field: 'entity', after: entityKey }];
      await appendBrainEvent(
        {
          id: `chain:${txHash}:${log.logIndex}`,
          characterId,
          owner: String(a.newOwner || a.owner || receipt.from).toLowerCase(),
          epoch: 0,
          at,
          kind: ownership ? 'ownership' : 'chain',
          title: decoded.eventName,
          source: 'chain',
          changes,
          txHash,
          blockNumber: String(receipt.blockNumber),
        },
        'public',
      );
      found = true;
    } catch (error) {
      // Unrelated logs have a different ABI; entity matching is always checked above.
      if (error instanceof Error && !/decode|signature|topics|data|abi/i.test(error.name))
        throw error;
    }
  }
  if (!found) throw new Error('This receipt contains no matching Arkiv entity event.');
}
type LedgerGlobal = typeof globalThis & {
  mitraiChainLedger?: { stop: () => void; pending: Set<string>; version: string };
};
/** Chain event filters start at the current head. Persist observed receipts; never invent
 * historical transfers when the RPC cannot replay old events. */
export function startChainLedger() {
  if (process.env.PROACTIVE_DISABLED === '1' || process.env.NEXT_PHASE === 'phase-production-build')
    return;
  const global = globalThis as LedgerGlobal;
  if (global.mitraiChainLedger?.version === 'receipts-v3') return;
  global.mitraiChainLedger?.stop();
  const pending = new Set<string>();
  const stop = arkivPublic().watchEntityEvents({
    pollingInterval: 10000,
    onEvent: async (e) => {
      const c = (await allCharacters()).find(
        (c) => c.entityKey?.toLowerCase() === e.entityKey.toLowerCase(),
      );
      const pendingKey = `${e.transactionHash}:${e.entityKey}`;
      if (!c || pending.has(pendingKey)) return;
      pending.add(pendingKey);
      try {
        await recordArkivReceipt(c.id, e.entityKey, e.transactionHash);
      } catch (error) {
        console.error(
          'Arkiv event receipt could not be recorded',
          error instanceof Error ? error.message : 'unknown',
        );
      } finally {
        pending.delete(pendingKey);
      }
    },
    onError: (e) => console.error('Arkiv event stream:', e.message),
  });
  global.mitraiChainLedger = { stop, pending, version: 'receipts-v3' };
}
