# Outdoor Post Workflow

Deno + TypeScript CLI for the phone teleprompter → desktop edit → Remotion pipeline.

```bash
cd video_ops/outdoor_post
deno task check
```

## 1. Export Phone Script JSON

From an edited `animation.json`:

```bash
deno task export-script sets-v2-04-set-equality
# or: deno run --allow-all main.ts export-outdoor-script sets-v2-04-set-equality
```

Output:

```text
video_ops/script_v2/sets-v2-04-set-equality/export/sets-v2-04-set-equality-outdoor-script.json
```

AirDrop that JSON to the phone and import it in the Expo app.

## 2. Film Outdoors

In the phone app:

- Use **manual mode** for casual delivery. The script follows you.
- Tap **Next** only when you actually finish the idea.
- Tap **Mark NG** immediately when a line goes bad.
- After recording, share the **Take JSON** back to the Mac.

The Take JSON contains slide-change timestamps and NG marker timestamps.

## 3. Analyze, Cut, and Generate Visual Plan

```bash
deno task ai-edit -- \
  --video /path/to/take.mp4 \
  --script video_ops/script_v2/sets-v2-04-set-equality/export/sets-v2-04-set-equality-outdoor-script.json \
  --take /path/to/take-manifest.json \
  --out-dir video_ops/script_v2/sets-v2-04-set-equality/export/outdoor-edit
```

If `OPENAI_API_KEY` is set, the script extracts audio and transcribes it with timestamps.

If you already have a Whisper verbose JSON transcript:

```bash
deno task ai-edit -- \
  --video /path/to/take.mp4 \
  --script /path/to/outdoor-script.json \
  --take /path/to/take-manifest.json \
  --transcript /path/to/transcript.verbose.json \
  --out-dir /path/to/outdoor-edit
```

Outputs:

- `audio.wav` — extracted mono 16k audio
- `transcript.verbose.json` — timestamped transcription
- `analysis.json` — transcript segments, bad intervals, good intervals
- `edited-good-intervals.mp4` — video cut to good intervals
- `remotion-visual-plan.json` — slide timeline after cuts (rough; see step 4)

## 4. Align Spoken Words to Script Beats

After cutting, align the edited take to `animation.json` beats using word-level timestamps:

```bash
deno task align sets-v2-04-set-equality -- \
  --edit-dir video_ops/script_v2/sets-v2-04-set-equality/export/outdoor-edit-take-mrbtjdup
```

Add `--retranscribe` to force a fresh word-level Whisper pass.

Outputs:

- `transcript.verbose.json` — word-level timestamps (`words[]`)
- `speech-alignment.json` — beat boundaries from script↔speech DP alignment
- `remotion-visual-plan.json` — slide timeline from alignment (schema v2)
- `animation-outdoor.json` — beat `durationSeconds` extended to match your spoken take
- `caption-zh-translations.json` — cached EN→ZH for each Whisper caption sentence

Chinese burned captions translate **each spoken Whisper sentence** offline (not `animation.md` sayZh). With `npm run outdoor:all`, a local server on `:8790` uses the IndexTTS Python venv (`~/index-tts/.venv`) and `Helsinki-NLP/opus-mt-en-zh`. One-time model download: run outdoor:all once online, or set `HF_HUB_OFFLINE=0`.

Optional env:

- `CAPTION_TRANSLATE_URL` — default `http://127.0.0.1:8790`
- `CAPTION_TRANSLATE_PYTHON` — default `~/index-tts/.venv/bin/python`
- `CAPTION_TRANSLATE_PROVIDER=openai` — cloud fallback (needs `OPENAI_API_KEY`)

## Voice clone (VoxCPM2)

`npm run outdoor:all` also starts a local VoxCPM server on `:8791` for voice cloning experiments (separate from filmed outdoor audio and from IndexTTS studio exports).

First run (one-time, needs network):

```bash
npm run setup:voxcpm
# or: bash bin/setup-voxcpm.sh
```

Clone API (model loads on first `/clone` request; weights download once):

```bash
curl -s http://127.0.0.1:8791/health

curl -s -X POST http://127.0.0.1:8791/clone \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Set equality is mutual subset.",
    "referenceAudioPath": "projects/.../takes/take-xxx/source.webm",
    "outputPath": ".cache/voxcpm-output/test-clone.wav"
  }'
```

