# Theorem — empty set is subset of every set

Playlist: abstract algebra: formalized from scratch with turn-lang — script_v2 serial

Title: Theorem — empty set is subset of every set

Promotional description: One Judson §1.2 idea from the Sets lecture, split for filming. Textbook beat → your intuition on camera → Lean 4 vs Turn-Lang compare. Teleprompter lives below the editor canvas.

Status: Script

Education core: L1–L2
Patience: short (~90s)
Hook type: textbook → intuition → compare
Turn wedge: named structures and relations match Judson bold terms

Series order: script_v2 sets #06-empty-subset-theorem

Builds on: (published) 2026-5-26-  1.1 Sets: Abstract Algebra formalized from scratch with Turn-Lang

Source file: `script/shared/reference/02_sets_and_equivalence_relations.turn`

Lean source: `script/shared/reference/judson_sets.lean`

Filming: use `/video-ops/editor/sets-v2-06-empty-subset-theorem` — script panel under canvas; overlay off.

## Scene 1: Textbook anchor

Duration: 14s

Say:

> Open the book — Judson Abstract Algebra, section one point two, Sets.
> The empty set is a subset of every set.
> This is the bold definition we are formalizing today — one clip, one idea.

Show on screen:

Textbook beat on math board: Judson §1.2 — ∅ ⊆ S

Visual notes:

math-focus only. No code.

## Scene 2: Intuition — your voice

Duration: 20s

Say:

> Vacuous truth: to show ∅ ⊆ S, assume x ∈ ∅ — contradiction.
> Good first reductio proof in the chapter.
> We model as theorem for practice, not only as axiom.

Show on screen:

Chapter beat — short labels matching your spoken intuition.

Visual notes:

Film yourself; canvas stays on beat text. Script reads from panel below preview.

## Scene 3: Lean vs Turn compare

Duration: 28s

Say:

> Goal: Subset(EmptySet, S).
> Turn proof: unfold Subset, assume_not, use no_members.
> Lean: often bundled in library lemmas about empty.
> Clip focuses on statement shape, not full tactic replay.

Show on screen:

Side-by-side compare: Lean 4 (left) vs Turn-Lang (right).

Visual notes:

Caption beats sync editor highlights on both columns.

## Final Takeaway

Theorem — empty set is subset of every set: The empty set is a subset of every set. Turn names the formal object; Lean uses Mathlib lemmas — same meaning, different pedagogy.
