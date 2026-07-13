---
videoOps: 1
scriptId: algebra-01-spread-classes-into-partition
title: algebra_01_spread_classes_into_partition
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: The Turn wedge

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

Turn-Lang defines `Partition` once.
Each cell is nonempty and sits inside the ambient set.
The structure carries `disjoint` and `cover` as laws — not as prose you paste into every theorem.
When Judson 1.25 gives us a family `Classes`, we do not rewrite that checklist.
We reuse this definition.

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

Left: Turn editor types the structure. Right: scoped knowledge panel — Definition 15 Partition with axioms (same render as `/app`). No hook card, no checklist montage.

turn-ide track: tracks/scene-2-ide.json

# Scene 2: Math receipt

<!--
layout: code-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Math receipt

<!--
duration: 12
allow-script-change: false
-->

Here is the receipt in the theorem statement.
`exists Partition<X>[..Classes]` means: spread this class family into the partition type.
The data is `Classes`. The reusable shape is `Partition<X>`.
The spread syntax is the bridge between them.

### Turn

```turn
theorem "equivalence classes form a partition (Judson Theorem 1.25 forward)" {
    forall X: Set<Any>,
    forall E: EquivalenceRelation<X>,
    exists Classes: Set<Set<Any>> where { ... },
    |- exists Partition<X>[..Classes]
}
```

### Visual notes

Highlight `[..Classes]` once the line types. Proof panel may show the open goal after `theorem` appears. No split-receipt close card.

turn-ide track: tracks/scene-3-ide.json

