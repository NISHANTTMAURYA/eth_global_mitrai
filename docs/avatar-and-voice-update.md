# Avatar and voice update — 6 November 2026

Spoken bubbles now appear at the AudioBufferSource start, after synthesis, alignment and decoding, rather than before the audio request. A preparing-voice indicator explains buffering. Muted replies appear as text. Voice preparation failures reveal the text and surface the error. Generation cancellation prevents an old request from revealing a stale reply. The existing eight-second message batching window remains in place.

Audio is encoded from the original WAV, preserving its quality; the resampled analysis WAV is only used for Rhubarb alignment. A live Sarvam Bulbul v3 request was verified to return real MP3 audio and eleven mouth cues for a 1.7-second test phrase. Browser audio permission still depends on user activation; the send/speaker interaction resumes Web Audio. This is buffered speech, not streaming TTS.

Added Vivi (girl) and Sakurada Fumiriya (boy), VRoid beta sample avatars from the madjin/vrm-samples mirror. Each exact downloaded file embeds a CC0 license, permission for commercial use, 54 humanoid bone mappings and bound A/I/U/E/O mouth shapes. Source and license are recorded beside the models in public/models/vrm/README.md. The avatars are in discovery and creation with distinct default voices.

VRM model detection now uses the model catalog instead of a single hard-coded human ID. VRM 0 avatars receive orientation conversion and the appropriate relaxed-arm pose. Detail rendering uses a higher pixel ratio, reduced lighting and a close portrait camera coordinated with orbit controls. A Full body / Face view toggle is available. Orbit receives the same presentation improvements without changing its character identity or memories.

Sources:
- Avatar files and license notes: https://github.com/madjin/vrm-samples
- CC0: https://creativecommons.org/publicdomain/zero/1.0/
- Browser autoplay rules: https://developer.chrome.com/blog/autoplay

Validation: embedded license/bone/morph tests, existing motion and batching tests, real local speech tests, TypeScript and production build. Live Sarvam synthesis succeeded. Vivi and Fumiriya were visually inspected in the browser. No exhaustive cross-browser or acoustic listening assessment was performed.
