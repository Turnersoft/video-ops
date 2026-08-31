# Beat Posters — 10-complement

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

## Beat 1: Open the book — complement

### Title zh

打开课本。今天的对象是补集

### English

The textbook writes `A′ = { x ∈ U | x ∉ A }`. The universe `U` is part of the sentence.

“Not in `A`” is not enough. Not-in-`A` among what?

### Chinese

课本把补集写成 `A′ = { x ∈ U | x ∉ A }`。宇宙 `U` 是这句话的一部分。

只说“不属于 `A`”还不够。是在什么范围里不属于 `A`？

### Next en

Lean’s model: the type is the universe.

### Next zh

Lean 的建模：类型本身就是宇宙

## Beat 2: Lean’s model — the type is the universe

### Title zh

Lean 怎样给补集建模

### English

The aim is classroom `A′`. Lean hangs a postfix `ᶜ` on any `Set α`.

The universe is the type `α`, not a set `U`. Extra notation, different universe.

### Chinese

目标就是课堂上的补集记号。Lean 给任何 `Set α` 挂上后缀 `ᶜ`。

宇宙是类型 `α`，不是集合 `U`。符号接上了，宇宙却换了。

### Lean

```lean
protected def compl (s : Set α) := {a | a ∉ s}
postfix:max "ᶜ" => Set.compl
```

### Editor

lean

### Next en

How Mathlib uses sᶜ.

### Next zh

Mathlib 怎样使用绝对补集

## Beat 3: How Mathlib uses sᶜ

### Title zh

Mathlib 怎样使用绝对补集

### English

Boolean-algebra lemmas on `Set` use `sᶜ` as complement in the type.

To recover classroom `A′` inside a set `U`, Mathlib writes a difference: `U \ A`.

### Chinese

集合上的布尔代数引理，把 `sᶜ` 当成类型里的补集来用。

若要回到课堂上相对于宇宙 `U` 的补集 `A′`，Mathlib 写成差集 `U \ A`。

### Lean

```lean
protected def compl (s : Set α) := {a | a ∉ s}
-- classroom A′ inside U is U \ A
```

### Editor

lean

### Next en

Turn keeps U as a parameter.

### Next zh

Turn 把宇宙 U 留作参数

## Beat 4: Turn keeps U as a parameter

### Title zh

Turn 把宇宙 U 留作参数

### English

Turn’s `Complement` takes `U` and `A`. A where-clause demands every member of `A` already lies in `U`.

That is the classroom universe, written so a checker can see it.

### Chinese

Turn-Lang 的 `Complement` 同时接收宇宙 `U` 和集合 `A`。where 子句要求：`A` 的每个成员都已经属于 `U`。

这就是课堂上的宇宙，写成检查器能看见的条件。

### Next en

The real Complement definition.

### Next zh

补集的真实定义

## Beat 5: The real Complement definition

### Title zh

补集的真实定义

### English

The where-clause is `forall x: T |- x in A -> x in U`, not a call to `Subset`.

The `def` law is a conjunction block: in `U`, and not in `A`.

### Chinese

where 子句写成 `forall x: T |- x in A -> x in U`，并不是去调用 `Subset`。

定律 `def` 是一个合取块：属于 `U`，并且不属于 `A`。

### Turn-Lang

```turn
@notation({A}~"'")
structure Complement<T: Any, U: Set<T>, A: Set<T> where {
    forall x: T |- x in A -> x in U
}>: Set<T> {
    relations {
        law def: Prop {
            forall x in self |- {
                x in U;
                not (x in A);
            }
        }
    }
}
```

### Editor

turn

### Next en

Where the AATA file uses Complement.

### Next zh

AATA 文件在哪里使用补集

## Beat 6: Where the AATA file uses Complement

### Title zh

AATA 文件在哪里使用补集

### English

The lemma `Difference versus U-relative patch` proves `Difference(A, B) = Intersect(A, Complement(U, B))`.

De Morgan is `Complement(U, Union(A, B)) = Intersect(Complement(U, A), Complement(U, B))`.

### Chinese

引理 `Difference versus U-relative patch` 证明：差集 `Difference(A, B)` 等于 `Intersect(A, Complement(U, B))`。

德摩根定律写成：`Complement(U, Union(A, B))` 等于两个补集的交集。

### Turn-Lang

```turn
theorem "de morgan's laws" {
  forall A B U: Set<Any>
  where {|- Subset(A, U); |- Subset(B, U);}
  |- SetEq(Complement(U, Union(A, B)),
     Intersect(Complement(U, A), Complement(U, B)))
}
```

### Editor

turn

### Next en

Textbook vs Lean vs Turn.

### Next zh

课本、Lean、Turn 三处哪里不同

## Beat 7: Textbook vs Lean vs Turn

### Title zh

课本、Lean、Turn 三处哪里不同

### English

Textbook and Turn: complement is relative to a set `U`. Lean: complement is relative to the type `α`.

Same classroom words “not in `A`”. Different universe.

### Chinese

课本和 Turn-Lang：补集相对于一个集合宇宙 `U`。Lean：补集相对于类型 `α`。

课堂上都说“不属于 `A`”。宇宙不是同一个。

### Next en

Do not write Complement with where Subset(A, U).

### Next zh

不要把补集写成 where Subset(A, U)

## Beat 8: The where-clause is a membership implication

### Title zh

where 子句是成员蕴涵，不是 Subset 调用

### English

The AATA where-clause repeats the subset sentence in membership form.

That is the checkable version of “`A` sits inside `U`”.

### Chinese

AATA 的 where 子句用成员语言把子集关系再说一遍。

这就是“`A` 待在 `U` 里面”的可检查写法。

### Turn-Lang

```turn
structure Complement<T: Any, U: Set<T>, A: Set<T> where {
    forall x: T |- x in A -> x in U
}>: Set<T>
```

### Editor

turn

### Next en

Next: difference, classroom A minus B.

### Next zh

下期：差集，也就是课本里的 A 减 B

## Beat 9: Next — difference, classroom A minus B

### Title zh

下期：差集，也就是课本里的 A 减 B

### English

Difference stays inside `A`. Turn writes `∖`. Lean writes `Set.diff`.

The next clip also shows why `A \ B` equals `A ∩ B′` once `U` is present.

### Chinese

差集留在 `A` 里面。Turn-Lang 写成 `∖`。Lean 写成 `Set.diff`。

下一集还要说明：一旦有了宇宙 `U`，为什么 `A \ B` 等于 `A ∩ B′`。

### Next en

Next: difference — in A, but not in B.

### Next zh

下期：差集，也就是属于 A 但不属于 B
