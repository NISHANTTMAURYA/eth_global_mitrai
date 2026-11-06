import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkOrigin, requireIdentity } from '@/lib/session';
import { getCharacter } from '@/lib/store';
import { assertAlive } from '@/lib/domain';
import { readArkivCharacter } from '@/lib/arkiv';
import { defaultVoiceForModel } from '@/lib/voices';
import { generateSpeech } from '@/lib/speech-audio';
import { verifySnapshot } from '@/lib/proof';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const requests = new Map<string, { start: number; count: number }>();

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const owner = await requireIdentity();
    const now = Date.now(),
      previous = requests.get(owner);
    if (previous && now - previous.start < 60000) {
      if (previous.count >= 24)
        throw new Error('Please wait before generating more voice replies.');
      previous.count++;
    } else requests.set(owner, { start: now, count: 1 });
    for (const [key, value] of requests) if (now - value.start >= 60000) requests.delete(key);
    const raw = await request.text();
    if (raw.length > 14000) throw new Error('Speech request is too large.');
    const body = z
      .object({ id: z.string().min(1).max(100), text: z.string().trim().min(1).max(2500) })
      .parse(JSON.parse(raw));
    let c = getCharacter(body.id);
    assertAlive(c);
    const remote = c.entityKey ? await readArkivCharacter(c.entityKey as `0x${string}`) : null;
    const chainOwner = remote ? String(remote.owner).toLowerCase() : c.owner;
    if (!c.published && chainOwner !== owner) throw new Error('This character is not available.');
    if (chainOwner !== owner && remote) {
      if (
        !remote.character.published ||
        !verifySnapshot(remote.character, remote.proof, remote.verifier)
      )
        throw new Error('This public voice is not available.');
      c = { ...remote.character, entityKey: c.entityKey, birth: remote.birth };
    }
    const result = await generateSpeech(
      body.text,
      (c as typeof c & { voice?: string }).voice || defaultVoiceForModel(c.model),
    );
    assertAlive(c);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not generate speech.' },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
