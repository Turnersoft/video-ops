# Union — constructed set with a def law

Social title (English): 7. Union: in A or in B
Social title (China): 7. 并集：在 A 里或在 B 里
Promotional description: Union is not two boxes glued together. It is a third set: you are in it if you are in A or in B. Lean hangs ∪ on Set α; Turn names Union and writes law def. Episode 7 of Abstract Algebra in a Proof Assistant · #TurnLang #Lean4 #Mathlib #Union #SetTheory #FormalMethods #ProofAssistant

Format: **v4 animated-PPT beats** · Editor: `/video-ops/editor/07-union`

**Authoring:** edit [`animation.md`](./animation.md). It contains the spoken script, Lean/Turn-Lang code, highlights, visual notes, and Chinese captions. See [`../../../docs/animation-markdown-language.md`](../../../docs/animation-markdown-language.md).

Assumes viewer just watched [06-empty-subset-theorem](../06-empty-subset-theorem/script.md). **10 beats:** textbook set-builder → a third set, not a sentence → Lean’s `Set.union` plus `Union` wiring → `mem_union` unfolds → Turn names `Union` and writes `def` → where AATA unfolds `Union.def` → textbook vs Lean vs Turn → don’t treat `mem_union` as the model → the constructed set is still a set → next: intersection.

**Lean excerpt:** `Set.union` in `Mathlib/Data/Set/Defs.lean` — the “or” predicate; `mem_union` is the unfolding.
**Turn-Lang excerpt:** `structure Union<T, A, B>` inheriting `Set<T>`, with law `def` matching the classroom “or”.
