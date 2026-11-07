import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkOrigin } from '@/lib/session';
import { getCharacter } from '@/lib/store';
import { assertAlive, publicCharacter } from '@/lib/domain';
import { readArkivCharacter } from '@/lib/arkiv';
import { verifySnapshot } from '@/lib/proof';
import { generateSpeech } from '@/lib/speech-audio';
import { getMonologue } from '@/lib/monologue';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const cache = new Map<string, { at: number; body: unknown }>(),
  requests = new Map<string, { at: number; n: number }>();
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'local',
      now = Date.now(),
      previous = requests.get(ip);
    if (previous && now - previous.at < 60000) {
      if (++previous.n > 20) throw new Error('Please wait a moment before another introduction.');
    } else requests.set(ip, { at: now, n: 1 });
    for (const [key, v] of requests) if (now - v.at > 60000) requests.delete(key);
    const id = z
      .string()
      .min(1)
      .max(100)
      .parse((await request.json()).id);
    let c = await getCharacter(id);
    if (!c.published) throw new Error('This persona has not shared a public story.');
    let proof = 'demo';
    if (!c.demo) {
      if (!c.entityKey) throw new Error('This persona is not published.');
      const remote = await readArkivCharacter(c.entityKey as `0x${string}`);
      if (
        !remote.character.published ||
        !verifySnapshot(remote.character, remote.proof, remote.verifier)
      )
        throw new Error('The public story is not available.');
      proof = remote.proof;
      c = { ...publicCharacter(remote.character), entityKey: c.entityKey, birth: remote.birth, monologue: c.monologue };
    }
    assertAlive(c);
    const text = getMonologue(c);
    const key = `mono:${id}:${c.voice}:${text}`;
    const saved = cache.get(key);
    if (saved && now - saved.at < 600000) return NextResponse.json(saved.body);
    const speech = await generateSpeech(text, c.voice);
    assertAlive(c);
    const body = { text, speech, provider: 'Stored Monologue' };
    cache.set(key, { at: now, body });
    if (cache.size > 100) cache.delete(cache.keys().next().value!);
    return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
