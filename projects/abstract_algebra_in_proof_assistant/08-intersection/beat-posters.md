# Beat Posters — 08-intersection

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

## Beat 1: Open the book — intersection

### Title zh

打开课本。今天的对象是交集

### English

The textbook writes `A ∩ B = { x | x ∈ A and x ∈ B }`.

Same constructed-set job as union. Only the joining word is “and”.

### Chinese

课本把交集写成 `A ∩ B = { x | x ∈ A 且 x ∈ B }`。

工作和并集同类：造出一个新集合。变的只是连接词“并且”。

### Next en

Lean’s model: still Set α, with an “and” predicate.

### Next zh

Lean 的建模：仍然是集合，成员条件是“并且”

## Beat 2: Lean’s model — an “and” predicate

### Title zh

Lean 怎样给交集建模

### English

The aim is classroom `∩`. Lean keeps `Set α`, then hangs `∩` through the `Inter` typeclass.

`Set.inter` is the “and” predicate. The instance is extra wiring so the page still writes `∩`.

### Chinese

目标就是课堂上的 `∩`。Lean 继续用 `Set α`，再通过类型类 `Inter` 把符号挂上去。

`Set.inter` 是“并且”这句成员条件。实例是额外接线，好让纸上仍然写出 `∩`。

### Lean

```lean
protected def inter (s t : Set α) := {a | a ∈ s ∧ a ∈ t}
infixl:70 " ∩ " => Inter.inter
instance : Inter (Set α) := ⟨Set.inter⟩
```

### Editor

lean

### Next en

How Mathlib uses ∩.

### Next zh

Mathlib 怎样使用交集

## Beat 3: How Mathlib uses ∩

### Title zh

Mathlib 怎样使用交集

### English

`mem_inter` unfolds the definition. Lattice lemmas treat `∩` as an infimum.

Disjointness, De Morgan, and `A ∩ A = A` all start from this predicate.

### Chinese

引理 `mem_inter` 把定义展开。格上的引理把 `∩` 当成下确界。

不相交、德摩根定律、以及 `A ∩ A = A`，都从这条成员条件出发。

### Lean

```lean
theorem mem_inter {s t : Set α} :
    a ∈ s ∩ t ↔ a ∈ s ∧ a ∈ t
```

### Editor

lean

### Next en

Turn writes Intersect with a conjunction block.

### Next zh

Turn 的交集用合取块来写

## Beat 4: Turn writes a conjunction block, not “and”

### Title zh

Turn 的交集用合取块，不写 and

### English

The AATA file does not write `x in A and x in B` as one token.

It opens a block: `x in A;` then `x in B;`. That is how Turn spells conjunction.

### Chinese

AATA 文件并不把 `x in A and x in B` 写成一个词。

它打开一个合取块：先写 `x in A;`，再写 `x in B;`。这就是 Turn-Lang 写“并且”的方式。

### Next en

The real Intersect definition.

### Next zh

交集的真实定义

## Beat 5: The real Intersect definition

### Title zh

交集的真实定义

### English

`Intersect` is a set. Its `def` law is that block of two memberships.

Later proofs write `unfold Intersect.def`, then `split_assumption_conjunction`.

### Chinese

`Intersect` 是一个集合。它的定律 `def` 就是那两句成员条件组成的合取块。

后面的证明写成 `unfold Intersect.def`，再写成 `split_assumption_conjunction`。

### Turn-Lang

```turn
@notation({A} ~ " ∩ " ~ {B})
structure[T] Intersect<T: Any, A B: Set<T>>: Set<T> {
    relations {
        law def: Prop {
            forall x in self |- {
                x in A;
                x in B;
            }
        }
    }
}
```

### Editor

turn

### Next en

Where the library unfolds Intersect.def.

### Next zh

库在哪里展开 Intersect.def

## Beat 6: Where the library unfolds Intersect.def

### Title zh

库在哪里展开 Intersect.def

### English

`Disjoint` is `SetEq(Intersect(A, B), EmptySet)`. De Morgan unfolds `Intersect.def` on complements.

`basic set` proves `SetEq(Intersect(A, A), A)` the same way.

### Chinese

不相交定义为 `SetEq(Intersect(A, B), EmptySet)`。德摩根定律在补集上展开 `Intersect.def`。

定理 `basic set` 证明 `SetEq(Intersect(A, A), A)` 时，用的是同一套路。

### Turn-Lang

```turn
second: SetEq(Intersect(A, A), A) proof {
  unfold Intersect.def at h
  split_assumption_conjunction h into h1 h2
  exact h1
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

Textbook: “and” in a set-builder. Lean: `∧` inside a predicate on `Set α`. Turn: a named structure and a conjunction block you unfold.

Same two memberships. Three pages.

### Chinese

课本在集合表示里写“并且”。Lean 在集合类型 `Set α` 的成员条件里写 `∧`。Turn-Lang 给有名字的结构，再用合取块，证明时展开。

两句成员条件相同。三页纸的写法不同。

### Next en

Do not invent an `and` token in Turn.

### Next zh

不要在 Turn 里另造一个 and 记号

## Beat 8: Lean pane — the predicate

### Title zh

Lean 这一栏：成员条件

### English

If you only show `mem_inter`, you hid `Set.inter`.

Show the definition first. The biconditional is how the library cites it later.

### Chinese

如果只出示 `mem_inter`，就藏起了 `Set.inter`。

先看出定义。那条双向是库后面引用它的方式。

### Lean

```lean
protected def inter (s t : Set α) := {a | a ∈ s ∧ a ∈ t}
```

### Editor

lean

### Next en

Next: disjoint, a sentence about two sets.

### Next zh

下期：不相交，一句关于两个集合的话

## Beat 9: Next — disjoint, a sentence about two sets

### Title zh

下期：不相交，一句关于两个集合的话

### English

Union and intersection built a third set. Disjoint does not.

It asks whether `Intersect(A, B)` equals `EmptySet` — and Lean asks that in order theory.

### Chinese

并集和交集都造出第三个集合。不相交不会。

它问的是 `Intersect(A, B)` 是否等于空集。Lean 则把这句话放到序理论里。

### Next en

Next: disjoint — no members in common.

### Next zh

下期：不相交，也就是没有任何公共元素
