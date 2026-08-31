---
videoOps: 1
scriptId: 03-proper-subset
title: 03_proper_subset
fps: 30
socialTitleEnglish: "3. Proper subset: the sentence from class, written so a computer can check it"
socialTitleChina: "3. 真子集：课堂上那句，写成电脑能检查"
promotionalDescription: "You already know proper subset from class: inside, but not the same set."
promotionalDescriptionChina: "真子集就是课堂上那句：在里面，但不是同一个。"
format: landscape
width: 1920
height: 1080
---

# Scene 1: Proper subset — Lean vs Turn

<!--
layout: dual-panel
burn-captions: true
visual-notes: 20 beats — class sentence, why Boolean algebra is the yes/no package, then Turn writes the sentence first.
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
display.editor-font-scale: 0.7
display.lean-editor-font-scale: 0.8
display.render-font-scale: 0.85
-->

## Overlay: textbook-proper-subset

<!--
type: textbook
aata-excerpt: sets-proper-subset-definition
placement: center
-->

## Beat 1: The sentence from class

<!--
overlay: textbook-proper-subset
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

Hi friends, welcome back.
Last time was ordinary subset. Today is proper subset.
You already know this from class: A is a proper subset of B when A is inside B, and they are not the same set.
That is it. A textbook does not ask where the symbol lives.
### Lean

```lean
-- From class:
--   A ⊊ B  ⇔  A ⊆ B  and  A ≠ B
```
### Lean highlights

- `A ⊊ B`
- `A ⊆ B  and  A ≠ B`
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    }
}
```
### Chinese

大家好，欢迎回来。上期是普通子集。这期是真子集。课堂上你就会：A 在 B 里面，并且不是同一个集合。就这一句。
### Visual notes

Textbook overlay. Sentence from class first.

## Beat 2: A computer needs the rule written down

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

In class, the teacher fills in the gaps.
A computer checking a proof cannot.
If nobody writes the rule, the computer does not have proper subset at all.
### Lean

```lean
-- In class: you already know what ⊊ means.
-- On a computer: no written rule, no idea.
```
### Lean highlights

- `no written rule`
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    }
}
```
### Chinese

课堂上老师会补全没说清的地方。电脑检查证明，不会补。没人写成规则，电脑那边就没有真子集。
### Visual notes

A computer needs the rule written down.

## Beat 3: Lean never wrote that classroom sentence

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

Look for a line that says proper subset means inside and not equal.
Lean’s set folder does not have it.
The sentence from class was never copied in.
Lean will borrow a bigger toolkit to get it back.
### Lean

```lean
-- From class: A ⊊ B  ⇔  A ⊆ B  and  A ≠ B

-- In Lean’s set folder: there is no such line.
```
### Lean highlights

- `there is no such line`
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    }
}
```
### Chinese

去找“真子集等于在里面并且不相等”这一行。Lean 的集合文件夹里没有。课堂上那句没被抄进去。
### Visual notes

Lean’s set folder has no classroom sentence.

## Beat 4: Turn writes the class sentence first

<!--
duration: 18
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

First difference.
Turn-Lang writes what you said in class: inside, and not the same set.
No extra toolkit yet.
The computer can still check it. The words are just where a student looks first.
### Lean

```lean
-- From class: A ⊊ B  ⇔  A ⊆ B  and  A ≠ B
-- Lean has not written this on sets yet.
```
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    },
    @notation({A} ~ " ⊊ " ~ {B})
    proper: Prop {
        |- { default(A, B); not SetEq(A, B); }
    }
}
```
### Turn highlights

- `proper`
- `not SetEq`
### Chinese

第一个差别。Turn-Lang 写下课堂上那句：在里面，并且不是同一个。还不用额外工具。电脑照样能检查。
### Visual notes

Turn writes the class sentence first.

## Beat 5: ⊆ already works like ≤

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

Lean takes the long way.
Last time: on two sets, less-than-or-equal already means inside.
So subset is already an order, the way less-than-or-equal is an order on numbers.
Keep this: less-than-or-equal means subset.
### Lean

```lean
protected def Subset (s₁ s₂ : Set α) :=
  ∀ ⦃a⦄, a ∈ s₁ → a ∈ s₂

instance : LE (Set α) :=
  ⟨Set.Subset⟩
```
### Lean highlights

