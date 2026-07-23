---
videoOps: 1
scriptId: 01-surjective-quantifier-order
title: pitfalls_01_surjective_quantifier_order
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: The experience

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
duration: 20
allow-script-change: false
-->

Hi friends, welcome back. This is Turner.
Suppose I say every room in a hotel has a guest.
That does not mean every guest has their own room.
The order of “for every” and “there exists” changes the picture.
This is the same trap in proof courses.
We remember a definition in English — “onto,” “covers everything” — but formal work asks for the exact quantifier direction.
If that direction is wrong, you are not a little wrong. You are proving a different statement.

### Visual notes

Hotel rooms / guests sketch, then a generic checker mismatch.
Empathy beat — “this happens to everyone.” Keep the hotel example visual and fast.

# Scene 2: The Turn wedge

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

In Turn-Lang the definition is in the file next to the function — not buried in tactic output.
Open surjective and read the quantifiers before you prove.
That block is the contract.

### Visual notes

Scroll to `structure Function` → `@notation(adjective)` → `surjective: Prop` block (do not open with this).
Highlight that definitions live beside the structure, not only in memory.

# Scene 3: Math confirm (one example)

<!--
layout: code-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1

<!--
duration: 10
focus: turn
allow-script-change: false
-->

Here is how surjective is written in this chapter.
For every output in the range, there exists an input hitting it — b first, then a.
Swap that order and you are proving a different theorem.
Later proofs unfold this exact block at the goal.

### Turn

```turn
surjective: Prop {
    forall b in range,
    exists a in domain
    |- apply(a) = b
}
```

Highlights:

- `forall b in range`
- `exists a in domain`
- `apply(a) = b`

### Visual notes

Brief flash: `unfold Function.surjective at goal` in `"composition's rules"`.
Math is receipt, not lecture.

turn-ide track: tracks/scene-3-ide.json

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

So before tactics: read the named property in the file.
Full chapter in the description. Subscribe for more pitfalls where formal work catches traps early.

### Visual notes

Return to `surjective: Prop`.
Short close.

