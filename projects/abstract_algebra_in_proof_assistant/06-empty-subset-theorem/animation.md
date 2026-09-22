---
videoOps: 1
scriptId: 06-empty-subset-theorem
title: 06_empty_subset_theorem
fps: 30
socialTitleEnglish: "6. The empty set is a subset of every set"
socialTitleChina: "6. 空集是任何集合的子集"
promotionalDescription: "The book calls ∅ ⊆ S obvious. Subset is an if-then, and empty never opens the if. We prove it by unfolding, then citing last clip’s no_members law."
promotionalDescriptionChina: "课本把空集是任何集合的子集写成显然。子集是一个蕴涵：如果在空集里，就在那边。空集里没有元素，前提永远打不开。今天把这句证出来。"
format: landscape
width: 1920
height: 1080
---

# Scene 1: Empty subset of every set

<!--
layout: dual-panel
burn-captions: true
visual-notes: Continues 05-empty-set. Ten beats: textbook obvious line; subset as implication; Lean unfolds ⊆ and False; empty_subset names the unfolding; Turn writes the classroom sentence; proof cites no_members; later proofs copy the lookup; three-way compare; don’t invent a Lean-style theorem name in Turn; union CTA.
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
display.editor-font-scale: 0.7
display.lean-editor-font-scale: 0.8
display.render-font-scale: 0.85
-->

## Overlay: textbook-empty-subset

<!--
type: textbook
aata-excerpt: sets-empty-subset-theorem
placement: center
definition-label: Empty subset
book-title: Abstract Algebra: Theory and Applications
book-author: Thomas W. Judson
source: §1.2 — Sets and Equivalence Relations
-->

### LaTeX

```latex
The empty set is a subset of every set.
```

## Beat 1: Open the book — a theorem about the empty set

<!--
overlay: textbook-empty-subset
duration: 18
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

Hi friends, welcome back.
Last time we named the empty set, and we wrote one law: nothing is a member.
Today we pick up the same file.
The textbook has a one-line theorem: the empty set is a subset of every set.
It treats that line as obvious.
It does not say which definition you should unfold.

### Lean

```lean
-- From class:
--   ∅ ⊆ S  for every set S
-- The book does not say which definition to unfold.
```

### Lean highlights

- `∅ ⊆ S`
- `every set S`

### Turn

```turn
theorem "Empty subset of every set" {
  forall S: Set<Any> |- Subset(EmptySet, S)
}
```

### Turn highlights

- `Empty subset of every set`
- `Subset(EmptySet, S)`

### Chinese

大家好，欢迎回来。上期我们给空集起了名，还写了一条定律：谁都不是成员。今天还是同一份文件。课本有一句定理：空集是任何集合的子集。它把这句当成显然。它没有说该展开哪一条定义。

### Visual notes

Keep the textbook overlay visible. Show the one-line theorem first. Do not show a full proof yet.

## Beat 2: Subset is an implication

<!--
duration: 20
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

Okay, so what is subset actually asking?
From two clips ago: A is a subset of B when every element of A is already in B.
In other words: if x is in A, then x is in B.
Now put empty on the left.
If x is in the empty set, then x is in S.
There is no such x.
So the if never opens.
That is why people call this vacuous truth.

### Lean

```lean
-- Subset asks an implication:
--   x ∈ ∅  →  x ∈ S
-- The left side never holds.
```

### Lean highlights

- `x ∈ ∅`
- `→`
- `x ∈ S`

### Turn

```turn
relation Subset(T: Any, A B: Set<T>): Prop {
    forall x: T
    |- x in A -> x in B
}
```

### Turn highlights

- `x in A -> x in B`
- `Subset`

### Chinese

所以子集到底在问什么？两集之前那期：A 是 B 的子集，意思是 A 里的每个元素本来就在 B 里。也就是：如果 x 在 A 里，那么 x 在 B 里。现在把空集放在左边。如果 x 在空集里，那么 x 在 S 里。这样的 x 并不存在。所以这个“如果”永远打不开。这就是空真。

### Visual notes

Write the implication in the open. Pause on “the if never opens.” Do not say “ex falso” or “False.elim” yet.

## Beat 3: Lean’s model — unfold ⊆ and False

<!--
duration: 18
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

