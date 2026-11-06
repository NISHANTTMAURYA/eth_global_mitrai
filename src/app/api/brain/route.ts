import { NextResponse } from 'next/server';
import { getCharacter, brainEvents } from '@/lib/store';
import { identity } from '@/lib/session';
import { ownerProfiles, loadMind, jobsFor } from '@/lib/continuity-store';
import { conversationScope } from '@/lib/private-mind';
import { readArkivCharacter, readArkivCheckpoints, arkivPublic } from '@/lib/arkiv';
import { verifySnapshot } from '@/lib/proof';
import { startChainLedger } from '@/lib/chain-ledger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new Error('Choose a character.');
    const c = await getCharacter(id),
      viewer = await identity();
    if (!c.published && c.owner !== viewer) throw new Error('This character is private.');
    let own = c.owner === viewer,
      chainError: string | null = null,
      chain: null | { owner: string; entityKey: string; version: number; checkedAt: number } = null;
    let checkpoints: {
      key: string;
      blockNumber: string;
      at: number;
      version: number;
      traits: unknown;
      memories: unknown;
      habits: unknown;
      owner: string;
    }[] = [];
    if (c.entityKey) {
      try {
        const remote = await readArkivCharacter(c.entityKey as `0x${string}`);
        if (
          !verifySnapshot(remote.character, remote.proof, remote.verifier) ||
          remote.character.id !== c.id ||
          remote.character.createdAt !== c.createdAt
        )
          throw new Error('Could not verify the chain snapshot.');
        own = own && String(remote.owner).toLowerCase() === viewer;
        chain = {
          owner: String(remote.owner).toLowerCase(),
          entityKey: c.entityKey,
          version: remote.character.brain.version,
          checkedAt: Date.now(),
        };
        const rows = await readArkivCheckpoints(c.entityKey as `0x${string}`);
        const blocks = new Map<string, number>();
        for (const row of rows
          .sort((a, b) => Number(BigInt(b.blockNumber) - BigInt(a.blockNumber)))
          .slice(0, 30)) {
          if (
            !verifySnapshot(row.character, row.proof, row.verifier) ||
            row.character.id !== c.id ||
            row.character.createdAt !== c.createdAt
          )
            continue;
          let at = blocks.get(row.blockNumber);
          if (at === undefined) {
            at =
              Number(
                (await arkivPublic().getBlock({ blockNumber: BigInt(row.blockNumber) })).timestamp,
              ) * 1000;
            blocks.set(row.blockNumber, at);
          }
          checkpoints.push({
            key: row.key,
            blockNumber: row.blockNumber,
            at,
            version: row.character.brain.version,
            traits: row.character.brain.traits,
            memories: row.character.brain.memories,
            habits: row.character.brain.habits,
            owner: String(row.owner),
          });
        }
      } catch (e) {
        if (!chain) own = false;
        chainError = e instanceof Error ? e.message : 'Chain unavailable';
      }
    }
    startChainLedger();
    return NextResponse.json(
      {
        events: await brainEvents(c.id, own ? viewer : null, c.ownershipEpoch || 0),
        mind: own ? await loadMind(c, viewer!) : null,
        profiles: own ? await ownerProfiles(c, viewer) : [],
        jobs: own ? await jobsFor(conversationScope(c.id, viewer!, c.ownershipEpoch || 0)) : [],
        chain,
        chainError,
        checkpoints,
        coverage:
          'Chain receipts confirmed by this app and events observed while it is online. Earlier external transfers may be unavailable; no missing history is fabricated.',
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not load the brain.' },
      { status: 400 },
    );
  }
}
