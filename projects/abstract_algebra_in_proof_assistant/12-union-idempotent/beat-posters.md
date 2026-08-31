# Beat Posters — 12-union-idempotent

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

## Beat 1: Open the book — union with itself

### Title zh

打开课本。今天是并集的幂等

### English

The textbook identity states `A ∪ A = A`. Union is idempotent.

The textbook lists it with five other algebra facts. This clip is only the first leaf.

### Chinese

课本把第一条恒等式写成 `A ∪ A = A`。并集是幂等的。

课本把它和另外五条代数事实列在一起。这一集只要第一片叶子。

### Next en

Lean’s model: extensionality plus the “or” predicate.

### Next zh

Lean 的建模：外延性加上“或者”这句成员条件

## Beat 2: Lean’s model — extensionality plus “or”

### Title zh

Lean 怎样得到并集幂等

### English

Sets are equal when they have the same members. That is `Set.ext`.

`x ∈ s ∪ s` is `x ∈ s ∨ x ∈ s`, which is `x ∈ s`. The theorem is this unfolding.

### Chinese

两个集合相等，当且仅当它们的成员完全一样。这就是外延性 `Set.ext`。

`x` 属于 `s ∪ s`，意思是 `x` 属于 `s` 或者属于 `s`，也就是 `x` 属于 `s`。这条定理是把并集的定义展开。

### Lean

```lean
protected def union (s t : Set α) := {a | a ∈ s ∨ a ∈ t}
infixl:65 " ∪ " => Union.union
instance : Union (Set α) := ⟨Set.union⟩
```

### Editor

lean

### Next en

How Mathlib uses union_self.

### Next zh

Mathlib 怎样使用 union_self

## Beat 3: How Mathlib uses union_self

### Title zh

Mathlib 怎样使用 union_self

### English

`union_self` names the unfolding. Simplifiers rewrite `s ∪ s` to `s` all over the library.

It is not a new model of union. It is how the model is cited.

### Chinese

引理 `union_self` 只是给这次展开起名。化简器会在整个库里把 `s ∪ s` 改写成 `s`。

这不是并集的第二种建模。这是库引用这个模型的方式。

### Lean

```lean
theorem union_self (s : Set α) : s ∪ s = s
```

### Editor

lean

### Next en

Turn puts the leaf inside theorem “basic set”.

### Next zh

Turn 把这片叶子放在定理 basic set 里面

## Beat 4: Turn puts the leaf inside “basic set”

### Title zh

Turn 把这片叶子放在定理 basic set 里面

### English

The AATA file does not write `theorem union_self(A)`. It writes theorem `"basic set"`, then `first: SetEq(Union(A, A), A)`.

The six textbook parts share one theorem folder.

### Chinese

AATA 文件并不写成 `theorem union_self(A)`。它写成定理 `"basic set"`，再写 `first: SetEq(Union(A, A), A)`。

课本的六部分，共用同一个定理文件夹。

### Next en

The real first proof.

### Next zh

第一条证明的真实写法

## Beat 5: The real first proof

### Title zh

第一条证明的真实写法

### English

Unfold `SetEq`, then both `Subset` directions. On the union side, `unfold Union.def` and split the “or”.

The other direction rebuilds the “or” by reducing to the left.

### Chinese

先展开集合相等 `SetEq`，再展开两个方向的子集关系。在并集那一侧，展开 `Union.def`，再把“或者”拆开。

另一侧则把“或者”收回到左边。

### Turn-Lang

```turn
theorem "basic set" {
  forall A B C: Set<Any> |- {
    first: SetEq(Union(A, A), A) proof {
      unfold Union.def at h
    }
  }
}
```

### Editor

turn

### Next en

How the rest of “basic set” uses the same laws.

### Next zh

basic set 的其余部分怎样使用同一批定律

## Beat 6: How the rest of “basic set” uses the same laws

### Title zh

basic set 的其余部分怎样使用同一批定律

### English

The next leaves unfold `Intersect.def` and `Difference.def`. Identity laws unfold `Union.def` against `EmptySet`.

One folder, the same lookup style as the empty-subset theorem.

### Chinese

后面的叶子会展开 `Intersect.def` 和 `Difference.def`。单位律则对着空集展开 `Union.def`。

同一个文件夹，查找方式和“空集是子集”那条定理相同。

### Turn-Lang

```turn
theorem "basic set" {
    forall A B C: Set<Any> |- {
        p1: {
            first: SetEq(Union(A, A), A)
            second: SetEq(Intersect(A, A), A)
            third: SetEq(Difference(A, A), EmptySet)
        };
        p2: {
            SetEq(Union(A, EmptySet), A)
        }
    }
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

Textbook: a listed identity. Lean: `Set.ext` plus `Set.union`, then a simp lemma. Turn: a named folder whose first proof unfolds `Union.def`.

Same leaf. Three citations.

### Chinese

课本列一条恒等式。Lean 用外延性加上 `Set.union`，再做成一条化简引理。Turn-Lang 用有名字的文件夹，第一条证明展开 `Union.def`。

同一片叶子。三处的引用方式不同。

### Next en

Do not invent theorem union_self in Turn.

### Next zh

不要在 Turn 里另造 theorem union_self

## Beat 8: The name is “basic set”, not union_self

### Title zh

名字是 basic set，不是 union_self

### English

Turn’s theorem title is the textbook bundle. The identifier `union_self` is Lean’s corollary name.

Keep those names on the correct side of the compare.

### Chinese

Turn-Lang 的定理标题是课本那一整束。标识符 `union_self` 是 Lean 给推论起的名字。

对照的时候，名字要留在正确的一边。

### Lean

```lean
theorem union_self (s : Set α) : s ∪ s = s
```

### Editor

lean

### Next en

The model was already on Union.

### Next zh

建模其实已经写在并集上

## Beat 9: The model was already on Union

### Title zh

建模其实已经写在并集上

### English

This clip does not redefine union. It shows how the library spends `Union.def` and `Set.union`.

If the “or” is already on the object, idempotence is unfolding, not a new idea.

### Chinese

这一集并不重新定义并集。它说明库怎样使用 `Union.def` 和 `Set.union`。

如果“或者”已经写在对象上，幂等就是展开，不是新想法。

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

Later leaves stay in the same folder.

### Next zh

后面的叶子还在同一个文件夹里

## Beat 10: Later leaves stay in the same folder

### Title zh

后面的叶子还在同一个文件夹里

### English

`A ∩ A = A`, `A \ A = ∅`, and `A ∪ ∅ = A` are the next lines of `"basic set"`.

Same unfold-and-cite style. The empty-set law and the `def` laws stay the lookups.

### Chinese

`A ∩ A = A`、`A \ A = ∅`、以及 `A ∪ ∅ = A`，就是 `"basic set"` 接下来的几行。

还是展开再引用。空集的定律，以及各条 `def` 定律，仍然是查找入口。

### Next en

Later leaves: the rest of 1.2.1.

### Next zh

后面的叶子：命题 1.2.1 的其余几条