Lean already hung subset and empty on Set alpha.
This theorem does not invent a new object.
It just unfolds both.
Empty is the predicate that answers False.
Subset is the implication.
So empty subset S means False implies a is in S.
The lemma is extra naming, not a new model.

### Lean

```lean
instance : HasSubset (Set α) := ⟨Set.Subset⟩
instance : EmptyCollection (Set α) := ⟨fun _ => False⟩
theorem empty_subset (s : Set α) : ∅ ⊆ s
```

### Lean highlights

- `HasSubset`
- `EmptyCollection`
- `fun _ => False`
- `empty_subset`

### Turn

```turn
theorem "Empty subset of every set" {
  forall S: Set<Any> |- Subset(EmptySet, S)
}
```

### Chinese

Lean 已经把子集和空集挂在 Set alpha 上。这条定理并不另造一个对象。它只是把两处一起展开。空集是一个永远回答假的谓词。子集是那个蕴涵。所以空集是 S 的子集，意思就是假命题蕴涵 a 属于 S。引理只是额外起名，不是新的建模。

### Visual notes

Point at EmptyCollection’s `False`, then at ⊆. Keep empty_subset as a name tag, not the construction.

## Beat 4: How Mathlib uses empty_subset

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

So why does Mathlib bother naming it?
Because later proofs do not want to rebuild False implies whatever every time.
They cite empty_subset.
Same story as not_mem_empty from last clip.
A corollary of the model, used throughout Data.Set.

### Lean

```lean
-- Mathlib/Data/Set/Basic.lean
theorem empty_subset (s : Set α) : ∅ ⊆ s
-- later proofs cite this instead of rebuilding False → _
```

### Lean highlights

- `Mathlib/Data/Set/Basic.lean`
- `empty_subset`
- `∅ ⊆ s`

### Turn

```turn
theorem "Empty subset of every set" {
  forall S: Set<Any> |- Subset(EmptySet, S)
}
```

### Chinese

那 Mathlib 为什么还要给它起名？因为后面的证明不想每次重写“假命题蕴涵随便什么”。它们引用 empty_subset。这和上期的 not_mem_empty 是同一件事：建模的推论，在 Data.Set 里反复使用。

### Visual notes

Show the file path. Treat the lemma as a lookup, not a second definition of empty.

## Beat 5: Turn writes the named theorem

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

Turn-Lang does not write theorem empty_subset of S.
The AATA file names it Empty subset of every set.
The claim is Subset of EmptySet and S.
No invented identifier.
The name is the classroom sentence.

### Lean

```lean
theorem empty_subset (s : Set α) : ∅ ⊆ s
```

### Turn

```turn
theorem "Empty subset of every set" {
  forall S: Set<Any> |- Subset(EmptySet, S)
}
```

### Turn highlights

- `"Empty subset of every set"`
- `Subset(EmptySet, S)`

### Chinese

Turn-Lang 并不写成 theorem empty_subset of S。AATA 文件把这条定理叫做 Empty subset of every set。断言是 Subset(EmptySet, S)。没有另造一个函数名。定理的名字就是课堂上的那句话。

### Visual notes

Contrast Lean’s identifier with Turn’s quoted classroom title. No proof body on this beat.

## Beat 6: The proof cites last clip’s law

<!--
duration: 22
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

Okay, now the proof.
First unfold Subset at the goal.
Now it says: for every x, if x is in empty, then x is in S.
The left side of that arrow is last clip’s law.
Nothing is in EmptySet.
So we contradict the premise by EmptySet.no_members.
We do not rewrite “nobody is in” by hand.
We point at the named law.

### Lean

```lean
theorem empty_subset (s : Set α) : ∅ ⊆ s
-- unfolds to: a ∈ ∅ → a ∈ s
-- and a ∈ ∅ is False
```

### Turn

```turn
theorem "Empty subset of every set" {
  forall S: Set<Any> |- Subset(EmptySet, S)
} proof {
  unfold Subset at goal
  contradiction goal.1 by EmptySet.no_members
}
```

### Turn highlights

- `unfold Subset at goal`
- `contradiction goal.1`
- `EmptySet.no_members`

### Hint

Unfold `Subset` first. The leftover arrow is `x in EmptySet → x in S`. `goal.1` is that premise; `EmptySet.no_members` already says it is false.

