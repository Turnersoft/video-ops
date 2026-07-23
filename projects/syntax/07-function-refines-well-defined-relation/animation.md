---
videoOps: 1
scriptId: 07-function-refines-well-defined-relation
title: syntax_07_function_refines_well_defined_relation
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
In the last clip, a relation was a table of allowed input-output pairs.
Now imagine the table is supposed to behave like a machine.
You put in one input, and the machine is not allowed to return two different outputs.
That single-valued rule is the whole jump from relation to function.
So the design question is: should Turn invent a brand-new object, or reuse the relation we already understand?

### Visual notes

Pipeline sketch: one input → one output (no code yet).
Show relation table turning into a one-output machine. Question before symbols.

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
focus: turn
allow-script-change: false
-->

Turn-Lang puts single-valuedness on `Relation` as a named property — for each input, a unique output in the relation.
Then `Function` refines that relation and adds `apply` — one inheritance line you can read on screen.

### Turn

```turn
structure Function<domain range: Set<Any>>: (well_defined)Relation<domain, range> {
    @notation( {self} ~ "(" ~ {a} ~ ")" )
    apply(a: domain): range,
```

Highlights:

- `(well_defined)Relation`
- `apply(a: domain)`

### Visual notes

`well_defined` on `Relation`, then:
Click Relation → Function in outline.
Highlight `exists unique b` then refinement line.

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

## Beat 1: Work beat and close

<!--
duration: 10
allow-script-change: false
-->

Same idea in simulation — one input should not return two unrelated outputs.
Pitfalls clip on when rules fail that test — link in description.
Full 1.2 walkthrough below.

### Visual notes

`apply(a: domain)` highlighted.
L5 one sentence; CTA pitfalls-04.

