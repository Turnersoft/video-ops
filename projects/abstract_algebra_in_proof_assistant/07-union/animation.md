---
videoOps: 1
scriptId: 07-union
title: 07_union
fps: 30
socialTitleEnglish: "7. Union: in A or in B"
socialTitleChina: "7. 并集：在 A 里或在 B 里"
promotionalDescription: "Union is not two boxes glued together. It is a third set: you are in it if you are in A or in B."
promotionalDescriptionChina: "并集不是把两个盒子焊在一起。它是第三个集合：你在 A 里，或者在 B 里，就算在里面。"
format: landscape
width: 1920
height: 1080
---

# Scene 1: Union — a constructed set

<!--
layout: dual-panel
burn-captions: true
visual-notes: Continues 06-empty-subset-theorem. Ten beats: textbook set-builder; third set not a sentence; Lean Set.union plus Union wiring; mem_union unfolds; Turn Union plus def; where AATA unfolds Union.def; three-way compare; mem_union is not the model; constructed set is still a set; intersection CTA.
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
display.editor-font-scale: 0.7
display.lean-editor-font-scale: 0.8
display.render-font-scale: 0.85
-->

## Overlay: textbook-union

<!--
type: textbook
aata-excerpt: sets-union-definition
placement: center
definition-label: Union
book-title: Abstract Algebra: Theory and Applications
book-author: Thomas W. Judson
source: §1.2 — Sets and Equivalence Relations
-->

### LaTeX

```latex
A \cup B = \{ x \mid x \in A \text{ or } x \in B \}
```

## Beat 1: Open the book — union

<!--
overlay: textbook-union
duration: 18
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

Hi friends, welcome back.
Last time we proved empty is a subset of every set.
We unfolded Subset, and we cited no_members.
Today we pick up the same Turn-Lang file.
The textbook writes a set-builder: A union B is the set of x such that x is in A, or x is in B.
The page treats that cup as a primitive mark.
It does not say which object later proofs should unfold.

### Lean

```lean
-- From class:
--   A ∪ B = { x | x ∈ A or x ∈ B }
-- The book does not say which object to unfold.
```

### Lean highlights

- `A ∪ B`
- `x ∈ A or x ∈ B`

### Turn

```turn
@notation({A} ~ " ∪ " ~ {B})
structure Union<T: Any, A B: Set<T>>: Set<T>
```

### Turn highlights

- `Union`
- `" ∪ "`

### Chinese

大家好，欢迎回来。上期我们证明了空集是任何集合的子集。展开了 Subset，还引用了 no_members。今天还是同一份 Turn-Lang 文件。课本用集合表示写出并集：A 并 B 是那些 x，x 在 A 里或者在 B 里。纸上的杯号像一个原始记号。课本没有说后面的证明该展开哪一个对象。

### Visual notes

Keep the textbook overlay visible. Show the set-builder. Do not yet contrast structure versus relation.

## Beat 2: A third set, not a claim

<!--
duration: 18
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

Here is the key idea.
Subset was a sentence about two sets you already had.
Union is not a sentence.
It is a new set you can test membership on.
Think of two guest lists.
You are on the combined list if you are on list A, or on list B.
Once A and B are fixed, that third list is fixed.

### Lean

```lean
-- Subset: a claim about A and B
-- Union: a third set, built from A and B
```

### Turn

```turn
-- Subset(A, B) is a proposition
-- Union(A, B) is a set
```

### Turn highlights

- `Union(A, B) is a set`

### Chinese

关键在这里。子集是关于两个已有集合的一句话。并集不是一句话。它是一个新的集合，你可以问属不属于。想像两份来宾名单。你在合并名单上，意思是你在 A 的名单上，或者在 B 的名单上。A 和 B 一旦定了，第三份名单也就定了。

### Visual notes

Two labeled lists, then a third. Contrast with the subset clip: no new box then, a new box now.

## Beat 3: Lean’s model — an “or” predicate

<!--
duration: 20
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

