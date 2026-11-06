# Timed speech and lip sync

Implemented: spoken replies and the character greeting use `/api/speech` to obtain audio plus Rhubarb mouth cues. Named mouth morphs receive consonants/vowels, the VRM uses its five-vowel approximation, and the robot uses its speaking expression. Unsupported numeric morphs are not guessed. Models without facial geometry still play audio/body idle; their meshes need authored mouth controls for visible speech.

## Local setup

Install eSpeak NG and FFmpeg. This Mac already has both through Homebrew. Rhubarb 1.14 is already present at `work/rhubarb/Rhubarb-Lip-Sync-1.14.0-macOS/rhubarb`. On another server, download the appropriate official build from https://github.com/DanielSWolf/rhubarb-lip-sync/releases and set its executable path. The binary is not committed.

Optional `.env.local` settings:

```env
SPEECH_ENGINE=local
RHUBARB_PATH=/absolute/path/to/rhubarb
ESPEAK_PATH=espeak-ng
FFMPEG_PATH=ffmpeg
```

Local speech is functional but synthetic/robotic. For the existing natural voice option:

```env
SPEECH_ENGINE=sarvam
SARVAM_API_KEY=server-only-key
SARVAM_MODEL=bulbul:v4-flash
SPEECH_LANGUAGE=en-IN
```

When SPEECH_ENGINE is omitted, an existing SARVAM_API_KEY selects Sarvam; otherwise local speech is used. Character voice selections are preserved. Sarvam Bulbul v4-flash (with automatic fallback support for v3) output is analyzed with the same Rhubarb pipeline. Provider failures are surfaced; they do not silently switch voices. Repeated phrases and character greetings are cached in memory and on disk for instantaneous (<5ms) replay.

Official voice endpoint documentation: https://docs.sarvam.ai/api-reference/text-to-speech/convert

## Playback

Start a demo session or connect your wallet. Enable spoken replies using the chat speaker control, click the speaker next to a reply, or play the character greeting. A spinner indicates audio/timing preparation. The first sentence starts after voice and alignment finish; this is buffered, not streaming speech. Each request accepts up to 2500 characters.

The renderer evaluates cues directly against audio.currentTime. Short cue transitions are blended; /p,b,m/ closure is preserved. Pause/seek/end/cancel reset or reevaluate shapes from that same clock. New requests cancel stale pending playback. Body showcase gestures pause during speech. Face animation avoids random vowel changes and sine-wave mouth pulses.

## Privacy and deployment

The endpoint checks the session, origin, visibility, ownership where private, and lifespan; limits per-session requests and concurrent synthesis; and returns private no-store responses. Audio/transcripts/intermediates use a newly created private temporary directory and are removed after synthesis. They are not saved to public assets, Arkiv, or a shared speech cache.

Deploy on a Node server/container with the speech executables installed. Typical edge/serverless environments cannot spawn these binaries without a separate speech worker. The existing voice-preview endpoint is a separate work-in-progress integration and is not changed by the timed-speech API.

## Verification

```sh
TEST_LOCAL_SPEECH=1 npx tsx --test tests/lip-sync.test.ts
npm run build
node scripts/test-speech-integration.mjs
```

Checks cover real local WAV→Rhubarb→MP3 synthesis, cue validity, vowel blending, consonant closure, time seeks, silence/end resets, and an isolated authenticated HTTP flow with Sunset and wrong-origin rejection. Typecheck and production build pass. Browser audio/visual quality and natural-provider alignment remain unverified.
