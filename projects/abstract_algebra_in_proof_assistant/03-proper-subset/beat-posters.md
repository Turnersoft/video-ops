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

## Beat 1: The sentence from class

### Title zh

课堂上那句，你早就知道

### English

You already know this from class: `A ⊊ B` means `A` is inside `B`, and they are not the same set.

That is it. A textbook does not ask where the symbol lives.

### Chinese

课堂上你就会：`A ⊊ B` 表示 `A` 在 `B` 里面，并且不是同一个集合。

就这一句。课本不会问这个符号写在哪一页。

### Lean

```lean
-- From class:
--   A ⊊ B  ⇔  A ⊆ B  and  A ≠ B
```

### Editor

lean

### Next en

A computer cannot use “you know what I mean”.

### Next zh

电脑听不懂“你懂我意思”

## Beat 2: A computer needs the rule written down

### Title zh

电脑要检查，就得写成规则

### English

In class, the teacher fills in the gaps. A computer checking a proof cannot.

If nobody writes the rule, the computer does not have proper subset at all.

### Chinese

课堂上老师会补全没说清的地方。电脑检查证明，不会补。

没人写成规则，电脑那边就没有真子集。

### Lean

```lean
-- In class: you already know what ⊊ means.
-- On a computer: no written rule, no idea.
```

### Editor

lean

### Next en

Lean’s first surprise: that rule is missing.

### Next zh

Lean 的第一下：那条规则不见了

## Beat 3: Lean never wrote that classroom sentence

### Title zh

Lean 没把课堂上那句写下来

### English

Look for a line that says “proper subset means inside and not equal.” Lean’s set folder does not have it.

The sentence from class was never copied in. Lean will borrow a bigger toolkit to get it back.

### Chinese

去找“真子集 = 在里面并且不相等”这一行。Lean 的集合文件夹里没有。

课堂上那句没被抄进去。Lean 会借一套更大的工具，把它找回来。

### Lean

```lean
-- From class: A ⊊ B  ⇔  A ⊆ B  and  A ≠ B

-- In Lean’s set folder: there is no such line.
```

### Editor

lean

### Next en

Turn-Lang starts with the sentence from class.

### Next zh

Turn-Lang 从课堂上那句写起

## Beat 4: Turn writes the class sentence first

### Title zh

Turn-Lang 先写课堂上那句

### English

First difference. Turn-Lang writes what you said in class: inside, and not the same set.

No extra toolkit yet. The computer can still check it — the words are just where a student looks first.

### Chinese

第一个差别。Turn-Lang 写下课堂上那句：在里面，并且不是同一个。

还不用额外工具。电脑照样能检查——只是话写在学生先看见的地方。

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

Lean takes the long way. First, ⊆ already works like ≤.

### Next zh

Lean 走远路。先记住：⊆ 已经像 ≤

## Beat 5: ⊆ already works like ≤

### Title zh

⊆ 已经像数字里的 ≤

### English

Last time: on two sets, `≤` already means “inside.”

So subset is already an order, the way `≤` is an order on numbers. Keep this: `≤` means `⊆`.

### Chinese

上期：两个集合上写 `≤`，意思已经是“在里面”。

所以子集已经是一种序，就像数字里的 `≤`。记住：`≤` 就是 `⊆`。

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

In class, “inside” already feels like an order.

### Next zh

课堂上，“在里面”本来就像一种序

## Beat 6: In class, “inside” already feels like ≤

### Title zh

课堂上，“在里面”本来就像 ≤

### English

You already use three facts: every set is inside itself. If `A` is inside `B` and `B` is inside `C`, then `A` is inside `C`. If each is inside the other, they are the same set.

Nobody calls that Boolean algebra in class. You still use it.

### Chinese

你早就在用三件事：每个集合都在自己里面；`A` 在 `B` 里、`B` 在 `C` 里，则 `A` 在 `C` 里；互相在里面，就是同一个。

课堂上没人叫它布尔代数。你照样会用。

### Lean

```lean
-- Facts from class:
--   A ⊆ A
--   A ⊆ B ⊆ C  →  A ⊆ C
--   A ⊆ B and B ⊆ A  →  A = B
```

### Editor

lean

### Next en

On the computer, ⊂ and < start empty.

### Next zh

在电脑上，⊂ 和 < 先是空的

## Beat 7: ⊂ and < start as empty marks

### Title zh

⊂ 和 < 先是空记号

### English

`<` is the mark for “strictly smaller.” `⊂` is the mark for “strictly inside.” At first both marks are empty.

