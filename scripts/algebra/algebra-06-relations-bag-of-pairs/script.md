# Before Functions, You Need a Language for Allowed Pairs

Playlist: abstract algebra: formalized from scratch with turn-lang

Title: Before Functions, You Need a Language for Allowed Pairs

Promotional description: Textbooks jump to functions fast. Formal work starts with which ordered pairs you allow — Turn encodes that as one readable membership law on `Relation`.

Status: Script

Education core: L1
Education refresh: L0 (bag-of-pairs metaphor)
Education work: L5 (allowed input–output tuples — optional one line)
Education horizon: L2 (leads to Function)
Patience: short (2 min)
Work link: none
Primary audience: Undergraduate STEM students, visual conceptual learners

Hook type: experience → turn-wedge → math-confirm
Turn wedge: one `Subset` law on `Relation` — pairs enforced in the chapter file

Series order: abstract algebra: formalized from scratch with turn-lang #4

Builds on: (published) 2026-6-17-  1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang

Clip source: published/2026-6-17-  1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang.md (2:14–2:58, reframe)

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (`Relation`, `CartesianProduct`)

## Core Idea

The experience: you cannot talk about maps until you say which pairings are legal. Turn’s wedge: a relation is a set with one law — nothing outside the product. Math confirm: read `Subset(self, CartesianProduct<...>)` in the real file.

## Scene 1: The experience

Duration: 18s

Say:

> Hi friends, welcome back. This is Turner.
> Before we talk about functions, imagine a very simple table.
> On the left are inputs you might choose from A.
> On the right are outputs you might choose from B.
> A relation is just the list of pairings you allow.
> Not every possible pair has to be in the list — but every pair in the list must really be one A-object and one B-object.
> So the question is: how does Turn-Lang keep illegal pairs out of the bag?

Show on screen:

Simple A × B grid with a few highlighted pairs — no Turn file yet.

Visual notes:

3b1b-style grid first: two columns, then a highlighted subset of allowed arrows.

## Scene 2: The Turn wedge

Duration: 12s

Say:

> In Turn-Lang a relation is not a new species of object — it is a set with one membership law.
> Every member must already live inside the Cartesian product.
> Illegal pairs cannot sneak in. You read that contract in the source.

Show on screen:

Scroll to `structure Relation` — show `laws { subset { ... } }` before expanding body.

Visual notes:

Outline: Relation as Set.

## Scene 3: Math confirm

Duration: 12s

Say:

> Here is how that looks in this chapter.
> `Subset(self, CartesianProduct<[A, B]>)` — that is the formal name for “pairs you allow.”
> Functions refine this same object next — but first you need the bag.

Show on screen:

```turn
structure Relation<A B: Set<Any>>: Set<Any> {
    laws {
        subset {
            |- Subset(self, CartesianProduct<[A, B]>)
        }
    }
```

Flash `structure Function` header in outline — do not open body.

Visual notes:

Arrow Relation → Function in outline.

## Scene 4: Close

Duration: 6s

Say:

> Full chapter walkthrough in the long 1.2 video — link in description.
> Comment which pair you would forbid first in your own relation.

Show on screen:

File tab `02_sets_and_equivalence_relations.turn`.

Visual notes:

End card: full 1.2 video.

## Final Takeaway

Formalization starts with allowed pairs — Turn’s `Relation` enforces that with one `Subset` law you can read before functions enter the story.

## Audience lanes

- **L0 / Refresh:** bag-of-pairs metaphor; no quantifiers required.
- **L1–L2 Core:** read `Subset(self, CartesianProduct<[A, B]>)`.
- **L3 Horizon:** substrate for `well_defined` and `Function`.
- **L5 Work:** allowed (input, output) tuples in a table (one sentence).
- **Visual learners:** grid before symbols; outline edge to Function.
- **Educators:** one law, one screen — good first clip in the 1.2 series.
