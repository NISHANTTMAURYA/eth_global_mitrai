import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm, access, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateSpeechTrack, SpeechTrack } from './lip-sync';

const execute = promisify(execFile);
const selectedVoices = new Set(['shubh', 'priya', 'simran', 'aditya', 'ishita', 'rohan']);
let running = 0;

export const V4_FLASH_SPEAKERS: Record<string, string> = {
  shubh: 'shubh_en_narration_gentle',
  priya: 'sanchita_en_companion',
  simran: 'simran_en_conversation',
  aditya: 'dev_en_conversational',
  ishita: 'ishita_en_stories',
  rohan: 'rohan_en_recovery',
};

export function resolveSarvamSpeaker(voice: string, model: string): string {
  if (model.includes('v4')) {
    return V4_FLASH_SPEAKERS[voice] || voice || 'shubh_en_narration_gentle';
  }
  return selectedVoices.has(voice) ? voice : 'shubh';
}

export interface GeneratedSpeechResult extends SpeechTrack {
  audio: string;
  provider: string;
  alignment: string;
  voice: string;
}

const memorySpeechCache = new Map<string, GeneratedSpeechResult>();
const cacheDirectory = path.join(
  process.env.MITRAI_DATA_DIR || path.join(process.cwd(), '.data'),
  'speech-cache',
);

export async function generateSpeech(text: string, voice = 'shubh', forceLocal = false): Promise<GeneratedSpeechResult> {
  if (!text.trim() || text.length > 2500)
    throw new Error('Voice supports 1–2500 characters per reply.');

  const engine = forceLocal
    ? 'local'
    : process.env.SPEECH_ENGINE || (process.env.SARVAM_API_KEY ? 'sarvam' : 'local');
  if (!['local', 'sarvam'].includes(engine))
    throw new Error('SPEECH_ENGINE must be local or sarvam.');

  const sarvamModel = process.env.SARVAM_MODEL || 'bulbul:v4-flash';
  const resolvedSpeaker = engine === 'sarvam' ? resolveSarvamSpeaker(voice, sarvamModel) : voice;

  // Cache lookup (key based on engine, model, speaker, and text)
  const cleanKey = `${engine}:${sarvamModel}:${resolvedSpeaker}:${text.trim().toLowerCase()}`;
  const hash = crypto.createHash('sha256').update(cleanKey).digest('hex');

  const memCached = memorySpeechCache.get(hash);
  if (memCached) {
    return memCached;
  }

  const cacheFile = path.join(cacheDirectory, `${hash}.json`);
  if (existsSync(cacheFile)) {
    try {
      const saved = JSON.parse(await readFile(cacheFile, 'utf8'));
      memorySpeechCache.set(hash, saved);
      return saved;
    } catch {}
  }

  if (running >= 2) throw new Error('Voice is busy. Please try again in a moment.');

  const rhubarb =
    process.env.RHUBARB_PATH ||
    path.join(process.cwd(), 'work/rhubarb/Rhubarb-Lip-Sync-1.14.0-macOS/rhubarb');
  try {
    await access(rhubarb);
  } catch {
    throw new Error('Install Rhubarb and set RHUBARB_PATH to enable timed speech.');
  }
  const directory = await mkdtemp(path.join(tmpdir(), 'mitrai-speech-'));
  // Recheck after async directory creation so simultaneous callers cannot exceed the cap.
  if (running >= 2) {
    await rm(directory, { recursive: true, force: true });
    throw new Error('Voice is busy. Please try again in a moment.');
  }
  running++;
  try {
    const transcript = path.join(directory, 'text.txt'),
      wav = path.join(directory, 'voice.wav');
    await writeFile(transcript, text, { mode: 0o600 });
    let provider = 'Local eSpeak NG';
    if (engine === 'sarvam') {
      if (!process.env.SARVAM_API_KEY)
        throw new Error('Sarvam voice is selected but SARVAM_API_KEY is missing.');
      const response = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': process.env.SARVAM_API_KEY,
        },
        body: JSON.stringify({
          text,
          language_code: process.env.SPEECH_LANGUAGE || 'en-IN',
          model: sarvamModel,
          speaker: resolvedSpeaker,
          output_audio_codec: 'wav',
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`Voice generation failed (${response.status}).`);
      const result = await response.json();
      if (typeof result.audios?.[0] !== 'string')
        throw new Error('Voice provider returned no audio.');
      const bytes = Buffer.from(result.audios[0], 'base64');
      if (!bytes.length || bytes.length > 20_000_000)
        throw new Error('Voice response was invalid.');
      await writeFile(wav, bytes, { mode: 0o600 });
      provider = `Sarvam Bulbul ${sarvamModel.includes('v4') ? 'v4-flash' : 'v3'}`;
    } else {
      await execute(
        process.env.ESPEAK_PATH || 'espeak-ng',
        [
          '-v',
          ['priya', 'simran', 'ishita'].includes(voice) ? 'en-us+f3' : 'en-us+m3',
          '-s',
          '155',
          '-w',
          wav,
          '-f',
          transcript,
        ],
        { timeout: 30000, maxBuffer: 1024 * 1024 },
      );
    }
    const analysis = path.join(directory, 'analysis.wav'),
      mp3 = path.join(directory, 'voice.mp3'),
      cues = path.join(directory, 'cues.json');
    await execute(
      process.env.FFMPEG_PATH || 'ffmpeg',
      ['-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-ar', '16000', analysis],
      { timeout: 30000 },
    );
    await execute(
      rhubarb,
      ['-r', 'phonetic', '-f', 'json', '-d', transcript, '-o', cues, analysis],
      { timeout: 90000, maxBuffer: 1024 * 1024 },
    );
    const track = validateSpeechTrack(JSON.parse(await readFile(cues, 'utf8')));
    await execute(
      process.env.FFMPEG_PATH || 'ffmpeg',
      ['-loglevel', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '4', mp3],
      { timeout: 30000 },
    );
    const speechResult: GeneratedSpeechResult = {
      audio: `data:audio/mpeg;base64,${(await readFile(mp3)).toString('base64')}`,
      ...track,
      provider,
      alignment: 'Rhubarb phonetic',
      voice,
    };
    memorySpeechCache.set(hash, speechResult);
    if (memorySpeechCache.size > 200) {
      const first = memorySpeechCache.keys().next().value;
      if (first) memorySpeechCache.delete(first);
    }
    try {
      await mkdir(cacheDirectory, { recursive: true });
      await writeFile(cacheFile, JSON.stringify(speechResult), 'utf8');
    } catch {}
    return speechResult;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      throw new Error(
        'Timed speech needs eSpeak NG (local mode), FFmpeg and Rhubarb installed on the server.',
      );
    throw error;
  } finally {
    running--;
    await rm(directory, { recursive: true, force: true });
  }
}
