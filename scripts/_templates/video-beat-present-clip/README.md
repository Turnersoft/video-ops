# Video beat templates

Starter scripts for presenting bundled video clips inside Remotion beats.

## `video-beat-present-clip`

Authoring source: `scripts/_templates/video-beat-present-clip/animation.md`

Compiled output and named video-overlay resource: `animation.json`

Copy this folder when you want a beat that shows another MP4 instead of (or beside) compare panes.
Edit the Markdown and run `npm run sync` from `remotion/`.

### Patterns

| Pattern | animation.md syntax | Render behavior |
|---------|---------------------|-----------------|
| Inline beat video | `### Video` + asset path | Replaces compare pane for that beat |
| Named overlay video | beat `<!-- overlay: name -->` | Resolves the named resource retained in `animation.json` |
| Full-scene video | scene `presentation.src` directive | Main layer is only the clip |
| Outdoor full filmed take | beat `presenter: full-clip` directive | Portrait letterboxes presenter at full width |
| Scene default outdoor framing | `outdoorEdit.presenterMode: "full-clip"` | All beats unless beat overrides |

### Assets

Place clips relative to the script folder, e.g. `assets/demo-clip.mp4`.

### Editor comments (editor only)

Per beat in `animation.md`:

```markdown
## Beat 1
<!-- allow-script-change: false -->

Shorten the Lean explanation. <!-- comment: audience already knows subsets -->
```

Comments can also sit on their own line, inside Lean/Turn fences, or as multi-line `<!-- comment: ... -->` blocks. Saved from the Video Editor teleprompter panel. Never burned on export.

### Outdoor presenter modes

- `split-crop` (default) — top third cropped presenter + compare below
- `full-clip` — entire landscape take visible at full width (letterboxed)

Set on a beat:

```markdown
## Beat 1
<!-- presenter: full-clip -->

This beat shows the full filmed take.
```

Or as scene default under `outdoorEdit.presenterMode`.
