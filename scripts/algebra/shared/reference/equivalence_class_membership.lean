-- /Users/johndoe/Documents/company/basic_ui/video_ops/script/shared/reference/equivalence_class_membership.lean
import Mathlib.Data.Setoid.Basic

variable {α : Type*} (s : Setoid α)

-- Textbook set-builder: the equivalence class of `x` is `{ y | s x y }`.
-- Membership is the relation itself, packaged inside `Setoid.eqvClass`.
-- This keeps the source readable in editors that do not support block comments.
-- The theorem below is the actual Lean statement shown in the clip.
theorem eqvClass_mem_iff (x y : α) :
  y ∈ s.eqvClass x ↔ s x y := by
  simp [Setoid.eqvClass]
