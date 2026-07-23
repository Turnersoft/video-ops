# Proper subset — variant on the same relation

Social title (English): 3. Proper Subset: why Lean doesn't model and name it directly?!
Social title (China): 3. Proper Subset：为什么 Lean 不直接建模并命名它？！
Promotional description: Hook: Proper subset feels obvious in a textbook — Lean often refuses to give it a first-class name. This episode explains why the proof assistant prefers the subset relation plus inequality, what that buys you, and how Turn-Lang still lets you say the idea clearly on camera. Series episode 3 · #TurnLang #Lean4 #Mathlib #ProperSubset #FormalMethods

Format: **v4 animated-PPT beats** · Editor: `/video-ops/editor/03-proper-subset`

**Teleprompter:** [`script-clean.md`](./script-clean.md). **Authoring:** edit beats in [`animation.json`](./animation.json) (v4). See [`../../docs/animation-beat-schema.md`](../../docs/animation-beat-schema.md).

Assumes viewer just watched [sets-v2-02-subset](../sets-v2-02-subset/script-clean.md). **11 beats:** textbook proper subset → hook (stricter relation) → Lean subset recap → lattice `lt` → `HasSSubset` → `ssubset_iff_subset_ne` → `ssubset_def` → full Lean picture → Turn `relation Subset` recap → `proper` ⊊ + `SetEq` → layout compare → set equality CTA.

**Lean excerpt:** `mathlib4/Mathlib/Data/Set/Basic.lean`
**Turn excerpt:** `script/shared/reference/02_sets_and_equivalence_relations.turn`
