# Side Conditions Are a Bundle, Not One Big And

Playlist: why we need turn-lang

Title: Side Conditions Are a Bundle, Not One Big And

Promotional description: Textbooks list several conditions on one object. Turn-Lang keeps them as a named `where` bundle in the source, not a single anonymous conjunction.

Status: Idea

Audience: Analysis students, applied modelers, anyone confused when generic parameters feel like logic

Series order: why we need turn-lang #1

Builds on: (published) How turn-lang is more intuitive than textbook for every math object!

Source file: `language_server/examples/Tao Analysis-1/Tao-Analysis-1__fhcifj48/Ch5_The_Real_Numbers__5ug15l3wh22la3tuqy1t/5.1_Cauchy_Sequences__h1ta6tfvqbykppzu84hh.turn`

## Core Idea

A Cauchy sequence is not one formula. It is epsilon positive, N at least one, and j and k past N, all at once. Turn-Lang writes that as a `where` bundle on the law, so each condition stays readable in the real Tao formalization file.

## Scene 1: Open the Tao file

Duration: 8s

Say:

> Hi friends, welcome back. This is Turner.
> So we are formalizing Tao's Analysis, chapter five, Cauchy sequences.
> Open the real file with me. This is not a toy example. This is the actual chapter source.

Show on screen:

Open `5.1_Cauchy_Sequences__h1ta6tfvqbykppzu84hh.turn` in the Turn-Lang workspace.

Visual notes:

Show the file path in the editor tab. Start on the `IsCauchy` structure.

## Scene 2: Read the definition on screen

Duration: 10s

Say:

> Look at the law for `IsCauchy`.
> Epsilon must be positive. N must be at least one. j and k must both be at least N.
> In a textbook these are listed as separate bullets. Here they sit in one `where` block.

Show on screen:

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

Visual notes:

Highlight each `where` clause one at a time: epsilon, N, j and k.

## Scene 3: Why a bundle beats one big And

Duration: 9s

Say:

> You could mash all of this into one giant conjunction.
> But then you lose the shape of the definition.
> The bundle says: these are the side conditions checked together when you instantiate the structure.

Show on screen:

Keep the same `IsCauchy` block on screen. Cursor on the semicolon-separated `where` lines.

Visual notes:

Do not rewrite the code live. Just point.

## Scene 4: Close

Duration: 6s

Say:

> So when you read Turn-Lang, look for the `where` blocks.
> That is often where the textbook's fine print lives.
> Subscribe, and we will keep formalizing Tao together.

Show on screen:

End on the rendered math for `IsCauchy` if available, otherwise the source block.

Visual notes:

Calm close in the workspace.

## Final Takeaway

Turn-Lang keeps textbook side conditions as a readable `where` bundle in the real source file.
