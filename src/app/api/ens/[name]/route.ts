import { NextResponse } from 'next/server';
import { allCharacters } from '@/lib/store';
import { getCharacterEnsPassport, characterSubname, getEnsPublicClient } from '@/lib/ens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  props: { params: Promise<{ name: string }> }
) {
  try {
    const params = await props.params;
    const rawName = decodeURIComponent(params.name || '').toLowerCase().trim();
    const characters = (await allCharacters()).filter((c) => c.published);

    // Match either by subname (e.g. milo.mitrai.eth) or by character id/name
    const found = characters.find((c) => {
      const sub = characterSubname(c).toLowerCase();
      return (
        sub === rawName ||
        c.name.toLowerCase() === rawName ||
        c.id.toLowerCase() === rawName ||
        sub.startsWith(`${rawName}.`)
      );
    });

    if (!found) {
      return NextResponse.json(
        {
          error: `ENS subname "${rawName}" not found in MitrAI registry`,
          resolved: false,
        },
        { status: 404 }
      );
    }

    const passport = getCharacterEnsPassport(found);

    let onchainAddress: string | null = null;
    try { onchainAddress = await getEnsPublicClient().getEnsAddress({ name: passport.subname }); } catch { /* unavailable RPC is not proof of registration */ }
    const registeredOnEns = !!onchainAddress;
    return NextResponse.json({
      resolved: registeredOnEns,
      registeredOnEns,
      source: 'mitrai-app',
      name: passport.subname,
      parent: passport.parent,
      node: passport.node,
      resolver: registeredOnEns ? passport.resolver : null,
      onchainAddress,
      owner: passport.owner,
      records: passport.records,
      updatedAt: passport.createdAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'ENS resolution error' },
      { status: 500 }
    );
  }
}

