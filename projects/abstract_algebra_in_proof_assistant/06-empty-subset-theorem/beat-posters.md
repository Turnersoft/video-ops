# Beat Posters — 06-empty-subset-theorem

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

## Beat 1: Open the book — a theorem about the empty set

### Title zh

打开课本。今天是关于空集的一条定理

### English

The textbook states: the empty set is a subset of every set.

It treats the line as obvious. It does not say which definition to unfold.

### Chinese

课本写：空集是任何集合的子集。

课本把这句当成显然。它没有说该展开哪一条定义。

### Next en

What “subset” asked last clips.

### Next zh

上一集的子集关系在问什么

## Beat 2: Subset is an implication

### Title zh

子集关系是一个蕴涵

### English

`∅ ⊆ S` means: if `x` is in the empty set, then `x` is in `S`.

There is no such `x`. The implication holds because the premise never opens.

### Chinese

子集关系 `∅ ⊆ S` 的意思是：如果 `x` 属于空集，那么 `x` 也属于 `S`。

这样的 `x` 并不存在。蕴涵成立，是因为前提永远打不开。这叫做空真。

### Next en

Lean unfolds ⊆ and False.

### Next zh

Lean 展开子集关系和假命题

## Beat 3: Lean’s model — unfold ⊆ and False

### Title zh

Lean 怎样得到这条定理

### English

Lean already hung `⊆` and `∅` on `Set α`. This theorem just unfolds both.

`∅ ⊆ s` means `False → a ∈ s`. The lemma is extra naming, not a new model.

### Chinese

Lean 已经把 `⊆` 和 `∅` 挂在 `Set α` 上。这条定理只是把两处一起展开。

`∅ ⊆ s` 意思是 `False → a ∈ s`。引理是额外起名，不是新的建模。

### Lean

```lean
instance : HasSubset (Set α) := ⟨Set.Subset⟩
instance : EmptyCollection (Set α) := ⟨fun _ => False⟩
theorem empty_subset (s : Set α) : ∅ ⊆ s
```

### Editor

lean

### Next en

How Mathlib files the corollary.

### Next zh

Mathlib 怎样收录这条推论

## Beat 4: How Mathlib uses empty_subset

### Title zh

Mathlib 怎样使用 empty_subset

### English

`empty_subset` names that unfolding. Later proofs cite it instead of rebuilding `False → _`.

Same story as `not_mem_empty`: a corollary of the model, used throughout `Data.Set`.

### Chinese

引理 `empty_subset` 只是给这次展开起名。后面的证明引用它，而不再重写 `False → _`。

这和 `not_mem_empty` 是同一件事：建模的推论，在 `Data.Set` 里反复使用。

### Lean

```lean
-- Mathlib/Data/Set/Basic.lean
theorem empty_subset (s : Set α) : ∅ ⊆ s
```

### Editor

lean

### Next en

Turn writes a named theorem, then a proof.

### Next zh

Turn 写下有名字的定理，再写证明

## Beat 5: Turn writes the named theorem

### Title zh

Turn 写下有名字的定理

### English

The AATA file names it `Empty subset of every set`. The claim is `Subset(EmptySet, S)`.

No invented identifier. The name is the classroom sentence.

### Chinese

AATA 文件把这条定理叫做 `Empty subset of every set`。断言是 `Subset(EmptySet, S)`。

没有另造一个函数名。定理的名字就是课堂上的那句话。

### Turn-Lang

```turn
theorem "Empty subset of every set" {
  forall S: Set<Any> |- Subset(EmptySet, S)
} proof {
  unfold Subset at goal
  contradiction goal.1 by EmptySet.no_members
}
```

### Editor

turn

### Next en

The proof cites last clip’s law.

### Next zh

证明引用的是上一集的定律

## Beat 6: The proof cites last clip’s law

### Title zh

证明引用的是上一集的定律

### English

Unfold `Subset`. Assume a counterexample. Contradict with `EmptySet.no_members`.

That is how Turn uses the empty set: by name, not by rewriting “nobody is in”.

### Chinese

先展开子集关系 `Subset`。再假设有反例。最后用 `EmptySet.no_members` 得出矛盾。

Turn-Lang 使用空集的方式就是点名引用，而不是把“谁都不在里面”再写一遍。

### Turn-Lang

```turn
theorem "Empty subset of every set" {
  forall S: Set<Any> |- Subset(EmptySet, S)
} proof {
  unfold Subset at goal
  contradiction goal.1 by EmptySet.no_members
}
```

### Editor

turn

### Next en

Later proofs copy this pattern.

### Next zh

后面的证明会复制这个套路

## Beat 7: Later proofs copy this pattern

### Title zh

后面的证明会复制这个套路

### English

`A \ A = ∅` and the symmetric-difference example both end with `contradiction … by EmptySet.no_members`.

The empty-subset proof is the first time the file shows that library move.

### Chinese

`A \ A = ∅`，以及对称差的例子，结尾都是 `contradiction … by EmptySet.no_members`。

空集是子集这条证明，是整份文件第一次演示这个库用法。

### Turn-Lang

```turn
third: SetEq(Difference(A, A), EmptySet) proof {
  unfold Difference.def at goal.1
  contradiction goal.1 by EmptySet.no_members
}
```

### Editor

turn

### Next en

Textbook vs Lean vs Turn.

### Next zh

课本、Lean、Turn 三处哪里不同

## Beat 8: Textbook vs Lean vs Turn

### Title zh

课本、Lean、Turn 三处哪里不同

### English

Textbook: “obvious”. Lean: `False` implies anything, then a named lemma. Turn: unfold `Subset`, cite `EmptySet.no_members`.

Same vacuous fact. Three different lookups.

### Chinese

课本说“显然”。Lean 用“假命题蕴涵任何结论”，再给引理起名。Turn-Lang 展开 `Subset`，并引用 `EmptySet.no_members`。

空真是同一件事实。三处的查找方式不同。

### Next en

Do not invent a new Turn theorem syntax.

### Next zh

不要给 Turn 另造一套定理写法

## Beat 9: The statement is a classroom sentence

### Title zh

定理的名字就是课本上的句子

### English

Turn does not write `theorem empty_subset(S)`. It writes a classroom title, then a proof that uses the empty-set law.

That is the library style for the rest of AATA sets.

### Chinese

Turn-Lang 并不写成 `theorem empty_subset(S)`。它写成课堂上的标题，再用空集的定律做证明。

AATA 集合这一章后面的定理，都是这个库风格。

### Turn-Lang

```turn
theorem "Empty subset of every set" {
    forall S: Set<Any> |- Subset(EmptySet, S)
}
```

### Editor

turn

### Next en

Next: union, the first constructed set.

### Next zh

下期：并集，第一个造出来的集合

## Beat 10: Next — union, the first constructed set

### Title zh

下期：并集，第一个造出来的集合

### English

Today reused `EmptySet` and `Subset`. Next clip builds a third set: union.

The same file will unfold `Union.def` the way it unfolded `Subset` here.

### Chinese

今天用到的是空集和子集关系。下一集要造第三个集合：并集。

同一份文件接下来会展开 `Union.def`，就像今天展开 `Subset` 一样。

### Next en

Next: union — in A or in B.

### Next zh

下期：并集，也就是属于 A 或者属于 B