- `instance : LE (Set α)`
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    }
}
```
### Chinese

Lean 走远路。上期：两个集合上写 ≤，意思已经是在里面。记住：≤ 就是 ⊆。
### Visual notes

⊆ already works like ≤.

## Beat 6: In class, “inside” already feels like ≤

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

You already use three facts.
Every set is inside itself.
If A is inside B and B is inside C, then A is inside C.
If each is inside the other, they are the same set.
Nobody calls that Boolean algebra in class. You still use it.
### Lean

```lean
-- Facts from class:
--   A ⊆ A
--   A ⊆ B ⊆ C  →  A ⊆ C
--   A ⊆ B and B ⊆ A  →  A = B
```
### Lean highlights

- `A ⊆ A`
- `A = B`
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    }
}
```
### Chinese

你早就在用三件事：自己在自己里面；一串能接；互相在里面就是同一个。课堂上没人叫它布尔代数。你照样会用。
### Visual notes

Class facts. No Boolean algebra named yet.

## Beat 7: ⊂ and < start as empty marks

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

Less-than is the mark for strictly smaller.
The other mark is for strictly inside.
At first both marks are empty.
A computer will not guess the sentence from class. Someone has to fill them in.
### Lean

```lean
-- lean4/src/Init/Prelude.lean
class LT (α : Type u) where
  lt : α → α → Prop

-- lean4/src/Init/Core.lean
class HasSSubset (α : Type u) where
  SSubset : α → α → Prop
infix:50 " ⊂ " => SSubset
```
### Lean highlights

- `class LT`
- `" ⊂ "`
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    }
}
```
### Chinese

< 是严格更小的记号。⊂ 是严格在里面的记号。一开始两个都是空的。电脑不会猜课堂上那句。
### Visual notes

⊂ and < start empty.

## Beat 8: The shortcut Lean will not take

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

The easy idea: let less-than on sets mean inside, but not equal. Then you are done.
Lean will not do that.
Sets can do more than compare — and that extra toolkit is why Boolean algebra shows up.
### Lean

```lean
-- Easy idea: let < on sets mean “⊆ and not equal”.
-- Done?

-- Lean says no.
```
### Lean highlights

- `Lean says no`
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    }
}
```
### Chinese

最省事的想法：让集合上的 < 表示在里面但不相等。Lean 不这么做。集合还有别的运算，布尔代数就从这儿出场。
### Visual notes

Lean will not take the one-line shortcut.

## Beat 9: Sets also have ∪, ∩, and complement

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

You do not only ask which set is inside which.
You also take union, intersection, and complement.
Those are the same three moves as yes-and-no: or, and, not.
That package is what people call a Boolean algebra.
### Lean

```lean
-- Sets are not only compared.
-- They also have ∪, ∩, and complement.
-- Same three moves as yes / no: or, and, not.
```
### Lean highlights

- `∪, ∩, and complement`
- `or, and, not`
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    }
}
```
### Chinese

你不只问谁在谁里面。你还会做并集、交集、补集。这三步和“对或错”是同一套：或者、并且、否定。这套东西就叫布尔代数。
### Visual notes

Union, intersection, complement = or, and, not.

## Beat 10: Why we need Boolean algebra

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

If you already have the yes-and-no package, you get strictly smaller for free.
The same way less-than comes with less-or-equal on numbers.
That is why Lean uses Boolean algebra on sets, instead of writing one extra line for proper subset.
### Lean

```lean
-- Boolean algebra includes order.
-- Order includes <.
-- So ⊂ can arrive with the package,
-- instead of as a one-line extra definition.
```
### Lean highlights

- `arrive with the package`
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    }
}
```
### Chinese

如果你已经有“对或错”那一套，就会白送“严格更小”。所以 Lean 在集合上用布尔代数，而不是再单独写一行。
### Visual notes

Why Boolean algebra: the package includes <.

## Beat 11: The package is stacked

<!--
duration: 14
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

Boolean algebra includes union and intersection.
Those include the order less-or-equal.
That includes strictly-less.
Plug in the whole package, and strictly smaller shows up. You do not define it a second time.
### Lean

```lean
-- Boolean algebra  includes  union / intersection
-- those include            ≤
-- ≤ includes               <
```
### Lean highlights

