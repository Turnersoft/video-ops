# Beat Posters — 02-subset

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

## Beat 1: Textbook subset

### Title zh
课本：A 的元素都在 B 里

### English
Last clip formalized the set. Today is subset.

The textbook: `A` is a subset of `B` when every element of `A` is already in `B`.

### Chinese
上期把集合写清楚了。这期写子集。

课本：`A` 是 `B` 的子集，意思是 `A` 里的每个元素，都已经在 `B` 里。

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
Subset is not a new box.

### Next zh
子集不是一个新盒子

## Beat 2: A proposition, not a container

### Title zh
子集是命题，不是新容器

### English
Subset is not a new container. It is a proposition about two sets you already have.

`B` is not built from `A`.

### Chinese
子集不是新容器。它是关于两个已有集合的命题。

`B` 不是从 `A` 造出来的。

### Lean
```lean
def Set (α : Type u) := α → Prop
```

### Editor
lean

### Next en
Same Mathlib file as last clip. Subset sits on top.

### Next zh
还是上期那个 Mathlib 文件，子集叠在上面

## Beat 3: Same Set, Mem, Membership

### Title zh
还是 Set、Mem、Membership

### English
Same file as last clip: `def Set`, `Set.Mem`, and the `Membership` instance.

Subset is built on those three. No new membership story.

### Chinese
还是上期那三个：`def Set`、`Set.Mem`、`Membership` 实例。

子集叠在这上面。成员故事不用重写。

### Lean
```lean
def Set (α : Type u) := α → Prop

namespace Set
  protected def Mem (s : Set α) (a : α) : Prop := s a
  instance : Membership α (Set α) := ⟨Set.Mem⟩
```

### Editor
lean

### Next en
First line of the new def: two sets in, no set out.

### Next zh
新定义的第一行：进去两个集合，不造新集合

## Beat 4: Subset relates two sets

### Title zh
Subset 连的是两个集合

### English
`protected def Subset` takes `s₁` and `s₂`, both `Set α`.

It relates two sets. It does not create a third.

### Chinese
`protected def Subset` 吃 `s₁` 和 `s₂`，都是 `Set α`。

它连两个集合，不造第三个。

### Lean
```lean
namespace Set
  protected def Subset (s₁ s₂ : Set α) :=
```

### Editor
lean

### Next en
The body is the textbook rule.

### Next zh
函数体就是课本那句话

## Beat 5: The body is the textbook rule

### Title zh
函数体就是课本原句

### English
`∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂`. Every `a` in the first set is in the second.

The double braces make `a` instance-implicit, so Lean infers the element.

### Chinese
`∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂`。第一个集合里的每个 `a`，都在第二个里。

双花括号让 `a` 变成可推断参数，元素类型 Lean 自己补。

### Lean
```lean
namespace Set
  protected def Subset (s₁ s₂ : Set α) :=
    ∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂
```

### Editor
lean

### Next en
Those `∈` marks are still last clip's `Set.Mem`.

### Next zh
这些 `∈`，还是上期的 `Set.Mem`

## Beat 6: ∈ is still Set.Mem

### Title zh
∈ 还是上期那个

### English
The `∈` symbols still come from `Set.Mem`.

Subset is two membership facts, joined by implication.

### Chinese
这些 `∈` 还是来自 `Set.Mem`。

子集就是两条成员事实，中间加一个蕴含。

### Lean
```lean
protected def Subset (s₁ s₂ : Set α) :=
  ∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂
```

### Editor
lean

### Next en
Register `≤` so two sets can use an order symbol.

### Next zh
再注册 ≤，两个集合才能用序符号

## Beat 7: LE makes ≤ mean subset

### Title zh
LE 一接，≤ 就是子集

### English
Same idea as `Membership`. Implement `LE` on `Set α`, and `≤` means subset.

`⟨Set.Subset⟩` fills the only field.

### Chinese
跟 `Membership` 同一套路。在 `Set α` 上实现 `LE`，`≤` 就表示子集。

`⟨Set.Subset⟩` 填那一个字段。

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
`HasSubset` hangs the ⊆ glyph on that same `≤`.

### Next zh
`HasSubset` 把 ⊆ 挂到同一个 ≤ 上

## Beat 8: ⊆ is the same ≤

### Title zh
⊆ 和 ≤，展开是同一个定义

### English
`HasSubset` registers the subset glyph. It reuses the `LE` notation we just implemented.

So `A ≤ B` and `A ⊆ B` both desugar to `Set.Subset A B`.

### Chinese
`HasSubset` 注册子集符号，复用刚接上的 `LE` 记号。

所以 `A ≤ B` 和 `A ⊆ B` 展开都是 `Set.Subset A B`。

### Lean
```lean
instance : LE (Set α) := ⟨Set.Subset⟩
instance : HasSubset (Set α) := ⟨(· ≤ ·)⟩
-- A ≤ B and A ⊆ B → Set.Subset A B
```

### Editor
lean

### Next en
One def, two instances. That is Lean's subset.

### Next zh
一个定义，两个实例。Lean 的子集就这些

## Beat 9: Lean's subset in one file

### Title zh
Lean 的子集，一张图看完

### English
One def for the rule. Two instances: order symbol, subset symbol.

Both notations point at `Set.Subset`. The rule itself is the forall.

### Chinese
一个定义写规则。两个实例：一个接序符号，一个接子集符号。

两套记号都指向 `Set.Subset`。规则本身就是那个全称命题。

### Lean
```lean
-- mathlib4/Mathlib/Data/Set/Defs.lean
namespace Set
  protected def Subset (s₁ s₂ : Set α) :=
    ∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂
  instance : LE (Set α) := ⟨Set.Subset⟩
  instance : HasSubset (Set α) := ⟨(· ≤ ·)⟩
end Set
```

### Editor
lean

### Next en
Turn-Lang: same rule, declared as a relation.

### Next zh
Turn-Lang：同一条规则，写成关系

## Beat 10: Turn names the relation

### Title zh
Turn-Lang 把关系写在明面上

### English
Same rule, declared as `relation Subset`. It takes a type `T` and two sets `A B : Set<T>`.

`PropModified` means several proposition variants can share the name. The strict one is next clip.

### Chinese
同一条规则，写成 `relation Subset`。吃一个类型 `T`，再吃两个 `Set<T>`。

`PropModified` 表示好几个命题变体可以共用这个名字。严格的那个，下期再讲。

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
Same math. Different layout.

### Next zh
数学一样，版式不一样

## Beat 11: Same math, two layouts

### Title zh
同一句话，两种摆法

### English
Lean splits the def of `Subset` from its notation. Turn keeps the relation and `@notation` in one block.

Same forall. You read it in different places.

### Chinese
Lean 把 `Subset` 的定义和记号拆开。Turn 把关系和 `@notation` 放在同一块。

都是那个全称命题。你读到的位置不一样。

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
Next clip: proper subset — the strict version.

### Next zh
下期：真子集，严格的那种

## Beat 12: Next clip is proper subset

### Title zh
下期：真子集

### English
Ordinary subset is `A ⊆ B`. Proper subset adds that they are not the same set.

That is the next clip.

### Chinese
普通子集是 `A ⊆ B`。真子集还要加上：这两个集合不是同一个。

下期就讲这个。

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
Next: proper subset.

### Next zh
下期：真子集