The aim is still the classroom union symbol.
Lean does not invent a type called UnionSet.
It keeps Set alpha, then hangs that symbol on sets through a typeclass named Union.
Set.union is the membership test: in s or in t.
The instance is extra wiring, so the page still writes the union sign.

### Lean

```lean
protected def union (s t : Set α) := {a | a ∈ s ∨ a ∈ t}
infixl:65 " ∪ " => Union.union
instance : Union (Set α) := ⟨Set.union⟩
```

### Lean highlights

- `protected def union`
- `a ∈ s ∨ a ∈ t`
- `infixl:65 " ∪ "`
- `instance : Union (Set α)`

### Turn

```turn
@notation({A} ~ " ∪ " ~ {B})
structure Union<T: Any, A B: Set<T>>: Set<T>
```

### Chinese

目标还是课堂上的那个杯号。Lean 并不另造类型 UnionSet。它继续用 Set alpha，再通过类型类 Union 把杯号挂上去。Set.union 就是那句成员条件：在 s 里或者在 t 里。实例是额外接线，好让纸上仍然写出杯号。

### Visual notes

Same wiring story as EmptyCollection last week: keep Set α, attach the glyph. Point at `∨`, then at the instance.

## Beat 4: How Mathlib uses ∪

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

Once that predicate exists, Mathlib mostly unfolds it.
mem_union is not a second model.
It is the biconditional that says: a is in s union t if and only if a is in s or a is in t.
Lattice lemmas then treat union as a supremum.
Idempotence, associativity, De Morgan — they all ride that one predicate.

### Lean

```lean
-- unfolding, not a second model
theorem mem_union {s t : Set α} :
    a ∈ s ∪ t ↔ a ∈ s ∨ a ∈ t
```

### Lean highlights

- `mem_union`
- `a ∈ s ∪ t`
- `↔`
- `a ∈ s ∨ a ∈ t`

### Turn

```turn
law def: Prop {
    forall x in self |- x in A or x in B
}
```

### Chinese

有了这条成员条件，Mathlib 多半只是把它展开。mem_union 不是第二种建模。它是一条双向：a 属于 s 并 t，当且仅当 a 属于 s 或者属于 t。格上的引理再把并集当成上确界来用。幂等、结合律、德摩根定律，都骑在这一条成员条件上。

### Visual notes

Hold mem_union as an unfolding lemma. Tease idempotence for episode 12; do not prove A ∪ A = A here.

## Beat 5: Turn names Union and writes law def

<!--
duration: 18
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

Turn-Lang puts the name on the object itself.
Union of T, A, B is the union set.
It inherits Set of T, so you can still ask membership.
Its only law is the classroom or.
Later proofs write unfold Union.def.
That is the lookup.

### Lean

```lean
protected def union (s t : Set α) := {a | a ∈ s ∨ a ∈ t}
```

### Turn

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

### Turn highlights

- `structure Union`
- `law def`
- `x in A or x in B`

### Chinese

Turn-Lang 把名字写在对象上。Union of T, A, B 本身就是那个并集。它继承 Set of T，所以你还可以问属不属于。它唯一的定律就是课堂上的“或者”。后面的证明写成 unfold Union.def。这就是查找入口。

### Visual notes

Outline `structure Union` and the `def` law. Do not walk a theorem proof on this beat.

## Beat 6: Where the AATA file unfolds Union.def

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

You will see that lookup immediately.
Theorem basic set proves A union A equals A by unfolding Union.def, then splitting the or.
De Morgan does the same: unfold Union.def at h.2.
One law, many theorems.
We are not proving those today.
I just want you to see where the file looks.

### Lean

```lean
theorem union_self (s : Set α) : s ∪ s = s
-- later clip: unfolds Set.union, then Set.ext
```

### Turn

```turn
first: SetEq(Union(A, A), A)
-- unfold Union.def, then split the or
```

### Turn highlights

- `SetEq(Union(A, A), A)`
- `Union.def`

### Chinese

