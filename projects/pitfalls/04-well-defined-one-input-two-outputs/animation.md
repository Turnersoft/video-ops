---
videoOps: 1
scriptId: 04-well-defined-one-input-two-outputs
title: pitfalls_04_well_defined_one_input_two_outputs
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
Imagine I give you a rule and call it a function.
You test it on one example, and it gives a nice answer.
But then the same input shows up in a different disguise, and the rule gives a different answer.
A calculator would not know which answer to trust.
A proof checker should not know either.
This is why “well-defined” is not a teacher being picky — it is the gate before the word function is even legal.

### Visual notes

Whiteboard: same input via two labels → two outputs (classic half vs two-fourths story, no jargon).
Use 1/2 = 2/4 only as the picture, not as a rational-number lecture. Industry viewers: same beat for tabulated material data.

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
duration: 12
focus: turn
allow-script-change: false
-->

Turn-Lang does not bury that in a footnote.
On `Relation` there is a named property: for each input, there exists a unique output in the relation.
Only after that passes do we refine to `Function`.
The checker can reject the rule before you waste a proof.

### Turn

```turn
        well_defined: Prop {
            forall a in A,
            exists unique b in B
            |- { [a b] in self; }
        }
```

Highlights:

- `well_defined: Prop`
- `exists unique b in B`

### Visual notes

Outline: `Relation` → `well_defined` → `Function` refines relation.
Side-by-side trap and property.

turn-ide track: tracks/scene-2-ide.json

# Scene 3: Work beat and close

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

Same class of bug in simulation — two strain paths that should be the same state returning different stresses.
Formal methods make you name the obligation up front.
Link to the full formalization in the description.

### Visual notes

Return to `well_defined` block.
L5 one sentence; short subscribe CTA.

