# animation.md — VideoOps Markdown language

`animation.md` is the human-authored source for a Remotion video. `npm run sync` compiles it into v4 `animation.json`, then the existing v4 compiler produces Lean, Turn, goal, and hint-layout tracks.

The language is intentionally small:

- `# Scene` starts a scene.
- `## Beat` starts a timed script beat.
- Plain lines are the exact spoken script, one teleprompter row per line.
- `### Lean` and `### Turn` contain exact fenced source code.
- `### Hint` creates a hint panel. Its trailing HTML comment identifies the target, code needle, and position.
- `### Chinese`, `### Visual notes`, and `### Video` map directly to v4 beat fields.
- `<!-- comment: ... -->` carries editor notes anywhere in a beat.
- Other HTML comments carry settings that should not be spoken or rendered as Markdown.

## Minimal file

````markdown
---
videoOps: 1
scriptId: demo-equality
title: Equality
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: Equality
<!--
layout: dual-panel
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
display.editor-font-scale: 0.7
-->

## Beat 1: The hook
<!-- focus: both -->

Hi friends, welcome back.
Today, let's work out what this equals sign actually means.

### Lean
```lean
example (n : Nat) : n + 0 = n := rfl
```

Highlights:
- `rfl`

### Hint
Both sides reduce to the same term.
<!-- target: lean-code; needle: rfl; position: 18,38 -->

### Turn
```turn
relation SetEq(T: Any, A B: Set<T>): Prop {
    |- {
        Subset(A, B);
        Subset(B, A);
    }
}
```

Highlights:
- `SetEq`
- `Subset(A, B)`

### Chinese
大家好，欢迎回来。今天我们来看看这个等号到底是什么意思。

### Visual notes
Open on both panes, then point at rfl.

<!-- comment: Keep the opening conversational. -->
<!-- allow-script-change: true -->
````

## Editor comments

Use `<!-- comment: ... -->` for beat-level editor notes. They compile to `beat.comment` in `animation.json` and never appear in the rendered video.

Comments can sit anywhere in a beat:

````markdown
## Beat 2
<!-- allow-script-change: true -->

First spoken line. <!-- comment: tighten the hook -->

### Lean
```lean
example : Nat := 1
<!-- comment: keep this minimal -->
```

### Visual notes
Point at rfl.

<!-- comment:
Multi-line notes are fine.
Use them for rewrite guidance.
-->
````

Multiple comments in one beat are merged in source order, separated by blank lines.

Legacy `### Comment` sections still compile, but prefer inline `<!-- comment: ... -->` blocks.

`allow-script-change` belongs in the beat directive comment near the `## Beat` heading, or anywhere else in the beat body.

## Spoken script

Text directly below a `## Beat` heading is the narration:

````markdown
## Beat 2

This is the first teleprompter row.
This is the second teleprompter row.
````

The compiler writes those lines as:

```json
{
  "say": "This is the first teleprompter row.\nThis is the second teleprompter row."
}
```

Use ordinary lines, not Markdown bullets, for spoken text. Emotion tags such as `[spark]word` and linked phrases such as `extensionality~lemma` pass through unchanged.

You may use an explicit `### Script` section instead, but not both forms in one beat.

## Lean and Turn panes

Each pane accepts one fenced code block:

````markdown
### Lean
```lean
example : ((2 : Nat) : Int) = (2 : Int) := rfl
```

Highlights:
- `Nat`
- `Int`
````

Code is copied exactly. The compiler does not reindent, format, or reinterpret Lean or Turn syntax.

Use `as before` when a pane keeps the previous beat's code:

````markdown
### Lean
```lean
as before
```

Highlights:
- `Set.ext`
````

The first pane of either language cannot use `as before`.

A reusable block already declared in `animation.json` can be referenced without a fence:

```markdown
### Lean
<!-- ref: shared-lean-definition -->

Highlights:
- `Set`
```

The compiler checks that every code highlight occurs in the resolved code.

Pane lists supported today are:

```markdown
Highlights:
- `needle in editor code`

Goal:
- `needle in the Lean goal panel`

Knowledge:
- `needle in the Turn knowledge panel`
```

## Hint panels and positions

A hint is a Markdown subsection:

```markdown
### Hint
The textbook sentence becomes two proof obligations.
<!-- target: turn-code; needle: Subset(A, B); position: 82,38 -->
```

Supported targets:

- `lean-code`
- `lean-goal`
- `turn-code`
- `turn-knowledge`

`position` is a percentage pair, `x,y`, measured in the compare overlay. The optional four-value form also stores the highlighted-code anchor:

```markdown
<!-- target: lean-code; needle: rfl; position: 18,38,20,40 -->
```

