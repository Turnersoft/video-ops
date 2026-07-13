-- /Users/johndoe/Documents/company/basic_ui/video_ops/script/shared/reference/mathlib/Data/Set/SubsetCompare.lean
-- Excerpt from Mathlib/Data/Set/Defs.lean + Basic.lean — subset compare layout

def Set (α : Type u) := α → Prop

namespace Set

protected def Mem (s : Set α) (a : α) : Prop :=
  s a

instance : Membership α (Set α) :=
  ⟨Set.Mem⟩

protected def Subset (s₁ s₂ : Set α) :=
  ∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂

instance : LE (Set α) :=
  ⟨Set.Subset⟩

instance : HasSubset (Set α) :=
  ⟨(· ≤ ·)⟩

theorem subset_def {s t : Set α} : (s ⊆ t) = ∀ x, x ∈ s → x ∈ t :=
  rfl

end Set
