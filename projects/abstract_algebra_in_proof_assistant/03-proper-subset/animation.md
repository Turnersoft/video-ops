---
videoOps: 1
scriptId: 03-proper-subset
title: 03_proper_subset
fps: 30
socialTitleEnglish: "3. Proper subset: ⊂ is the strict order of ⊆"
socialTitleChina: "3. 真子集：⊂ 就是 ⊆ 的严格序"
promotionalDescription: "Mathlib has no def SSubset on sets. ⊂ is the generic strict order: Preorder.lt is ≤ and not ≥, and on sets ≤ already means ⊆. Turn-Lang adds a proper variant: ordinary subset plus not SetEq."
promotionalDescriptionChina: "Mathlib 没有给集合直接写 def SSubset。⊂ 是通用严格序：Preorder.lt 是 ≤ 且非 ≥，集合上的 ≤ 已经是 ⊆。Turn-Lang 加一个 proper 变体：普通子集再加上不相等。"
format: landscape
width: 1920
height: 1080
---

# Scene 1: Proper subset — Lean vs Turn

<!--
layout: dual-panel
burn-captions: true
visual-notes: 15 beats — proper subset via order theory. Per-beat visualNotes on each compare beat.
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
display.editor-font-scale: 0.7
display.lean-editor-font-scale: 0.8
display.render-font-scale: 0.85
-->

## Overlay: textbook-proper-subset

<!--
type: textbook
aata-excerpt: sets-proper-subset-definition
placement: center
-->

## Beat 1: Continues sets-v2-02-subset

<!--
overlay: textbook-proper-subset
duration: 25.3
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

Hi friends, Welcome back.
Last clip was ordinary subset
Today, is about proper subset.
The textbook definition looks very simple,
But please be warned, that Lean is about to get 5x more difficult on this concept.
Because we don't have a direct concept of proper subset at all.
Let me show you how they actually do it.
### Lean

```lean
-- Textbook: A ⊊ B  ⇔  A ⊆ B  and  A ≠ B

-- Now search Mathlib for `def SSubset` on sets…
-- …there is none. Proper subset is never defined directly. 😳
```
### Lean highlights

- `there is none`
- `never defined directly`
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    },
    @notation({A} ~ " ⊊ " ~ {B})
    proper: Prop {
        |- {
            default(A, B);
            not SetEq(A, B);
        }
    }
}
```
### Turn highlights

- `proper`
- `⊊`
### Chinese

大家好，欢迎回来。上期是普通子集。今天讲真子集。课本定义很简单，但 Lean 没有直接定义这一概念，难度会高很多。来看它实际怎么做的。
### Visual notes

Continues sets-v2-02-subset. Textbook overlay center. Hook: Lean has no proper-subset def — glow Turn ⊊ vs Lean “never defined directly”.

## Beat 2: Turn: as before (beat-0 block)

<!--
duration: 23
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

it look like subset to start with.
But nowhere in the library is proper subset spelled out.
Instead Lean call out an exotic theory called order theory, where the the strict subset symbol will be binded there instead, (not in the set theory folder).
Let me pull up the real source code here.
### Lean

```lean
-- Question: where is Lean's definition of ⊂ (proper subset)?
-- Surprise: there isn't one written for sets.
-- ⊂ is inherited from generic order theory. Let's trace it.
```
### Lean highlights

- `⊂`
- `there isn't one`
### Turn

```turn
as before
```
### Chinese

看起来仍像子集，但库里从未写清真子集。Lean 借用序理论，严格子集符号在那里绑定，不在集合论文件夹。我来拉出真正的源码。
### Visual notes

Turn: as before (beat-0 block). Lean: order-theory reveal — no full Mathlib paste yet.

## Beat 3: Turn: as before

<!--
duration: 30.8
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

Quick recap from last clip.
We implemented the LE instance so we could write less-than-or-equal sign on two sets to mean a subset relation, and back then it just looked like a notation convention.
But that one instance is what makes subset an order operation on sets, and today we will tell the full story.
So keep this in mind, subset is modelled by less-than-or-equal-to.
### Lean

```lean
-- Mathlib source: mathlib4/Mathlib/Data/Set/Defs.lean (recap from last clip)
  protected def Subset (s₁ s₂ : Set α) :=
    ∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂

  instance : LE (Set α) :=
    ⟨Set.Subset⟩          -- last clip: looked like notation; really declares ≤ = ⊆
```
### Lean highlights

- `instance : LE (Set α)`
- `⟨Set.Subset⟩`
### Turn

```turn
as before
```
### Chinese

