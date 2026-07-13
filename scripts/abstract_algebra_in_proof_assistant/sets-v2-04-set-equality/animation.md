---
videoOps: 1
scriptId: sets-v2-04-set-equality
title: 04_set_equality
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: Set equality — what equals means in a proof assistant

<!--
layout: dual-panel
burn-captions: true
visual-notes: 6 beats from take-mrhmharr: textbook SetEq hook, atomic vs meaningful equality + definitional/propositional, homogeneous Lean Eq and mutual-subset/Set.ext, notation-backed Turn SetEq, FunctionEq / funext, then isomorphism and level of sameness.
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
display.editor-font-scale: 0.7
display.lean-editor-font-scale: 0.8
display.render-font-scale: 0.85
-->

## Overlay: textbook-set-equality

<!--
type: textbook
aata-excerpt: sets-set-equality-definition
placement: center
-->

## Beat 1: Start with the textbook rule

<!--
overlay: textbook-set-equality
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
-->

Hi friends, welcome back.
The best way to understand a math concept is to formalize it.
Today we formalize set equality.
And the textbook definition looks really simple.
Two sets are equal when each one is a subset of the other.
But if we want to formalize this statement,
we still need to understand what the equals sign actually means inside a proof system.
And this is more complicated than you think.

### Lean

```lean
-- Textbook set equality
-- A = B  when each is a subset of the other
--
-- In Lean this still becomes ordinary Eq:
--   A = B
```

Highlights:

- `each is a subset`
- `ordinary Eq`
- `A = B`

### Turn

```turn
@notation({A} ~ " = " ~ {B})
relation SetEq(T: Any, A B: Set<T>): Prop {
    |- {
        Subset(A, B);
        Subset(B, A);
    }
}
```

Highlights:

- `relation SetEq`
- `Subset(A, B)`
- `Subset(B, A)`

### Hint

The textbook sentence becomes two proof obligations.

<!-- target: turn-code; needle: Subset(A, B); position: 82,38 -->

### Chinese

大家好，欢迎回来。真正理解一个数学概念的最好方式，就是把它形式化。今天我们形式化集合相等。课本定义看起来很简单：两个集合相等，就是彼此都是对方的子集。但要形式化这句话，我们还需要理解证明系统里的等号到底是什么意思。这比你想的更复杂。

### Visual notes

Beat 1: textbook mutual-subset rule first, then the real question about the equals sign.

## Beat 2: Separate atomic sameness from meaningful equality

<!-- font-scales: as before; allow-script-change: true -->

So, equal doesn't always mean being the same atomically.
One plus one equals two is not the same atomically,
because they have different expressions literally,
but they are mathematically the same.
And this is the kind of equality that we want to prove —
this is the meaningful equality.
There's another equality, things like one equals one,
because the left-hand side and right-hand side are the same,
and these are not worth proving.
But they're still very useful,
because they show up at the end of every proof for this meaningful equality —
just to close the proof.
So in Lean we can write A equal to B.
And notice that we do not implement an equality typeclass first,
because the equals sign is built-in notation for values,
just like other programming languages.
But there are two different kinds of equality here:
definitional equality and propositional equality.
Definitional equality is something the computer can still check automatically,
even when the two sides look different.
Propositional equality is something you need to prove —
but after you prove it, the proof engine can still apply it as if it is a computer rule.

### Lean

```lean
-- Lean's = compares terms of one type
-- no equality typeclass is required

-- definitional: computer checks (closes the proof)
example (n : Nat) : n + 0 = n := rfl

-- propositional: you prove it; then it becomes a rule
example (n : Nat) : 0 + n = n := Nat.zero_add n
```

Highlights:

- `no equality typeclass`
- `definitional`
- `rfl`
- `propositional`
- `Nat.zero_add`

### Hint

The terms do not reduce to the same syntax, so this equality needs a theorem.

<!-- target: lean-code; needle: Nat.zero_add; position: 18,38 -->

### Turn

```turn
-- Two kinds of equality
--
-- definitional: computer can check automatically
--   even when the two sides look different
--
-- propositional: you must prove it
--   then the proof engine can use it as a rule
--
-- meaningful: 1 + 1 = 2  (different expressions, same math)
-- closing:     1 = 1      (same data; closes a proof)
```

Highlights:

- `definitional`
- `propositional`
- `1 + 1 = 2`
- `1 = 1`

### Chinese

所以，相等并不总是意味着原子层面完全一样。一加一等于二在原子层面并不一样，因为表达式字面上不同，但它们在数学上是一样的。这才是我们想证明的那种有意义的相等。还有另一种相等，比如一等于一：左右两边一样，不值得证明，但仍然很有用，因为它们会出现在有意义证明的末尾，用来收束证明。在 Lean 里我们可以写 A 等于 B，而且不需要先实现相等类型类，因为等号是值的内置记号，就像其他编程语言一样。但这里有两种相等：定义相等和命题相等。定义相等是计算机仍可自动检查的，即使两边看起来不同。命题相等是你需要证明的东西——但证明之后，证明引擎仍可以把它当作计算机规则来用。