A computer will not guess the sentence from class. Someone has to fill them in.

### Chinese

`<` 是“严格更小”的记号。`⊂` 是“严格在里面”的记号。一开始两个都是空的。

电脑不会猜课堂上那句。得有人填进去。

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

Shortcut: just let < mean proper subset?

### Next zh

捷径：让 < 直接表示真子集？

## Beat 8: The shortcut Lean will not take

### Title zh

Lean 不走的那条捷径

### English

The easy idea: let `<` on sets mean “inside, but not equal.” Then you are done.

Lean will not do that. Sets can do more than compare — and that extra toolkit is why Boolean algebra shows up.

### Chinese

最省事的想法：让集合上的 `<` 表示“在里面，但不相等”。然后就结束了。

Lean 不这么做。集合不只是拿来比大小——多出来的那些运算，就是布尔代数出场的原因。

### Lean

```lean
-- Easy idea: let < on sets mean “⊆ and not equal”.
-- Done?

-- Lean says no.
```

### Editor

lean

### Next en

Sets also have union, intersection, complement.

### Next zh

集合还有并、交、补

## Beat 9: Sets also have ∪, ∩, and complement

### Title zh

集合还有并、交、补

### English

You do not only ask which set is inside which. You also take union, intersection, and complement.

Those are the same three moves as yes-and-no: or, and, not. That package is what people call a Boolean algebra.

### Chinese

你不只问谁在谁里面。你还会做并集、交集、补集。

这三步和“对或错”是同一套：或者、并且、否定。这套东西就叫布尔代数。

### Lean

```lean
-- Sets are not only compared.
-- They also have ∪, ∩, and complement.
-- Same three moves as yes / no: or, and, not.
```

### Editor

lean

### Next en

That package already includes “strictly smaller”.

### Next zh

这套工具里，已经有“严格更小”

## Beat 10: Why we need Boolean algebra

### Title zh

为什么需要布尔代数

### English

If you already have the yes-and-no package, you get “strictly smaller” for free — the way `<` comes with `≤` on numbers.

That is why Lean uses Boolean algebra on sets, instead of writing one extra line for `⊂`.

### Chinese

如果你已经有“对或错”那一套，就会白送“严格更小”——就像数字里有了 `≤`，就有 `<`。

所以 Lean 在集合上用布尔代数，而不是再单独写一行 `⊂`。

### Lean

```lean
-- Boolean algebra includes order.
-- Order includes <.
-- So ⊂ can arrive with the package,
-- instead of as a one-line extra definition.
```

### Editor

lean

### Next en

The package is stacked, like number facts.

### Next zh

这套工具是叠起来的，像数字性质

## Beat 11: The package is stacked

### Title zh

这套工具是叠起来的

### English

Boolean algebra includes the lattice of union and intersection. That includes the order `≤`. That includes `<`.

Plug in the whole package, and “strictly smaller” shows up. You do not define it a second time.

### Chinese

布尔代数里有并和交。并和交里有序 `≤`。序里有 `<`。

整套接上，“严格更小”自己出现。不必再定义一次。

### Lean

```lean
-- Boolean algebra  includes  union / intersection
-- those include            ≤
-- ≤ includes               <
```

### Editor

lean

### Next en

What < means, for any order.

### Next zh

对任何序，< 是什么意思

## Beat 12: What < means — not about sets yet

### Title zh

< 是什么意思——还没轮到集合

### English

For numbers, `a < b` means `a ≤ b` and not the other way around.

The same shape works for any order. We have not used sets yet.

### Chinese

对数字来说，`a < b` 就是 `a ≤ b`，并且不能反过来。

任何序都是这个形状。现在还没用到集合。

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

Why sets already have that package.

### Next zh

为什么集合本来就有这套工具

## Beat 13: A set is already yes-or-no

### Title zh

集合本来就是“在或不在”

### English

A set answers one question about every object: in, or not?

Yes-or-no already is Boolean algebra. So sets already have the package. Lean does not rebuild union and complement from scratch.

### Chinese

集合对每个东西只问一句：在，还是不在？

“在或不在”本来就是布尔代数。所以集合本来就有这套工具。Lean 不用从零再造并和补。

### Lean

```lean
-- A set answers yes or no for every object.
-- Yes / no already is Boolean algebra.
-- So the package is already there.
```

### Editor

lean

### Next en

Then < on sets means proper subset.

### Next zh

于是集合上的 <，就是真子集

## Beat 14: Then < on sets means proper subset

