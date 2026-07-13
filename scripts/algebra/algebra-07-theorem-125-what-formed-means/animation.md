---
videoOps: 1
scriptId: algebra-07-theorem-125-what-formed-means
title: algebra_07_theorem_125_what_formed_means
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

## Beat 1: The experience

<!--
duration: 22
allow-script-change: false
-->

Hi friends, welcome back.
Textbooks love phrases like “these objects form a partition.”
If you already understand the theorem, that sounds obvious.
But if you are learning, the word “form” hides the work.
What are the pieces?
What is the object being constructed?
Which facts about partitions have to be checked?
In Turn, “form a partition” becomes a concrete construction claim: build the `Partition` structure from exactly these equivalence classes.

### Visual notes

Vague textbook line vs question “what object?” (conceptual).

Classes as blobs covering X — visual optional.

# Scene 2: The Turn wedge

<!--
layout: code-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: The Turn wedge

<!--
duration: 14
allow-script-change: false
-->

Turn-Lang first defines the family `Classes` — every class is some equivalence class, every equivalence class appears.
The conclusion is not hand-waving: `exists Partition<X>[..Classes]`.
Spread the family into the partition type — the structure you already read carries the laws.

### Turn

```turn
theorem "equivalence classes form a partition (Judson Theorem 1.25 forward)" {
    forall X: Set<Any>,
    forall E: EquivalenceRelation<X>,
    exists Classes: Set<Set<Any>> where {
        forall C in Classes,
        exists x in X,
        |- SetEq(C, EquivalenceClass<X, E, x>);
        forall x' in X
        |- EquivalenceClass<X, E, x'> in Classes;
    },
    |- exists Partition<X>[..Classes]
}
```

### Visual notes

Highlight `exists Partition<X>[..Classes]`.

Do not prove live.

turn-ide track: tracks/scene-2-ide.json

# Scene 3: Horizon and close

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Horizon and close

<!--
duration: 10
allow-script-change: false
-->

The proof is one big `witness confirm` — obligations named from the partition definition.
That is the why-need clip: C.1, C.2, cover, disjoint — not anonymous goals.
Full proof in the file — link in description.

### Visual notes

Flash `witness confirm { at goal {` header only.

CTA why-need-06.