这个查找入口马上就会用到。定理 basic set 证明 A 并 A 等于 A 时，先展开 Union.def，再把“或者”拆开。德摩根定律也是如此：unfold Union.def at h.2。一条定律，很多条定理。今天不证那些。我只想让你看见文件往哪里找。

### Visual notes

Show the unfold site, not the full tactic replay. No `proof { }` — that would split this beat into tactic cards. Episode 12 walks idempotence.

## Beat 7: Textbook vs Lean vs Turn

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

So three lookups, same or.
Textbook: a set-builder and a glyph.
Lean: redefine the predicate on Set alpha.
Turn: a named structure whose def law you unfold.
Same classroom union symbol.
Different place to look it up.

### Lean

```lean
protected def union (s t : Set α) := {a | a ∈ s ∨ a ∈ t}
instance : Union (Set α) := ⟨Set.union⟩
```

### Turn

```turn
structure Union<T: Any, A B: Set<T>>: Set<T> {
    law def: Prop {
        forall x in self |- x in A or x in B
    }
}
```

### Chinese

所以三处查找，同一句“或者”。课本给集合表示和一个记号。Lean 在集合类型 Set alpha 上改写成员条件。Turn-Lang 给一个有名字的结构，证明时展开它的定律 def。课堂上的杯号相同。不同的是你到哪里去找它。

### Visual notes

Three short labels: set-builder / predicate on Set α / named structure. Fair compare, no dunking.

## Beat 8: mem_union is the unfolding

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

One trap.
If you only show a in s union t iff a in s or a in t, you hid how Lean built the set.
The model is Set.union.
The biconditional is a corollary.
It is the same job as unfold Union.def on the Turn side.

### Lean

```lean
protected def union (s t : Set α) := {a | a ∈ s ∨ a ∈ t}
```

### Lean highlights

- `protected def union`
- `{a | a ∈ s ∨ a ∈ t}`

### Turn

```turn
unfold Union.def
```

### Chinese

有一个坑。如果只出示 a 属于 s 并 t 当且仅当 a 属于 s 或者属于 t，就藏起了 Lean 怎样造出这个集合。建模是 Set.union。那条双向只是推论。相当于 Turn-Lang 里的 unfold Union.def。

### Visual notes

Put `Set.union` above `mem_union`. Same pattern as last clip: `empty_subset` was a name, not the empty set.

## Beat 9: The constructed set is still a set

<!--
duration: 14
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

And after all that wiring, union is still a set.
Turn inherits Set of T.
Lean stays on Set alpha.
You ask membership of the union the same way you ask membership of A.
That is why later algebra of sets can treat A union B as just another set.

### Lean

```lean
variable (A B : Set α)
#check A ∪ B  -- still Set α
```

### Turn

```turn
structure Union<T: Any, A B: Set<T>>: Set<T>
```

### Turn highlights

- `: Set<T>`

### Chinese

接完线以后，并集仍然是一个集合。Turn-Lang 让并集继承 Set of T。Lean 仍然停在 Set alpha 上。你可以像问 A 那样问并集的成员。所以后面的集合代数，能把 A 并 B 只当成又一个集合。

### Visual notes

Point at the inheritance `: Set<T>` and Lean’s `Set α`. Membership is the same question as episode 1.

## Beat 10: Next — intersection, the “and” twin

<!--
duration: 14
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

Same constructed-set pattern next time.
Only the joining word changes: and, instead of or.
The AATA file will write Intersect with a conjunction block, then unfold Intersect.def.
Please hit like if this compare is helping.
Subscribe, and I will see you for intersection.

### Lean

```lean
-- next clip: A ∩ B = { x | x ∈ A and x ∈ B }
```

### Turn

```turn
-- next: Intersect, same pattern, joining word “and”
-- unfold Intersect.def
```

### Chinese

下次还是“造出一个集合”这一套路。变的只是连接词：把“或者”换成“并且”。AATA 文件会把交集写成带合取块的 Intersect，再展开 Intersect.def。如果这个对照对你有帮助，请点个赞。订阅一下，下期见交集。

### Visual notes

CTA only. Do not define intersection on this beat. Leave the “and” as a teaser.
