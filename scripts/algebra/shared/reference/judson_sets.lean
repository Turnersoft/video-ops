-- /Users/johndoe/Documents/company/basic_ui/video_ops/script/shared/reference/judson_sets.lean
import Mathlib.Data.Set.Basic

variable {α : Type u}

-- Subset: textbook "every element of A is in B".
theorem subset_def' (s t : Set α) : s ⊆ t ↔ ∀ ⦃x⦄, x ∈ s → x ∈ t :=
  Set.subset_def

-- Strict (proper) subset.
theorem ssSubset_def' (s t : Set α) : s ⊂ t ↔ s ⊆ t ∧ ¬ t ⊆ s := by
  simp [Set.ssubset_iff_subset_ne]

-- Extensionality via mutual subset (Judson set equality).
theorem Set.ext_iff' (s t : Set α) : s = t ↔ s ⊆ t ∧ t ⊆ s :=
  Set.ext_iff

-- Empty set has no members.
theorem not_mem_empty (x : α) : x ∉ (∅ : Set α) :=
  Set.not_mem_empty x

-- Union membership.
theorem mem_union_iff (x : α) (s t : Set α) : x ∈ s ∪ t ↔ x ∈ s ∨ x ∈ t :=
  Set.mem_union_iff

-- Intersection membership.
theorem mem_inter_iff (x : α) (s t : Set α) : x ∈ s ∩ t ↔ x ∈ s ∧ x ∈ t :=
  Set.mem_inter_iff

-- Disjoint: intersection is empty.
theorem disjoint_iff (s t : Set α) : Disjoint s t ↔ s ∩ t = ∅ :=
  Set.disjoint_iff_inter_eq_empty

-- Complement relative to universe `u`.
theorem mem_compl_iff (x : α) (s u : Set α) : x ∈ u \ s ↔ x ∈ u ∧ x ∉ s :=
  Set.mem_diff_iff

-- Set difference (same as relative complement when universe is fixed).
theorem mem_sdiff_iff (x : α) (s t : Set α) : x ∈ s \ t ↔ x ∈ s ∧ x ∉ t :=
  Set.mem_sdiff_iff
