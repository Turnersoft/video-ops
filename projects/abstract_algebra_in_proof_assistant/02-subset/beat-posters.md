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

## Beat 1: The sentence you already say

### Title zh
课本那句：A 里的，都在 B 里

### English
Last time we made a set into a question. Today we compare two of them.

`A` is a subset of `B` when every element of `A` is already in `B`.

### Chinese
上期把集合写成一句问话。这期比较两个集合。

`A` 是 `B` 的子集，意思是：`A` 里的每个元素，本来就已经在 `B` 里。

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

## Beat 2: A sentence, not a new box

### Title zh
子集是一句话，不是新盒子

### English
Subset does not build a third set. It is a sentence about two sets you already have.

`B` is not assembled from `A`. You are only asking whether `A` sits inside `B`.

### Chinese
子集不会造出第三个集合。它是关于两个已有集合的一句话。

`B` 不是从 `A` 拼出来的。你只是在问：`A` 是不是待在 `B` 里面。

### Lean
```lean
def Set (α : Type u) := α → Prop
```

### Editor
lean

### Next en
You already have membership. Subset uses it twice.

### Next zh
“属于”已经有了。子集只是用两次

## Beat 3: You already have membership

### Title zh
“属于”已经有了

### English
Last clip gave us a set and the symbol `∈`.

Subset stands on that. No new story about belonging.

### Chinese
上期已经有了集合，也有了符号 `∈`。

子集就站在这上面。不用重讲“属于”是什么。

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
Two sets go in. No third set comes out.

### Next zh
进去两个集合，不造第三个

## Beat 4: Two sets in, no third set out

### Title zh
进去两个集合，不造第三个

### English
Subset takes two sets and relates them.

It does not manufacture a new collection. The output is a claim: yes, or no.

### Chinese
子集吃进两个集合，说出它们的关系。

它不新造一堆东西。出来的是一句断言：是，或不是。

### Lean
```lean
namespace Set
  protected def Subset (s₁ s₂ : Set α) :=
```

### Editor
lean

### Next en
The body is the sentence from class.

### Next zh
函数体就是课堂上那句话

## Beat 5: The body is the sentence from class

### Title zh
写下来，就是课堂上那句

### English
Every `a` in the first set is in the second.

That is the textbook line, written so you can check it element by element.

### Chinese
第一个集合里的每个 `a`，都在第二个里。

就是课本那一句，写成可以一个个核对的样子。

### Lean
```lean
namespace Set
  protected def Subset (s₁ s₂ : Set α) :=
    ∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂
```

### Editor
lean

### Next en
Those `∈` marks are last clip’s belonging.

### Next zh
这些 ∈，还是上期的“属于”

## Beat 6: If it is in A, it is in B

### Title zh
在 A 里，就在 B 里

### English
The `∈` symbols are still last clip’s belonging.

Subset is two membership facts, joined by “if … then …”.

### Chinese
这些 `∈` 还是上期那个“属于”。

子集就是两条成员事实，中间加一句“如果……那么……”。

### Lean
```lean
protected def Subset (s₁ s₂ : Set α) :=
  ∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂
```

### Editor
lean

### Next en
The ≤ you know from numbers can mean “inside”.

### Next zh
数字里的 ≤，在集合上可以表示“在里面”

## Beat 7: ≤ can mean “inside”

### Title zh
≤ 也可以表示“在里面”

### English
On numbers, `≤` means “no larger than”. On sets, the same mark can mean subset.

One order symbol, a new reading: inside, not smaller-as-a-number.

### Chinese
在数字上，`≤` 表示“不比它大”。在集合上，同一个记号可以表示子集。

还是序的符号，读法换成：在里面，不是数字上的更小。

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
⊆ is that same idea with the set symbol.

### Next zh
⊆ 就是同一件事，换上集合的符号

## Beat 8: ⊆ is the same idea

### Title zh
⊆ 和 ≤，说的是同一件事

### English
`A ⊆ B` is the subset glyph you already like.

It points at the same rule as `A ≤ B`: everything in `A` is already in `B`.

### Chinese
`A ⊆ B` 就是你喜欢的那个子集符号。

它和 `A ≤ B` 指向同一条规则：`A` 里的，本来就在 `B` 里。

### Lean
```lean
instance : LE (Set α) := ⟨Set.Subset⟩
instance : HasSubset (Set α) := ⟨(· ≤ ·)⟩
-- A ≤ B and A ⊆ B → Set.Subset A B
```

### Editor
lean

### Next en
One rule. Two ways to write it.

### Next zh
一条规则，两种写法

## Beat 9: One rule, two ways to write it

### Title zh
一条规则，两种写法

### English
One sentence for the mathematics. Two notations so you can write it as order or as subset.

The rule itself is still that “for every” from class.

### Chinese
数学就那一句。两套记号，让你既能写成序，也能写成子集。

规则本身，还是课堂上那个“对每一个”。

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
You can also write the relation in one block.

### Next zh
也可以把这层关系写在一块

## Beat 10: Write the relation in one place

### Title zh
把这层关系写在一块

### English
Same rule, declared as a relation between two sets.

The strict version — properly inside — waits for the next clip.

### Chinese
还是那条规则，写成两个集合之间的关系。

更严格的那种——真的在里面，而且不一样——留给下期。

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
数学一样，摆法不一样

## Beat 11: Same math, two layouts

### Title zh
同一句话，两种摆法

### English
One layout splits the rule from its symbol. The other keeps them in one block.

You are reading the same “for every”. Only the page looks different.

### Chinese
一种摆法把规则和符号拆开。另一种写在同一块。

读到的都是那个“对每一个”。变的只是版式。

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
Next: strictly inside.

### Next zh
下期：真的在里面

## Beat 12: Next: strictly inside

### Title zh
下期：真的在里面

### English
Ordinary subset is `A ⊆ B`. Proper subset adds: they are not the same set.

That extra honesty is the next clip.

### Chinese
普通子集是 `A ⊆ B`。真子集还要加一句：这两个集合不是同一个。

多出来的那句老实话，就是下期。

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