快速回顾上期：LE 实例让两集合的 ≤ 表示子集，当时像记号约定，实则把子集建成集合上的序。记住：≤ 就是 ⊆。
### Visual notes

Turn: as before. Lean: Defs.lean recap — glow instance LE / ⟨Set.Subset⟩.

## Beat 4: Turn: as before

<!--
duration: 37.8
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

Now for proper subset.
Just like Membership held the in operator last time, two built-in typeclasses hold the meaning of ordering.
LT holds less-than symbol, and HasSSubset holds the strict subset symbol.
But Look closely, they are both  just empty template for notation.
We still don't have the logical statement about proper subset.
and the instinct here is to model proper subset using less-than operator
so should we just go ahead and  implement LT on set to finish the job?
### Lean

```lean
-- Lean core source: lean4/src/Init/Prelude.lean

--   class LT (α : Type u) where
--     lt : α → α → Prop

-- Lean core source: lean4/src/Init/Core.lean

--   class HasSSubset (α : Type u) where
--     SSubset : α → α → Prop

--   infix:50 " ⊂ " => SSubset
```
### Lean highlights

- `lean4/src/Init/Prelude.lean`
- `class LT`
- `lean4/src/Init/Core.lean`
- `class HasSSubset`
- `SSubset`
- `" ⊂ " => SSubset`
### Turn

```turn
as before
```
### Chinese

真子集方面，LT 承载 <，HasSSubset 承载 ⊂，但都只是空槽，还没有真子集的逻辑表述。直觉是在 Set 上实现 LT 来完成吗？
### Visual notes

Turn: as before. Lean: Init.Prelude LT + Init.Core HasSSubset empty slots; glow ⊂ infix.

## Beat 5: Turn: as before

<!--
duration: 62.1
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

the answer is no!
Mathematically, Set plays many roles, and in Mathlib those roles form many hierarchys of typeclasses
When your roles fit in one of its hierarchy, you should only implement the most specific one, and everything upstream in the hierarchy will just apply automatically.
SO LT is too far upstream to implement directly.
And in this LT hierachy, The most specific typeclass is Boolean algebra, and Boolean algebra extends distributive lattice, which extends lattice, then semilattice, then partial order, and finally preorder, and preorder extends LT.
That's why we implement Boolean algebra on Set, instead of LT, and the less-than method comes down from LT from the hierarchy.
this is how turn-lang model hierarchy, but it is quite different and we will talk about it in later videos
### Lean

```lean
-- Where does < come from? Follow the `extends` ladder
-- (Order/BooleanAlgebra, Order/Lattice.lean, Order/Defs.lean):
--   BooleanAlgebra α  extends  DistribLattice α, HasCompl α, …
--   DistribLattice α  extends  Lattice α
--   Lattice α         extends  SemilatticeSup α, SemilatticeInf α
--   SemilatticeSup α  extends  PartialOrder α
--   PartialOrder α    extends  Preorder α      -- ← Preorder owns <
--   Preorder α        extends  LE α, LT α

-- Set α's most specific role is BooleanAlgebra — so < comes for free.
```
### Lean highlights

- `BooleanAlgebra α  extends  DistribLattice α`
- `PartialOrder α    extends  Preorder α`
- `Preorder owns <`
- `most specific role is BooleanAlgebra`
### Turn

```turn
as before
```
### Chinese

不要！集合在 Mathlib 有多重角色和类型类层级。应只实现最具体的 BooleanAlgebra，< 从 Preorder 层级传下来，而不是直接实现 LT。
### Visual notes

Turn: as before. Lean: extends ladder — BooleanAlgebra is Set’s most specific role; Preorder owns <.

## Beat 6: Turn: as before

<!--
duration: 33.2
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

And if you look at the typeclass Preorder which is the second to last at the middle of the hierarchy,
Here it define what less-than mean,
And remember, to truly implement a typeclass, we need to have actualy implementation for every methods inside a typeclass.
But here, less-than has a default definition.
So [here] this one line is the source statement of proper subset, but it has nothing to do with set yet.
### Lean

```lean
-- Mathlib source: mathlib4/Mathlib/Order/Defs.lean

class Preorder (α : Type u) extends LE α, LT α where
  le_refl  : ∀ a : α, a ≤ a
  le_trans : ∀ a b c : α, a ≤ b → b ≤ c → a ≤ c
  lt := fun a b => a ≤ b ∧ ¬b ≤ a
  lt_iff_le_not_le : ∀ a b : α, a < b ↔ a ≤ b ∧ ¬b ≤ a := by intros; rfl
```
### Lean highlights

