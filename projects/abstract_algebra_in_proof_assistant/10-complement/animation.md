---
videoOps: 1
scriptId: 10-complement
title: 10_complement
socialTitleEnglish: "10. Complement: everything not in A"
socialTitleChina: "10. 补集：宇宙里不在 A 的那些"
promotionalDescription: "The complement of A is everything in the universe that is not in A."
promotionalDescriptionChina: "补集（complement）是宇宙里不属于 A 的那些对象。课本先点名宇宙 U；Lean 的绝对补集则以类型本身为宇宙。"
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
math-board: Judson §1.2 — Complement
- Textbook: Judson §1.2 Sets
- Definition: A′ = { x ∈ U | x ∉ A }.

## Beat 2

<!--
allow-script-change: false
-->

A′ = { x ∈ U | x ∉ A }.

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

Complement needs a universe U, with a where clause Subset(A,U).
### Visual notes

Film presenter; beats on board.
layer: chapter-beat

## Beat 2

<!--
allow-script-change: false
-->

Still a set object, not a relation.

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

Textbook: elements in U but not in A.
### Visual notes

Compare layer; caption beats on both sides.
compare leanTrack: tracks/scene-compare-lean4.json
compare turnTrack: tracks/scene-compare-turn.json

## Beat 2

<!--
allow-script-change: false
-->

Turn: Complement structure with U generic.

## Beat 3

<!--
allow-script-change: false
-->

Lean: relative complement u \ s.

## Beat 4

<!--
allow-script-change: false
-->

Universe is explicit in Turn where-block.
