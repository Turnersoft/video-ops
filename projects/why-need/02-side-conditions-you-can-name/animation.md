---
videoOps: 1
scriptId: 02-side-conditions-you-can-name
title: why_need_02_side_conditions_you_can_name
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: Open the real Judson proof

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
duration: 9
allow-script-change: false
-->

Hi friends, welcome back. This is Turner.
So we are in the chapter file, at Judson Theorem 1.25.
The statement says equivalence classes form a partition.
The interesting part is not the headline. It is what the proof has to check.

### Visual notes

Open `02_sets_and_equivalence_relations.turn`. Scroll to theorem `"equivalence classes form a partition (Judson Theorem 1.25 forward)"`.
Show the theorem statement ending in `|- exists Partition<X>[..Classes]`.

# Scene 2: Point at the Partition structure first

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
duration: 9
allow-script-change: false
-->

Before the proof, look at how `Partition` is defined.
Each cell must be nonempty and a subset of X.
The laws ask for cover and disjointness.
These names are already in the structure.

### Turn

```turn
structure[
    C: Set<Any> where {
        |- C != EmptySet;
        |- Subset(C, X)
    }
] Partition<X: Set<Any>>: Set<Set<Any>> {
    laws {
        disjoint { ... },
        cover { ... }
    }
}
```

### Visual notes

Briefly show structure, then jump to the proof's `witness confirm`.

turn-ide track: tracks/scene-2-ide.json

# Scene 3: The named confirm block

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
duration: 12
allow-script-change: false
-->

Now the proof.
`witness confirm` is doing the real work.
`C.1` and `C.2` discharge the cell conditions.
`cover` and `disjoint` discharge the partition laws.
You always know which obligation you are paying for.

### Turn

```turn
} proof {
    witness confirm {
        at goal {
            C.1 { ... }
            C.2 { ... }
            cover { ... }
            disjoint { ... }
        }
    }
}
```

Highlights:

- `C.1`
- `C.2`
- `cover`
- `disjoint`

### Visual notes

Expand one branch briefly, e.g. `witness hRep.witness for x in hRep` inside `C.1`, then collapse. The names are the hero.

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
duration: 7
allow-script-change: false
-->

So this is what I mean by side conditions you can name.
The partition proof in our real library is readable because the obligations keep their names.
Tell me which Judson theorem you want next.

### Visual notes

Cursor on `disjoint {` inside the confirm block.
End in the file, not on a logo.

