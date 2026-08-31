---
videoOps: 1
scriptId: 01-set
title: 01_set
fps: 30
socialTitleEnglish: "1. Set: a yes-or-no question"
socialTitleChina: "1. 集合：先会问在不在"
promotionalDescription: "A set is a yes-or-no question you can ask about every object. You already know the collection; the fun is writing the membership sentence so it can be checked."
promotionalDescriptionChina: "集合是一句能对每个东西回答在或不在的话。你早就认识这个对象；有意思的是把成员那句话写成能核对的样子。"
format: landscape
width: 1920
height: 1080
---

# Scene 1: Set — Lean vs Turn

<!--
layout: dual-panel
burn-captions: true
visual-notes: 18 beats: real source paths on screen: lean4/src/Init/Prelude.lean (45s), lean4/src/Init/Notation.lean (51s), mathlib4/Mathlib/Data/Set/Defs.lean (57s). Teaching lines L14–24 above instance.
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
display.editor-font-scale: 0.7000000000000001
display.lean-editor-font-scale: 0.8
display.render-font-scale: 0.8500000000000001
-->

## Overlay: textbook-p1

<!--
type: textbook
aata-excerpt: sets-set-theory-p1
placement: center
-->

## Beat 1: Beat 1

<!--
overlay: textbook-p1
duration: 18
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

Hi Friends, welcom back! So a set is just a well-defined collection of objects. Those objects are called elements, or members. What we and formal logic care about is the precise rule for deciding whether an element belongs to the set.
### Turn

```turn
structure[T] Set<T: Any> {
}
```
### Turn highlights

- `structure`
- `Set`

## Beat 2: Beat 2

<!--
duration: 36
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

So for Lean, it models a set as a membership test, not a bag of elements.
def Set is Mathlib's approach for that idea.
Parentheses hold alpha — the type of elements you are ranging over.
Type u means alpha is a type at universe level u.
Thin arrow alpha to Prop says: one element in, true or false out.
That is a function type — different from the fat arrow on the lambda line later.
Prop is Lean's type for statements that can be true or false.
and Colon-equals means value assignment.
### Lean

```lean
-- Textbook: a set is a well-defined collection; for each x we decide membership.

-- Mathlib source: mathlib4/Mathlib/Data/Set/Defs.lean
def Set (α : Type u) := α → Prop
```
### Lean highlights

- `mathlib4/Mathlib/Data/Set/Defs.lean`
- `def Set`
- `Type u`
- `α → Prop`
- `Prop`
- `:=`
### Turn

```turn
structure[T] Set<T: Any> {
}
```

## Beat 3: Beat 3

<!--
duration: 17
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

For example, oddIntegers colon Set Int fixes Int as the element type for this one concrete set. Colon here is a type label on the name. The colon equals on the same line says the definition continues on the next line.
### Lean

```lean
def Set (α : Type u) := α → Prop
  -- …
def oddIntegers : Set Int :=
```
### Lean highlights

- `oddIntegers`
- `Set Int`
- `:=`
### Turn

```turn
structure[T] Set<T: Any> {
}
```

## Beat 4: Beat 4

<!--
duration: 18
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

Then fun statement is Lean's anonymous function, like a JavaScript arrow function. And the function take a parameter n and return a statement about n. When that proposition is proven to be true, n will belong to the set.
### Lean

```lean
def oddIntegers : Set Int :=
  fun n => n % 2 = 1
```
### Lean highlights

- `fun n =>`
- `n % 2`
### Turn

```turn
structure[T] Set<T: Any> {
}
```

## Beat 5: Beat 5

<!--
duration: 20
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

So if you apply oddIntegers to n directly, you will get a Prop, a membership question. Notice that Lean never forces you to treat that Prop as membership condition. Rename def Set and the story disappears. That semantic gap is a real pitfall in formal methods.
### Lean

```lean
def Set (α : Type u) := α → Prop
  -- …
def oddIntegers : Set Int :=
  fun n => n % 2 = 1
```
### Lean highlights

- `oddIntegers`
- `Prop`
### Turn

```turn
structure[T] Set<T: Any> {
}
```

## Beat 6: Beat 6

<!--
duration: 13
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

Next, mathlib defines a namespace block for Set. So Names inside get the Set dot prefix, which is why you read Set dot Mem instead of bare Mem. end Set at the bottom closes that block.
### Lean

```lean
namespace Set
  def Mem (s : Set α) (a : α) : Prop :=
     s a
end Set 

 /- Set.Mem s a
```
### Lean highlights

- `namespace Set`
- `end Set`
### Turn

```turn
structure[T] Set<T: Any> {
}
```

## Beat 7: Beat 7

<!--
duration: 30
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

After that, Mathlib adds protected def Mem.
protected means you can only use the function with the namespace dot syntax.
On the parameters, s colon Set alpha labels the set and a colon alpha is one element.
The return type after the second colon is Prop again.
The body is s a which means s applied on a
So this is how we model membership, but where is the symbol a in s?
### Lean

```lean
namespace Set
  protected def Mem (s : Set α) (a : α) : Prop :=
     s a
end Set 

 -- but where is the symbol a ∈ s
```
### Lean highlights

- `protected def Mem`
- `s : Set α`
- `a : α`
- `s a`
### Turn

```turn
structure[T] Set<T: Any> {
}
```

## Beat 8: Beat 8

<!--
duration: 35
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

