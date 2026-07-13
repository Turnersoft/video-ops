---
videoOps: 1
scriptId: algebra-04-partition-cutting-the-cake
title: algebra_04_partition_cutting_the_cake
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

Hi friends, welcome back.
Imagine sorting every object in a box into labeled bins.
Every object must go somewhere.
No object is allowed to belong to two bins at once.
And no bin is allowed to be empty if you are claiming it is one of the pieces.
That is a partition.
The cake picture is the same idea: cover everything, share nothing.
Turn's job is to name each part of that picture.

### Visual notes

Partition sketch of set X — cake or mesh blocks.

Picture first, no file.

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
duration: 12
allow-script-change: false
-->

Turn-Lang writes `Partition` in two readable layers.
First: each cell C is nonempty and lives inside X — assumptions on the generic, right where you declare cells.
Then laws `disjoint` and `cover` — the global picture.
You see the design before you prove anything about equivalence classes.

### Turn

```turn
structure[
    C: Set<Any> where {
        |- C != EmptySet;
        |- Subset(C, X)
    }
] Partition<X: Set<Any>>: Set<Set<Any>> {
    laws {
        disjoint { ... }
        cover { ... }
    }
}
```

### Visual notes

Briefly flash `cover` body: `exists C in self |- x in C`.

turn-ide track: tracks/scene-2-ide.json

# Scene 3: Close

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
duration: 8
allow-script-change: false
-->

Theorem clip next: when the book says classes “form” a partition, what that means in formal work.
Full file in description.

### Visual notes

`disjoint` law header.

L5 domain decomposition one sentence.