<!-- target: turn-code; needle: EmptySet.no_members; position: 28,62 -->

### Chinese

现在看证明。先在目标上展开 Subset。现在它说：对每一个 x，如果 x 在空集里，那么 x 在 S 里。箭头左边就是上期的定律。EmptySet 里什么都没有。所以我们用 EmptySet.no_members 把前提推出矛盾。不必手写“谁都不在里面”。点名那条定律就行。

### Visual notes

Replay two tactics only. Highlight `unfold Subset`, then `EmptySet.no_members`. Do not add assume_not — the story is the unopened implication.

## Beat 7: Later proofs copy this pattern

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

And this is not a one-off trick.
Later in the same file, A minus A equals empty ends the same way.
The symmetric-difference example too.
Both close with contradiction by EmptySet.no_members.
Today is the first time the file shows that library move.

### Lean

```lean
-- later Mathlib also reuses empty, not a fresh “nobody is in”
example (A : Set α) : A \ A = ∅ := by
  ext x; simp
```

### Turn

```turn
third: SetEq(Difference(A, A), EmptySet)
-- same close: contradiction … by EmptySet.no_members
```

### Turn highlights

- `Difference(A, A)`
- `EmptySet`

### Chinese

这不是只用一次的技巧。同一份文件后面，A 减 A 等于空集，结尾也是这样。对称差的例子也是。两边都用 contradiction by EmptySet.no_members 收尾。今天是整份文件第一次演示这个库用法。

### Visual notes

Show the Difference snippet as a reuse, not a new proof to walk. No `proof { }` block — that would split this beat into tactic cards.

## Beat 8: Textbook vs Lean vs Turn

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

So three lookups, same fact.
Textbook: obvious.
Lean: False implies anything, then a named lemma.
Turn: unfold Subset, cite EmptySet.no_members.
Vacuous truth is the same sentence.
The difference is where you look it up.

### Lean

```lean
theorem empty_subset (s : Set α) : ∅ ⊆ s
-- False → a ∈ s, then a name
```

### Turn

```turn
unfold Subset at goal
contradiction goal.1 by EmptySet.no_members
```

### Chinese

所以三处查找，同一件事实。课本说显然。Lean 用“假命题蕴涵任何结论”，再给引理起名。Turn-Lang 展开 Subset，并引用 EmptySet.no_members。空真是同一句话。不同的是你到哪里去找它。

### Visual notes

Three short labels on screen: obvious / False-implies / named law. No dunking — three pedagogies.

## Beat 9: The statement is a classroom sentence

<!--
duration: 14
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

One thing I do not want you to copy.
Do not invent theorem empty_subset of S inside Turn.
Turn writes a classroom title, then a proof that uses the empty-set law.
That is the library style for the rest of AATA sets.

### Lean

```lean
theorem empty_subset (s : Set α) : ∅ ⊆ s
```

### Turn

```turn
theorem "Empty subset of every set" {
    forall S: Set<Any> |- Subset(EmptySet, S)
}
```

### Turn highlights

- `theorem "Empty subset of every set"`

### Chinese

有一件事请不要照抄。不要在 Turn 里另造 theorem empty_subset of S。Turn-Lang 写成课堂上的标题，再用空集的定律做证明。AATA 集合这一章后面的定理，都是这个库风格。

### Visual notes

Hold the quoted title. Lean’s identifier stays on the left as contrast, not as the Turn spelling.

## Beat 10: Next — union, the first constructed set

<!--
duration: 14
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

Today we reused EmptySet and Subset.
We did not build a third set.
Next clip does.
Union: you are in it when you are in A, or in B.
Same file. Next time we unfold Union.def the way we unfolded Subset today.

### Lean

```lean
-- next clip: A ∪ B = { x | x ∈ A ∨ x ∈ B }
```

### Turn

```turn
-- next: Union, a constructed set
-- unfold Union.def, the way we unfolded Subset
```

### Chinese

今天用到的是空集和子集关系。我们没有造第三个集合。下一集要造。并集：你在 A 里，或者在 B 里，就算在里面。还是同一份文件。下次展开 Union.def，就像今天展开 Subset 一样。

### Visual notes

CTA only. Do not define union on this beat. Leave the set-builder as a teaser.
