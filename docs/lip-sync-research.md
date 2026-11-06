# Lip-sync research and implementation plan

Implementation update: the buffered audio + Rhubarb pipeline is now implemented for dynamic replies and greetings. See [setup and actual verification](timed-speech-setup.md). Earlier descriptions below record the previous state and research; advanced provider viseme streams and authoring missing facial shapes remain future work.

Researched 6 November 2026. Recommendations below are engineering conclusions from the primary documentation and a fresh inspection of our local GLBs. No new paid speech service is integrated by this document.

## What the current application does

Fixed greeting audio already has Rhubarb mouth-cue JSON. Playback samples the cues using audio.currentTime. Dynamic replies use browser speechSynthesis word boundary events, guess a vowel from the word, and change a small number of mouth targets. This approximates speech; it cannot deliver reliable phoneme timing. The animation loop also adds a sine-wave mouth pulse, which is a stylization rather than a measure of the audio.

MDN describes boundary as a word/sentence event, not a viseme stream. The TalkingHead author reports poor synchronization with this API and explains its lack of usable audio/timing access. Do not mistake a word event for phoneme alignment.

- https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/boundary_event
- https://github.com/met4citizen/TalkingHead#faq

## Local asset inspection

| Models | Speech geometry | Practical result |
|---|---|---|
| CactusBoy, Nightmare, Wizzir, Carrot Kid | 15 named speech morphs each, plus blink/eyelids | Best candidates for consonants, vowels and closed lips. Currently only vowel subset is driven. |
| pixiv VRM humanoid | VRM expression presets aa/ih/ou/ee/oh | Good stylized vowel speech; fewer consonant distinctions. |
| SaintClaus, Astrodisco, Bloody, Clown, Ghost, Zombie | 16 numeric morphs each | Inspect each target visually and record a per-model mapping before using it. Index order is not a verified phoneme definition. |
| RobotExpressive | Angry/Surprised/Sad expressions | A speaking expression is possible; accurate speech shapes require authored morphs. |
| Fox, Alien, Soldier, Casual Female, German Shepherd, Pug, character-female-a, five Gobkit animals | No facial morph targets | Need suitable jaw/lip controls or newly authored morph targets before convincing lip sync. Body animation does not create a working mouth. |

## Techniques researched

### 1. Speech synthesis with viseme timestamps

Generate speech and timing from the same TTS voice/configuration. Schedule mouth shapes against the actual audio playback clock. This avoids guessing sounds from written letters.

- Amazon Polly supports viseme speech marks with millisecond timestamps. Audio and marks are separate requests. Keep text, voice, engine, language and SSML settings identical; verify speech-mark support for the chosen engine. This is a reasonable option if the team's AWS credits cover Polly. Existing model credentials do not automatically prove Polly access or credit coverage.
  https://docs.aws.amazon.com/polly/latest/dg/using-speechmarks.html
  https://docs.aws.amazon.com/polly/latest/dg/output.html
  https://docs.aws.amazon.com/polly/latest/dg/speechmarksconsole.html
- Azure Speech supplies viseme IDs with audio offsets and, for supported voices/locales, blend-shape frame data. Its schema must be mapped to our character rather than applied by numeric index. Confirm locale support before selecting a voice.
  https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-speech-synthesis-viseme

### 2. Existing audio plus Rhubarb

Generate a real speech file, convert to a supported analysis format, run Rhubarb, then play the original audio with its mouth-cue JSON. It supplies a small set of mouth shapes, suited to stylized characters. Its PocketSphinx recognizer targets English; the phonetic recognizer is language independent but documented as less precise. Supply a transcript when appropriate. This extends our existing greeting pipeline and requires no new cloud lip-sync account. Audio generation remains a separate step.

https://github.com/DanielSWolf/rhubarb-lip-sync

### 3. Real-time audio analysis: HeadAudio

HeadAudio uses an AudioWorklet, MFCC features and Gaussian prototypes to estimate Oculus viseme weights from audio. It runs in-browser, works without word timestamps and is MIT licensed. The author explicitly notes prediction/VAD limits and lower accuracy than text-driven alignment. It requires access to the actual audio stream; browser speechSynthesis is not automatically an input audio buffer.

https://github.com/met4citizen/HeadAudio

### 4. TalkingHead as an integrated avatar runtime

TalkingHead supports timestamped audio, viseme arrays and full avatar expression/gesture coordination. Its standard setup expects a compatible rig and ARKit/Oculus facial shapes. It does not manufacture those shapes for arbitrary GLBs. Importing the entire runtime is more disruptive than adding a small viseme driver to our existing R3F/VRM stage. Borrow the timing/data design first; evaluate full runtime adoption only if we switch to compatible avatars.

https://github.com/met4citizen/TalkingHead

## Recommended MitrAI implementation

1. Start with CactusBoy, Wizzir, Carrot Kid or Nightmare because their mouth shapes are named. Use the VRM's five-vowel fallback for Orbit.
2. Return a speech artifact from the server: audio URL, duration, language/voice identifier, timestamped viseme weights and the source of alignment. Keep private generated speech off public blockchain storage.
3. Initial free tooling path: real audio plus Rhubarb, reusing the greeting pipeline. For higher quality dynamic speech, evaluate Polly audio plus matching viseme marks with the available AWS account. No service switch is required for the text model.
4. Normalize providers into a shared cue format, for example `{ start: 0.12, end: 0.20, weights: { pp: 1 } }`. Maintain a capability and mapping profile for each model. Numeric targets need explicit mapping.
5. Use audio.currentTime or an AudioContext playback clock for evaluation; do not advance an independent mouth timer. Pause/seek/cancel/end must reset the mouth and track playback.
6. Blend adjacent sounds over short configurable windows instead of snapping. Start tuning around 40–80 ms of overlap; this range is a design starting point, not a documented universal optimum. Preserve full closures for /p/, /b/, /m/ and teeth/lip contact for /f/, /v/. Normalize competing speech weights and keep emotion/blink controls on separate channels.
7. Remove the periodic sine-mouth pulse from the accurate path. Mouth opening should follow cue intensity and, optionally, a restrained audio-energy envelope. Return to a neutral mouth during silence.
8. Reduce dance/body motion during speech, keep head movements modest and blend expressions without overpowering the speech shapes. These are presentation decisions to validate with recordings.
9. Check clips containing consonant closures, rounded vowels, pauses, fast speech and the intended language/Hinglish. Record screen+audio to measure offset and drift at the start/middle/end. Validate on mobile as well as desktop before claiming quality.

## Animation coverage audit

All 24 catalog forms have body motion: 13 have embedded clips; 10 imported humanoids use the authored retargeted library and upright idle; 1 VRM uses procedural gestures. Living visible personas cycle supported nonterminal animations; Legacy personas remain still. Not every species supports every humanoid gesture. Default size was increased by exactly 15% in compact gallery projection and 10% in character-detail projection, retaining fixed framing during clip changes.
