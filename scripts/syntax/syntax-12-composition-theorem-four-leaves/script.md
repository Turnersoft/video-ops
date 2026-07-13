# A Big Theorem Is a Folder — Not a Wall of Text

Playlist: turn-lang syntax highlight

Title: A Big Theorem Is a Folder — Not a Wall of Text

Promotional description: Monolithic theorem files bury which fact you need. Turn keeps related claims as named leaves inside one theorem — click the branch you want, like a document outline.

Status: Script

Education core: L1–L2
Education refresh: L0 (folder metaphor)
Education work: none
Education horizon: L3 (library maintainability)
Patience: short (2 min)
Primary audience: Students, educators, visual learners

Hook type: experience → turn-wedge → math-confirm
Turn wedge: one theorem, four named leaves in outline

Series order: turn-lang syntax highlight #12

Builds on: syntax-08-composition-pipeline-a-to-c

Clip source: published/2026-6-17-  1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang.md (9:02–10:00, reframe)

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (theorem `"composition's rules"`)

## Core Idea

The experience: four related facts, one overwhelming proof wall. Turn’s wedge: one theorem folder, independent leaves. Math confirm: `"composition's rules"` in the file.

## Scene 1: The experience

Duration: 18s

Say:

> Hi friends, welcome back.
> Imagine you open a textbook section called “rules for composition.”
> Inside it are several related facts.
> One fact says composition is associative.
> Another says injective functions stay injective.
> Another says surjective functions stay surjective.
> These belong together, but they are not the same proof.
> So the right mental model is not a wall of text — it is a folder with named pages.

Show on screen:

Generic “wall of text” proof vs folder icon with four tabs (conceptual).

Visual notes:

Cross-reference 1.1 Sets folder pattern verbally.

## Scene 2: The Turn wedge

Duration: 12s

Say:

> In this chapter, four composition facts live in one theorem — `"composition's rules"`.
> Associative, injective, surjective, bijective — each a named leaf with its own proof block.
> The outline is the navigation. You click the fact you need.

Show on screen:

```turn
theorem "composition's rules" {
    forall A B C D: Set<Any>,
    forall f: Function<A, B>,
    forall g: Function<B, C>,
    forall h: Function<C, D>,
    |- {
        associative: ... proof { ... };
        injective: ... proof { ... };
        surjective: ... proof { ... };
        bijective: ... proof { ... };
    }
}
```

Outline expanded to four leaves.

Visual notes:

Click `surjective` leaf — flash `unfold Function.surjective at goal`.

## Scene 3: Close

Duration: 8s

Say:

> Merging unrelated proofs helps nobody.
> Adding a fifth leaf does not rewrite the other four.
> That is how a proof library stays teachable — link to full file below.

Show on screen:

Outline tree collapsed then expanded.

Visual notes:

Inspiring: navigable library.

## Final Takeaway

Turn treats big theorems as folders — `"composition's rules"` is four independent leaves in one inspectable theorem.

## Audience lanes

- **L0 / Refresh:** folder metaphor.
- **L1–L2 Core:** map four book claims to four leaves.
- **L3:** maintainability — extend without rewriting.
- **Educators:** show where each fact is proved.
- **Visual learners:** outline tree is the diagram.
- **Proof-assistant users:** named subgoals without theorem sprawl.
