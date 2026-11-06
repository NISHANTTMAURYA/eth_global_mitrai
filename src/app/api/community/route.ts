import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCharacter } from '@/lib/store';
import { lifecycle } from '@/lib/domain';
import { query, transaction } from '@/lib/database';
import { checkOrigin, identity, requireIdentity } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idSchema = z.string().min(1).max(100);

export async function GET(request: Request) {
  try {
    const id = idSchema.parse(new URL(request.url).searchParams.get('id'));
    const character = await getCharacter(id);
    const wallet = (await identity())?.toLowerCase() || null;
    if (!character.published && wallet !== character.owner.toLowerCase())
      return NextResponse.json({ error: 'This community is not public.' }, { status: 403 });
    const [members, posts] = await Promise.all([
      query<{ wallet: string }>('SELECT wallet FROM community_members WHERE character_id=$1', [id]),
      query<{ id: string; wallet: string; body: string; created_at: string }>(
        'SELECT id,wallet,body,created_at FROM community_posts WHERE character_id=$1 ORDER BY created_at DESC LIMIT 60',
        [id],
      ),
    ]);
    return NextResponse.json({
      count: members.rowCount,
      joined: !!wallet && members.rows.some((row) => row.wallet === wallet),
      posts: posts.rows.reverse().map((post) => ({
        id: post.id,
        wallet: post.wallet,
        body: post.body,
        at: Number(post.created_at),
      })),
      alive: lifecycle(character).alive,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load community.' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const wallet = (await requireIdentity()).toLowerCase();
    const input = z.object({
      id: idSchema,
      action: z.enum(['join', 'leave', 'post']),
      body: z.string().trim().min(1).max(500).optional(),
    }).parse(await request.json());
    const character = await getCharacter(input.id);
    if (!character.published || !lifecycle(character).alive)
      throw new Error('This community is read-only until the character is public and alive.');
    if (input.action === 'join') {
      await query(
        'INSERT INTO community_members(character_id,wallet,joined_at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
        [input.id, wallet, Date.now()],
      );
    } else if (input.action === 'leave') {
      await query('DELETE FROM community_members WHERE character_id=$1 AND wallet=$2', [input.id, wallet]);
    } else {
      if (!input.body) throw new Error('Write a short message.');
      await transaction(async (client) => {
        const member = await query('SELECT 1 FROM community_members WHERE character_id=$1 AND wallet=$2', [input.id, wallet], client);
        if (!member.rowCount) throw new Error('Join the community before posting.');
        const last = await query<{ created_at: string }>(
          'SELECT created_at FROM community_posts WHERE character_id=$1 AND wallet=$2 ORDER BY created_at DESC LIMIT 1',
          [input.id, wallet], client,
        );
        if (last.rows[0] && Date.now() - Number(last.rows[0].created_at) < 15_000)
          throw new Error('Wait a moment before posting again.');
        await query(
          'INSERT INTO community_posts(id,character_id,wallet,body,created_at) VALUES($1,$2,$3,$4,$5)',
          [crypto.randomUUID(), input.id, wallet, input.body, Date.now()],
          client,
        );
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update community.' }, { status: 400 });
  }
}
