# Extend What You Already Formalized — Don't Invent a New Species

Playlist: turn-lang syntax highlight

Title: Extend What You Already Formalized — Don't Invent a New Species

Promotional description: Other systems bolt “function” on as a separate type. Turn puts single-valuedness on `Relation` first, then refines — inheritance you can read in one line.

Status: Script

Education core: L1–L2
Education refresh: L0 (machine metaphor)
Education work: L5 (single-valued response — one line)
Education horizon: L2 (properties block next)
Patience: short (2 min)
Work link: constitutive map single-valued response
Primary audience: Students, self-learners

Hook type: experience → turn-wedge → math-confirm
Turn wedge: `(well_defined)Relation` refinement + `apply`

Series order: turn-lang syntax highlight #7

Builds on: algebra-06-relations-bag-of-pairs

Clip source: published/2026-6-17-  1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang.md (2:58–3:40, reframe)

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (`Relation.well_defined`, `Function`)

## Core Idea

The experience: reinventing “function” from scratch duplicates the uniqueness story. Turn’s wedge: well-posedness lives on `Relation`; `Function` refines and adds `apply`. Math confirm: read both blocks in the file.

## Scene 1: The experience

Duration: 18s

Say:

> Hi friends, welcome back.
> In the last clip, a relation was a table of allowed input-output pairs.
> Now imagine the table is supposed to behave like a machine.
> You put in one input, and the machine is not allowed to return two different outputs.
> That single-valued rule is the whole jump from relation to function.
> So the design question is: should Turn invent a brand-new object, or reuse the relation we already understand?

Show on screen:

Pipeline sketch: one input → one output (no code yet).

Visual notes:

Show relation table turning into a one-output machine. Question before symbols.

## Scene 2: The Turn wedge

Duration: 14s

Say:

> Turn-Lang puts single-valuedness on `Relation` as a named property — for each input, a unique output in the relation.
> Then `Function` refines that relation and adds `apply` — one inheritance line you can read on screen.

Show on screen:

`well_defined` on `Relation`, then:

```turn
structure Function<domain range: Set<Any>>: (well_defined)Relation<domain, range> {
    @notation( {self} ~ "(" ~ {a} ~ ")" )
    apply(a: domain): range,
```

Click Relation → Function in outline.

Visual notes:

Highlight `exists unique b` then refinement line.

## Scene 3: Work beat and close

Duration: 10s

Say:

> Same idea in simulation — one input should not return two unrelated outputs.
> Pitfalls clip on when rules fail that test — link in description.
> Full 1.2 walkthrough below.

Show on screen:

`apply(a: domain)` highlighted.

Visual notes:

L5 one sentence; CTA pitfalls-04.

## Final Takeaway

Turn extends `Relation` instead of reinventing it — `(well_defined)Relation` and `apply` are visible in the source.

## Audience lanes

- **L0 / Refresh:** machine metaphor — feed a, get one b.
- **L1–L2 Core:** refinement syntax and `apply`.
- **L3:** compare to separate function types in other provers.
- **L5 Work:** single-valued material map (one line).
- **Visual learners:** outline inheritance Relation → Function.
