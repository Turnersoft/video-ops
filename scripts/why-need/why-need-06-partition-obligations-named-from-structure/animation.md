---
videoOps: 1
scriptId: why-need-06-partition-obligations-named-from-structure
title: why_need_06_partition_obligations_named_from_structure
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: The hand-wave

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

Hi friends, welcome back.
Homework says: clearly these sets form a partition.
You nod — but what was checked?
Nonempty pieces. Pieces inside X. Cover everything. No overlap.
That is the whole proof, hidden in one adverb.

### Visual notes

“Clearly a partition.” → four short labels appear.
One textbook line, one checklist. No tool yet.

# Scene 2: Names from the definition

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

Turn-Lang names those checks where the partition is defined.
C.1, C.2, cover, disjoint — not invented in the proof.
When you prove Theorem 1.25, you discharge the same names at the goal.

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

`Partition` structure with container + laws; overlay C.1 / C.2.
Proof-slide branch map if available.

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

## Beat 1

<!--
duration: 8
allow-script-change: false
-->

Longer, yes — but you see every obligation.
That is the trade formal work offers.
Open the chapter file in the description and click through the proof yourself.

### Visual notes

Return to `Partition` in outline.
CTA subscribe / code along.

