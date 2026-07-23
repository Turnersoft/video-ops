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