- `mathlib4/Mathlib/Order/Defs.lean`
- `Preorder`
- `lt := fun a b => a ≤ b ∧ ¬b ≤ a`
### Turn

```turn
as before
```
### Chinese

看 Preorder：这里用默认式定义 < 的含义。a≤b 且非 b≤a——这是真子集的源头，此时与集合无关。
### Visual notes

Turn: as before. Lean: Order/Defs Preorder.lt default — glow lt := a ≤ b ∧ ¬b ≤ a.

## Beat 7: Turn: as before

<!--
duration: 51.8
font.editor: 0.7000000000000001
font.lean: 0.7000000000000001
font.render: 0.8500000000000001
allow-script-change: false
-->

so! we just need to implment boolean algebra on set.
notice we we just overide the LT method
and be careful we must override with the same shape of function because method in typeclass have a prescribed type.
and here we can replace less-than-or-equal with subset and lean allows it because the former is built using the latter.
So now less-than finally have the proper subset meaning.
but it is not an implication yet. it is a function.
Lastly, HasSSubset binds the strict subset symbol to less-than.
but we are not done, yet, in order for lean to use the proper subset symbol without calling .lt from a set, mathlib creates 2 theorems
### Lean

```lean
-- The layer that's easy to miss: Set doesn't build this — it INHERITS it.
-- Set α := α → Prop, and Prop is a BooleanAlgebra, so α → Prop is one
-- pointwise. Set pulls it in with `inferInstance`, then relabels fields:

-- Mathlib source: mathlib4/Mathlib/Order/BooleanAlgebra/Set.lean
instance instBooleanAlgebra : BooleanAlgebra (Set α) :=
  { (inferInstance : BooleanAlgebra (α → Prop)) with
    le  := (· ≤ ·),                    -- ≤ is ⊆
    lt  := fun s t => s ⊆ t ∧ ¬t ⊆ s,  -- < is ⊆ and not ⊇
    sup := (· ∪ ·),  inf := (· ∩ ·),
    compl := (·ᶜ),  top := univ,  bot := ∅,  sdiff := (· \ ·) }

instance : HasSSubset (Set α) :=
  ⟨(· < ·)⟩                            -- ⊂ is <
```
### Lean highlights

- `inferInstance : BooleanAlgebra (α → Prop)`
- `instBooleanAlgebra`
- `lt  := fun s t => s ⊆ t ∧ ¬t ⊆ s`
- `instance : HasSSubset (Set α)`
- `⟨(· < ·)⟩`
### Turn

```turn
as before
```
### Chinese

在 Set 上继承 Boolean algebra 并覆写 lt：s⊆t 且非 t⊆s；HasSSubset 把 ⊂ 绑到 <。还需两个定理把课本表述和定义连在一起。
### Visual notes

Turn: as before. Lean: BooleanAlgebra/Set — inferInstance from α→Prop; lt := ⊆∧¬⊇; HasSSubset wires ⊂.

## Beat 8: Turn: as before

<!--
duration: 34
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

because only these 2 theorems put the Proper Subset and Subset in one statement
Notice the second one is the one introduced in the textbook
the first theorem is copied from the lt method.
the second theorem is what textbook articulated.
That rfl means try to proof by reflexivity, which try to find theorem that matches the goal or the reduced form of the goal.
In this case this theorem is just Lt from our boolean algebra implementation
### Lean

```lean
-- Mathlib source: mathlib4/Mathlib/Data/Set/Basic.lean
namespace Set
variable {α : Type u} {s t : Set α}

theorem ssubset_def : (s ⊂ t) = (s ⊆ t ∧ ¬t ⊆ s) :=
  rfl                       -- true BY DEFINITION, not via a proof

protected theorem ssubset_iff_subset_ne :
  s ⊂ t ↔ s ⊆ t ∧ s ≠ t
```
### Lean highlights

- `ssubset_def`
- `rfl`
- `BY DEFINITION`
- `ssubset_iff_subset_ne`
- `s ⊆ t ∧ s ≠ t`
### Turn

```turn
as before
```
### Chinese

两个定理把真子集与子集放在同一陈述里；ssubset_def 用 rfl 证明，因为两边按定义相等。
### Visual notes

Turn: as before. Lean: Basic.lean — ssubset_def rfl + ssubset_iff_subset_ne textbook bridge.

## Beat 9: Turn: as before

<!--
duration: 28.6
font.editor: 0.7000000000000001
font.lean: 0.65
font.render: 0.8500000000000001
allow-script-change: false
-->

