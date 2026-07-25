---
videoOps: 1
scriptId: 05-outline-to-proof-slide-breadcrumb
title: syntax_05_outline_to_proof_slide_breadcrumb
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: Big theorem, small target

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Big theorem, small target

<!--
duration: 8
allow-script-change: false
-->

Hi friends, welcome back.
Same `"basic set"` theorem in this chapter.
Last time we used the outline as a folder.
Today we click a leaf and proof-slide already knows which subproof we mean.
### Visual notes

Outline tree with `basic set` expanded → `p1` → `second` visible.
AppPage `/app` with outline panel open.

# Scene 2: Outline click → proof slide

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Outline click → proof slide

<!--
duration: 12
allow-script-change: false
-->

I click `second` under `p1`.
Proof-slide opens on that proof block — not the first identity, not the whole file.
The editor and the slide stay aligned on one claim.
### Visual notes

Click `second` → proof-slide shell opens → first tactic visible is from `second`'s proof (`unfold Intersect.def` or similar).
Show slide toggle if needed; one smooth click path.

# Scene 3: Breadcrumb from the language

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Breadcrumb from the language

<!--
duration: 12
allow-script-change: false
-->

Look at the top bar.
It does not just say "basic set."
It shows `basic set › p1 › second` — the path Turn-Lang exported from the source.
That breadcrumb travels with the proof; the UI does not reconstruct it by guessing.
### Visual notes

Proof-slide top bar `fullTitle` / breadcrumb segments. Optional: devtools or viz JSON snippet showing `nav_breadcrumb` array.
Point at `›` separator between segments.

# Scene 4: Step through with context

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Step through with context

<!--
duration: 10
allow-script-change: false
-->

As I step tactics forward, I always know which leaf I am lecturing on.
If I jump to `third`, the breadcrumb updates.
Students are not lost inside a fifty-line theorem.
### Visual notes

Next/Previous tactic → breadcrumb stable except when switching to another outline leaf.
Keep one theorem; do not tour the whole chapter.

# Scene 5: Close

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Close

<!--
duration: 6
allow-script-change: false
-->

So the outline is not just navigation in the editor.
It is the remote control for proof-slide on named claims.
### Visual notes

Outline + proof-slide side by side.
Short close.
