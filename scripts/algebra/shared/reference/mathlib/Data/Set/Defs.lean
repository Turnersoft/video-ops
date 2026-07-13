-- /Users/johndoe/Documents/company/basic_ui/video_ops/script/shared/reference/mathlib/Data/Set/Defs.lean
-- Excerpt from Mathlib/Data/Set/Defs.lean (mathlib4) — compare layout: Set + Mem only

def Set (α : Type u) := α → Prop

namespace Set

protected def Mem (s : Set α) (a : α) : Prop :=
  s a

end Set
