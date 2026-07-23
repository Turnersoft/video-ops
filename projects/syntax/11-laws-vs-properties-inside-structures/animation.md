---
videoOps: 1
scriptId: 11-laws-vs-properties-inside-structures
title: syntax_11_laws_vs_properties_inside_structures
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
Think about a car listing.
“Electric” is a property you can ask about this particular car.
“The brakes must work” is not optional — every valid car has to satisfy it.
Mathematical structures have the same split.
Some facts are adjectives we may or may not require.
Other facts are laws every instance must obey.
If a formal file mixes those together, the reader gets lost.

### Visual notes

Split columns: “optional tag” vs “always enforced rule” (generic).
L5: validation rule vs classification label.

# Scene 2: The Turn wedge

<!--
layout: beat-focus
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
allow-script-change: false
-->

Turn-Lang puts both inside `Function`, but in separate blocks.
`properties` — adjectives you attach when you care.
`laws` — what every function instance must satisfy, including how `apply` behaves.
You read both in the chapter file — side by side.

### Visual notes

Split view: `properties {` and `laws {` headers — scroll slowly.
Contrast headers before bodies.

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

`domain_def` is a law: plug in from the domain, land in the range.
Surjective is a property: you ask whether this particular map is onto.
Same file, two blocks — link to full chapter below.

### Turn

```turn
    laws {
        domain_def {
            forall a in domain |- apply(a) in range
        }
    }
```

Highlights:

- `domain_def`
- `apply(a) in range`

### Visual notes

Contrast with `surjective: Prop` above.
Whole `Function` in outline at close.

turn-ide track: tracks/scene-3-ide.json

