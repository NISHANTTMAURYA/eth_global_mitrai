#!/bin/sh
set -eu
# Requires eSpeak NG, FFmpeg, and official Rhubarb 1.14.0 macOS binary.
RHUBARB="${RHUBARB:-work/rhubarb/Rhubarb-Lip-Sync-1.14.0-macOS/rhubarb}"
mkdir -p work/audio public/audio
printf '%s' "Hello, I'm Mira. Let's make something worth remembering." > work/audio/mira-greeting.txt
printf '%s' "Hello, I'm Milo. A small hello can start a big adventure." > work/audio/milo-greeting.txt
espeak-ng -v en-us+f3 -s 155 -p 56 -w work/audio/mira-greeting.wav -f work/audio/mira-greeting.txt
espeak-ng -v en-us+m3 -s 150 -p 42 -w work/audio/milo-greeting.wav -f work/audio/milo-greeting.txt
for voice in mira milo; do
  ffmpeg -loglevel error -y -i "work/audio/$voice-greeting.wav" -codec:a libmp3lame -q:a 4 "public/audio/$voice-greeting.mp3"
  "$RHUBARB" -r phonetic -f json -d "work/audio/$voice-greeting.txt" -o "public/audio/$voice-greeting.json" "work/audio/$voice-greeting.wav"
done
python3 - <<'PY'
from pathlib import Path
import json
for name in ['mira','milo']:
 p=Path(f'public/audio/{name}-greeting.json'); d=json.loads(p.read_text())
 d['metadata']['soundFile']=f'{name}-greeting.mp3'
 d['transcript']=Path(f'work/audio/{name}-greeting.txt').read_text()
 d['generator']={'speech':'eSpeak NG 1.52.0','cues':'Rhubarb Lip Sync 1.14.0, phonetic recognizer','timing':'Audio-derived estimated mouth cues, seconds'}
 p.write_text(json.dumps(d,indent=2)+'\n')
PY