If `target` is omitted, a hint immediately following `### Lean` defaults to `lean-code`, and one immediately following `### Turn` defaults to `turn-code`.

The compiler rejects a hint needle that does not occur in its target.

## Beat directives

Beat settings live in an HTML comment immediately below the beat heading:

```markdown
## Beat 3
<!--
focus: lean
overlay: textbook-definition
presenter: full-clip
script-fullscreen: true
pip-shape: circle
pip-size: 0.22,0.30
pip-position: 0.04,0.58
pip-scale: 1.4
allow-script-change: false
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->
```

Supported directives:

- `focus`: `lean`, `turn`, or `both`
- `overlay`: key from the scene's existing `compare.overlays`
- `presenter`: `split-crop` or `full-clip` — filmed take as small pip vs letterboxed full width
- `script-fullscreen`: `true` or `false` — when `true`, Lean/Turn compare fills the frame and the filmed take stays in the adjustable pip mask
- `pip-shape`: `circle` or `rectangle`
- `pip-size`: `width,height` — normalized mask box size (e.g. `0.28,0.38`)
- `pip-position`: `x,y` — normalized top-left of the mask box
- `pip-scale`: zoom inside the mask (default `1.28`)
- `pip-crop`: `objectX,objectY` — focal point inside the filmed clip (0–1)
- `allow-script-change`: `true` or `false`
- `font.editor`, `font.lean`, `font.render`: positive scale numbers
- `font-scales: as before`
- `duration: auto` or a positive number; sync normally recomputes duration from narration

## Named overlays

Declare textbook or video overlay resources before the scene's first beat:

```markdown
## Overlay: textbook-definition
<!--
type: textbook
aata-excerpt: sets-set-equality-definition
placement: center
-->

## Overlay: reference-clip
<!--
type: video
src: assets/demo-clip.mp4
object-fit: contain
label: Reference clip
-->
```

Activate one from a beat directive:

```markdown
## Beat 2
<!-- overlay: textbook-definition -->
```

## Video beats

An inline video uses a subsection:

```markdown
### Video
assets/demo-clip.mp4
<!-- object-fit: contain; label: Reference clip -->
```

For a whole-scene video presentation, put this in the scene comment:

```markdown
<!--
layout: beat-focus
presentation.src: assets/demo-clip.mp4
presentation.object-fit: contain
presentation.label: Full-scene video
-->
```

## Scene directives

Scene settings belong in one comment after `# Scene` and before the first beat:

```markdown
# Scene 1: Set equality
<!--
layout: dual-panel
burn-captions: true
visual-notes: Six animated beats.
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
display.editor-font-scale: 0.7
display.lean-editor-font-scale: 0.8
display.render-font-scale: 0.85
-->
```

Multiple scenes are written as multiple `# Scene N` sections. Scene and beat numbers must be sequential.

## Compiled and preserved data

`animation.md` owns the beat script, pane code, highlights, hints, videos, editor comments, and beat presentation directives.

Remotion renders compare scenes from the compiled beat data (`compiledTracks` built at expand time). You do **not** need a `tracks/` folder for markdown-authored videos — edit only `animation.md`. Sync still writes a derived `animation.json` cache for hot reload metadata; treat that file as generated.

The Markdown compiler also retains these non-script resources from an existing v4 `animation.json` when present:

- named `compare.blocks`
- older named `compare.overlays` that are not replaced by Markdown
- cover configuration
- `voiceEdit` and `outdoorEdit` recording alignment

This lets a script move to Markdown without discarding recorded takes or draggable editor data. If recorded beat-duration arrays no longer match the Markdown beat count, compilation fails instead of silently misaligning the video.

When `animation.md` exists, it replaces `script-clean.md` as the narration source for that script. Older scripts without `animation.md` continue using the existing JSON and `script-clean.md` workflow. Hint drag positions write back into `animation.md` hint comments — not into `tracks/`.

## Compile and verify

```bash
cd video_ops/remotion
npm run sync
```

Studio and every render run sync during preparation, so they compile `animation.md` before loading `animation.json`.

While Studio is open, saving `animation.md` triggers a debounced rebuild of only that script. Studio edits to spoken lines, editor comments, script-change permission, per-beat font scales, and dragged hint positions are also written back into the Markdown source.

The compiler reports line-numbered errors for:

- malformed frontmatter
- unknown directives or subsections
- skipped scene or beat numbers
- invalid enums, booleans, scales, and hint positions
- missing code-block or overlay references
- `as before` without previous code
- highlights and hint needles absent from their rendered target
- beat-count changes that would invalidate recorded timing arrays
