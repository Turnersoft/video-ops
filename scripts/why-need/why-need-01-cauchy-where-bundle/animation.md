---
videoOps: 1
scriptId: why-need-01-cauchy-where-bundle
title: why_need_01_cauchy_where_bundle
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: Open the Tao file

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

Hi friends, welcome back. This is Turner.
So we are formalizing Tao's Analysis, chapter five, Cauchy sequences.
Open the real file with me. This is not a toy example. This is the actual chapter source.

### Visual notes

Open `5.1_Cauchy_Sequences__h1ta6tfvqbykppzu84hh.turn` in the Turn-Lang workspace.
Show the file path in the editor tab. Start on the `IsCauchy` structure.

# Scene 2: Read the definition on screen

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
duration: 10
allow-script-change: false
-->

Look at the law for `IsCauchy`.
Epsilon must be positive. N must be at least one. j and k must both be at least N.
In a textbook these are listed as separate bullets. Here they sit in one `where` block.

### Turn

```turn
structure IsCauchy<a: Sequence>: Prop {
    laws {
        def {
            forall epsilon: Rational where { |- RatLT(Zero, epsilon) },
            exists N: Natural where { |- NatGE<N, NatOne> },
            forall j k: Natural where { |- NatGE<j, N>; |- NatGE<k, N>; }
            |- RatEpsilonClose(a.apply(j), a.apply(k), epsilon)
        }
    }
}
```

Highlights:

- `where { |- RatLT(Zero, epsilon) }`
- `where { |- NatGE<N, NatOne> }`
- `where { |- NatGE<j, N>; |- NatGE<k, N>; }`

### Visual notes

Highlight each `where` clause one at a time: epsilon, N, j and k.

turn-ide track: tracks/scene-2-ide.json

# Scene 3: Why a bundle beats one big And

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

You could mash all of this into one giant conjunction.
But then you lose the shape of the definition.
The bundle says: these are the side conditions checked together when you instantiate the structure.

### Visual notes

Keep the same `IsCauchy` block on screen. Cursor on the semicolon-separated `where` lines.
Do not rewrite the code live. Just point.

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

So when you read Turn-Lang, look for the `where` blocks.
That is often where the textbook's fine print lives.
Subscribe, and we will keep formalizing Tao together.

### Visual notes

End on the rendered math for `IsCauchy` if available, otherwise the source block.
Calm close in the workspace.

