# animation.json v4 — animated PPT beats

**Version 4** treats each beat like a slide: you paste the **exact code** to show, list **highlights** (plain-text needles), and optional **hints**. No viewports, no goal steps, no source line numbers.

v3 (viewport/editor/goal) and v2 still expand at load time. `npm run sync` compiles v4 beats → track JSON for Remotion.

For direct script authoring, use [`animation.md`](./animation-markdown-language.md). When that file exists beside `animation.json`, sync treats the Markdown as the beat source and regenerates v4 JSON while preserving recording alignment and named scene resources.

## Top-level shape

```json
{
  "version": 4,
  "scriptId": "sets-v2-01-set-60s",
  "composition": { "format": "landscape", "fps": 30, "width": 1920, "height": 1080 },
  "scenes": [
    {
      "index": 1,
      "durationSeconds": 120,
      "layout": "dual-panel",
      "teleprompter": { "position": "below-canvas" },
      "compare": {
        "display": { "editorFontScale": 0.7 },
        "blocks": {
          "turn-set-intro": {
            "turn": { "code": "structure[T] Set<T: Any> {\n}" }
          }
        },
        "overlays": {
          "textbook-p1": {
            "type": "textbook",
            "aataExcerpt": "sets-set-theory-p1",
            "placement": "center"
          }
        },
        "beats": [ /* see below */ ]
      }
    }
  ]
}
```

## One beat = one slide

| Field | Purpose |
|-------|---------|
| `say` | Teleprompter line |
| `durationSeconds` | How long this slide stays up |
| `visualNotes` | Filming / editor note for this beat, or `"as before"` to reuse the previous beat's note |
| `lean` | Lean editor pane (optional) |
| `turn` | Turn editor pane (optional) |
| `overlay` | Key into `compare.overlays` (optional) |
| `presenter` | Outdoor portrait framing: `split-crop` (default) or `full-clip` (letterboxed full take) |
| `video` | Inline video clip for this beat — `{ src, objectFit?, label? }` |
| `comment` | Editor-only AI improvement comment (not exported) |
| `allowScriptChange` | When `false`, AI must not rewrite this beat's `say` (default `true`) |

### Pane (`lean` / `turn`)

| Field | Purpose |
|-------|---------|
| `code` | **Exact text** shown in the editor, or `"as before"` to reuse the previous beat's code on this pane (lean and turn carry separately) |
| `ref` | Reuse `compare.blocks[ref].lean.code` or `.turn.code` instead of inline `code` |
| `highlights` | Plain strings — **every occurrence** in `code` glows yellow |
| `hints` | Hover callouts (`target`, `needle`, `text`, optional `layout`) |

### Example beat

```json
{
  "say": "Then fun n fat-arrow is Lean's anonymous function…",
  "durationSeconds": 20,
  "lean": {
    "code": "def oddIntegers : Set Int :=\n  fun n => n % 2 = 1",
    "highlights": ["fun n =>", "n % 2"],
    "hints": [
      {
        "target": "lean-code",
        "needle": "fun n =>",
        "text": "Fat arrow => is lambda; thin → is function type."
      }
    ]
  },
  "turn": {
    "code": "structure[T] Set<T: Any> {\n}",
    "highlights": ["structure", "Set"]
  }
}
```

### Reuse code with `"as before"`

When only `highlights` or `hints` change, avoid pasting the same block again:

```json
{
  "say": "Same Lean file on screen — glow moves to Prop.",
  "durationSeconds": 8,
  "lean": {
    "code": "as before",
    "highlights": ["Prop"]
  },
  "turn": {
    "code": "as before",
    "highlights": ["Set"]
  }
}
```

Lean and Turn each keep their own “previous code” chain. The first beat on a side cannot use `"as before"` (there is nothing to reuse yet).

### Per-beat visual notes

Same `"as before"` chain as pane `code` — use it when only highlights change but filming direction stays the same (e.g. Turn pane `as before` for many beats):

```json
{
  "say": "Same Turn block — glow moves on Lean.",
  "durationSeconds": 12,
  "visualNotes": "as before",
  "lean": { "code": "…new lean snippet…", "highlights": ["LT"] },
  "turn": { "code": "as before", "highlights": [] }
}
```

On expand to v2, resolved notes land in `director.beatVisualNotes[]` (aligned with `say`).

## Resources outside beats

- **`compare.blocks`** — reusable code snippets. Reference with `lean.ref` / `turn.ref`.
- **`compare.overlays`** — named overlays (textbook paper, bundled video, etc.). Reference with beat `overlay`.
  - `type: "textbook"` — AATA paper card
  - `type: "video"` — `{ src, objectFit?, label? }` presented during beats that reference the overlay
- **`layers: [{ type: "video-clip" }]`** — whole-scene video presentation (see `scripts/_templates/video-beat-present-clip/`).

## Timing

- Each beat `durationSeconds` is **recomputed from `say` text** on `npm run sync` and when saving a beat in Remotion Studio.
- Pace is **per script** via `teleprompter.pace.syllablesPerSecond` (or `wordsPerSecond`), optional `script.md` header `Pace: 3.5 syllables/s`, or script-id defaults (`sets-v2-*-60s` vs long-form).
- **`paceFactor`** multiplies each computed beat after syllable/word timing (e.g. `1.25` = +25% headroom for slower delivery or editing). Formula per beat: `max(minBeatSeconds, round((syllables / syllablesPerSecond + pauseAfterBeat) × paceFactor))`.
- Scene `durationSeconds` = sum of beat `durationSeconds`.
- Render uses cumulative `sayTimings` internally.

