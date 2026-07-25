---
videoOps: 1
scriptId: 09-function-properties-as-adjectives
title: syntax_09_function_properties_as_adjectives
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
Once a relation becomes a function, we start describing what kind of function it is.
Is it onto?
Is it one-to-one?
Is it invertible?
In ordinary math these words behave like adjectives: an onto map, a one-to-one map.
Turn keeps that shape — instead of bolting predicates on somewhere else in the syntax.
### Visual notes

Informal: “let f be an onto map” vs cluttered formal UI (generic, no tool dunk).
Warm tone — empathy for syntax shock.

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
focus: turn
allow-script-change: false
-->

Turn-Lang keeps adjectives on the `Function` structure in a `properties` block.
`@notation(adjective)` means they render like words before the map — the way mathematicians write.
The laws still live here; you are not hiding them in tactic memory.
### Turn

```turn
    properties {
        @notation(adjective)
        surjective: Prop {
```
### Turn highlights

- `@notation(adjective)`
### Visual notes

Highlight `@notation(adjective)` before expanding quantifiers.
Flash rendered `(surjective)f` if UI supports it.

turn-ide track: tracks/scene-2-ide.json

# Scene 3: Math confirm and close

<!--
layout: code-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Math confirm and close

<!--
duration: 10
focus: turn
allow-script-change: false
-->

Open one adjective — the quantifiers are the contract, and they stay in the file.
Pitfalls clip on when lecture shorthand and the checker disagree — link below.
Subscribe for more syntax that stays readable at scale.
### Turn

```turn
        surjective: Prop {
            forall b in range,
            exists a in domain
            |- apply(a) = b
        }
```
### Turn highlights

- `forall b in range`
- `exists a in domain`
- `apply(a) = b`
### Visual notes

Properties block in outline.
CTA pitfalls-01.

turn-ide track: tracks/scene-3-ide.json
