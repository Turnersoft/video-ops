---
videoOps: 1
scriptId: 03-reject-a-false-premise
title: pitfalls_03_reject_a_false_premise
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: The trap

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1

<!--
duration: 14
allow-script-change: false
-->

Hi friends, welcome back. This is Turner.
Homework says: let g be the inverse of f, and prove something about g.
Sounds normal.
But what if f is not invertible?
On paper you might still write g and hope the grader looks away.
You are not stuck because you are bad at proofs.
You are stuck because the exercise smuggled in a false premise.
### Visual notes

Homework line: “Let g be the inverse of f.” Under it, a map that fails invertibility (e.g. f(x)=x² on ℝ→ℝ) — one picture, no lecture.
Empathy first. No product UI yet.

# Scene 2: The honest move

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1

<!--
duration: 12
allow-script-change: false
-->

The honest move is not to force a proof.
It is to name what the question assumed.
Invertible is not a vibe — it means an inverse actually exists with the right laws.
If f does not have one, every line after “let g” is built on air.
### Visual notes

Short checklist: premise stated? → premise true? → only then prove.
Keep abstract. One flowchart, three boxes.

# Scene 3: Turn receipt

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1

<!--
duration: 14
allow-script-change: false
-->

In Turn-Lang, invertible is a real property on the function — not a comment you can paste in.
It says there exists an inverse structure, and that structure has laws to check.
Try to use invertible on a map that does not qualify, and the checker will not let you treat the assumption as free.
That is the point: catch the bad premise before you “prove” nonsense.
### Visual notes

`Function.invertible` property and `exists InverseFunction<self>` in the chapter file.
Link to pitfalls-05 for depth; here only show that invertible is checkable.

pip: shared/reference/turn-workspace.mp4 (bottom-right, widthFraction=0.44, startFrom=0)

# Scene 4: Close

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1

<!--
duration: 6
allow-script-change: false
-->

Formal method is not only proving theorems.
Sometimes it is saying: this question assumed too much.
Comment a homework problem that felt ill-posed. Link to the chapter in the description.
### Visual notes

Return to `invertible` line in outline.
Warm CTA. No dev tooling on screen.

pip: shared/reference/turn-workspace.mp4 (bottom-right, widthFraction=0.44, startFrom=12)