- `≤ includes <`
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    }
}
```
### Chinese

布尔代数里有并和交。并和交里有 ≤。≤ 里有 <。整套接上，严格更小自己出现。
### Visual notes

The package is stacked.

## Beat 12: What < means — not about sets yet

<!--
duration: 14
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

For numbers, a is less than b when a is less-or-equal, and not the other way around.
The same shape works for any order.
We have not used sets yet.
### Lean

```lean
-- mathlib4/Mathlib/Order/Defs.lean
class Preorder (α : Type u) extends LE α, LT α where
  le_refl  : ∀ a : α, a ≤ a
  le_trans : ∀ a b c : α, a ≤ b → b ≤ c → a ≤ c
  lt := fun a b => a ≤ b ∧ ¬b ≤ a
```
### Lean highlights

- `a ≤ b ∧ ¬b ≤ a`
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    }
}
```
### Chinese

对数字来说，a < b 就是 a ≤ b，并且不能反过来。任何序都是这个形状。现在还没用到集合。
### Visual notes

What < means. Not about sets yet.

## Beat 13: A set is already yes-or-no

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

A set answers one question about every object: in, or not?
Yes-or-no already is Boolean algebra.
So sets already have the package.
Lean does not rebuild union and complement from scratch.
### Lean

```lean
-- A set answers yes or no for every object.
-- Yes / no already is Boolean algebra.
-- So the package is already there.
```
### Lean highlights

- `yes or no`
- `package is already there`
### Turn

```turn
structure[T] Set<T: Any> {
}
```
### Chinese

集合对每个东西只问一句：在，还是不在？在或不在本来就是布尔代数。所以集合本来就有这套工具。
### Visual notes

A set is already yes-or-no.

## Beat 14: Then < on sets means proper subset

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

Lean takes the package, then reads it on sets.
Less-or-equal means inside.
Strictly-less means inside one way, not the other.
The other mark is that same strictly-less.
The sentence from class is now something a computer can check.
### Lean

```lean
-- mathlib4/Mathlib/Order/BooleanAlgebra/Set.lean
instance instBooleanAlgebra : BooleanAlgebra (Set α) :=
  { (inferInstance : BooleanAlgebra (α → Prop)) with
    le := (· ≤ ·),
    lt := fun s t => s ⊆ t ∧ ¬t ⊆ s }

instance : HasSSubset (Set α) := ⟨(· < ·)⟩
```
### Lean highlights

- `lt := fun s t => s ⊆ t ∧ ¬t ⊆ s`
### Turn

```turn
structure[T] Set<T: Any> {
}
```
### Chinese

Lean 接上这套工具，再读到集合上。≤ 表示在里面。< 表示这边在里面、反过来不在。课堂上那句，现在电脑也能检查。
### Visual notes

Then < on sets means proper subset.

## Beat 15: The package vs the sentence from class

<!--
duration: 16
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

The package says: A is a proper subset of B when A is inside B, and B is not inside A.
Class says: inside, and not the same set.
A computer can prove those two sentences match.
### Lean

```lean
-- mathlib4/Mathlib/Data/Set/Basic.lean
theorem ssubset_def : (s ⊂ t) = (s ⊆ t ∧ ¬t ⊆ s) := rfl

protected theorem ssubset_iff_subset_ne :
  s ⊂ t ↔ s ⊆ t ∧ s ≠ t
```
### Lean highlights

- `ssubset_iff_subset_ne`
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊊ " ~ {B})
    proper: Prop {
        |- { default(A, B); not SetEq(A, B); }
    }
}
```
### Chinese

工具包说：A 在 B 里，并且 B 不在 A 里。课堂上说：在里面，并且不是同一个。电脑可以证明这两句是同一句话。
### Visual notes

Package wording vs class wording.

## Beat 16: ⊂ is just the < of ⊆

<!--
duration: 14
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

Subset works like less-or-equal on numbers.
The matching strictly-less on sets is proper subset.
Boolean algebra was only there so this match is given to you, not written by hand.
### Lean

```lean
-- On numbers:  a < b  ↔  a ≤ b and a ≠ b
-- On sets:     s ⊂ t  ↔  s ⊆ t and s ≠ t
```
### Lean highlights

- `s ⊂ t  ↔  s ⊆ t and s ≠ t`
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊊ " ~ {B})
    proper: Prop {
        |- { default(A, B); not SetEq(A, B); }
    }
}
```
### Chinese

