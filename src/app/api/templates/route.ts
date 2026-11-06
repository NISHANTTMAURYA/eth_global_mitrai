import { NextResponse } from 'next/server';
import { templates } from '@/lib/templates';
import { modelClaims } from '@/lib/model-claims';
import { getCharacter } from '@/lib/store';
import { identity } from '@/lib/session';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  const owner = await identity(),
    claims = await modelClaims();
  const characters = await Promise.all(
    claims.map((claim) => getCharacter(claim.character_id).catch(() => null)),
  );
  return NextResponse.json(
    {
      templates: templates.map((t) => {
        const claim = claims.find((c) => c.model === t.model);
        const c = claim ? characters[claims.indexOf(claim)] : null;
        const mine = !!c && c.owner === owner;
        return {
          ...t,
          status: !claim ? 'available' : claim.state === 'confirmed' ? 'created' : 'reserved',
          mine,
          characterId: c && (mine || c.published) ? c.id : undefined,
        };
      }),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
