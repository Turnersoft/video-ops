# Beat Posters — 07-union

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

  A blank line inside English/Chinese starts a new text card (max 3).
  Keep each block to 1–2 short sentences — the card auto-fits font size,
  always staying larger than the code font.
  Any field left out falls back to auto-derived copy from animation.md.
-->

## Cover

### English

A third set, not a sentence about two.

### Chinese

第三个集合，不是关于两个集合的一句话。

## Beat 1: Open the book — union

### Title zh

打开课本。今天的对象是并集

### English

The textbook writes a set-builder: `A ∪ B = { x | x ∈ A or x ∈ B }`.

The page treats `∪` as a primitive mark. It does not say which object later proofs should unfold.

### Chinese

课本用集合表示写出并集：`A ∪ B = { x | x ∈ A 或 x ∈ B }`。

纸上的 `∪` 像一个原始记号。课本没有说后面的证明该展开哪一个对象。

### Next en

A third set, not a sentence about two.

### Next zh

这是第三个集合，不是关于两个集合的一句话

## Beat 2: A third set, not a claim

### Title zh

并集是第三个集合，不是一句话

### English

Subset was a sentence about two sets. Union is a new set you can test membership on.

Two guest lists: you are on the combined list if you are on A or on B. Once `A` and `B` are fixed, `A ∪ B` is fixed.

### Chinese

子集关系是关于两个已有集合的一句话。并集是一个新的集合，你可以问“属不属于”。

两份来宾名单：你在合并名单上，意思是在 A 或者在 B。集合 `A` 和 `B` 一旦确定，并集 `A ∪ B` 也就确定了。

### Next en

Lean’s model: still Set α, with an “or” predicate.

### Next zh

Lean 的建模：仍然是集合，成员条件是“或者”

## Beat 3: Lean’s model — an “or” predicate

### Title zh

Lean 怎样给并集建模

### English

The aim is classroom `∪`. Lean keeps `Set α`, then hangs `∪` on sets through the `Union` typeclass.

`Set.union` is the “or” predicate. The instance is extra wiring so the page still writes `∪`.

### Chinese

目标就是课堂上的 `∪`。Lean 继续用 `Set α`，再通过类型类 `Union` 把符号挂上去。

`Set.union` 是“或者”这句成员条件。实例是额外接线，好让纸上仍然写出 `∪`。

### Lean

```lean
protected def union (s t : Set α) := {a | a ∈ s ∨ a ∈ t}
infixl:65 " ∪ " => Union.union
instance : Union (Set α) := ⟨Set.union⟩
```

### Editor

lean

### Next en

How Mathlib uses ∪.

### Next zh

Mathlib 怎样使用并集

## Beat 4: How Mathlib uses ∪

### Title zh

Mathlib 怎样使用并集

### English

`mem_union` only unfolds the definition. Lattice lemmas then treat `∪` as a supremum.

Idempotence, associativity, and De Morgan all ride that one predicate.

### Chinese

引理 `mem_union` 只是把定义展开。格上的引理再把 `∪` 当成上确界来用。

幂等、结合律、德摩根定律，都骑在这一条成员条件上。

### Lean

```lean
-- unfolding, not a second model
theorem mem_union {s t : Set α} :
    a ∈ s ∪ t ↔ a ∈ s ∨ a ∈ t
```

### Editor

lean

### Next en

Turn names Union and writes law def.

### Next zh

Turn 给并集起名，并写下定律 def

## Beat 5: Turn names Union and writes law def

### Title zh

Turn 给并集起名，并写下定律 def

### English

`Union<T, A, B>` _is_ the union set. Its only law is the classroom “or”.

Later proofs write `unfold Union.def`. That is the lookup.

### Chinese

`Union<T, A, B>` 本身就是那个并集。它唯一的定律就是课堂上的“或者”。

后面的证明写成 `unfold Union.def`。这就是查找入口。

### Turn-Lang

```turn
@notation({A} ~ " ∪ " ~ {B})
structure Union<T: Any, A B: Set<T>>: Set<T> {
    relations {
        law def: Prop {
            forall x in self |- x in A or x in B
        }
    }
}
```

### Editor

turn

### Next en

Where the AATA file unfolds Union.def.

### Next zh

AATA 文件在哪里展开 Union.def

## Beat 6: Where the AATA file unfolds Union.def

### Title zh

AATA 文件在哪里展开 Union.def

### English

Theorem `basic set` proves `SetEq(Union(A, A), A)` by unfolding `Union.def` and splitting the “or”.

De Morgan does the same: `unfold Union.def at h.2`. One law, many theorems.

### Chinese

定理 `basic set` 证明 `SetEq(Union(A, A), A)` 时，先展开 `Union.def`，再把“或者”拆开。

德摩根定律也是如此：`unfold Union.def at h.2`。一条定律，很多条定理。

### Turn-Lang

```turn
first: SetEq(Union(A, A), A)
-- unfold Union.def, then split the or
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

Textbook: a set-builder and a glyph. Lean: redefine the predicate on `Set α`. Turn: a named structure whose `def` law you unfold.

Same “or”. Three lookups.

### Chinese

课本给集合表示和一个记号。Lean 在集合类型 `Set α` 上改写成员条件。Turn-Lang 给一个有名字的结构，证明时展开它的定律 `def`。

“或者”是同一句。三处的查找方式不同。

### Next en

Do not treat mem_union as the model.

### Next zh

不要把 mem_union 当成建模本身

## Beat 8: mem_union is the unfolding

### Title zh

mem_union 只是把定义展开

### English

If you only show `a ∈ s ∪ t ↔ a ∈ s ∨ a ∈ t`, you hid how Lean built the set.

The model is `Set.union`. The biconditional is a corollary, like Turn’s `unfold Union.def`.

### Chinese

如果只出示 `a ∈ s ∪ t ↔ a ∈ s ∨ a ∈ t`，就藏起了 Lean 怎样造出这个集合。

建模是 `Set.union`。这条双向只是推论，相当于 Turn-Lang 里的 `unfold Union.def`。

### Lean

```lean
protected def union (s t : Set α) := {a | a ∈ s ∨ a ∈ t}
```

### Editor

lean

### Next en

The constructed set is still a set.

### Next zh

造出来的仍然是一个集合

## Beat 9: The constructed set is still a set

### Title zh

造出来的仍然是一个集合

### English

Turn inherits `Set<T>`. Lean stays on `Set α`. You can ask membership of the union the same way as of `A`.

That is why later algebra of sets can treat `A ∪ B` as just another set.

### Chinese

Turn-Lang 让并集继承 `Set<T>`。Lean 仍然停在 `Set α` 上。你可以像问 `A` 那样问并集的成员。

所以后面的集合代数，能把 `A ∪ B` 只当成又一个集合。

### Next en

Next: intersection, the “and” twin.

### Next zh

下期：交集，也就是“并且”那一边

## Beat 10: Next — intersection, the “and” twin

### Title zh

下期：交集，也就是“并且”那一边

### English

Same constructed-set pattern. Only the joining word changes: “and” instead of “or”.

The AATA file will write `Intersect` with a conjunction block, then unfold `Intersect.def`.

### Chinese

还是“造出一个集合”这一套路。变的只是连接词：把“或者”换成“并且”。

AATA 文件会把交集写成带合取块的 `Intersect`，再展开 `Intersect.def`。

### Next en

Next: intersection — in A and in B.

### Next zh

下期：交集，也就是同时属于 A 并且属于 B
