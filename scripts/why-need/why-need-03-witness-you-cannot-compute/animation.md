---
videoOps: 1
scriptId: why-need-03-witness-you-cannot-compute
title: why_need_03_witness_you_cannot_compute
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: The situation in the real proof

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

Hi friends, welcome back.
So in the partition proof, we are inside obligation `C.1`.
We specialized `Classes.1` and got a representation hypothesis `hRep`.
That hypothesis does not give us a concrete element. It gives us an existential.

### Turn

```turn
specialize Classes.1 for C as D into hRep
witness hRep.witness for x in hRep
```

Highlights:

- `witness hRep.witness for x in hRep`

### Visual notes

Inside `C.1` in the Judson 1.25 proof:
Start zoomed into `C.1` only.

turn-ide track: tracks/scene-1-ide.json

# Scene 2: What the tactic is really doing

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
duration: 10
allow-script-change: false
-->

`witness hRep.witness for x in hRep` is not inventing a number.
It says: take the witness promised by this existential, and name it.
The name `hRep.witness` is the scoped realization unpacked from binder `x`.

### Visual notes

Keep the witness line highlighted. Show proof state if available: `w in X` or domain evidence after witness.
If proof panel shows context rows, point at the witness receipt.

# Scene 3: Why this matters for teaching

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

Students often think a witness must be something you can compute.
But generic sets do not work that way.
Turn-Lang makes the unpack visible in the script, so the proof step is honest.

### Visual notes

Scroll slightly to `C.2` showing the same witness pattern repeated.
Same file, same theorem. Reinforce pattern recognition.

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

So existential elimination is a real move, and the syntax should show it.
Subscribe if you want more of these proof-state details from the real library.

### Visual notes

End on `witness hRep.witness for x in hRep`.
Short close.

