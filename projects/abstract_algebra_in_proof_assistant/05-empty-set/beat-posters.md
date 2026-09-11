# Beat Posters — 05-empty-set

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

The empty set is not a tiny bag.

### Chinese

空集（empty set）不只是一个空袋子。

## Beat 1: Open the book — the empty set

### Title zh

打开课本。今天的对象是空集

### English

The textbook writes a symbol: the empty set `∅` has no elements.

It does not say what kind of object `∅` is, or where later proofs should look it up.

### Chinese

课本写出一个符号：空集 `∅` 没有任何元素。

课本没有说 `∅` 是哪一种对象，也没有说后面的证明该到哪里去引用它。

### Next en

Textbook: a symbol. Formal: hang that symbol on an object.

### Next zh

课本给一个符号。形式化要把符号挂到对象上

## Beat 2: Textbook gives a symbol, not a lookup

### Title zh

课本给符号，不给可以查找的对象

### English

On the page, `∅` is a glyph. Later theorems just reuse the same mark.

A checker cannot “open ∅” unless someone registered it as an object with a law.

### Chinese

纸上的 `∅` 只是一个记号。后面的定理还是重复使用同一个记号。

检查器没法“打开空集”，除非有人把它登记成带定律的对象。

### Next en

Lean still wants that classroom ∅.

### Next zh

Lean 仍然想要课堂上的那个 ∅

## Beat 3: Lean hangs ∅ on the empty set

### Title zh

Lean 怎样把 ∅ 挂到空集上

### English

The aim is the classroom empty set, so Lean still wants the glyph `∅` on the page.

It does not invent a type `EmptySet`. It keeps `Set α`, then attaches `∅` through a typeclass.

That typeclass is `EmptyCollection`, from Lean core in `Init/Core.lean`. One field, `emptyCollection : α`, and `∅` is its notation.

### Chinese

目标就是课堂上的空集，所以 Lean 仍然想在纸上写出符号 `∅`。

它并不另造类型 `EmptySet`。它继续用集合 `Set α`，再通过类型类把 `∅` 挂上去。

这个类型类叫 `EmptyCollection`，来自 Lean 核心的 `Init/Core.lean`。只有一个字段 `emptyCollection : α`，`∅` 就是它的记号。

### Lean

```lean
-- lean4/src/Init/Core.lean
class EmptyCollection (α : Type u) where
  emptyCollection : α

notation "∅" => EmptyCollection.emptyCollection
```

### Editor

lean

### Next en

The instance is the extra wiring.

### Next zh

实例才是那根额外的接线

## Beat 4: EmptyCollection is extra wiring

### Title zh

EmptyCollection 是为了看起来像课本

### English

`notation "∅"` is generic. Any type can claim the glyph by becoming `EmptyCollection`.

`Set` then plugs in `fun _ ↦ False`. That is a long way around, just so the page still says `∅`.

The instance is Mathlib's, in `Data/Set/Defs.lean`, where `Set α` is `α → Prop`. So `∅` is the predicate that answers no.

### Chinese

`notation "∅"` 是通用的。任何类型都可以变成 `EmptyCollection`，从而占用这个符号。

集合再把内容填成 `fun _ ↦ False`。绕这么远，只是为了纸上仍然写出 `∅`。

这个实例在 Mathlib 的 `Data/Set/Defs.lean`，那里 `Set α` 就是 `α → Prop`。所以 `∅` 是一个永远回答“不在”的谓词。

### Lean

```lean
-- lean4/src/Init/Core.lean
notation "∅" => EmptyCollection.emptyCollection

-- mathlib4/Mathlib/Data/Set/Defs.lean
def Set (α : Type u) := α → Prop
instance : EmptyCollection (Set α) := ⟨fun _ ↦ False⟩
```

### Editor

lean

### Next en

How Mathlib uses that ∅ after the wiring.

### Next zh

接线之后，Mathlib 怎样使用这个 ∅

## Beat 5: Turn names EmptySet and writes a law

### Title zh

Turn 给空集起名，并写下一条定律

### English

Turn-Lang puts `@notation("∅")` on the object itself. Then one law: `no_members`.

No typeclass detour. The classroom symbol sits on `EmptySet`.

### Chinese

Turn-Lang 把 `@notation("∅")` 直接写在对象上，再加一条定律 `no_members`。

没有类型类绕路。课堂上的符号就坐在 `EmptySet` 上。

### Turn-Lang

```turn
@notation("∅")
structure EmptySet: Set<Any> {
  relations {
    law no_members: Prop {
      forall x: Any |- not (x in self)
    }
  }
}
```

### Editor

turn

### Next en

That law is the lookup the rest of the file uses.

### Next zh

这条定律就是后面整份文件的查找入口

## Beat 6: The law is the library lookup

### Title zh

这条定律就是库里的查找入口

### English

