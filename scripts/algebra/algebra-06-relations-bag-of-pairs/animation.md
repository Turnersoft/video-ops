---
videoOps: 1
scriptId: algebra-06-relations-bag-of-pairs
title: algebra_06_relations_bag_of_pairs
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
duration: 18
allow-script-change: false
-->

Hi friends, welcome back. This is Turner.
Before we talk about functions, imagine a very simple table.
On the left are inputs you might choose from A.
On the right are outputs you might choose from B.
A relation is just the list of pairings you allow.
Not every possible pair has to be in the list — but every pair in the list must really be one A-object and one B-object.
So the question is: how does Turn-Lang keep illegal pairs out of the bag?

### Visual notes

Simple A × B grid with a few highlighted pairs — no Turn file yet.

3b1b-style grid first: two columns, then a highlighted subset of allowed arrows.

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

## Beat 1: The Turn wedge

<!--
duration: 12
allow-script-change: false
-->

In Turn-Lang a relation is not a new species of object — it is a set with one membership law.
Every member must already live inside the Cartesian product.
Illegal pairs cannot sneak in. You read that contract in the source.

### Visual notes

Scroll to `structure Relation` — show `laws { subset { ... } }` before expanding body.

Outline: Relation as Set.

# Scene 3: Math confirm

<!--
layout: code-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Math confirm

<!--
duration: 12
allow-script-change: false
-->

Here is how that looks in this chapter.
`Subset(self, CartesianProduct<[A, B]>)` — that is the formal name for “pairs you allow.”
Functions refine this same object next — but first you need the bag.

### Turn

```turn
structure Relation<A B: Set<Any>>: Set<Any> {
    laws {
        subset {
            |- Subset(self, CartesianProduct<[A, B]>)
        }
    }
```

### Visual notes

Flash `structure Function` header in outline — do not open body.

Arrow Relation → Function in outline.

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

## Beat 1: Close

<!--
duration: 6
allow-script-change: false
-->

Full chapter walkthrough in the long 1.2 video — link in description.
Comment which pair you would forbid first in your own relation.

### Visual notes

File tab `02_sets_and_equivalence_relations.turn`.

End card: full 1.2 video.