this is actually more complicated than we think
the notation is a built-in syntax in lean's kernel,
and then the notation is binded to a typeclass called Membership which is basically a encapsolation for methods in Lean
Notice the outParam here on the element type here, it means it can be ignored in usage and lean will just infer it.
So that is the preparation
But in order for our Set to use this notation, we still need to do one more thing
### Lean

```lean
-- Lean core source: lean4/src/Init/Prelude.lean

--   class Membership (α : outParam (Type u)) (γ : Type v) where
--     mem : γ → α → Prop

-- Lean core source: lean4/src/Init/Notation.lean

--   notation:50 a:50 " ∈ " b:50 => Membership.mem b a

-- Mathlib source: mathlib4/Mathlib/Data/Set/Defs.lean
-- Set α wires the Membership field to Set.Mem below.
```
### Lean highlights

- `lean4/src/Init/Prelude.lean`
- `class Membership`
- `outParam`
- `mem : γ → α → Prop`
- `a:50 " ∈ " b:50`
### Turn

```turn
structure[T] Set<T: Any> {
}
```

## Beat 9: Beat 9

<!--
duration: 31
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

that is to implement the typeclass on def of Set by using the instance block
notice here alpha is bounded by the Set alpha on the right. whatever allowed in Set is what's allowed for alpha
by using the angle bracket, we provide the value for the only method in the typeclass which is convinence syntax.
But If we have multiple method in a typeclass, we have to implement the one by one as shown below
### Lean

```lean
--   class Membership (α : outParam (Type u)) (γ : Type v) where
--        mem : γ → α → Prop
--

instance : Membership α (Set α) :=
  ⟨Set.Mem⟩

/- Multi-field typeclass (teaching): explicit field names -/

class Foo (α : Type u) where
  bar : α → α
  baz : α → Prop
  qux : Nat

-- 1. Named where block (clearest when teaching)
instance : Foo Nat where
  bar := fun n => n + 1
  baz := fun n => n > 0
  qux := 42

-- 2. Named structure syntax
instance : Foo Int := {
  bar := fun n => n + 1
  baz := fun n => n > 0
  qux := 42
}
```
### Lean highlights

- `instance`
- `Membership`
- `⟨Set.Mem⟩`
### Turn

```turn
structure[T] Set<T: Any> {
}
```

## Beat 10: Beat 10

<!--
duration: 10
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

So now we can use the notation like this because the typeclass implement
Notice it construct a proposition with a in S
### Lean

```lean
--   notation:50 a:50 " ∈ " b:50 => Membership.mem b a
  -- …
-- Set α wires the Membership field to Set.Mem below.
  -- …
example (s : Set α) (a : α) : Prop := a ∈ s
```
### Lean highlights

- `a ∈ s`
- `Membership.mem`
- `Set.Mem`
### Turn

```turn
structure[T] Set<T: Any> {
}
```

## Beat 11: Beat 11

<!--
duration: 4
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

Another example here using OddIntegers
### Lean

```lean
example (n : Int) : Prop := n ∈ oddIntegers
```
### Lean highlights

- `n ∈ oddIntegers`
### Turn

```turn
structure[T] Set<T: Any> {
}
```

## Beat 12: Beat 12

<!--
duration: 13
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

So that is the full picture of lean's modelling:
first a function-type constructor
then a prop returning wrapper
finally the notation for the mathematical "in" operator
### Lean

```lean
-- function type constructor 
def Set (α : Type u) := α → Prop
  -- …
namespace Set
-- prop returning wrapper
  protected def Mem (s : Set α) (a : α) : Prop :=
    s a
end Set

-- notation implmenetation for ∈ (in) operator
instance : Membership α (Set α) :=
  ⟨Set.Mem⟩
```
### Lean highlights

- `protected def Mem`
- `instance`
- `⟨Set.Mem⟩`
### Turn

```turn
structure[T] Set<T: Any> {
}
```

## Beat 13: Beat 13

<!--
duration: 23
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

So now we look at turn-lang, Notice it immediately give you a container story.
we model Set using a structure directly.
square bracket make it a container structure which allows it to use the "in" operator.
Then we can use the in operator for every set to specify its content using laws.
### Lean

```lean
as before
```
### Turn

```turn
structure[T] Set<T: Any> {
}

// Turn-Lang: x in s is built-in (no Mem, no instance)
```
### Turn highlights

- `structure[T]`
- `Set`
- `in`

## Beat 14: Beat 14

<!--
duration: 22
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

For example, we model EmptySet by inheriting from set.
and we use a law to specify the membership function
no_members says for every x, x not in self, so nothing belongs to the empty set.
So law is a requirement that every instance of the structure must satisfy.
### Lean

```lean
as before
```
### Turn

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
### Turn highlights

- `Set<Any>`
- `no_members`
- `in self`

## Beat 15: Beat 15

<!--
duration: 12
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

Similarly, Union follows the same pattern.
Its law says x in the union when x is in A or x is in B.
so this is how we model set in both languages
### Lean

```lean
as before
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

- `Union`
- `def`
- `in self`
- `in A`
- `in B`

## Beat 16: Beat 16

<!--
duration: 6
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

So I hope you enjoyed this video.
Leave a comment if you need help with these.
### Lean

```lean
as before
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

## Beat 17: Beat 17

<!--
duration: 6
font.editor: 0.7000000000000001
font.lean: 0.8
font.render: 0.8500000000000001
allow-script-change: false
-->

in the next video, we will talk about subset.
Subscribe and see you in the next one.
### Lean

```lean
as before
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

- `Union`
