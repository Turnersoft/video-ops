---
videoOps: 1
scriptId: 06-empty-subset-theorem
title: 06_empty_subset_theorem
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: Textbook anchor

<!--
layout: math-focus
burn-captions: true
visual-notes: math-focus; textbook beat only.
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1

<!--
allow-script-change: false
-->

Open the book. Judson Abstract Algebra, section one point two, Sets.
### Visual notes

math-focus; textbook beat only.
math-board: Judson §1.2 — ∅ ⊆ S
- Textbook: Judson §1.2 Sets
- Definition: The empty set is a subset of every set.

## Beat 2

<!--
allow-script-change: false
-->

The empty set is a subset of every set.

## Beat 3

<!--
allow-script-change: false
-->

This is the bold definition we are formalizing today, which is one clip, one idea.

# Scene 2: Intuition

<!--
layout: beat-focus
burn-captions: true
visual-notes: Film presenter; beats on board.
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1

<!--
allow-script-change: false
-->

Vacuous truth: to show empty subset S, assume x in empty, which leads to contradiction.
### Visual notes

Film presenter; beats on board.
layer: chapter-beat

## Beat 2

<!--
allow-script-change: false
-->

Good first reductio proof in the chapter.

## Beat 3

<!--
allow-script-change: false
-->

We model as theorem for practice, not only as axiom.

# Scene 3: Lean vs Turn

<!--
layout: dual-panel
burn-captions: true
visual-notes: Compare layer; caption beats on both sides.
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1

<!--
allow-script-change: false
-->

Goal: Subset(EmptySet, S).
### Visual notes

Compare layer; caption beats on both sides.
compare leanTrack: tracks/scene-compare-lean4.json
compare turnTrack: tracks/scene-compare-turn.json

## Beat 2

<!--
allow-script-change: false
-->

Turn proof: unfold Subset, assume_not, use no_members.

## Beat 3

<!--
allow-script-change: false
-->

Lean: often bundled in library lemmas about empty.

## Beat 4

<!--
allow-script-change: false
-->

Clip focuses on statement shape, not full tactic replay.
