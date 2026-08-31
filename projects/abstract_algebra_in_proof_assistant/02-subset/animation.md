---
videoOps: 1
scriptId: 02-subset
title: 02_subset
fps: 30
socialTitleEnglish: "2. Subset: everything in A is already in B"
socialTitleChina: "2. 子集：A 里的，本来就在 B 里"
promotionalDescription: "Subset is the sentence you already say: everything in A is already in B. It is a claim about two sets, not a new box."
promotionalDescriptionChina: "子集就是那句：A 里的，本来就在 B 里。它是两个集合之间的一句话，不是再造一个盒子。"
format: landscape
width: 1920
height: 1080
---

# Scene 1: Subset — Lean vs Turn

<!--
layout: dual-panel
burn-captions: true
visual-notes: Continues sets-v2-01-set. 12 beats: textbook subset → hook → Lean foundation recap → protected def Subset → ∀⦃a⦄ body → ∈ from Set.Mem → instance LE → instance HasSubset → theorem subset_def/rfl → full Lean picture → Turn relation Subset → default ⊆ → proper ⊊ + SetEq → layout compare → CTA proper subset.
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
display.editor-font-scale: 0.7000000000000001
display.lean-editor-font-scale: 0.8
display.render-font-scale: 0.8500000000000001
-->

## Overlay: textbook-subset

<!--
type: textbook
aata-excerpt: sets-subset-definition
placement: center
-->

## Beat 1: Beat 1

<!--
overlay: textbook-subset
duration: 14
allow-script-change: false
-->

Welcome back.
In last video we formalized the set,
Today we formalize subset.
The textbook says A is a subset of B when every element of A is already in B.
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
   }
}
```
### Turn highlights

- `Set`

## Beat 2: Beat 2

<!--
duration: 12
allow-script-change: false
-->

Here is the key idea, just like last time. Subset is not a new container. It is a proposition about two sets you already have. B is not built from A.
### Lean

```lean
-- Mathlib source: mathlib4/Mathlib/Data/Set/Defs.lean (recap from last clip)
def Set (α : Type u) := α → Prop
```
### Lean highlights

- `def Set`
- `α → Prop`
### Turn

```turn
as before
```

## Beat 3: Beat 3

<!--
duration: 12
allow-script-change: false
-->

Quick reminder, this is the same Mathlib file from the last clip. You still have def Set, Set dot Mem, and the Membership instance. Subset is going to build right on top of these.
### Lean

```lean
def Set (α : Type u) := α → Prop

namespace Set
  protected def Mem (s : Set α) (a : α) : Prop :=
    s a

  instance : Membership α (Set α) :=
    ⟨Set.Mem⟩
```
### Lean highlights

- `protected def Mem`
- `instance : Membership α (Set α)`
- `⟨Set.Mem⟩`
### Turn

```turn
as before
```
### Turn highlights

- `Set`

## Beat 4: Beat 4

<!--
duration: 10
allow-script-change: false
-->

First, protected def Subset. It takes s one and s two, both of type Set alpha. So it relates two sets, it does not create one.
### Lean

```lean
namespace Set
  -- …Mem and Membership from last clip…

  protected def Subset (s₁ s₂ : Set α) :=
```
### Lean highlights

- `protected def Subset`
- `s₁ s₂ : Set α`
### Turn

```turn
as before
```

## Beat 5: Beat 5

<!--
duration: 15
allow-script-change: false
-->

The body is for all a, a in s one implies a in s two.
That is exactly the textbook rule.
The double braces around a make it instance-implicit, so Lean again infer the element type for you.
### Lean

```lean
namespace Set
  protected def Subset (s₁ s₂ : Set α) :=
    ∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂
```
### Lean highlights

- `∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂`
### Turn

```turn
as before
```

## Beat 6: Beat 6

<!--
duration: 12
allow-script-change: false
-->

Notice the in symbols here.
They still come from Set dot Mem in the last video.
So subset is just putting 2 of membership condition together in an implication.
### Lean

```lean
as before
```
### Lean highlights

- `a ∈ s₁`
- `a ∈ s₂`
### Turn

```turn
as before
```

## Beat 7: Beat 7

<!--
duration: 19
allow-script-change: false
-->

Now the registration, the same idea as Membership before.
we implement the typeclass LE on set so that we can have use the notation >= on 2 sets.
And again, the angle brackets make Set.Subset the implementation of the only method in typeclass LE.
### Lean

```lean
  protected def Subset (s₁ s₂ : Set α) :=
    ∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂

  instance : LE (Set α) :=
    ⟨Set.Subset⟩
```
### Lean highlights

- `instance : LE (Set α)`
- `⟨Set.Subset⟩`
### Turn

```turn
as before
```

## Beat 8: Beat 8

<!--
duration: 16
allow-script-change: false
-->

Then the typeclass HasSubset registers the subset symbol itself.
But it use the notation from LE that we just implemented.
So both <= notation and subset notation desugars to Set.Subset def of 2 sets
### Lean

```lean
  protected def Subset (s₁ s₂ : Set α) :=
    ∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂

  instance : LE (Set α) :=
    ⟨Set.Subset⟩

  instance : HasSubset (Set α) :=
    ⟨(· ≤ ·)⟩

-- A <= B and A ⊆ B desugars to Set.Subset A B
```
### Lean highlights

- `instance : HasSubset (Set α)`
- `⟨(· ≤ ·)⟩`
### Turn

```turn
as before
```

## Beat 9: Beat 9

<!--
duration: 13
allow-script-change: false
-->

So that is Lean's modelling of subset. One def for the rule, two instances to register the ordering and the symbol, and a theorem tying the notation to the for-all form.
### Lean

```lean
-- Mathlib source: mathlib4/Mathlib/Data/Set/Defs.lean
namespace Set
  protected def Subset (s₁ s₂ : Set α) :=
    ∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂

  instance : LE (Set α) :=
    ⟨Set.Subset⟩

  instance : HasSubset (Set α) :=
    ⟨(· ≤ ·)⟩

end Set
```
### Lean highlights

- `protected def Subset`
- `instance : LE (Set α)`
- `instance : HasSubset (Set α)`
### Turn

```turn
as before
```

## Beat 10: Beat 10

<!--
duration: 20
allow-script-change: false
-->

Now Turn-Lang, same rule, declared as a relation.
relation Subset takes a type T and two sets A and B of type Set of T.
PropModified means several proposition variants share the name.
spoiler alert, we will talk about a special subset in next video
### Lean

```lean
as before
```
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
   }
}
```
### Turn highlights

- `relation Subset`
- `A B: Set<T>`
- `PropModified`

## Beat 11: Beat 11

<!--
duration: 12
allow-script-change: false
-->

Same mathematics, two layouts.
Lean splits definition of Subset and its notation apart.
Turn keeps the relation and its notation together in one block.
### Lean

```lean
as before
```
### Lean highlights

- `protected def Subset`
- `instance : LE (Set α)`
- `instance : HasSubset (Set α)`
### Turn

```turn
as before
```
### Turn highlights

- `relation Subset`
- `default`

## Beat 12: Beat 12

<!--
duration: 10
allow-script-change: false
-->

So Next clip is proper subset, the strict version, with extra drama.
Comment if you are stuck at anything, see you in the next one.
### Lean

```lean
as before
```
### Turn

```turn
as before
```
