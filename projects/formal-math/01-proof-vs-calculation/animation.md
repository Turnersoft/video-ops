---
videoOps: 1
scriptId: 01-proof-vs-calculation
title: Proof vs calculation
styleKit: motion-essay
format: landscape
fps: 30
width: 1920
height: 1080
bgmProfile: motion-etude
---

# Scene 1: Proof vs calculation
<!--
layout: beat-focus
teleprompter.position: below-canvas
pace.syllables-per-second: 3.7
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 5
pace.pace-factor: 1
-->

## Beat 1: A different question

```beat-variants
{"selected":"A","candidates":[{"label":"A","template":"compare-dual","templateConfig":{"kind":"compare-dual","config":{"leanEnabled":true,"turnEnabled":true}},"content":{"title":"A different question","say":"A calculator can tell you what is true. A proof tells you why it cannot be false.","leanCode":"","turnCode":"","visualNotes":"beat-template: manim-motion\nlayer: math-board\nmanim-sub: equation-morph\n\nOpen with the title “Proof vs calculation.” A calculator produces a green\n“true”; the frame pivots to the larger question “why?”"}}]}
```

A calculator can tell you what is true. A proof tells you why it cannot be false.

### Lean

```lean

```

### Turn

```turn

```

### Visual notes
<!-- beat-studio: {"template":"manim-motion","templateConfig":{"kind":"manim-motion","config":{"subTemplate":"equation-morph","durationSeconds":6,"caption":""}}} -->

beat-template: manim-motion
layer: math-board
manim-sub: equation-morph

Open with the title “Proof vs calculation.” A calculator produces a green
“true”; the frame pivots to the larger question “why?”
## Beat 2: Evidence is not enough

For any integer n, n times the next integer is even. A CAS can test a million cases and see the pattern.

### Visual notes
Show `n(n + 1)` beside a rapidly advancing test counter and a stream of green
even results. End on an infinity mark to make the unseen cases visible.

## Beat 3: The universal reason

But the proof is simple: consecutive integers are multiplied, so one must always be even.

### Visual notes
Split `n(n + 1)` into two neighboring integers. Highlight one factor as even,
then connect that fact directly to the even product.

## Beat 4: Guarantee

A proof assistant checks every logical link. Calculation finds a pattern. Proof gives a guarantee.

### Visual notes
Turn the argument into a chain of verified links. Finish with a lock icon and
the end card: “Calculation finds patterns. Proof guarantees.”

