---
videoOps: 1
scriptId: template-video-beat-present-clip
title: Template — present other videos in beats
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: Inline and overlay video beats
<!--
layout: dual-panel
teleprompter.position: below-canvas
pace.syllables-per-second: 3.4
pace.pause-after-beat: 0.35
pace.min-beat-seconds: 6
pace.pace-factor: 1.1
display.editor-font-scale: 0.72
-->

## Overlay: demo-clip
<!--
type: video
src: assets/demo-clip.mp4
object-fit: contain
label: Reference clip
-->

## Beat 1: Normal compare beat

Here is a compare beat — Lean and Turn side by side as usual.

### Lean
```lean
example : Nat := 1
```

Highlights:
- `Nat`

### Turn
```turn
example : Nat = 1
```

Highlights:
- `Nat`

## Beat 2: Inline video

This beat presents another video inline — drop your MP4 under assets/.

### Video
assets/demo-clip.mp4
<!-- object-fit: contain; label: Inline video beat -->

<!-- comment: Tighten the hook; keep jargon minimal. -->
<!-- allow-script-change: true -->

## Beat 3: Named video overlay
<!-- overlay: demo-clip -->

You can also reference a named overlay video resource.

# Scene 2: Full-scene video
<!--
layout: beat-focus
teleprompter.position: below-canvas
presentation.src: assets/demo-clip.mp4
presentation.object-fit: contain
presentation.label: Full-scene video
-->

## Beat 1: Present the clip

Scene two uses a video-clip presentation — the whole slide is the clip.
