# Turn Video Kit

Universal Remotion components for **math explainers** (3Blue1Brown-style) and **coding tutorials** (IDE + terminal), built around Turn-Lang's real math renderer.

## Layout presets

| Preset | Use case | Main content |
|--------|----------|--------------|
| `dual-panel` | Coding tutorial default | Source + Render (`turn-ide`) |
| `presenter-dual` | Screencast + face cam | dual-panel + PiP column |
| `math-focus` | Full-board math | `math-board` (dark GoalRows) |
| `title-full` | Hook / chapter / outro | `title-card` |
| `beat-focus` | Single idea beat | `chapter-beat` |
| `code-focus` | Terminal / CLI demos | `terminal` |

Set explicitly on a scene, or let `inferLayoutPreset()` pick from the main layer type.

```json
{
  "index": 1,
  "layout": "title-full",
  "layers": [{ "type": "title-card", "title": "Partitions", "subtitle": "Reuse the definition" }]
}
```

## Layer types

### Coding (tutorial)

| Layer | Purpose |
|-------|---------|
| `turn-ide` | Turn source typing + knowledge/proof render (primary) |
| `lean4` | Lean 4 source typing + static goal infoview |
| `turn-code` | Inline snippet without track file |
| `terminal` | Shell output typing animation |

### Math (3b1b-style)

| Layer | Purpose |
|-------|---------|
| `math-board` | Dark full-width board; loads knowledge export JSON |
| `title-card` | Hook / chapter title on gradient board |
| `chapter-beat` | One idea + optional `emphasis` highlight |
| `screen-text` | Legacy authoring → maps to `chapter-beat` |

### Production

| Layer | Purpose |
|-------|---------|
| `pip` | Screen recording column |
| `talking-head` | Presenter video (`background` or PiP) |
| `caption` | Burned-in subtitles (`burnCaptions: true` uses `director.say`) |

## Examples

### Hook (3b1b)

```json
{
  "layout": "title-full",
  "durationSeconds": 5,
  "layers": [{
    "type": "title-card",
    "title": "What is a partition?",
    "subtitle": "Four laws you only define once",
    "variant": "hook"
  }]
}
```

### Math board with exported laws

```json
{
  "layout": "math-focus",
  "layers": [{
    "type": "math-board",
    "heading": "Partition laws",
    "exportPath": "tracks/scene-2-knowledge.json",
    "reveal": "sequential",
    "beats": [
      { "atSeconds": 0, "label": "Nonempty" },
      { "atSeconds": 2, "label": "Subset" },
      { "atSeconds": 4, "label": "Disjoint" },
      { "atSeconds": 6, "label": "Cover" }
    ]
  }]
}
```

### Coding tutorial + captions

```json
{
  "burnCaptions": true,
  "layers": [
    { "type": "turn-ide", "track": "tracks/scene-2-ide.json" },
    { "type": "pip", "src": "reference/demo.mp4" }
  ]
}
```

### Terminal demo

```json
{
  "layout": "code-focus",
  "layers": [{
    "type": "terminal",
    "prompt": "$",
    "charsPerSecond": 30,
    "lines": [
      "turn proof check partition.turn",
      "✓ all obligations discharged"
    ]
  }]
}
```

## Architecture

```
VideoFromScript
  └─ SceneComposer          ← layout + overlays + captions
       ├─ LayoutShell
       ├─ MainLayerRenderer  ← layer type → component
       ├─ PresenterColumn    ← pip / talking-head
       └─ BurnedCaption      ← export subtitles
```

Components live in `src/components/universal/`. Registry logic in `src/video-kit/`.

## Director vs export

- `director.say` — teleprompter in Studio (`showDirector: true`)
- `burnCaptions: true` or `caption` layer — burned into MP4
