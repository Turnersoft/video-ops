-- Textbook: a set is a well-defined collection; for each x we decide membership.

-- Mathlib source: mathlib4/Mathlib/Data/Set/Defs.lean
def Set (α : Type u) := α → Prop

namespace Set

def oddIntegers : Set Int :=
  fun n => n % 2 = 1

protected def Mem (s : Set α) (a : α) : Prop :=
  s a

-- Lean core source: lean4/src/Init/Prelude.lean

--   class Membership (α : outParam (Type u)) (γ : Type v) where
--     mem : γ → α → Prop

-- Lean core source: lean4/src/Init/Notation.lean

--   notation:50 a:50 " ∈ " b:50 => Membership.mem b a

-- Mathlib source: mathlib4/Mathlib/Data/Set/Defs.lean
-- Set α wires the Membership field to Set.Mem below.

instance : Membership α (Set α) :=
  ⟨Set.Mem⟩

example (s : Set α) (a : α) : Prop := a ∈ s

example (n : Int) : Prop := n ∈ oddIntegers

end Set