So this is the full picture.
The strict subset symbol lives in Lean's kernel, and the meaning of strict less-than lives in Preorder in Mathlib's order theory.
for Set, Mathlib does not redefine anything. It inherits the whole Boolean algebra into set,
And finally make the proper subset symbol unwrap to the less than operation
So across many theories, proper subset finally emerges
### Lean

```lean
-- 1. Lean core (lean4/src/Init/Core.lean) — the symbol slot
--   class HasSSubset (α) where SSubset : α → α → Prop
--   infix:50 " ⊂ " => SSubset

-- 2. Mathlib (mathlib4/Mathlib/Order/Defs.lean) — the meaning of <
--   class Preorder extends LE α, LT α where
--     lt := fun a b => a ≤ b ∧ ¬b ≤ a

-- 3. Mathlib (Order/BooleanAlgebra/Set.lean) — Set inherits it ALL from α → Prop:
instance instBooleanAlgebra : BooleanAlgebra (Set α) :=
  { (inferInstance : BooleanAlgebra (α → Prop)) with
    le := (· ≤ ·), lt := fun s t => s ⊆ t ∧ ¬t ⊆ s, sup := (· ∪ ·), compl := (·ᶜ) }

instance : HasSSubset (Set α) := ⟨(· < ·)⟩
```
### Lean highlights

- `class HasSSubset`
- `lt := fun a b => a ≤ b ∧ ¬b ≤ a`
- `inferInstance : BooleanAlgebra (α → Prop)`
- `instBooleanAlgebra`
- `⟨(· < ·)⟩`
### Turn

```turn
as before
```
### Chinese

完整图景：⊂ 符号在 Lean 内核，< 含义在 Preorder，Set 继承 Boolean algebra 后真子集自然出现。
### Visual notes

Turn: as before. Lean: three-file summary (Core + Defs + Set.lean).

## Beat 10: Turn: as before

<!--
duration: 34.1
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

So the question is, why does lean do that?
And The surprising answer is this allow proper subset to reuse theorems from theorem directly.
for example
subset has the property of being reflexive, transitive, and it is antisymmetric,
Proper subset is precisely a strict order becasue it is irreflexive
and all there properties are already proven for the order theory operation like the less-than operation.
so this is very time-saving
### Lean

```lean
-- "Free lemmas" is a side effect. The real reason: ⊆ IS a partial order.
--   le_refl     : s ⊆ s
--   le_trans    : s ⊆ t → t ⊆ u → s ⊆ u
--   le_antisymm : s ⊆ t → t ⊆ s → s = t     -- this is set extensionality!

-- And every partial order induces exactly ONE strict order:
theorem lt_iff_le_and_ne : a < b ↔ a ≤ b ∧ a ≠ b
-- On sets that reads:  s ⊂ t ↔ s ⊆ t ∧ s ≠ t
-- So ⊂ is not borrowed from < — it IS the strict order of ⊆.
```
### Lean highlights

- `le_antisymm : s ⊆ t → t ⊆ s → s = t`
- `set extensionality`
- `lt_iff_le_and_ne`
- `it IS the strict order of ⊆`
### Turn

```turn
as before
```
### Chinese

为什么值得？⊆ 是偏序，真子集是其严格序，序理论引理（不可自反、传递、⊆/⊂ 链式等）自动可用；注意任意集合在 ⊂ 下并非 well-founded。
### Visual notes

Turn: as before. Lean: partial-order payoff — le_antisymm / lt_iff_le_and_ne; ⊂ IS strict order of ⊆.

## Beat 11: Turn: as before

<!--
duration: 10.1
font.editor: 0.6000000000000001
font.lean: 0.7000000000000001
font.render: 0.8500000000000001
allow-script-change: false
-->

so just to show them on the screen, if you were to define they manully for proper subset.
and it looks like we don't want to do that.
### Lean

```lean
-- Does ⊂ carry enough to be worth it? These fire on sets constantly:
theorem lt_irrefl       (s : Set α) : ¬ s ⊂ s
theorem lt_asymm        : s ⊂ t → ¬ t ⊂ s
@[trans] theorem lt_trans       : s ⊂ t → t ⊂ u → s ⊂ u
@[trans] theorem lt_of_le_of_lt : s ⊆ t → t ⊂ u → s ⊂ u   -- chain ⊆ then ⊂
@[trans] theorem lt_of_lt_of_le : s ⊂ t → t ⊆ u → s ⊂ u   -- chain ⊂ then ⊆

-- + Set α is a complete Boolean algebra: ∪ / ∩ are ⊆-monotone,
--   complement flips strict order:  s ⊂ t ↔ tᶜ ⊂ sᶜ
-- caveat: Set α is NOT well-founded under ⊂ (∞ descending chains),
--         so ⊂-strong-induction is a Finset / finite-set tool.
```
### Lean highlights