```json
"teleprompter": {
  "position": "below-canvas",
  "pace": {
    "syllablesPerSecond": 3.6,
    "pauseAfterBeat": 0.4,
    "minBeatSeconds": 4,
    "paceFactor": 1.25
  }
}
```

Batch recompute without full sync:

```bash
npx tsx tooling/recomputeAnimationBeatDurations.ts
npx tsx tooling/recomputeAnimationBeatDurations.ts sets-v2-01-set-60s
```

## Derived files (sync)

| Output | From |
|--------|------|
| `tracks/scene-compare-lean4.json` | `beatCodeSegments` + hint caption beats |
| `tracks/scene-compare-turn.json` | same for Turn pane |
| `social-posts.json` | `script.md` header — optional `Social title (English)` / `Social title (China)`, plus `Promotional description` → per-platform copy with Lean/formal-math tags |
| `export/.gitignore` | ensures rendered MP4s stay local (`*.mp4`) |

## Export video

```bash
cd video_ops/remotion && npm run render:script -- sets-v2-01-set-60s
```

Writes `video_ops/script_v2/sets-v2-01-set-60s/export/sets-v2-01-set-60s.mp4` (not `remotion/out/`).

Every export appends a **6s series outro** (`SeriesOutroCard`) with homepage + waitlist links. Social post bodies in `social-posts.json` omit URLs — links live in the video outro only.

## Voice-aligned edited export (IndexTTS-2 voice clone + bilingual sentence captions)

Two timing worlds, one `animation.json`:

- **Canonical file (editor / teleprompter):** beat `durationSeconds` stay at teleprompter pace (recomputed by sync) so you can read along in Remotion Studio / Video Editor.
- **Edited export:** `render-edited.mjs` temporarily injects audio-calibrated durations + sentence caption segments, renders, then restores the canonical file.

Pipeline (index-tts checkout at `~/index-tts`):

```bash
# 1. (once) build a voice bank from your recordings — timbre refs, emotion ref, natural pause length
cd ~/index-tts && uv run python build_voice_bank.py --videos "/Users/johndoe/Movies/turn-lang videos" --out refs/bank

# 2. synthesize per-sentence cloned narration for a script
uv run python gen_beats.py --device cpu \
  --animation <script-dir>/animation.json --script-dir <script-dir> \
  --ref refs/bank/ref-00.wav --bank refs/bank

# 3. render the edited export (canonical animation.json untouched afterwards)
cd video_ops/remotion && npm run render:edited -- <script-id>
```

- `gen_beats.py` splits each beat's `say` into sentences, synthesizes each with IndexTTS-2 (friendly baseline emotion vector; optional one-word tags), trims leading/trailing silence, compresses awkward mid-sentence pauses, joins with your measured natural pause, and writes `export/voice/beat-NN.wav` + `export/voice-manifest.json` (v2, with per-sentence timings). `animation.json` is not modified.

### Emotion tags (in `say` / `script-clean.md`)

Put a tag **immediately before one word** — only that word gets a barely perceptible tone nudge; everything else stays on the same friendly baseline. Tags are stripped from burned captions; they stay in the teleprompter as stage directions.

| Tag | Use when | Voice color |
|-----|----------|-------------|
| `[spark]` | one word gets a whisper of lift | +0.2% happy, +0.3% surprised |
| `[warm]` | one word is a small payoff | +0.2% happy |
| `[flat]` | one Lean/formal word feels drier | barely flatter |
| `[got]` | one word quietly lands | tiny nod |
| `[ease]` | one word extra relaxed | +0.3% calm |

Example: `Set equality is not a [spark]new container.` — only “new” shifts; you should barely notice.

### Linked phrases (continuation prosody)

Related words that should sound like **one breath** (e.g. `extensionality lemma`, `mutual subset`, `theorem Set dot ext_iff`) are auto-detected and synthesized as a single flat chunk so the first word does not rise before the second.

Optional explicit link: `extensionality~lemma` (caption shows a space; TTS reads them connected).

Re-running `gen_beats.py --reuse-sentences` re-synthesizes sentences when raw `say` text, `emoProfile`, or `prosodyProfile` changes.
- `render:edited` injects `voiceEdit.{beatVoiceSrc,beatDurationsSeconds,captionSegments}` + audio-true beat durations, renders, restores the pace-based file, and renames the output to `export/<slug>-edited.mp4`.
- Burned captions in the edited export show **one sentence at a time** (English + `sayZh`-aligned Chinese), timed to the synthesized audio; sync respects `beatDurationsSeconds` and never re-paces an injected scene.
- Legacy Jianying flow (`tooling/prepareVideoOpsVoiceEdit.ts`) still exists for drafts with `textReading/*.wav`.

## Migration from v3

```bash
node tooling/migrateAnimationV3ToV4.mjs video_ops/script_v2/sets-v2-01-set-60s/animation.json
cd video_ops/remotion && npm run sync
```

Reference: `video_ops/script_v2/sets-v2-01-set-60s/animation.json`
