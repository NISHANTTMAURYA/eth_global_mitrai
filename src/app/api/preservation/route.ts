import { NextResponse } from 'next/server';
import { identity } from '@/lib/session';
import { getCharacter } from '@/lib/store';
import { arkivPublic, Characters, Checkpoints, readArkivCheckpoints } from '@/lib/arkiv';
import { verifySnapshot } from '@/lib/proof';
import { hexToString, type Hex } from 'viem';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const c = getCharacter(new URL(request.url).searchParams.get('id') || ''),
      owner = await identity();
    if (!c.entityKey || !owner) throw new Error('Connect the owner wallet.');
    const client = arkivPublic(),
      root = await client.getEntity(c.entityKey as Hex, Characters);
    if (
      String(root.$owner).toLowerCase() !== owner ||
      !verifySnapshot(
        JSON.parse(hexToString(root.snapshot.value)),
        root.proof.value,
        root.verifier.value,
      )
    )
      throw new Error('Only the verified current owner can manage preservation.');
    const rows = await readArkivCheckpoints(c.entityKey as Hex),
      records = [];
    const head = await client.getBlockNumber();
    const entities = [
      root,
      ...(await Promise.all(rows.map((r) => client.getEntity(r.key, Checkpoints)))),
    ];
    for (const e of entities)
      records.push({
        key: e.$key,
        expiresAt: String(e.$expiresAt),
        blocksRemaining: String(e.$expiresAt - head),
        canExtend:
          String(e.$owner).toLowerCase() === owner || e.$creationFlags.permissionlessExtension,
      });

    return NextResponse.json(
      { records, head: String(head) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
