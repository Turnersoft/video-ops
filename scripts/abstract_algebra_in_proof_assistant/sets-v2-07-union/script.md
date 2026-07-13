# Union — constructed set with a def law

Playlist: abstract algebra: formalized from scratch with turn-lang — script_v2 serial

Title: Union — constructed set with a def law

Promotional description: One Judson §1.2 idea from the Sets lecture, split for filming. Textbook beat → your intuition on camera → Lean 4 vs Turn-Lang compare. Teleprompter lives below the editor canvas.

Status: Script

Education core: L1–L2
Patience: short (~90s)
Hook type: textbook → intuition → compare
Turn wedge: named structures and relations match Judson bold terms

Series order: script_v2 sets #07-union

Builds on: (published) 2026-5-26-  1.1 Sets: Abstract Algebra formalized from scratch with Turn-Lang

Source file: `script/shared/reference/02_sets_and_equivalence_relations.turn`

Lean source: `script/shared/reference/judson_sets.lean`

Filming: use `/video-ops/editor/sets-v2-07-union` — script panel under canvas; overlay off.

## Scene 1: Textbook anchor

Duration: 14s

Say:

> Open the book — Judson Abstract Algebra, section one point two, Sets.
> A ∪ B = { x | x ∈ A or x ∈ B }.
> This is the bold definition we are formalizing today — one clip, one idea.

Show on screen:

Textbook beat on math board: Judson §1.2 — Union

Visual notes:

math-focus only. No code.

## Scene 2: Intuition — your voice

Duration: 20s

Say:

> Union produces a new set deterministically from A and B.
> Structure with generics A, B — not a relation.
> Def law matches textbook or exactly.

Show on screen:

Chapter beat — short labels matching your spoken intuition.

Visual notes:

Film yourself; canvas stays on beat text. Script reads from panel below preview.

## Scene 3: Lean vs Turn compare

Duration: 28s

Say:

> Textbook set-builder with or.
> Turn: Union structure + def law.
> Lean: mem_union_iff biconditional.
> Symbolic modeling: proposition defines behavior of the structure.

Show on screen:

Side-by-side compare: Lean 4 (left) vs Turn-Lang (right).

Visual notes:

Caption beats sync editor highlights on both columns.

## Final Takeaway

Union — constructed set with a def law: A ∪ B = { x | x ∈ A or x ∈ B }. Turn names the formal object; Lean uses Mathlib lemmas — same meaning, different pedagogy.
