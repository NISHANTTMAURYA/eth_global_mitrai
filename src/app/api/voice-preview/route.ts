import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkOrigin } from '@/lib/session';
import { VOICES } from '@/lib/voices';
import { generateSpeech } from '@/lib/speech-audio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requests = new Map<string, { start: number; count: number }>();
const cache = new Map<string, { expires: number; speech: Awaited<ReturnType<typeof generateSpeech>> }>();

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const raw = await request.text();
    if (raw.length > 1000) throw new Error('Voice preview request is too large.');
    const body = z.object({
      voice: z.string().min(1).max(40),
      name: z.string().trim().min(1).max(32).optional(),
    }).parse(JSON.parse(raw));
    if (!VOICES.some((voice) => voice.id === body.voice)) throw new Error('Choose an available voice.');

    const now = Date.now();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const previous = requests.get(ip);
    if (previous && now - previous.start < 60000) {
      if (previous.count >= 8) throw new Error('Please wait a moment before trying another voice.');
      previous.count++;
    } else requests.set(ip, { start: now, count: 1 });
    for (const [key, value] of requests) if (now - value.start >= 60000) requests.delete(key);

    const key = `${body.voice}:${(body.name || '').toLocaleLowerCase()}`;
    const cached = cache.get(key);
    if (cached && cached.expires > now) {
      return NextResponse.json(cached.speech, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const name = body.name || 'MitrAI';
    const speech = await generateSpeech(
      `Hi, I'm ${name}. It's lovely to meet you. What would you like to explore together?`,
      body.voice,
    );
    cache.set(key, { expires: now + 5 * 60_000, speech });
    while (cache.size > 12) cache.delete(cache.keys().next().value!);
    return NextResponse.json(speech, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not prepare a voice preview.' },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
