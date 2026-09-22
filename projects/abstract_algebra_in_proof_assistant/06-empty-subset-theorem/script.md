# Theorem — empty set is a subset of every set

Social title (English): 6. The empty set is a subset of every set
Social title (China): 6. 空集是任何集合的子集
Promotional description: The book calls ∅ ⊆ S obvious. Subset is an if-then, and empty never opens the if. We prove it by unfolding, then citing last clip’s `no_members` law. Episode 6 of Abstract Algebra in a Proof Assistant · #TurnLang #Lean4 #Mathlib #EmptySet #Subset #FormalMethods #ProofAssistant

Format: **v4 animated-PPT beats** · Editor: `/video-ops/editor/06-empty-subset-theorem`

**Authoring:** edit [`animation.md`](./animation.md). It contains the spoken script, Lean/Turn-Lang code, highlights, visual notes, and Chinese captions. See [`../../../docs/animation-markdown-language.md`](../../../docs/animation-markdown-language.md).

Assumes viewer just watched [05-empty-set](../05-empty-set/script.md). **10 beats:** textbook “obvious” line → subset is an implication (vacuous truth) → Lean unfolds `⊆` and `False` → `empty_subset` names that unfolding → Turn writes the classroom sentence → proof cites `EmptySet.no_members` → later proofs copy the lookup → textbook vs Lean vs Turn → don’t invent `theorem empty_subset(S)` in Turn → next: union.

**Lean excerpt:** `empty_subset` in `Mathlib/Data/Set/Basic.lean` — a corollary of `∅` as `False` and `⊆` as implication, not a new model.
**Turn-Lang excerpt:** theorem `"Empty subset of every set"` — unfold `Subset`, then `contradiction … by EmptySet.no_members`.

Recompute beat timings after editing spoken text, then open the editor.
