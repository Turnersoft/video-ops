---
videoOps: 1
scriptId: 09-disjoint
title: 09_disjoint
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
math-board: Judson §1.2 — Disjoint
- Textbook: Judson §1.2 Sets
- Definition: A and B are disjoint if A ∩ B = ∅.

## Beat 2

<!--
allow-script-change: false
-->

A and B are disjoint if A ∩ B = ∅.

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

Two sets with no order, so this cannot be a constructor.
### Visual notes

Film presenter; beats on board.
layer: chapter-beat

## Beat 2

<!--
allow-script-change: false
-->

Relation: intersection equals empty.

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

Textbook: no common elements.
### Visual notes

Compare layer; caption beats on both sides.
compare leanTrack: tracks/scene-compare-lean4.json
compare turnTrack: tracks/scene-compare-turn.json

## Beat 2

<!--
allow-script-change: false
-->

Turn: Disjoint as SetEq(Intersect(A,B), EmptySet).

## Beat 3

<!--
allow-script-change: false
-->

Lean: disjoint_iff to intersection empty.

## Beat 4

<!--
allow-script-change: false
-->

Intuition matches: overlap is empty.
