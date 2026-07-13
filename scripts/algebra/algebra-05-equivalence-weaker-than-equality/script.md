# Equivalence Class Membership — Turn-Lang vs Lean 4

Playlist: abstract algebra: formalized from scratch with turn-lang

Title: Who Names the Bucket Better? Equivalence Class Membership

Promotional description: One concept: y belongs to the equivalence class of x if and only if x is related to y. Same textbook meaning — but Turn-Lang names `EquivalenceClass` with an explicit `def` law, while Lean hides the bucket inside `Setoid.eqvClass`. Side-by-side code + render, caption-synced highlights.

Status: Script

Education core: L1–L2
Education refresh: L0 (bucket = set of y tied to x)
Education work: L5 (equivalent states — optional)
Education horizon: L2 (partition — separate clip)
Patience: short (~1 min)
Work link: none
Primary audience: Algebra students comparing proof assistants

Hook type: one concept → compare → verdict
Turn wedge: `EquivalenceClass.def` mirrors set-builder notation line for line

Series order: abstract algebra: formalized from scratch with turn-lang #5

Builds on: (published) 2026-6-17-  1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (`EquivalenceClass.def`)

Lean source: `video_ops/script/shared/reference/equivalence_class_membership.lean` (`Setoid.eqvClass`)

## Core Idea (one concept only)

**Equivalence class membership:** for representative `x` and element `y`,

`y ∈ [x]  ↔  x ~ y`

Textbook set-builder: `[x] = { y ∈ X | x ~ y }`. This clip compares how Turn-Lang and Lean 4 spell that single biconditional — not the three laws, not partitions, not fractions.

## Scene 1: The concept — set-builder language

Duration: 16s

Say:

> Hi friends, welcome back. This is Turner.
> One concept today: membership in an equivalence class.
> Pick a representative x. The class is every y tied to x by the relation.
> Textbook set-builder: all y such that x is related to y.
> Formal membership: y is in the class of x if and only if x is related to y.
> That biconditional is the whole idea — nothing else in this clip.

Show on screen:

Manim-style math board: class notation → membership iff relation.

Visual notes:

math-board sequential reveal only. No code yet.

## Scene 2: Turn-Lang vs Lean — same biconditional

Duration: 32s

Say:

> Same concept in Turn-Lang and Lean — who reads closer to the textbook?
> Turn names the bucket: EquivalenceClass, with representative x and relation E.
> The def law is exactly set-builder membership: y in the class if and only if x is related to y.
> Lean packages the relation in a Setoid — the class is eqvClass x, a computed set.
> Membership is still a biconditional — but the bucket is not its own structure with an explicit law block.
> Lean proves it by unfolding eqvClass; Turn states the law where the book puts the definition.
> For teaching the meaning of equivalence class, Turn's named structure matches the book line for line.

Show on screen:

Side-by-side compare: Lean 4 (left) vs Turn-Lang (right). Caption beats on both sides.

Visual notes:

Caption beats highlight editor + render on both sides at each say line.

## Scene 3: Verdict — who is closer to the original meaning?

Duration: 14s

Say:

> Textbook: a set of y values, membership spelled as a biconditional with the relation.
> Turn: EquivalenceClass is that set, def law is the biconditional — visible in source and render.
> Lean: correct math, but eqvClass is infrastructure — you unfold to see the set-builder meaning.
> Verdict: Turn-Lang stays closer to how the concept is introduced on the page.

Show on screen:

math-board verdict beats: Textbook → Turn → Lean → Verdict.

Visual notes:

No code. Manim-style summary only.

## Final Takeaway

One concept: equivalence class membership. Both systems formalize `y ∈ [x] ↔ x ~ y`. Turn-Lang names the bucket and prints the law; Lean computes the class from a Setoid. For pedagogy aligned with Judson-style set-builder language, Turn is closer to the original meaning.

## Audience lanes

- **L0 / Refresh:** one bucket, one biconditional.
- **L1–L2 Core:** `y in self <-> [x y] in E` vs `y ∈ s.eqvClass x ↔ s x y`.
- **Visual learners:** math board → dual compare → verdict board.
