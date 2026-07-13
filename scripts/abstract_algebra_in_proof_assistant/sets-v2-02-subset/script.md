# Subset — relation, not a new set

Social title (English): 2. Subset: how Lean strive to bring in the ⊆ symbol!
Social title (China): 2. Subset：Lean 如何把 ⊆ 符号接进来！
Promotional description: Hook: Subset is a relation between two sets — not a new container. We walk Lean’s Subset / HasSubset wiring that earns the ⊆ symbol on screen, then show the Turn-Lang relation so the filmed explanation matches the formal obligation. Series: Abstract Algebra in a Proof Assistant · episode 2 · #TurnLang #Lean4 #Mathlib #FormalMethods #Subset

Format: **v4 animated-PPT beats** · Editor: `/video-ops/editor/sets-v2-02-subset`

**Teleprompter:** [`script-clean.md`](./script-clean.md). **Authoring:** edit beats in [`animation.json`](./animation.json) (v4). See [`../../docs/animation-beat-schema.md`](../../docs/animation-beat-schema.md).

Assumes viewer just watched [sets-v2-01-set](../sets-v2-01-set/script-clean.md). **12 beats:** textbook subset → hook (two sets, not a container) → Lean foundation recap → `protected def Subset` → `∀ ⦃a⦄` body → `∈` from `Set.Mem` → `instance LE` → `instance HasSubset` → full Lean picture → Turn `relation Subset` → layout compare → proper subset CTA.

**Lean excerpt:** `script/shared/reference/mathlib/Data/Set/Subset60sExcerpt.lean`
**Turn excerpt:** `script/shared/reference/turn/subset-relation.turn`
