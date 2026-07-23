# Tags Versus Rules the Checker Always Enforces

Playlist: turn-lang syntax highlight

Title: Tags Versus Rules the Checker Always Enforces

Promotional description: Mixing optional labels with must-hold constraints is a classic modeling mistake. Turn separates `properties` and `laws` inside one structure — both visible in source.

Status: Script

Education core: L1–L2
Education refresh: L0 (labels vs rules)
Education work: L5 (validator rules vs output tags)
Education horizon: L3 (structure design)
Patience: short (2 min)
Work link: solver validation rules vs output labels
Primary audience: Undergraduate students, self-learners

Hook type: experience → turn-wedge → math-confirm
Turn wedge: `properties` vs `laws` blocks on `Function`

Series order: turn-lang syntax highlight #11

Builds on: syntax-09-function-properties-as-adjectives

Clip source: published/2026-6-17-  1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang.md (6:53–7:28, reframe)

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (`Function` properties and laws)

## Core Idea

The experience: optional classifications vs invariants that every instance must satisfy get conflated. Turn’s wedge: two blocks, two jobs. Math confirm: `domain_def` law vs a property like surjective.

## Scene 1: The experience

Duration: 18s

Say:

> Hi friends, welcome back.
> Think about a car listing.
> “Electric” is a property you can ask about this particular car.
> “The brakes must work” is not optional — every valid car has to satisfy it.
> Mathematical structures have the same split.
> Some facts are adjectives we may or may not require.
> Other facts are laws every instance must obey.
> If a formal file mixes those together, the reader gets lost.

Show on screen:

Split columns: “optional tag” vs “always enforced rule” (generic).

Visual notes:

L5: validation rule vs classification label.

## Scene 2: The Turn wedge

Duration: 12s

Say:

> Turn-Lang puts both inside `Function`, but in separate blocks.
> `properties` — adjectives you attach when you care.
> `laws` — what every function instance must satisfy, including how `apply` behaves.
> You read both in the chapter file — side by side.

Show on screen:

Split view: `properties {` and `laws {` headers — scroll slowly.

Visual notes:

Contrast headers before bodies.

## Scene 3: Math confirm and close

Duration: 10s

Say:

> `domain_def` is a law: plug in from the domain, land in the range.
> Surjective is a property: you ask whether this particular map is onto.
> Same file, two blocks — link to full chapter below.

Show on screen:

```turn
    laws {
        domain_def {
            forall a in domain |- apply(a) in range
        }
    }
```

Contrast with `surjective: Prop` above.

Visual notes:

Whole `Function` in outline at close.

## Final Takeaway

Turn separates optional `properties` from always-on `laws` — read both blocks in the real `Function` structure.

## Audience lanes

- **L0 / Refresh:** labels vs must-hold rules.
- **L1–L2 Core:** read `domain_def` and one property.
- **L3–L4:** structure design; compare to flat axiom lists.
- **L5 Work:** validation rules vs tags on models.
- **Educators:** where to look before proving.
- **Self-learners:** demystify “why two blocks.”
