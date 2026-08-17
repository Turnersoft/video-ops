# Beat Posters — 03-proper-subset

<!--
  Poster copy for the infographic album. This file — not animation.md — is the
  source of truth for poster text. Matched by beat number.

  Social / publish captions (per platform) live in social-posts.json under
  the "infographic" key — not in this file. Video captions use "english"/"china".

  Per beat:
    ### Title zh    Chinese title override (EN title comes from the heading)
    ### English     Body card copy, EN. `code` spans render highlighted.
    ### Chinese     Body card copy, ZH. `code` 会渲染成高亮。
    ### Next en     "Up next" hook override, EN
    ### Next zh     「下一篇」钩子，ZH
    ### Lean        (optional) fenced code block overriding the poster's Lean pane
    ### Turn-Lang   (optional) fenced code block overriding the poster's Turn pane
    ### Editor      (optional) `lean` or `turn` — pins which code pane to show

  A blank line inside English/Chinese starts a new text card (max 3).
  Keep each block to 1–2 short sentences — the card auto-fits font size,
  always staying larger than the code font.
  Any field left out falls back to auto-derived copy from animation.md.
-->

## Beat 1: No def SSubset on sets

### Title zh
课本很简单，Mathlib 没直接写

### English
Last clip was ordinary subset. Today is proper subset: `A ⊊ B` means `A ⊆ B` and `A ≠ B`.

Search Mathlib for `def SSubset` on sets — there isn't one. The concept is not defined directly.

### Chinese
上期是普通子集。这期是真子集：`A ⊊ B` 就是 `A ⊆ B` 并且 `A ≠ B`。

去 Mathlib 搜集合上的 `def SSubset`——没有。这个概念没有被直接定义。

### Lean
```lean
-- Textbook: A ⊊ B  ⇔  A ⊆ B  and  A ≠ B

-- Search Mathlib for `def SSubset` on sets:
-- there is none.
```

### Editor
lean

### Next en
So where is ⊂ actually bound?

### Next zh
那 ⊂ 到底绑在哪？

## Beat 2: ⊂ is bound in order theory

### Title zh
⊂ 绑在序理论，不在集合文件夹

### English
It still looks like subset. The library never spells out proper subset for sets.

Lean binds the strict-subset symbol in order theory, not in the set-theory folder.

### Chinese
看起来还是子集。库里没有给集合单独写清真子集。

严格子集符号绑在序理论里，不在集合论那个文件夹。

### Lean
```lean
-- Where is Lean's definition of ⊂ on sets?
-- There isn't one written for sets.
-- ⊂ is inherited from generic order theory.
```

### Editor
lean

### Next en
Remember last clip: ≤ on sets already means ⊆.

### Next zh
先记住上期：集合上的 ≤ 已经是 ⊆

## Beat 3: ≤ on sets already means ⊆

### Title zh
集合上的 ≤，就是 ⊆

### English
Last clip: the `LE` instance lets you write `≤` on two sets, and it means subset.

That instance is what makes subset an order on sets. Keep this: `≤` is `⊆`.

### Chinese
上期那个 `LE` 实例，让两个集合能写 `≤`，意思就是子集。

子集因此成了集合上的序。记住：`≤` 就是 `⊆`。

### Lean
```lean
protected def Subset (s₁ s₂ : Set α) :=
  ∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂

instance : LE (Set α) :=
  ⟨Set.Subset⟩
```

### Editor
lean

### Next en
`LT` and `HasSSubset` are notation slots, not the set statement.

### Next zh
`LT` 和 `HasSSubset` 只是记号槽，还不是集合上的那句话

## Beat 4: Two empty notation slots

### Title zh
两个记号槽，还没有那句话

### English
`LT` holds `<`. `HasSSubset` holds `⊂`. Both are empty templates for notation.

There is still no logical statement about proper subset on sets. Should we implement `LT` on `Set`?

### Chinese
`LT` 承载 `<`，`HasSSubset` 承载 `⊂`。两者都只是记号的空槽。

集合上的真子集命题还没写。要不要直接在 `Set` 上实现 `LT`？

### Lean
```lean
-- lean4/src/Init/Prelude.lean
class LT (α : Type u) where
  lt : α → α → Prop

-- lean4/src/Init/Core.lean
class HasSSubset (α : Type u) where
  SSubset : α → α → Prop
infix:50 " ⊂ " => SSubset
```

### Editor
lean

### Next en
No. Implement the most specific role, not `LT`.

### Next zh
不要。实现最具体的角色，别直接实现 LT

## Beat 5: Implement BooleanAlgebra, not LT

### Title zh
实现最具体的 BooleanAlgebra

### English
`Set` plays many roles in Mathlib. Those roles sit in typeclass hierarchies.

