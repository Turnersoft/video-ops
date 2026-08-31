# Beat Posters — 11-difference

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

## Beat 1: Open the book — difference

### Title zh

打开课本。今天的对象是差集

### English

The textbook writes `A \ B = { x ∈ A | x ∉ B }`. The left set is already the universe of this sentence.

Keep who belongs to `A`. Drop who also belongs to `B`.

### Chinese

课本把差集写成 `A \ B = { x ∈ A | x ∉ B }`。左边的集合 `A` 已经是这句话的宇宙。

属于 `A` 的留下。同时也属于 `B` 的去掉。

### Next en

Lean’s model: still Set α, with “in and not-in”.

### Next zh

Lean 的建模：仍然是集合，成员条件是“在且不在”

## Beat 2: Lean’s model — in s and not in t

### Title zh

Lean 怎样给差集建模

### English

The aim is classroom `A \ B`. Lean hangs `\` through the `SDiff` typeclass.

`Set.diff` is the predicate. The instance is extra wiring so the page still writes `\`.

### Chinese

目标就是课堂上的 `A \ B`。Lean 通过类型类 `SDiff` 把 `\` 挂上去。

`Set.diff` 是成员条件。实例是额外接线，好让纸上仍然写出 `\`。

### Lean

```lean
protected def diff (s t : Set α) := {a ∈ s | a ∉ t}
instance : SDiff (Set α) := ⟨Set.diff⟩
```

### Editor

lean

### Next en

How Mathlib uses difference.

### Next zh

Mathlib 怎样使用差集

## Beat 3: How Mathlib uses difference

### Title zh

Mathlib 怎样使用差集

### English

`mem_diff` unfolds the definition. The library also proves `s \ t = s ∩ tᶜ`.

Classroom relative complement `U \ A` is this same `Set.diff`.

### Chinese

引理 `mem_diff` 把定义展开。库里还会证明 `s \ t = s ∩ tᶜ`。

课堂上相对于宇宙的补集 `U \ A`，用的就是同一个 `Set.diff`。

### Lean

```lean
theorem mem_diff {s t : Set α} :
    a ∈ s \ t ↔ a ∈ s ∧ a ∉ t
```

### Editor

lean

### Next en

Turn writes Difference with ∖ and a conjunction block.

### Next zh

Turn 的差集用 ∖，并用合取块来写

## Beat 4: Turn writes ∖ and a conjunction block

### Title zh

Turn 的差集用 ∖，并用合取块来写

### English

The glyph is `∖`, not a doubled backslash. The `def` law is two lines: in `A`, and not in `B`.

Same conjunction-block style as `Intersect`.

### Chinese

符号是 `∖`，不是两条反斜杠。定律 `def` 写成两行：属于 `A`，并且不属于 `B`。

合取块的写法和交集 `Intersect` 相同。

### Next en

The real Difference definition.

### Next zh

差集的真实定义

## Beat 5: The real Difference definition

### Title zh

差集的真实定义

### English

`Difference` is a set. Later proofs write `unfold Difference.def`.

That is the lookup for `A \ A = ∅` and for the patch against complement.

### Chinese

`Difference` 是一个集合。后面的证明写成 `unfold Difference.def`。

`A \ A = ∅`，以及差集对补集的那条补丁，都从这里查找。

### Turn-Lang

```turn
@notation({A} ~ " ∖ " ~ {B})
structure[T] Difference<T: Any, A B: Set<T>>: Set<T> {
    relations {
        law def: Prop {
            forall x in self |- {
                x in A;
                not (x in B);
            }
        }
    }
}
```

### Editor

turn

### Next en

Where the AATA file uses Difference.

### Next zh

AATA 文件在哪里使用差集

## Beat 6: Where the AATA file uses Difference

### Title zh

AATA 文件在哪里使用差集

### English

`basic set` proves `SetEq(Difference(A, A), EmptySet)` by unfolding `Difference.def` and citing `EmptySet.no_members`.

The patch theorem says `Difference(A, B)` equals `Intersect(A, Complement(U, B))`.

### Chinese

定理 `basic set` 证明 `SetEq(Difference(A, A), EmptySet)` 时，展开 `Difference.def`，再引用 `EmptySet.no_members`。

补丁定理则说：`Difference(A, B)` 等于 `Intersect(A, Complement(U, B))`。

### Turn-Lang

```turn
theorem "Difference versus U-relative patch in a universe" {
  forall U A B: Set<T>
  |- SetEq(Difference(A, B),
     Intersect(A, Complement(U, B)))
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

Textbook: a set-builder inside `A`. Lean: `Set.diff` on `Set α`. Turn: a named structure with `∖` and a `def` law.

The patch `A \ B = A ∩ B′` is a theorem in Turn. In Lean it is `sdiff_eq` after `sᶜ`.

### Chinese

课本在 `A` 里写集合表示。Lean 在 `Set α` 上写 `Set.diff`。Turn-Lang 给有名字的结构，符号是 `∖`，再加定律 `def`。

`A \ B = A ∩ B′` 在 Turn-Lang 里是一条定理。在 Lean 里则是绝对补集之后的 `sdiff_eq`。

### Next en

Do not write \\ as the Turn glyph.

### Next zh

不要把 Turn 的符号写成两条反斜杠

## Beat 8: The glyph is ∖

### Title zh

符号是 ∖

### English

The AATA notation is `{A} ~ " ∖ " ~ {B}`. Display that glyph.

The membership block is two propositions, not a single `and` token.

### Chinese

AATA 的记号是 `{A} ~ " ∖ " ~ {B}`。海报上就要用这个符号。

成员条件是两句命题，不是一个单独的 `and` 记号。

### Turn-Lang

```turn
@notation({A} ~ " ∖ " ~ {B})
structure[T] Difference<T: Any, A B: Set<T>>: Set<T> {
    relations {
        law def: Prop {
            forall x in self |- {
                x in A;
                not (x in B);
            }
        }
    }
}
```

### Editor

turn

### Next en

Next: the first algebra leaf, A ∪ A = A.

### Next zh

下期：集合代数的第一片叶子，A ∪ A = A

## Beat 9: Next — the first algebra leaf

### Title zh

下期：集合代数的第一片叶子

### English

The AATA theorem `basic set` opens with `SetEq(Union(A, A), A)`.

That proof unfolds `Union.def` — the law from the union clip — and splits the “or”.

### Chinese

AATA 的定理 `basic set` 第一条就是 `SetEq(Union(A, A), A)`。

那份证明会展开并集那一集的定律 `Union.def`，再把“或者”拆开。

### Next en

Next: A ∪ A = A.

### Next zh

下期：并集的幂等，也就是 A ∪ A = A
