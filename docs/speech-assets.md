# Offline greeting speech and timed mouth cues

Generated 6 November 2026. These are prerecorded greetings, not live model responses. They make voice/mouth playback testable without provider credentials.

| Character | Caption | Audio | Timing |
| --- | --- | --- | --- |
| Mira | Hello, I'm Mira. Let's make something worth remembering. | `/audio/mira-greeting.mp3` | `/audio/mira-greeting.json` — 4.19 seconds, 28 mouth cues |
| Milo | Hello, I'm Milo. A small hello can start a big adventure. | `/audio/milo-greeting.mp3` | `/audio/milo-greeting.json` — 4.63 seconds, 32 mouth cues |

## Provenance

Original greeting scripts were written for MitrAI. Speech was synthesized locally with **eSpeak NG 1.52.0** using en-us+f3 and en-us+m3 voices. No human speaker recording, celebrity voice or voice clone was used. Generated output is intentionally synthetic. Keep the tool/source provenance with the assets rather than claiming these are commercial natural-voice recordings or exclusive voices.

- [eSpeak NG official source](https://github.com/espeak-ng/espeak-ng) — GPLv3 software. Its COPYING is retained in `public/audio/licenses/ESPEAK-COPYING.txt`.
- [Rhubarb Lip Sync official release 1.14.0](https://github.com/DanielSWolf/rhubarb-lip-sync/releases/tag/v1.14.0) — official macOS binary downloaded into ignored `work/rhubarb/`; Rhubarb license retained in `public/audio/licenses/RHUBARB-LICENSE.md`.
- **FFmpeg 9.0.2**, libmp3lame, encoded PCM WAV analysis inputs to lightweight MP3 playback assets. Intermediate WAV/transcripts remain under `work/audio/`.
- Apple `/usr/bin/say` was deliberately not used for distributed recordings: [Apple's published system-voice terms](https://www.apple.com/legal/sla/docs/macOSBigSur.pdf) restrict public/commercial recording and sharing beyond personal noncommercial projects.

Source scripts are in `scripts/generate-greetings.sh`. Install the required tools and place the official Rhubarb macOS binary at the expected path, or set `RHUBARB` to its location. Run from repository root. No runtime network or TTS credential is required to play the exported greetings.

## Cue generation and playback

Rhubarb analyzes the actual WAV with its phonetic recognizer and the matching transcript. The JSON contains `mouthCues: [{start, end, value}]` in seconds, plus transcript and generation metadata. These are actual audio-derived estimated articulation timings, not fabricated periodic mouth animation; automatic recognition is still approximate and does not guarantee phonetic accuracy.

Recommended approximate mapping to the available humanoid vowel targets:

- `A` or `X`: all mouth targets zero (closed/rest).
- `B`: `ih` at 0.4.
- `C`: `ee` at 0.7.
- `D`: `aa` at 0.8.
- `E`: `oh` at 0.7.
- `F`: `ou` at 0.8.
- `G`: `ee` at 0.4.
- `H`: `aa` at 0.35.

The model supplies five vowel targets rather than all Rhubarb mouth shapes, so this mapping is approximate even when timing follows the recording. Sample cues against **`audio.currentTime`**, smoothly blend values, and reset on pause, end, cancellation, component unmount or playback error. Gate playback behind a user click. Do not let the visual timer run while audio playback is blocked.

RobotExpressive has no full mouth viseme rig. For Milo, use the same real cue timings to drive its Surprised expression at a restrained strength and independent head/body gesture; describe it as stylized speaking motion. Hand waves should be one-shot actions blending back to idle, not extra mouth cues.

Both JSON files were checked for nonnegative ordered cue intervals and final cues within the analyzed audio duration. MP3 encoders can add container padding; modern browser playback accounts for gapless metadata, and visual QA should still inspect perceived alignment.
