---
videoOps: 1
scriptId: 05-empty-set
title: 05_empty_set
socialTitleEnglish: "5. Empty set: nothing is in it"
socialTitleChina: "5. 空集：对每个对象，都不在里面"
promotionalDescription: "The empty set is not a tiny bag. It is a membership rule: nobody belongs."
promotionalDescriptionChina: "空集（empty set）不是很小的一袋子。它是一条成员条件：对每一个对象，答案都是不属于这个集合。"
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
math-board: Judson §1.2 — Empty set
- Textbook: Judson §1.2 Sets
- Definition: The empty set ∅ is the set with no elements.

## Beat 2

<!--
allow-script-change: false
-->

The empty set ∅ is the set with no elements.

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

EmptySet is more specific than Set, which means inheritance, not the reverse.
### Visual notes

Film presenter; beats on board.
layer: chapter-beat

## Beat 2

<!--
allow-script-change: false
-->

No extra fields, only a law that says nothing is a member.

## Beat 3

<!--
allow-script-change: false
-->

We use the structure name EmptySet directly, with no generic instantiation.

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
pip-shape: rectangle
pip-size: 0.28, 0.38
pip-position: 0.22, 0.33
pip-crop: 0.5, 0.5
-->

Textbook: ∅ has no elements.
### Visual notes

Compare layer; caption beats on both sides.
compare leanTrack: tracks/scene-compare-lean4.json
compare turnTrack: tracks/scene-compare-turn.json

## Beat 2

<!--
allow-script-change: false
-->

Turn: EmptySet inherits Set; no_members law.

## Beat 3

<!--
allow-script-change: false
-->

Lean: not_mem_empty for any x.

## Beat 4

<!--
allow-script-change: false
-->

Turn makes the law block the pedagogical anchor.
