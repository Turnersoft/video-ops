# Beat Posters — 06-empty-subset-theorem

<!--
  Poster copy for the infographic album. This file — not animation.md — is the
  source of truth for poster text. Matched by beat number.

  Social / publish captions (per platform) live in social-posts.json under
  the "infographic" key — not in this file. Video captions use "english"/"china".

  Cover hook (the sentence on the album cover):
    ## Cover
    ### English / ### Chinese

  Per beat:
    ### Title zh    Chinese title override (EN title comes from the heading)
    ### English     Body card copy, EN. `code` spans render highlighted.
    ### Chinese     Body card copy, ZH. `code` 会渲染成高亮。
    ### Next en     "Up next" hook override, EN
    ### Next zh     「下一篇」钩子，ZH
    ### Lean        (optional) fenced code block overriding the poster's Lean pane
    ### Turn-Lang   (optional) fenced code block overriding the poster's Turn pane
    ### Editor      (optional) `lean` or `turn` — pins which code pane to show
    ### Proof       (optional) tactic chain. `open` is the start goal; each
                    later block is a tactic (label, then the after-goal).
                    Before-goal is the previous after. Blank line between
                    steps. Omit to auto-extract from Turn `proof { }` or
                    Lean `:= by`. Each tactic is its own poster: full
                    before/after goals (context stack + current claim),
                    unused context grayed like a flip-clock, tactic in
                    the middle. Highlights mark what the tactic used and
                    what changed.

  A blank line inside English/Chinese starts a new text card (max 3).
  Keep each block to 1–2 short sentences — the card auto-fits font size,
  always staying larger than the code font.
  Any field left out falls back to auto-derived copy from animation.md.
-->

## Cover

### English

The if never opens.

### Chinese

那个“如果”永远打不开。

## Beat 1: Open the book — a theorem about the empty set

### Title zh

打开课本。今天是关于空集的一条定理

### English

The textbook states: the empty set is a subset of every set.

It treats the line as obvious. It does not say where later proofs should look it up.

### Chinese

课本写：空集是任何集合的子集。

课本把这句当成显然。它没有说后面的证明该到哪里去引用它。

### Next en

What subset was asking two clips ago.

### Next zh

两集之前，子集关系在问什么

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
theorem empty_subset (s : Set α) :
    ∅ ⊆ s
```

### Editor

lean

### Next en

How Mathlib names that unfolding.

### Next zh

Mathlib 怎样给这次展开起名

## Beat 4: How Mathlib uses empty_subset

### Title zh

Mathlib 怎样使用 empty_subset

### English

`empty_subset` names that unfolding. Later proofs cite it instead of rewriting `False → _` each time.

Same story as last clip’s `not_mem_empty`: a name for the model, not a new empty set.

### Chinese

引理 `empty_subset` 只是给这次展开起名。后面的证明引用它，而不再每次重写 `False → _`。

这和上期的 `not_mem_empty` 是同一件事：给建模起名，不是再造一个空集。

### Lean

```lean
-- Mathlib/Data/Set/Basic.lean
theorem empty_subset (s : Set α) :
    ∅ ⊆ s
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

Turn-Lang names it `Empty subset of every set`. The claim is `Subset(EmptySet, S)`.

No invented identifier. The name is the classroom sentence.

### Chinese

Turn-Lang 把这条定理叫做 `Empty subset of every set`。断言是 `Subset(EmptySet, S)`。

没有另造一个函数名。定理的名字就是课堂上的那句话。

### Turn-Lang

```turn
theorem "Empty subset of every set" {
  forall S: Set<Any> |-
    Subset(EmptySet, S)
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

Unfold `Subset`. The leftover claim is: if `x` is in empty, then `x` is in `S`.

The premise is already false. Cite `EmptySet.no_members`. Do not rewrite “nobody is in” by hand.

### Chinese

先展开子集关系 `Subset`。剩下的断言是：如果 `x` 在空集里，那么 `x` 在 `S` 里。

前提已经为假。引用 `EmptySet.no_members`。不必手写“谁都不在里面”。

### Turn-Lang

```turn
theorem "Empty subset of every set" {
  forall S: Set<Any> |-
    Subset(EmptySet, S)
} proof {
  unfold Subset at goal
  contradiction goal.1 by EmptySet.no_members
}
```

### Proof

open
forall S: Set<Any> |- Subset(EmptySet, S)

unfold Subset at goal
forall S: Set<Any> |- forall x: Any |- x in EmptySet -> x in S

contradiction goal.1 by EmptySet.no_members

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

`A \ A = ∅` ends the same way: `contradiction … by EmptySet.no_members`.

Today is the first time the file points at that named law.

### Chinese

`A \ A = ∅` 的结尾也是 `contradiction … by EmptySet.no_members`。

空集是子集这条证明，是整份文件第一次点名引用那条定律。

### Turn-Lang

```turn
third: SetEq(Difference(A, A), EmptySet)
-- same close: contradiction … by EmptySet.no_members
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

Turn writes the classroom sentence.

### Next zh

Turn 写成课堂上的那句话

## Beat 9: The statement is a classroom sentence

### Title zh

定理的名字就是课本上的句子

### English

Turn does not write `theorem empty_subset(S)`. It writes a classroom title, then a proof that uses the empty-set law.

That is the style for the rest of this chapter.

### Chinese

Turn-Lang 并不写成 `theorem empty_subset(S)`。它写成课堂上的标题，再用空集的定律做证明。

这一章后面的定理，都是这个写法。

### Turn-Lang

```turn
theorem "Empty subset of every set" {
    forall S: Set<Any> |-
      Subset(EmptySet, S)
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
