-- /Users/johndoe/Documents/company/basic_ui/video_ops/script/shared/reference/partition_equivalence.lean
import Mathlib.Data.Set.Basic

variable {α : Type*} (R : α → α → Prop)

-- Equivalence classes cover the domain when R is an equivalence relation.
theorem equivalence_classes_cover (h : Equivalence R) (a : α) :
    ∃ b, R a b := by
  use a
  exact h.refl a

example (h : Equivalence R) (a : α) :
    ∃ b, R a b := by
  obtain ⟨b, hb⟩ := equivalence_classes_cover h a
  exact ⟨b, hb⟩
