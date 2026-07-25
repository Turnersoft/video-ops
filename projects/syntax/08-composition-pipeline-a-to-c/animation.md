---
videoOps: 1
scriptId: 08-composition-pipeline-a-to-c
title: syntax_08_composition_pipeline_a_to_c
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
Imagine a two-step machine.
First it turns raw data into cleaned data.
Then it turns cleaned data into a report.
If you reverse the order, the report step receives the wrong kind of thing.
Function composition is just this pipeline, but the notation can make people hesitate.
Which one runs first — the left map or the right map?
Turn answers by putting the pipeline law directly beside the notation.
### Visual notes

Simple A→B→C diagram — f then g, no code yet.
3b1b-style pipeline before symbols.

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

Turn-Lang writes composition as a `Function` with inherited `apply`.
The notation shows g after f — f closer to the input.
The law in the file says apply at x equals g of f of x — same order, on screen, not buried in tactics.
### Turn

```turn
@notation({g} ~ " ∘ " ~ {f})
structure Composition<A B C: Set<Any>, f: Function<A, B>, g: Function<B, C>>: Function<A, C> {
    apply(domain: A): C
    laws {
        def {
            forall x in A
            |- apply(x) = g.apply(f.apply(x))
        }
    }
}
```
### Turn highlights

- `@notation({g} ~ " ∘ " ~ {f})`
- `g.apply(f.apply(x))`
### Visual notes

Highlight nested `apply` calls beside notation line.

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
duration: 8
allow-script-change: false
-->

Same picture in a multistep solver — output of step one feeds step two, nothing leaks outside declared ranges.
Next clip: big theorems as folders. Full 1.2 in description.
### Visual notes

`Composition.def` law only.
L5 pipeline sentence; CTA syntax-12.