### Visual notes

Beat 2: 1+1=2 as meaningful equality vs 1=1 as proof-closing; then Lean built-in =; definitional vs propositional. No Mathematica detour.

## Beat 3: Homogeneous equality and mutual subset

<!-- font-scales: as before; allow-script-change: true -->

So now the question is, when can we even write the equals sign in Lean?
Both sides must be exactly the same type.
So two as a natural number and two as an integer cannot be compared directly.
They look like the same number to us, but Lean sees two different types.
So we first cast the natural number into an integer, and then equality makes sense.
Now set A and set B have type Set alpha, so they can compare directly.
And Lean defines set equality using the subset idea we already have —
mutual subset implies A equals B.
So if x belongs to A exactly when x belongs to B, for every x,
then the two sets are equal.
And in our textbook, this is exactly what mutual subset is.

### Lean

```lean
-- Equality is homogeneous: both sides need one type
-- invalid: (2 : Nat) = (2 : Int)
example : ((2 : Nat) : Int) = (2 : Int) := rfl

-- Mutual subset → set equality
example {A B : Set α}
    (h₁ : A ⊆ B) (h₂ : B ⊆ A) : A = B :=
  Subset.antisymm h₁ h₂

-- Same idea via membership for every x
example {A B : Set α}
    (h : ∀ x, x ∈ A ↔ x ∈ B) : A = B :=
  Set.ext h
```

Highlights:

- `one type`
- `invalid`
- `Subset.antisymm`
- `Set.ext`
- `x ∈ A ↔ x ∈ B`

### Turn

```turn
-- Same set, explained without Lean vocabulary
--
-- ask every possible element x:
--   x in A exactly when x in B
--
-- equivalently (textbook):
--   Subset(A, B) and Subset(B, A)
--
-- that mutual subset is what SetEq means
```

Highlights:

- `every possible element`
- `exactly when`
- `Subset(A, B)`
- `Subset(B, A)`

### Chinese

现在的问题是，什么时候我们才能在 Lean 里写等号？两边必须具有完全相同的类型。所以自然数里的 2 和整数里的 2 不能直接比较。对我们来说它们像同一个数字，但 Lean 看见的是两个类型。先把自然数转成整数，等式才有意义。集合 A 和 B 都具有 Set α 类型，所以可以直接比较。Lean 用我们已有的子集想法来定义集合相等——互相包含就推出 A 等于 B。所以如果对每个 x，它属于 A 当且仅当属于 B，那么两个集合相等。在我们的课本里，这正好就是互相包含。

### Visual notes

Beat 3: Nat vs Int counterexample, then mutual subset / Set.ext as the textbook rule in Lean.

## Beat 4: Bind notation to SetEq

<!-- font-scales: as before; allow-script-change: true -->

So now Turn-Lang makes a different choice.
We do not want to use the equals sign everywhere
and suddenly assume that every structure has the same meaning of equality.
Let's look at the at-notation here.
It binds the visible A equals B to a named relation called SetEq.
That means the equals sign is only the notation.
In order to use SetEq, you call SetEq with brackets containing A and B.
And the body of this relation is just what we already have:
A and B are subsets of each other —
two statements, very clear.

### Lean

```lean
-- Lean: one homogeneous Eq
-- set equality is proved via subsets / Set.ext
--
-- A = B  ↔  A ⊆ B ∧ B ⊆ A
--
-- the theorem chooses how to prove Eq
```

Highlights:

- `one homogeneous Eq`
- `A ⊆ B ∧ B ⊆ A`
- `how to prove Eq`

### Turn

```turn
@notation({A} ~ " = " ~ {B})
relation SetEq(T: Any, A B: Set<T>): Prop {
    |- {
        Subset(A, B);
        Subset(B, A);
    }
}

-- use it by name:
--   SetEq(A, B)
-- unfolds to the two Subset goals above
```

Highlights:

- `SetEq`
- `Subset(A, B)`
- `Subset(B, A)`
- `SetEq(A, B)`

### Hint

Here '=' is notation for the named SetEq relation; call SetEq(A, B) for the two subset goals.

<!-- target: turn-code; needle: Subset(B, A); position: 82,38 -->

### Chinese

现在 Turn-Lang 做了另一种选择。我们不希望到处使用等号，然后突然假设每种结构里的相等都有同一个含义。看这里的 at-notation。它把画面上的 A 等于 B 绑定到一个叫 SetEq 的具名关系。所以等号只是记号。要使用 SetEq，你用括号写上 A 和 B 来调用它。关系的本体就是我们已经有的内容：A 和 B 互相是子集——两条陈述，非常清楚。

