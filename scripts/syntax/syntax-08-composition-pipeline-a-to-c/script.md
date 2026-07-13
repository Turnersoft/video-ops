# Pipeline Notation Should Match Execution Order on Screen

Playlist: turn-lang syntax highlight

Title: Pipeline Notation Should Match Execution Order on Screen

Promotional description: Composition order confuses everyone — notation says one thing, your head runs another. Turn encodes execution order in one `apply` law you can read beside the notation.

Status: Script

Education core: L1
Education refresh: L0 (pipeline metaphor)
Education work: L5 (staged operator / solver chain)
Education horizon: L2 (theorem folder next)
Patience: short (2 min)
Work link: solver pipeline
Primary audience: Undergraduates, visual learners, engineers

Hook type: experience → turn-wedge → math-confirm
Turn wedge: `Composition` `apply` law matches notation order

Series order: turn-lang syntax highlight #8

Builds on: syntax-07-function-refines-well-defined-relation

Clip source: published/2026-6-17-  1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang.md (7:46–8:25, reframe)

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (`Composition`)

## Core Idea

The experience: g ∘ f notation trips people — which runs first? Turn’s wedge: the defining law in source matches the pipeline. Math confirm: `Composition` structure.

## Scene 1: The experience

Duration: 18s

Say:

> Hi friends, welcome back.
> Imagine a two-step machine.
> First it turns raw data into cleaned data.
> Then it turns cleaned data into a report.
> If you reverse the order, the report step receives the wrong kind of thing.
> Function composition is just this pipeline, but the notation can make people hesitate.
> Which one runs first — the left map or the right map?
> Turn answers by putting the pipeline law directly beside the notation.

Show on screen:

Simple A→B→C diagram — f then g, no code yet.

Visual notes:

3b1b-style pipeline before symbols.

## Scene 2: The Turn wedge

Duration: 14s

Say:

> Turn-Lang writes composition as a `Function` with inherited `apply`.
> The notation shows g after f — f closer to the input.
> The law in the file says apply at x equals g of f of x — same order, on screen, not buried in tactics.

Show on screen:

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

Visual notes:

Highlight nested `apply` calls beside notation line.

## Scene 3: Work beat and close

Duration: 8s

Say:

> Same picture in a multistep solver — output of step one feeds step two, nothing leaks outside declared ranges.
> Next clip: big theorems as folders. Full 1.2 in description.

Show on screen:

`Composition.def` law only.

Visual notes:

L5 pipeline sentence; CTA syntax-12.

## Final Takeaway

Turn’s `Composition` ties notation order to one readable `apply` law — pipeline on screen matches pipeline in execution.

## Audience lanes

- **L0 / Refresh:** A→B→C drawing.
- **L1 Core:** read notation and `def` law together.
- **L2:** bridge to `"composition's rules"` theorem.
- **L5 Work:** staged operator / solver chain.
- **Visual learners:** diagram then code.
- **International / self-learners:** minimal symbols if diagram is clear.
