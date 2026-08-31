# Beat Posters — 09-disjoint

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

## Beat 1: Open the book — disjoint

### Title zh

打开课本。今天的概念是不相交

### English

The textbook says two sets are disjoint when `A ∩ B = ∅`.

That is a sentence about two sets, not a third box.

### Chinese

课本说：两个集合不相交，意思是它们的交集等于空集，写成 `A ∩ B = ∅`。

这是关于两个集合的一句话，不是再造第三个盒子。

### Next en

Lean does not start from sets.

### Next zh

Lean 并不从集合开始写

## Beat 2: Lean’s model — an order fact

### Title zh

Lean 怎样给不相交建模

### English

Lean does not hang a classroom glyph here. It reuses the name `Disjoint` from order theory so the page still says the word from class.

The cost: sets inherit a lattice fact instead of writing `A ∩ B = ∅` first.

### Chinese

这里 Lean 并不去挂课堂上的符号。它从序理论里借用名字 `Disjoint`，好让纸上仍然写出课堂用词。

代价是：集合先继承一条格上的事实，而不是先写 `A ∩ B = ∅`。

### Lean

```lean
def Disjoint (a b : α) : Prop :=
  ∀ x, x ≤ a → x ≤ b → x ≤ ⊥
```

### Editor

lean

### Next en

How Mathlib uses Disjoint.

### Next zh

Mathlib 怎样使用不相交

## Beat 3: How Mathlib uses Disjoint

### Title zh

Mathlib 怎样使用不相交

### English

On sets, `≤` is `⊆` and `⊥` is `∅`, so the order fact becomes empty intersection.

The same `Disjoint` is reused for ideals, subgroups, and coprime elements.

### Chinese

在集合上，序关系 `≤` 就是子集关系，底元 `⊥` 就是空集，所以这句话变成“交集是空集”。

同一个 `Disjoint` 还会用在理想、子群、以及互素的元素上。

### Lean

```lean
-- on sets this unfolds to empty intersection
theorem disjoint_iff {s t : Set α} :
    Disjoint s t ↔ s ∩ t = ∅
```

### Editor

lean

### Next en

Turn stays with the classroom sentence.

### Next zh

Turn 留在课堂上的那句话上

## Beat 4: Turn stays with the classroom sentence

### Title zh

Turn 留在课堂上的那句话上

### English

Turn does not borrow a lattice. It writes a relation: `Intersect(A, B)` equals `EmptySet`.

`@notation(adjective)` lets later text say the two sets are disjoint.

### Chinese

Turn-Lang 并不去借一个格。它写成一条关系：`A` 与 `B` 的交集等于空集。

`@notation(adjective)` 让后面的正文可以直接说这两个集合不相交。

### Next en

The real Disjoint relation.

### Next zh

不相交关系的真实写法

## Beat 5: The real Disjoint relation

### Title zh

不相交关系的真实写法

### English

The body is `SetEq(Intersect(A, B), EmptySet)`.

It spends last clips: intersection, set equality, and the empty set.

### Chinese

函数体就是 `SetEq(Intersect(A, B), EmptySet)`。

它用到了前几集：交集、集合相等、以及空集。

### Turn-Lang

```turn
@notation(adjective)
relation Disjoint(T: Any, A B: Set<T>): Prop {
    |- SetEq(Intersect(A, B), EmptySet)
}
```

### Editor

turn

### Next en

Where the AATA file uses Disjoint.

### Next zh

AATA 文件在哪里使用不相交

## Beat 6: Where the AATA file uses Disjoint

### Title zh

AATA 文件在哪里使用不相交

### English

The named relation is the classroom model. Later AATA spends the same sentence without calling `Disjoint` by name.

`Partition.disjoint` and the symmetric-difference example both prove `SetEq(Intersect(…), EmptySet)`.

### Chinese

有名字的关系是课堂上的建模。后面的 AATA 写同一句话，并不点名调用 `Disjoint`。

`Partition.disjoint` 和对称差的例子，都证明 `SetEq(Intersect(…), EmptySet)`。

### Turn-Lang

```turn
theorem "Symmetric halves of asymmetric difference disjoint" {
  forall A B: Set<T>
  |- SetEq(Intersect(Difference(A, B),
     Difference(B, A)), EmptySet)
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

Textbook: `A ∩ B = ∅`. Turn: the same sentence, as a named relation. Lean: a generic order fact that sets inherit.

This is the proper-subset move again: Lean looks upstream; Turn stays with the classroom words.

### Chinese

课本写 `A ∩ B = ∅`。Turn-Lang 把同一句话做成有名字的关系。Lean 写成序理论里的通用事实，集合只是继承。

这又是真子集那一招：Lean 往上游看；Turn-Lang 留在课堂上的用词。

### Next en

disjoint_iff is the set unfolding.

### Next zh

disjoint_iff 只是落到集合上的展开

## Beat 8: disjoint_iff is the set unfolding

### Title zh

disjoint_iff 只是落到集合上的展开

### English

Do not present `s ∩ t = ∅` as how Lean invented disjoint.

Present `Disjoint` in `Order`, then say sets specialise it.

### Chinese

不要把 `s ∩ t = ∅` 当成 Lean 发明不相交的方式。

先出示序理论里的 `Disjoint`，再说集合怎样把它特化。

### Lean

```lean
def Disjoint (a b : α) : Prop :=
  ∀ x, x ≤ a → x ≤ b → x ≤ ⊥
```

### Editor

lean

### Next en

Next: complement, and who names the universe.

### Next zh

下期：补集，以及谁来点名宇宙

## Beat 9: Next — complement, and who names the universe

### Title zh

下期：补集，以及谁来点名宇宙

### English

Classroom complement needs a universe `U`. Turn keeps `U` as a parameter.

Lean’s `sᶜ` uses the type `α` as the universe. That disagreement is the next clip.

### Chinese

课堂上的补集需要一个宇宙 `U`。Turn-Lang 把 `U` 留作参数。

Lean 的 `sᶜ` 把类型 `α` 本身当作宇宙。这个分歧就是下一集。

### Next en

Next: complement — everything not in A.

### Next zh

下期：补集，也就是不属于 A 的那些对象