⊆ 就像数字里的 ≤。配上的那个 <，在集合上就是 ⊂。用布尔代数，只是为了把这个对应白送给你。
### Visual notes

⊂ is the < of ⊆.

## Beat 17: The usual facts, for free

<!--
duration: 14
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
allow-script-change: false
-->

A set is not a proper subset of itself.
You cannot have both directions at once.
Chains still work.
In class these feel obvious. On a computer they arrive once the package is plugged in.
### Lean

```lean
theorem lt_irrefl (s : Set α) : ¬ s ⊂ s
theorem lt_asymm : s ⊂ t → ¬ t ⊂ s
theorem lt_trans : s ⊂ t → t ⊂ u → s ⊂ u
```
### Lean highlights

- `lt_irrefl`
- `lt_trans`
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊊ " ~ {B})
    proper: Prop {
        |- { default(A, B); not SetEq(A, B); }
    }
}
```
### Chinese

集合不是自己的真子集。不能两边同时成立。一串还能接。课堂上觉得这是废话。电脑上，工具包接上，这些就有了。
### Visual notes

Usual facts arrive with the package.

## Beat 18: Turn writes a relation, not a toolkit first

<!--
duration: 16
font.editor: 0.75
font.lean: 0.65
font.render: 0.85
allow-script-change: false
-->

Second difference, now that you saw Lean’s road.
Turn-Lang just names subset as a relation.
The everyday version is written first.
You do not need Boolean algebra on the page before the class sentence can appear.
### Lean

```lean
-- Lean got ⊂ by plugging in Boolean algebra.
-- Turn does not take that long way first.
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
### Chinese

看过 Lean 的远路，第二个差别就清楚了。Turn-Lang 只是给子集起个关系名。日常版本先写上。不必先接布尔代数。
### Visual notes

Turn writes a relation first.

## Beat 19: Proper subset is the class sentence, in one place

<!--
duration: 16
font.editor: 0.7
font.lean: 0.65
font.render: 0.85
allow-script-change: false
-->

Add not-equal to everyday subset.
That is the sentence from class, and a computer can check it.
Lean got the same sentence by plugging in Boolean algebra.
Turn wrote the sentence first. The toolkit can wait.
### Lean

```lean
-- Lean: ⊂ arrived with Boolean algebra.
-- Turn: the class sentence is in one block.
```
### Turn

```turn
relation Subset(T: Any, A B: Set<T>): PropModified {
    @notation({A} ~ " ⊆ " ~ {B})
    default: Prop {
        forall x: T |- x in A -> x in B
    },
    @notation({A} ~ " ⊊ " ~ {B})
    proper: Prop {
        |- { default(A, B); not SetEq(A, B); }
    }
}
```
### Turn highlights

- `proper`
- `not SetEq`
### Chinese

在日常子集上加上不相等。就是课堂上那句，电脑也能检查。Lean 靠布尔代数找回同一句。Turn 先写这一句。
### Visual notes

Proper subset is the class sentence in one block.

## Beat 20: One class sentence, two ways to write it

<!--
duration: 16
font.editor: 0.7
font.lean: 0.65
font.render: 0.85
allow-script-change: false
-->

In class, proper subset is one sentence.
A computer needs that sentence written down.
Lean borrows Boolean algebra so the extra mark works like less-than next to subset.
Turn writes the sentence first.
Next time: what the equals sign is asking. See you there.
### Lean

```lean
-- From class: A ⊊ B  ⇔  A ⊆ B and A ≠ B
-- Lean: use Boolean algebra, then ⊂ works like < next to ⊆
-- Turn: write the sentence first
```
### Turn

```turn
relation SetEq(T: Any, A B: Set<T>): Prop {
    |- {
        Subset(A, B);
        Subset(B, A);
    }
}
```
### Turn highlights

- `SetEq`
### Chinese

课堂上，真子集就是一句。电脑需要把这句写下来。Lean 借用布尔代数。Turn 先写这一句。下期讲集合相等。
### Visual notes

One class sentence, two ways to write it.