For best clone quality, pass `"promptWavPath"` + `"promptText"` (transcript of the reference clip) and optionally `"referenceAudioPath"` (ultimate clone mode).

Optional env:

- `VOXCPM_URL` — default `http://127.0.0.1:8791`
- `VOXCPM_ROOT` — default `~/VoxCPM` (repo + `.venv`)
- `VOXCPM_MODEL` — default `openbmb/VoxCPM2`
- `VOXCPM_DEVICE` — `auto` | `mps` | `cpu` | `cuda`
- `VOXCPM_INFERENCE_TIMESTEPS` — default `10` (lower for speed, raise for quality)
- `VOXCPM_CFG_VALUE` — default `2.0`
- `VOXCPM_REFERENCE_MAX_SECONDS` — default `0` (full reference; set 3–120 to trim)
- `VOXCPM_TEXT_CHUNK_MAX_CHARS` — default `0` (no chunking; set 40–400 to split long lines)
- `VOXCPM_SYNTHESIS_CONCURRENCY` — parallel sentence queue on the agent (default `1`)
- `OUTDOOR_SKIP_VOXCPM=1` — skip server in `outdoor:all`

## Voice clone (IndexTTS-2)

Faster local alternative to VoxCPM for **English** narration. Use **VoxCPM** for Chinese (`中文`) lines. In the beat editor toolbar, use the **Voice** toggle (**IndexTTS** vs **VoxCPM**). Each engine keeps its own preview cache under `.cache/voxcpm-script/` and `.cache/indextts-script/`.

`npm run outdoor:all` starts IndexTTS on `:8792` when `~/index-tts/.venv` and `~/index-tts/checkpoints` exist (same checkout used for caption translate).

```bash
curl -s http://127.0.0.1:8792/health

curl -s -X POST http://127.0.0.1:8792/clone \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Set equality is mutual subset.",
    "referenceAudioPath": "projects/.../takes/take-xxx/source.webm",
    "outputPath": ".cache/indextts-output/test-clone.wav"
  }'
```

Optional env:

- `INDEX_TTS_URL` — default `http://127.0.0.1:8792`
- `INDEX_TTS_ROOT` — default `~/index-tts`
- `INDEX_TTS_DEVICE` — `auto` | `mps` | `cpu` | `cuda`
- `INDEX_TTS_REFERENCE_MAX_SECONDS` — default `12`
- `OUTDOOR_SKIP_INDEX_TTS=1` — skip server in `outdoor:all`

## 5. Render Outdoor Portrait + Landscape

```bash
cd video_ops/remotion
npm run render:outdoor -- sets-v2-04-set-equality \
  --edit-dir ../script_v2/sets-v2-04-set-equality/export/outdoor-edit-take-mrbtjdup \
  --format both
```

Portrait layout: you (top 1/3), Turn editor (middle), Lean editor or Turn render (bottom 1/3 when Turn is in focus).

Landscape layout: full compare frame with your video cropped into the Lean render pane (bottom-left).

## How NG Cutting Works

The pipeline cuts intervals from two signals:

- manual **Mark NG** timestamps from the app
- spoken phrases such as `ng`, `again`, `restart`, `redo`, `cut this`

The first version intentionally keeps this simple. The important part is the timestamp structure:

```json
{
  "badIntervals": [{ "start": 12.3, "end": 18.7, "reason": "manual NG marker: NG" }],
  "goodIntervals": [{ "start": 0, "end": 12.3 }, { "start": 18.7, "end": 91.2 }],
  "visualTimeline": [
    {
      "slideId": "beat-01",
      "sourceStart": 0,
      "sourceEnd": 12.3,
      "editedStart": 0,
      "editedEnd": 12.3
    }
  ]
}
```

Remotion should consume `remotion-visual-plan.json` to render visuals against the final edited video instead of the original script timings.

## Why This Solves the Outdoor Problem

The script does not force timing while filming. You lead, and the phone records slide events. The AI/post pipeline later uses the actual take timeline to cut mistakes and rebuild visuals around the final spoken video.
