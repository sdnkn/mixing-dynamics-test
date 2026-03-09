# Mixing Dynamics Test

## Commands
```bash
npx live-server --port=5555   # dev server
```

## Architecture
- Vanilla JS, IIFE pattern, no frameworks
- Tone.js for audio: processing (Compressor, MultibandCompressor, Gain, Waveform, Meter), playback (Player, Buffer)
- Real audio files in audio/ (mp3 192kbps, ~12s loops)
- All data in data/*.js as global JS objects
- Single-page app with screen switching via JS
- 7 question types: theory, detection, matching, identify, multiband, sidechain, fix_mix
- 17 questions total (beginner/intermediate/advanced)
- Notched knobs mode for fixed-value compressor controls
- 1176-style ratio buttons (4, 8, 12, 20)
- Real-time gain compensation for A/B comparison
