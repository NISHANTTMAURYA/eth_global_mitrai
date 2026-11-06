import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { VOICES, DEFAULT_VOICE_ID } from '@/lib/voices';
import { resolveSarvamSpeaker } from '@/lib/speech-audio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const cacheDir = path.join(process.env.MITRAI_DATA_DIR || path.join(process.cwd(), '.data'), 'voice-cache');
try {
  fs.mkdirSync(cacheDir, { recursive: true });
} catch {}

const memCache = new Map<string, string>();

function getCached(hash: string): string | null {
  if (memCache.has(hash)) return memCache.get(hash)!;
  const filePath = path.join(cacheDir, `${hash}.mp3`);
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath);
      const b64 = data.toString('base64');
      memCache.set(hash, b64);
      return b64;
    } catch {}
  }
  return null;
}

function setCached(hash: string, base64Data: string) {
  memCache.set(hash, base64Data);
  if (memCache.size > 200) {
    const firstKey = memCache.keys().next().value;
    if (firstKey) memCache.delete(firstKey);
  }
  try {
    const filePath = path.join(cacheDir, `${hash}.mp3`);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
  } catch {}
}

export async function POST(request: Request) {
  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'Sarvam AI API key is not configured.' }, { status: 503 });
  }

  let body: { text?: string; voice?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const rawText = String(body.text || '').trim();
  if (!rawText) {
    return NextResponse.json({ error: 'Text is required for voice synthesis.' }, { status: 400 });
  }

  // Bound text length to 400 characters to prevent high latency and credit drain
  const cleanText = rawText.slice(0, 400);

  const selectedVoice = VOICES.some((v) => v.id === body.voice) ? body.voice! : DEFAULT_VOICE_ID;

  // Cache key based on voice and text
  const hash = crypto
    .createHash('sha256')
    .update(`${selectedVoice}:${cleanText.toLowerCase()}`)
    .digest('hex');

  const cached = getCached(hash);
  if (cached) {
    return NextResponse.json({
      audio: `data:audio/mp3;base64,${cached}`,
      cached: true,
      voice: selectedVoice,
    });
  }

  try {
    const sarvamModel = process.env.SARVAM_MODEL || 'bulbul:v4-flash';
    const resolvedSpeaker = resolveSarvamSpeaker(selectedVoice, sarvamModel);
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        text: cleanText,
        language_code: 'en-IN',
        model: sarvamModel,
        speaker: resolvedSpeaker,
        output_audio_codec: 'mp3',
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Sarvam TTS failed (${response.status}): ${errText.slice(0, 200)}` },
        { status: response.status >= 500 ? 502 : 400 },
      );
    }

    const data = (await response.json()) as { audios?: string[]; request_id?: string };
    const base64Audio = data.audios?.[0];
    if (!base64Audio) {
      return NextResponse.json({ error: 'No audio returned by Sarvam AI.' }, { status: 502 });
    }

    setCached(hash, base64Audio);

    return NextResponse.json({
      audio: `data:audio/mp3;base64,${base64Audio}`,
      cached: false,
      voice: selectedVoice,
      requestId: data.request_id,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Voice generation timed out or failed.' },
      { status: 500 },
    );
  }
}

