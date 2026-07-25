---
videoOps: 1
scriptId: 05-exists-on-structure-is-a-claim
title: pitfalls_05_exists_on_structure_is_a_claim
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

Hi friends, welcome back.
The textbook says: let g be the inverse of f.
On paper that line costs nothing.
But “there is an inverse” is a real claim — with laws attached.
If f is not invertible, you cannot smuggle g in for free.
Formal work makes you earn that sentence or reject it.
### Visual notes

Generic: “assume inverse exists” on whiteboard → red question mark. No tool names.
L5 tease: calibration inverse that fails at runtime — one line optional.

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

## Beat 1

<!--
duration: 14
focus: turn
allow-script-change: false
-->

Turn-Lang splits the job on purpose.
One place defines what an inverse *would* satisfy — the composition laws.
Another place on the map only says: there exists such an inverse for *this* map.
Exists means you are claiming you can instantiate that structure and the laws check.
That is a proposition — not a silent axiom in the header.
### Turn

```turn
        invertible: Prop {
            |- exists InverseFunction<self>
        }
```
### Turn highlights

- `exists InverseFunction<self>`
### Visual notes

Outline: `InverseFunction` structure (laws) separate from `Function.invertible` property (`exists`).
Zoom `InverseFunction` `laws { def { ... } }` briefly.
Arrow: laws on witness type, claim on function.

turn-ide track: tracks/scene-2-ide.json

# Scene 3: Math confirm and close

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
duration: 12
allow-script-change: false
-->

In this chapter, invertible is a property; the inverse is a structure with composition laws.
Exists means you still owe a witness that checks.
Full walkthrough in the description.
### Visual notes

`theorem "invertible mapping must be injective"` header only — do not prove live.
Tease algebra-02 / pitfalls-02.
