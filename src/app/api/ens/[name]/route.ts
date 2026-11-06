import { NextResponse } from 'next/server';
import { allCharacters } from '@/lib/store';
import { getCharacterEnsPassport, characterSubname } from '@/lib/ens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  props: { params: Promise<{ name: string }> }
) {
  try {
    const params = await props.params;
    const rawName = decodeURIComponent(params.name || '').toLowerCase().trim();
    const characters = allCharacters();

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

    return NextResponse.json({
      resolved: true,
      name: passport.subname,
      parent: passport.parent,
      node: passport.node,
      resolver: passport.resolver,
      owner: passport.owner,
      records: passport.records,
      updatedAt: found.createdAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'ENS resolution error' },
      { status: 500 }
    );
  }
}