### Title zh

于是 < 就表示真子集

### English

Lean takes the package, then reads it on sets: `≤` means inside, `<` means inside one way, not the other.

`⊂` is that same `<`. The sentence from class is now something a computer can check.

### Chinese

Lean 接上这套工具，再读到集合上：`≤` 表示在里面，`<` 表示这边在里面、反过来不在。

`⊂` 就是这个 `<`。课堂上那句，现在电脑也能检查。

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

Two lines: the package vs the sentence from class.

### Next zh

两行：工具包的说法，对上课堂上那句

## Beat 15: The package vs the sentence from class

### Title zh

工具包的说法，对上课堂上那句

### English

The package says: `s ⊂ t` means `s` is inside `t`, and `t` is not inside `s`.

Class says: inside, and not the same set. A computer can prove those two sentences match.

### Chinese

工具包说：`s ⊂ t` 表示 `s` 在 `t` 里，并且 `t` 不在 `s` 里。

课堂上说：在里面，并且不是同一个。电脑可以证明这两句是同一句话。

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

Why the long way was worth it.

### Next zh

绕远路，图的是什么

## Beat 16: ⊂ is just the < of ⊆

### Title zh

⊂ 就是 ⊆ 的那个 <

### English

`⊆` works like `≤` on numbers. The matching `<` on sets is `⊂`.

Boolean algebra was only there so this match is given to you, not written by hand.

### Chinese

`⊆` 就像数字里的 `≤`。配上的那个 `<`，在集合上就是 `⊂`。

用布尔代数，只是为了把这个对应白送给你，不用手写。

### Lean

```lean
-- On numbers:  a < b  ↔  a ≤ b and a ≠ b
-- On sets:     s ⊂ t  ↔  s ⊆ t and s ≠ t
```

### Editor

lean

### Next en

The usual facts come with it.

### Next zh

那些顺口的事实，会跟着来

## Beat 17: The usual facts, for free

### Title zh

那些顺口的事实，白送

### English

A set is not a proper subset of itself. You cannot have both `A ⊂ B` and `B ⊂ A`. Chains still work.

In class these feel obvious. On a computer they arrive once the package is plugged in.

### Chinese

集合不是自己的真子集。不能同时 `A ⊂ B` 又 `B ⊂ A`。一串还能接下去。

课堂上觉得这是废话。电脑上，工具包接上，这些就有了。

### Lean

```lean
theorem lt_irrefl (s : Set α) : ¬ s ⊂ s
theorem lt_asymm : s ⊂ t → ¬ t ⊂ s
theorem lt_trans : s ⊂ t → t ⊂ u → s ⊂ u
```

### Editor

lean

### Next en

Turn never took that long way first.

### Next zh

Turn 没有先走那条远路

## Beat 18: Turn writes a relation, not a toolkit first

### Title zh

Turn 先写关系，不先接工具包

### English

Second difference, now that you saw Lean’s road. Turn-Lang just names “subset” as a relation.

The everyday version is written first. You do not need Boolean algebra on the page before the class sentence can appear.

### Chinese

看过 Lean 的远路，第二个差别就清楚了。Turn-Lang 只是给“子集”起个关系名。

日常那个版本先写上。不必先在纸上接布尔代数，课堂上那句就能出现。

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

Proper subset is that relation, plus not equal.

### Next zh

真子集：这个关系，再加上不相等

## Beat 19: Proper subset is the class sentence, in one place

### Title zh

真子集：课堂上那句，写在一块

### English

Add “not equal” to everyday subset. That is the sentence from class, and a computer can check it.

Lean got the same sentence by plugging in Boolean algebra. Turn wrote the sentence first. The toolkit can wait.

### Chinese

在日常子集上加上“不相等”。就是课堂上那句，电脑也能检查。

Lean 靠接上布尔代数找回同一句。Turn 先写这一句。工具包可以以后再说。

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

One class sentence. Two ways to write it.

### Next zh

课堂上同一句，两种写法

## Beat 20: One class sentence, two ways to write it

### Title zh

课堂上同一句，两种写法

### English

In class, proper subset is one sentence. A computer needs that sentence written down.

Lean borrows Boolean algebra so `⊂` works like `<` next to `⊆`. Turn writes the sentence first. Next time: what `=` is asking.

### Chinese

课堂上，真子集就是一句。电脑需要把这句写下来。

Lean 借用布尔代数，让 `⊂` 像 `⊆` 旁边的 `<`。Turn 先写这一句。下期：等号在问什么。

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
