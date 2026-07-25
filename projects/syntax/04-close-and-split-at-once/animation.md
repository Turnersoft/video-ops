---
videoOps: 1
scriptId: 04-close-and-split-at-once
title: syntax_04_close_and_split_at_once
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: The goal before confirm

<!--
layout: code-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: The goal before confirm

<!--
duration: 8
focus: turn
allow-script-change: false
-->

Hi friends, welcome back.
End of Judson 1.25 forward proof.
The goal is `exists Partition<X>[..Classes]`.
We already built the class family `Classes` in the statement.
### Turn

```turn
|- exists Partition<X>[..Classes]
```
### Turn highlights

- `[..Classes]`
### Visual notes

Theorem conclusion:
Show `[..Classes]` spread syntax on screen.

turn-ide track: tracks/scene-1-ide.json

# Scene 2: One block, four named jobs

<!--
layout: code-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: One block, four named jobs

<!--
duration: 12
focus: turn
allow-script-change: false
-->

`witness confirm` closes the existential and immediately opens the checklist.
Cell nonempty, cell subset, cover, disjoint.
All in one block, all named.
### Turn

```turn
witness confirm {
    at goal {
        C.1 { specialize Classes.1 for C as D into hRep ... }
        C.2 { ... }
        cover { witness EquivalenceClass<X, E, x> for C ... }
        disjoint { witness hRepA.witness for x in hRepA ... }
    }
}
```
### Turn highlights

- `witness confirm`
- `C.1`
- `C.2`
- `cover`
- `disjoint`
### Visual notes

Expand `cover` and `disjoint` briefly — point at law names matching the `Partition` structure.

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
duration: 6
allow-script-change: false
-->

That is close-and-split in one move.
The real file is the reference implementation.
### Visual notes

Cursor on `at goal {`.
End in workspace.