If you fit a hierarchy, implement the most specific class. For this ladder that is `BooleanAlgebra`. `LT` is too far upstream; `<` comes down from `Preorder`.

### Chinese
`Set` 在 Mathlib 里有多重角色，角色落在类型类层级上。

对得上某条层级，就只实现最具体的那个。这条梯子上是 `BooleanAlgebra`。`LT` 太靠上，`<` 从 `Preorder` 传下来。

### Lean
```lean
-- BooleanAlgebra α  extends  DistribLattice α
-- Lattice α         extends  SemilatticeSup α
-- PartialOrder α    extends  Preorder α
-- Preorder α        extends  LE α, LT α
-- Set's most specific role here: BooleanAlgebra
```

### Editor
lean

### Next en
Open `Preorder`. That default `lt` is the source line.

### Next zh
打开 Preorder。默认的 lt，就是源头那一行

## Beat 6: Preorder writes what < means

### Title zh
Preorder 写出 < 是什么意思

### English
`Preorder` gives `<` a default: `a ≤ b ∧ ¬ b ≤ a`.

That is the source statement of the strict order. It is not about sets yet.

### Chinese
`Preorder` 给 `<` 一个默认定义：`a ≤ b ∧ ¬ b ≤ a`。

这是严格序的源头那一行。这时候还跟集合无关。

### Lean
```lean
-- mathlib4/Mathlib/Order/Defs.lean
class Preorder (α : Type u) extends LE α, LT α where
  le_refl  : ∀ a : α, a ≤ a
  le_trans : ∀ a b c : α, a ≤ b → b ≤ c → a ≤ c
  lt := fun a b => a ≤ b ∧ ¬b ≤ a
```

### Editor
lean

### Next en
Set inherits Boolean algebra, then relabels `lt`.

### Next zh
Set 继承 Boolean algebra，再给 lt 换标签

## Beat 7: Set inherits, then relabels lt

### Title zh
Set 继承过来，再把 lt 写成子集

### English
`Set α` is `α → Prop`, and `Prop` is a `BooleanAlgebra`, so the function type already is one. Set pulls it in with `inferInstance`.

Then it relabels: `lt` is `s ⊆ t ∧ ¬ t ⊆ s`. `HasSSubset` binds `⊂` to `<`.

### Chinese
`Set α` 就是 `α → Prop`，`Prop` 已经是 `BooleanAlgebra`，函数类型点点继承。Set 用 `inferInstance` 接进来。

然后换标签：`lt` 写成 `s ⊆ t ∧ ¬ t ⊆ s`。`HasSSubset` 把 `⊂` 绑到 `<`。

### Lean
```lean
-- mathlib4/Mathlib/Order/BooleanAlgebra/Set.lean
instance instBooleanAlgebra : BooleanAlgebra (Set α) :=
  { (inferInstance : BooleanAlgebra (α → Prop)) with
    le := (· ≤ ·),
    lt := fun s t => s ⊆ t ∧ ¬t ⊆ s }

instance : HasSSubset (Set α) := ⟨(· < ·)⟩
```

### Editor
lean

### Next en
Two theorems put ⊂ next to ⊆.

### Next zh
两条定理，把 ⊂ 和 ⊆ 放在同一句话里

## Beat 8: Two theorems, one is the textbook

### Title zh
两条定理，一条就是课本

### English
`ssubset_def` says `s ⊂ t` equals `s ⊆ t ∧ ¬ t ⊆ s`. The proof is `rfl`: same by definition.

`ssubset_iff_subset_ne` is the textbook form: `s ⊆ t ∧ s ≠ t`.

### Chinese
`ssubset_def` 说 `s ⊂ t` 等于 `s ⊆ t ∧ ¬ t ⊆ s`。证明是 `rfl`：按定义就是同一件事。

`ssubset_iff_subset_ne` 才是课本写法：`s ⊆ t ∧ s ≠ t`。

### Lean
```lean
-- mathlib4/Mathlib/Data/Set/Basic.lean
theorem ssubset_def : (s ⊂ t) = (s ⊆ t ∧ ¬t ⊆ s) := rfl

protected theorem ssubset_iff_subset_ne :
  s ⊂ t ↔ s ⊆ t ∧ s ≠ t
```

### Editor
lean

### Next en
Three files, then ⊂ appears on sets.

### Next zh
三个文件走完，集合上才有 ⊂

## Beat 9: Three files, then ⊂ on sets

### Title zh
三个文件，集合上才出现 ⊂

### English
The `⊂` slot lives in Lean's core. The meaning of `<` lives in `Preorder`.

Set does not redefine the strict order. It inherits Boolean algebra, then unwraps `⊂` to `<`.