- `lt_irrefl`
- `lt_of_le_of_lt`
- `lt_of_lt_of_le`
- `tᶜ ⊂ sᶜ`
- `NOT well-founded`
### Turn

```turn
as before
```
### Chinese

若手写在 Set 上重复定义真子集及其引理，工作量很大——我们不想那样做。
### Visual notes

Turn: as before. Lean: strict-order toolkit lemmas; NOT well-founded caveat in comment.

## Beat 12: Turn: NEW — Subset default only (no proper yet)

<!--
duration: 18.7
font.editor: 0.75
font.lean: 0.65
font.render: 0.8500000000000001
allow-script-change: false
-->

So now let's compare with Turn-Lang.
Last clip we introduced relation Subset with a default variant for just the ordinary subset.
Now the PropModified lets you put several variants that shares a single relation name.
### Lean

```lean
-- 1. Lean core (lean4/src/Init/Core.lean) — the symbol slot
--   class HasSSubset (α) where SSubset : α → α → Prop
--   infix:50 " ⊂ " => SSubset

-- 2. Mathlib (mathlib4/Mathlib/Order/Defs.lean) — the meaning of <
--   class Preorder extends LE α, LT α where
--     lt := fun a b => a ≤ b ∧ ¬b ≤ a

-- 3. Mathlib (Order/BooleanAlgebra/Set.lean) — Set inherits it ALL from α → Prop:
instance instBooleanAlgebra : BooleanAlgebra (Set α) :=
  { (inferInstance : BooleanAlgebra (α → Prop)) with
    le := (· ≤ ·), lt := fun s t => s ⊆ t ∧ ¬t ⊆ s, sup := (· ∪ ·), compl := (·ᶜ) }

instance : HasSSubset (Set α) := ⟨(· < ·)⟩
```
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    }
}
```
### Turn highlights

- `relation Subset`
- `default`
- `PropModified`
### Chinese

对比 Turn-Lang：上期有 relation Subset 的 default 变体；PropModified 让多个变体共享同一关系名。
### Visual notes

Turn: NEW — Subset default only (no proper yet). Lean: as before (3-file summary).

## Beat 13: Turn: full proper + SetEq block

<!--
duration: 74.1
font.editor: 0.7000000000000001
font.lean: 0.65
font.render: 0.8500000000000001
allow-script-change: false
-->

So for proper subset we will jsut put in a variant called "proper" which reuses default version and adds a not SetEq statement.
and SetEq is just a mutual subset relation between A and B, which we will formalize in the next video  when we talk about equality systematically ......
.....
So Turn-Lang states this very explicitly, but does it no worry about the same problem Lean has?
the answer is yes, we still have the same work to do, but not now.
So as we came across more perspectives on what a set essentially is in other you know more foundamental theory, we will add all of  these pespectives to the turn-lang structure of Set using special blocks inside the structure block.
And you will see them when we get there
But for now we want to keep our mind focused because that is the most helpful way to appreciate the concept itself without worry about the modelling underneath.
And that's what only turn-lang allows us to do
### Lean

```lean
as before
```
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    },
    @notation({A} ~ " ⊊ " ~ {B})
    proper: Prop {
        |- {
            default(A, B);
            not SetEq(A, B);
        }
    }
}

relation SetEq(T: Any, A B: Set<T>): Prop {
    |- {
        Subset(A, B);
        Subset(B, A);
    }
}
```
### Turn highlights

- `proper`
- `default(A, B)`
- `not SetEq(A, B)`
- `SetEq`
### Chinese

真子集用 proper 变体：复用 default 并加 not SetEq。Turn 写得很直白；底层多视角建模以后再加。
### Visual notes

Turn: full proper + SetEq block. Lean: as before.

## Beat 14: CTA next clip

<!--
duration: 5.7
font.editor: 0.7000000000000001
font.lean: 0.65
font.render: 0.8500000000000001
allow-script-change: false
-->

Next clip is set equality.
Please leave a Comment if you are stuck at any step, see you in the next one.
### Lean

```lean
as before
```
### Lean highlights

- `class HasSSubset`
- `lt := fun a b => a ≤ b ∧ ¬b ≤ a`
### Turn

```turn
as before
```
### Turn highlights

- `proper`
- `default`
### Chinese

下期讲集合相等。卡住请留言，下期见。
### Visual notes

CTA next clip. Both panes: as before; optional glow Turn proper.