The empty-subset theorem contradicts with `EmptySet.no_members`. So do `A ∖ A = ∅` and `A ∪ ∅ = A`.

One named law, reused. Not a fresh “nobody is in” sentence each time.

### Chinese

“空集是任何集合的子集”这条定理，用 `EmptySet.no_members` 来得出矛盾。`A ∖ A = ∅` 以及 `A ∪ ∅ = A` 也是如此。

一条有名字的定律，整份集合文件反复引用。不必每次重写“谁都不在里面”。

### Turn-Lang

```turn
theorem "Empty subset of every set" {
  forall S: Set<Any> |- Subset(EmptySet, S)
} proof {
  unfold Subset at goal
  assume_not {
    contradiction goal.1 by EmptySet.no_members
  }
}
```

### Proof

open
forall S: Set<Any> |- Subset(EmptySet, S)

unfold Subset at goal
forall S: Set<Any> |- forall x: Any |- x in EmptySet -> x in S

assume_not
forall S: Set<Any> |- forall x: Any |- not (x in EmptySet -> x in S)

contradiction goal.1 by EmptySet.no_members

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

Textbook: just write `∅`. Lean: a typeclass plus `notation`, then `False`, so the glyph still appears. Turn: `@notation("∅")` on `EmptySet`.

Same classroom symbol. Lean takes the long road to mimic the book.

### Chinese

课本直接写 `∅`。Lean 先做类型类和 `notation`，再填 `False`，好让符号仍然出现。Turn-Lang 把 `@notation("∅")` 写在 `EmptySet` 上。

课堂上的符号相同。Lean 绕远路，只为模仿课本。

### Next en

The lemma is a corollary, not the glyph.

### Next zh

那条引理只是推论，不是符号本身

## Beat 8: Same sentence, two layouts

### Title zh

同一句话，两种挂符号的方法

### English

Lean’s `∅` is a borrowed badge: `EmptyCollection` first, then a `Set` instance.

Turn writes the badge on the structure. Both say: for every `x`, not in.

One Mathlib file holds the chain, `Data/Set/Defs.lean`: `Set α` is `α → Prop`, `∈` comes from `Set.Mem`, `∅` is `fun _ ↦ False`.

### Chinese

Lean 的 `∅` 像借来的徽章：先有 `EmptyCollection`，再给集合做实例。

Turn-Lang 把徽章写在结构上。两边都说：对每一个 `x`，都不属于空集。

整条链都在 Mathlib 的 `Data/Set/Defs.lean`：`Set α` 是 `α → Prop`，`∈` 来自 `Set.Mem`，`∅` 是 `fun _ ↦ False`。

### Lean

```lean
-- mathlib4/Mathlib/Data/Set/Defs.lean
def Set (α : Type u) := α → Prop
protected def Set.Mem (s : Set α) (a : α) : Prop := s a
instance : Membership α (Set α) := ⟨Set.Mem⟩
instance : EmptyCollection (Set α) := ⟨fun _ ↦ False⟩
```

### Editor

lean

### Next en

The lemma is a corollary, not the model.

### Next zh

那条引理只是推论，不是建模本身

## Beat 9: The lemma is a corollary

### Title zh

那条引理只是推论，不是建模本身

### English

`Set.notMem_empty` follows after the glyph is attached. Do not treat the lemma as how Lean invented `∅`.

It lives in `Data/Set/Basic.lean`, and its proof is `id`: being in `∅` already unfolds to `False`.

Turn’s analogue is citing `EmptySet.no_members`.

### Chinese

`Set.notMem_empty` 是符号挂上之后的推论。不要把这条引理当成 Lean 发明 `∅` 的方式。

它在 `Data/Set/Basic.lean`，证明就是 `id`：属于 `∅` 本来就展开成 `False`。

在 Turn-Lang 里，对应的动作是引用 `EmptySet.no_members`。

### Lean

```lean
-- mathlib4/Mathlib/Data/Set/Basic.lean
theorem Set.notMem_empty (x : α) : x ∉ (∅ : Set α) := id
-- older Mathlib name: Set.not_mem_empty
```

### Editor

lean

### Next en

Next: why ∅ ⊆ S, using that law.

### Next zh

下期：为什么空集是任何集合的子集，并且会用到这条定律

## Beat 10: Next — the first theorem that cites the law

### Title zh

下期：第一条引用这条定律的定理

### English

The first theorem after `EmptySet` is: the empty set is a subset of every set.

It unfolds subset, then contradicts with `EmptySet.no_members`. That is library use, not a new object.

### Chinese

空集后面的第一条定理就是：空集是任何集合的子集。

它先展开子集关系，再用 `EmptySet.no_members` 得出矛盾。这是在使用空集，不是再造一个对象。

### Next en

Next: the empty set is a subset of every set.

### Next zh

下期：空集是任何集合的子集
