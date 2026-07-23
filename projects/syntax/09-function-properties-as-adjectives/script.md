# Formal Math Should Read Like Sentences You Already Speak

Playlist: turn-lang syntax highlight

Title: Formal Math Should Read Like Sentences You Already Speak

Promotional description: Adjectives like “onto” should read like math, not like a second syntax. Turn’s `@notation(adjective)` keeps properties on the function where you expect them.

Status: Script

Education core: L1–L2
Education refresh: L0 (grammar intuition)
Education work: none
Education horizon: L2 (bracket syntax next)
Patience: short (2 min)
Primary audience: Undergraduate students, self-learners

Hook type: experience → turn-wedge → math-confirm
Turn wedge: `@notation(adjective)` — properties read like words on the map

Series order: turn-lang syntax highlight #9

Builds on: pitfalls-01-surjective-quantifier-order

Clip source: published/2026-6-17-  1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang.md (4:13–4:45, reframe)

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (`Function` properties)

## Core Idea

The experience: formal tools often split “the map” and “what we claim about it” into alien syntax. Turn’s wedge: properties are adjectives on the structure, annotated for readable notation. Math confirm: one property block in the file.

## Scene 1: The experience

Duration: 18s

Say:

> Hi friends, welcome back.
> Once a relation becomes a function, we start describing what kind of function it is.
> Is it onto?
> Is it one-to-one?
> Is it invertible?
> In ordinary math these words behave like adjectives: an onto map, a one-to-one map.
> Turn keeps that shape — instead of bolting predicates on somewhere else in the syntax.

Show on screen:

Informal: “let f be an onto map” vs cluttered formal UI (generic, no tool dunk).

Visual notes:

Warm tone — empathy for syntax shock.

## Scene 2: The Turn wedge

Duration: 12s

Say:

> Turn-Lang keeps adjectives on the `Function` structure in a `properties` block.
> `@notation(adjective)` means they render like words before the map — the way mathematicians write.
> The laws still live here; you are not hiding them in tactic memory.

Show on screen:

```turn
    properties {
        @notation(adjective)
        surjective: Prop {
```

Highlight `@notation(adjective)` before expanding quantifiers.

Visual notes:

Flash rendered `(surjective)f` if UI supports it.

## Scene 3: Math confirm and close

Duration: 10s

Say:

> Open one adjective — the quantifiers are the contract, and they stay in the file.
> Pitfalls clip on when lecture shorthand and the checker disagree — link below.
> Subscribe for more syntax that stays readable at scale.

Show on screen:

```turn
        surjective: Prop {
            forall b in range,
            exists a in domain
            |- apply(a) = b
        }
```

Properties block in outline.

Visual notes:

CTA pitfalls-01.

## Final Takeaway

Turn keeps predicates where mathematicians put them — adjectives on the map, visible in source with `@notation(adjective)`.

## Audience lanes

- **L0 / Refresh:** adjective grammar before symbols.
- **L1–L2 Core:** locate properties block; read one law.
- **L3:** design choice vs separate predicate syntax.
- **Educators:** show where “onto” lives in the formalization.
- **Visual learners:** rendered adjective on screen.
