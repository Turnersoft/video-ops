# Bundle Conditions Once — Don't Copy the Same Definition Three Times

Playlist: turn-lang syntax highlight

Title: Bundle Conditions Once — Don't Copy the Same Definition Three Times

Promotional description: Textbooks repeat definitions; formal specs duplicate constraints. Turn reuses round brackets to bundle properties — one grammatical move, readable at scale.

Status: Script

Education core: L1–L2
Education refresh: L0 (bundling intuition)
Education work: none
Education horizon: L3 (syntax uniform for properties)
Patience: short (2 min)
Primary audience: Students, self-learners

Hook type: experience → turn-wedge → math-confirm
Turn wedge: `bijective: (surjective, injective)` bundle syntax

Series order: turn-lang syntax highlight #10

Builds on: syntax-09-function-properties-as-adjectives

Clip source: published/2026-6-17-  1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang.md (6:21–7:00, reframe)

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (`Function.bijective`, `Function.invertible`)

## Core Idea

The experience: maintaining three copies of the same idea drifts. Turn’s wedge: bundle adjectives with the same bracket syntax you use elsewhere. Math confirm: `bijective` line in the file.

## Scene 1: The experience

Duration: 18s

Say:

> Hi friends, welcome back.
> Imagine you are labeling a student as both “registered” and “paid.”
> You do not want to copy the whole definition of registered, then copy the whole definition of paid, every time you need “eligible.”
> You want to say: eligible means both labels together.
> That is the intuition behind bundling properties.
> In math, bijective is not a mysterious third thing — it is two adjectives traveling together.

Show on screen:

Three duplicate definition cards (conceptual) → one bundled card.

Visual notes:

No symbols yet. Use labels/checkmarks as the picture before `bijective`.

## Scene 2: The Turn wedge

Duration: 12s

Say:

> In this chapter, bijective is literally `(surjective, injective)` — one line.
> Same round-bracket idea when you attach several properties before a type.
> One syntax for “these conditions together” — that is how libraries stay readable.

Show on screen:

```turn
        @notation(adjective)
        bijective: (surjective, injective)
```

Expand surjective and injective in outline above.

Visual notes:

Stay on Function block only.

## Scene 3: Math confirm and close

Duration: 8s

Say:

> The underlying adjectives still have their own laws — you can prove them separately.
> The bundle is composition of names, not a wall of duplicated text.
> Full 1.2 video in the description.

Show on screen:

`invertible: Prop { ... }` briefly — tease pitfalls-05.

Visual notes:

Short close.

## Final Takeaway

Turn bundles properties with one bracket syntax — `bijective: (surjective, injective)` in the real file is the pattern.

## Audience lanes

- **L0 / Refresh:** “both adjectives together” before brackets.
- **L1–L2 Core:** read bundle line in properties block.
- **L3:** syntax uniformity as design principle.
- **Engineers:** tuple-of-constraints mental model.
- **Educators:** contrast with textbook repetition.
- **Visual learners:** outline tree with three sibling properties.
