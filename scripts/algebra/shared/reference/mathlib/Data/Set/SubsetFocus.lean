-- /Users/johndoe/Documents/company/basic_ui/video_ops/script/shared/reference/mathlib/Data/Set/SubsetFocus.lean
-- Subset compare excerpt (membership / Set α from sets-v2-01-set)

namespace Set

protected def Subset (s₁ s₂ : Set α) :=
  ∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂

instance : LE (Set α) :=
  ⟨Set.Subset⟩

instance : HasSubset (Set α) :=
  ⟨(· ≤ ·)⟩

theorem subset_def {s t : Set α} : (s ⊆ t) = ∀ x, x ∈ s → x ∈ t :=
  rfl

end Set