### Visual notes

Beat 4: Turn notation vs named SetEq(A, B); equal sign is only syntax.

## Beat 5: Pointwise function equality

<!-- font-scales: as before -->

Next, if we compare function equality, it has the same kind of problem.
Two functions cannot be exactly the same as raw code —
they may have a different body.
They may even return different types —
one wants to return a natural number, one returns an integer —
even though the values are the same.
So on the Lean side it uses funext,
which is a theorem attached to functions that tells you
you can rewrite f x equals g x into f equals g, for all x.
So on the Turn-Lang side we name the relation FunctionEq,
and again the visible equals sign is attached by notation.
So the notation tells us exactly which observation must agree:
the output on every input.

### Lean

```lean
-- funext:
--   (∀ x, f x = g x) → f = g
--
-- rewrite pointwise equality into function equality
example {α β : Type*} {f g : α → β}
    (h : ∀ x, f x = g x) : f = g :=
  funext h
```

Highlights:

- `funext`
- `∀ x`
- `f x = g x`
- `f = g`

### Turn

```turn
@notation({f} ~ " = " ~ {g})
relation FunctionEq(X Y: Set<Any>, f g: Function<X, Y>): Prop {
    forall x in X
    |- f(x) = g(x)
}

-- same idea as Lean funext:
-- agree on every input → treat as the same function
```

Highlights:

- `relation FunctionEq`
- `forall x in X`
- `f(x) = g(x)`

### Hint

Function equality becomes pointwise equality.

<!-- target: turn-code; needle: f(x) = g(x); position: 77.892,42.684 -->

### Chinese

接下来比较函数相等，也有同样的问题。两个函数作为原始代码不可能完全一样——它们可能有不同的函数体。它们甚至可能返回不同的类型：一个想返回自然数，一个返回整数，即使数值相同。所以在 Lean 这边用 funext：这是挂在函数上的定理，告诉你可以把对所有 x 的 f(x) 等于 g(x) 改写成 f 等于 g。在 Turn-Lang 这边我们把这个关系命名为 FunctionEq，同样由记号挂上可见等号。记号明确告诉我们需要一致的观察：每个输入上的输出。

### Visual notes

Beat 5: different bodies / possible Nat vs Int returns; funext and FunctionEq as pointwise agreement.

## Beat 6: Choose the right level of sameness

<!-- font-scales: as before; allow-script-change: true -->

Finally, let's move one level higher in category theory.
We have to be very careful not to say two objects are literally equal
when what we really mean is isomorphic.
For example, two groups can use completely different underlying elements.
So as raw data, they are not equal.
But if there is an isomorphism that preserves multiplication, identity, and inverse,
then from the group theory perspective they have the same structure.
And that connects back to everything we just did.
For sets, we compare members.
For functions, we compare outputs.
For structured objects, we compare structure-preserving maps.
And in higher category theory, even those maps can have higher comparisons.
In homotopy type theory, equality proofs behave like paths.
So the real question is not only, are these two things equal?
The real question is, at which level of mathematics should we treat them as the same?
So that is the real lesson of equality.
I hope you enjoyed this video. See you next time.

### Lean

```lean
-- Choose the level of sameness
--
-- sets:      same members
-- functions: same outputs
-- groups:    structure-preserving isomorphism
-- HoTT:      equality proofs behave like paths
--
-- equivalent structure need not be identical raw data
```

Highlights:

- `level of sameness`
- `same members`
- `same outputs`
- `isomorphism`
- `paths`

### Hint

Two presentations can differ as data while preserving all group structure.

<!-- target: lean-code; needle: isomorphism; position: 18,38 -->

### Turn

```turn
-- Ask which observations must agree
--
-- membership  -> SetEq
-- outputs     -> FunctionEq
-- structure   -> Isomorphism
-- higher maps -> higher equivalence
--
-- sameness depends on the mathematical perspective
```

Highlights:

- `which observations`
- `SetEq`
- `FunctionEq`
- `Isomorphism`
- `mathematical perspective`

### Chinese

最后，我们在范畴论里再往高一层。必须非常小心，不要在真正想说同构时，说两个对象字面相等。例如两个群可以使用完全不同的底层元素。作为原始数据，它们并不相等。但如果存在保持乘法、单位元和逆元的同构，那么从群论角度看，它们具有相同结构。这和刚才做的一切连起来：集合比较成员，函数比较输出，带结构的对象比较保持结构的映射。在高阶范畴论里，甚至这些映射之间还可以继续比较。在同伦类型论里，相等证明表现得像路径。所以真正的问题不只是“这两个东西相等吗”，而是“在数学的哪个层次上，我们应该把它们看作相同”。这就是相等真正的重点。希望你喜欢这期视频，下次见。

### Visual notes

Beat 6: isomorphism / levels of sameness; close with enjoy / see you next time (no empty-set tease).