### Chinese
`⊂` 的槽位在 Lean 内核。`<` 的含义在 `Preorder`。

Set 没有重写严格序。它继承 Boolean algebra，再把 `⊂` 展开成 `<`。

### Lean
```lean
-- 1. Init/Core.lean — HasSSubset slot, infix ⊂
-- 2. Order/Defs.lean — Preorder.lt := ≤ ∧ ¬≥
-- 3. BooleanAlgebra/Set.lean — inherit, then ⊂ := <
instance : HasSSubset (Set α) := ⟨(· < ·)⟩
```

### Editor
lean

### Next en
Why bother? ⊆ is a partial order. ⊂ is its strict order.

### Next zh
图什么？⊆ 是偏序，⊂ 就是它的严格序

## Beat 10: ⊂ is the strict order of ⊆

### Title zh
⊂ 就是 ⊆ 的严格序

### English
`⊆` is reflexive, transitive, and antisymmetric. Antisymmetry here is set extensionality.

Every partial order induces one strict order. On sets that reads: `s ⊂ t ↔ s ⊆ t ∧ s ≠ t`.

### Chinese
`⊆` 自反、传递、反对称。这里的反对称就是集合外延。

每个偏序恰好诱导一个严格序。落到集合上：`s ⊂ t ↔ s ⊆ t ∧ s ≠ t`。

### Lean
```lean
-- le_refl / le_trans / le_antisymm on ⊆
-- le_antisymm : s ⊆ t → t ⊆ s → s = t

theorem lt_iff_le_and_ne : a < b ↔ a ≤ b ∧ a ≠ b
-- on sets: s ⊂ t ↔ s ⊆ t ∧ s ≠ t
```

### Editor
lean

### Next en
Those lemmas already exist. You would rather not rewrite them.

### Next zh
这些引理已经有了。你不会想手写一遍

## Beat 11: Lemmas you would rather not rewrite

### Title zh
这些引理，你不会想手写

### English
Irreflexive, asymmetric, transitive, and the mixed chains with `⊆` — already proved for `<`.

One caveat from the clip: `Set α` is not well-founded under `⊂`.

### Chinese
不自反、不对称、传递，还有和 `⊆` 混着走的链式——`<` 上已经证过。

这期有一句提醒：一般的 `Set α` 在 `⊂` 下并不是良基的。

### Lean
```lean
theorem lt_irrefl (s : Set α) : ¬ s ⊂ s
theorem lt_asymm : s ⊂ t → ¬ t ⊂ s
theorem lt_trans : s ⊂ t → t ⊂ u → s ⊂ u
-- Set α is NOT well-founded under ⊂
```

### Editor
lean

### Next en
Turn-Lang: one relation, several variants.

### Next zh
Turn-Lang：一个关系，几个变体

## Beat 12: PropModified shares the name

### Title zh
PropModified：几个变体共用一个名

### English
Last clip: `relation Subset` with a `default` variant for ordinary subset.

`PropModified` lets several variants share one relation name. Proper is the next variant.

### Chinese
上期：`relation Subset` 的 `default` 变体，就是普通子集。

`PropModified` 让几个变体共用一个关系名。真子集是下一个变体。

### Turn-Lang
```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    }
}
```

### Editor
turn

### Next en
`proper` reuses `default` and adds `not SetEq`.

### Next zh
proper 复用 default，再加上 not SetEq

## Beat 13: proper is default plus not SetEq

### Title zh
真子集：普通子集，再加不相等

### English
The `proper` variant reuses `default` and adds `not SetEq`. `SetEq` is mutual subset; next clip formalizes it.

Turn states the textbook condition in one block. The hierarchy work Lean did is still work — just not in this clip.

### Chinese
`proper` 变体复用 `default`，再加上 `not SetEq`。`SetEq` 就是互相包含，下期系统讲。

Turn 把课本条件写在一块。Lean 那套层级工作以后还要做，只是不在这期做。

### Turn-Lang
```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    },
    @notation({A} ~ " ⊊ " ~ {B})
    proper: Prop {
        |- { default(A, B); not SetEq(A, B); }
    }
}
```

### Editor
turn

### Next en
Next clip: set equality.

### Next zh
下期：集合相等

## Beat 14: Next clip is set equality

### Title zh
下期：集合相等

### English
Proper subset needed `SetEq`. Next clip is what `=` means on sets.

See you there.

### Chinese
真子集已经用到 `SetEq`。下期就讲集合上的 `=` 是什么意思。

下期见。

### Turn-Lang
```turn
relation SetEq(T: Any, A B: Set<T>): Prop {
    |- {
        Subset(A, B);
        Subset(B, A);
    }
}
```

### Editor
turn

### Next en
Next: set equality.

### Next zh
下期：集合相等
