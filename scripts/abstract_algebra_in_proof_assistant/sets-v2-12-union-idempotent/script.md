# Theorem — A ∪ A = A

Playlist: abstract algebra: formalized from scratch with turn-lang — script_v2 serial

Title: Theorem — A ∪ A = A

Promotional description: One Judson §1.2 idea from the Sets lecture, split for filming. Textbook beat → your intuition on camera → Lean 4 vs Turn-Lang compare. Teleprompter lives below the editor canvas.

Status: Script

Education core: L1–L2
Patience: short (~90s)
Hook type: textbook → intuition → compare
Turn wedge: named structures and relations match Judson bold terms

Series order: script_v2 sets #12-union-idempotent

Builds on: (published) 2026-5-26-  1.1 Sets: Abstract Algebra formalized from scratch with Turn-Lang

Source file: `script/shared/reference/02_sets_and_equivalence_relations.turn`

Lean source: `script/shared/reference/judson_sets.lean`

Filming: use `/video-ops/editor/sets-v2-12-union-idempotent` — script panel under canvas; overlay off.

## Scene 1: Textbook anchor

Duration: 14s

Say:

> Open the book — Judson Abstract Algebra, section one point two, Sets.
> Proposition 1.2.1 (1): A ∪ A = A.
> This is the bold definition we are formalizing today — one clip, one idea.

Show on screen:

Textbook beat on math board: Judson Prop 1.2.1 (i)

Visual notes:

math-focus only. No code.

## Scene 2: Intuition — your voice

Duration: 20s

Say:

> First leaf of the big proposition tree in the parent video.
> Proof unfolds SetEq and Union — case split on or.
> Turn block style keeps six parts in one theorem folder.

Show on screen:

Chapter beat — short labels matching your spoken intuition.

Visual notes:

Film yourself; canvas stays on beat text. Script reads from panel below preview.

## Scene 3: Lean vs Turn compare

Duration: 28s

Say:

> Statement: union with itself equals A.
> Turn: SetEq(Union(A,A), A) with proof block.
> Lean: extensionality + mem_union_iff chain.
> Micro-clip: statement + compare, not full 12-step proof.

Show on screen:

Side-by-side compare: Lean 4 (left) vs Turn-Lang (right).

Visual notes:

Caption beats sync editor highlights on both columns.

## Final Takeaway

Theorem — A ∪ A = A: Proposition 1.2.1 (1): A ∪ A = A. Turn names the formal object; Lean uses Mathlib lemmas — same meaning, different pedagogy.
