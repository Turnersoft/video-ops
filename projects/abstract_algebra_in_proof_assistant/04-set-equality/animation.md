---
videoOps: 1
scriptId: 04-set-equality
title: 04_set_equality
fps: 30
socialTitleEnglish: "4. Set equality: what the equals sign is asking"
socialTitleChina: "4. 集合相等：等号到底在比什么"
promotionalDescription: "The equals sign asks what has to match — members, answers, or structure. Name the layer, then the claim becomes something you can prove."
promotionalDescriptionChina: "等号不是魔法，它只是在问两边要一样在哪。先点名层次：成员、答案，还是结构，再去证。"
format: landscape
width: 1920
height: 1080
---

# Scene 1: Set equality — what equals means in a proof assistant

<!--
layout: dual-panel
burn-captions: true
visual-notes: Continues 03-proper-subset for viewers new to Lean syntax. Eleven focused beats introduce one idea at a time: the textbook rule; what an equality claim looks like; automatic simplification; a named theorem; matching kinds of values; set membership; Turn-Lang's SetEq; function outputs; FuncEq; isomorphism; and a gentle closing question.
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
definition-label: Set equality
book-title: Abstract Algebra: Theory and Applications
book-author: Thomas W. Judson
source: §1.2 — Sets and Equivalence Relations
-->

### LaTeX

```latex
Two sets are equal, written $A = B$, if we can show that $A \subset B$ and $B \subset A$.
```

## Beat 1: Textbook rule and how `=` is wired

<!--
overlay: textbook-set-equality
font.editor: 0.7
font.lean: 0.8
font.render: 0.85
pip-shape: circle
pip-size: 0.2137, 0.3799
pip-position: 0.1571, 0.5546
pip-crop: 0.4464, 0.42
pip-scale: 1.6767
-->

```beat-variants
{"selected":"A","candidates":[{"label":"A","template":"compare-dual","templateConfig":{"kind":"compare-dual","config":{"leanEnabled":true,"turnEnabled":true}},"content":{"title":"Textbook rule and how `=` is wired","say":"Hi friends, welcome back.\nThe best way to digest mathematics is to formalize it.\ntoday we formalize set equality.\nThe textbook definition is really simple, set equality means mutual subset.\nBut in order to formalize it, we need to understand equality in proof assistant.\nThe equals sign is wired in Lean kernel, not in Mathlib.\n`Eq` is not a typeclass.\nIt is an inductive proposition in Prelude.\nWhen A and B are both sets of the same kind, writing `A = B` means `Eq A B`.\nTurn-Lang takes the opposite path.\nIt names `SetEq` first, then uses `@notation` to display A equals B.\nWe will unpack both sides one small step at a time.","leanCode":"-- Lean core: lean4/src/Init/Notation.lean\n-- The = character is infix notation for Eq.\ninfix:50 \" = \" => Eq\n\n-- Lean core: lean4/src/Init/Prelude.lean\n-- Eq is an inductive predicate, not a typeclass.\ninductive Eq : α → α → Prop where\n  | refl (a : α) : Eq a a\n-- Eq.refl a : a = a\n\n-- Set equality needs no new instance for =.\nvariable {α : Type _} {A B : Set α}\n-- A = B means Eq A B","turnCode":"// Turn-Lang source: reference/function-equality.turn\n// Turn-Lang names the rule first, then attaches the equals display.\n@notation({A} ~ \" = \" ~ {B})\nrelation SetEq(T: Any, A B: Set<T>): Prop {\n    |- {\n        Subset(A, B);\n        Subset(B, A);\n    }\n}","visualNotes":"beat-template: compare-dual\nlayer: compare\nlean-render: true\nturn-render: true\ntyping: true\n\noverlay: textbook-set-equality\n\nKeep the textbook-set-equality overlay visible for the whole beat. Show the mutual-subset rule on the textbook panel, then reveal the `inductive Eq` block from Prelude on the Lean pane — not a typeclass, no hidden type. Contrast with the subset clip's `instance : LE` registration; Turn-Lang shows `@notation` on `SetEq`."}}],"voice":{"schemaVersion":1,"sentences":[{"id":"beat-01-sentence-01","tone":"reveal","pauseAfterMs":180,"fingerprint":"aiuexu"},{"id":"beat-01-sentence-02","tone":"insight","pauseAfterMs":180,"fingerprint":"1r6zqtb"},{"id":"beat-01-sentence-03","tone":"grounding","pauseAfterMs":180,"fingerprint":"10z3pvn"},{"id":"beat-01-sentence-04","tone":"grounding","pauseAfterMs":180,"fingerprint":"o8t3fg"},{"id":"beat-01-sentence-05","tone":"grounding","pauseAfterMs":180,"fingerprint":"j840ia"},{"id":"beat-01-sentence-06","tone":"grounding","pauseAfterMs":180,"fingerprint":"1lv76me"},{"id":"beat-01-sentence-07","tone":"grounding","pauseAfterMs":180,"fingerprint":"1qbmt3j"},{"id":"beat-01-sentence-08","tone":"grounding","pauseAfterMs":180,"fingerprint":"1tlc46s"},{"id":"beat-01-sentence-09","tone":"grounding","pauseAfterMs":180,"fingerprint":"fsqxu4"},{"id":"beat-01-sentence-10","tone":"grounding","pauseAfterMs":180,"fingerprint":"8otx3k"},{"id":"beat-01-sentence-11","tone":"grounding","pauseAfterMs":180,"fingerprint":"q86d56"},{"id":"beat-01-sentence-12","tone":"grounding","pauseAfterMs":0,"fingerprint":"1tof03c"}]}}
```

Hi friends, welcome back.
The best way to digest mathematics is to formalize it.
today we formalize set equality.
The textbook definition is really simple, set equality means mutual subset.
But in order to formalize it, we need to understand equality in proof assistant.
The equals sign is wired in Lean kernel, not in Mathlib.
`Eq` is not a typeclass.
It is an inductive proposition in Prelude.
When A and B are both sets of the same kind, writing `A = B` means `Eq A B`.
Turn-Lang takes the opposite path.
It names `SetEq` first, then uses `@notation` to display A equals B.
We will unpack both sides one small step at a time.

### Lean

```lean
-- Lean core: lean4/src/Init/Notation.lean
-- The = character is infix notation for Eq.
infix:50 " = " => Eq

-- Lean core: lean4/src/Init/Prelude.lean
-- Eq is an inductive predicate, not a typeclass.
inductive Eq : α → α → Prop where
  | refl (a : α) : Eq a a
-- Eq.refl a : a = a

-- Set equality needs no new instance for =.
variable {α : Type _} {A B : Set α}
-- A = B means Eq A B
```

### Lean highlights

- `Init/Notation.lean`
- `" = "`
- `=> Eq`
- `Init/Prelude.lean`
- `inductive Eq`
- `| refl`
- `Eq a a`
- `A = B`

### Turn

```turn
// Turn-Lang source: reference/function-equality.turn
// Turn-Lang names the rule first, then attaches the equals display.
@notation({A} ~ " = " ~ {B})
relation SetEq(T: Any, A B: Set<T>): Prop {
    |- {
        Subset(A, B);
        Subset(B, A);
    }
}
```

### Chinese

大家好，欢迎回来。消化数学最好的方式，就是把它形式化。今天我们要形式化集合相等。课本里的定义很简单：集合相等就是互相包含。但要形式化它，得先理解证明助手里的相等是什么意思。等号在 Lean 的内核里就已经接好了，不在 Mathlib。`Eq` 不是 typeclass。它是 Prelude 里的 inductive 命题。当 A、B 都是同一种集合时，写 `A = B` 就是 `Eq A B`。Turn-Lang 走的是相反的路。它先取名 `SetEq`，再用 `@notation` 显示成 A 等于 B。接下来我们一步一步拆开两边。

### Visual notes

beat-template: compare-dual
layer: compare
lean-render: true
turn-render: true
typing: true

overlay: textbook-set-equality

Keep the textbook-set-equality overlay visible for the whole beat. Show the mutual-subset rule on the textbook panel, then reveal the `inductive Eq` block from Prelude on the Lean pane — not a typeclass, no hidden type. Contrast with the subset clip's `instance : LE` registration; Turn-Lang shows `@notation` on `SetEq`.

## Beat 2: What `=` asks us to prove

<!--
font-scales: as before
pip-shape: circle
pip-size: 0.2137, 0.3799
pip-position: 0.1571, 0.5546
pip-crop: 0.4464, 0.42
pip-scale: 1.6767
-->

```beat-variants
{"selected":"A","candidates":[{"label":"A","template":"compare-dual","templateConfig":{"kind":"compare-dual","config":{"leanEnabled":true,"turnEnabled":true}},"content":{"title":"What `=` asks us to prove","say":"Let's look at lean's equality.\n`1 = 1` is a claim that says one is equal to one.\nLean calls an expression like this a proposition.\nThe keyword `example` means “here is a small proposition to proof.”\nThe colon introduces the claim without any context variables.\nThe`:=` sign here introduces its proof.\nThe word `rfl` is a tactic that tries to finish the proof by checking if both sides are the same.\nrfl almost always closes a proof about equality","leanCode":"-- Lean core source: lean4/src/Init/Prelude.lean (Eq, rfl)\n-- \"example\" starts a small claim.\nexample : 1 = 1 := rfl\n-- `:` introduces the claim.\n-- `=` says \"is equal to\".\n-- `:=` gives the proof of the claim.\n-- `rfl` says both sides already match.","turnCode":"// Turn-Lang source: reference/function-equality.turn\ntheorem \"one_equals_one\" {\n    |- 1 = 1   \n} proof {\n    rfl\n}","visualNotes":"beat-template: compare-dual\nlayer: compare\nlean-render: true\nturn-render: true\ntyping: true\n\nReveal `example`, the colon, `1 = 1`, `:=`, and `rfl` one at a time. Add plain-language labels beside each token; do not introduce variables or addition yet."}}]}
```

Let's look at lean's equality.
`1 = 1` is a claim that says one is equal to one.
Lean calls an expression like this a proposition.
The keyword `example` means “here is a small proposition to proof.”
The colon introduces the claim without any context variables.
The`:=` sign here introduces its proof.
The word `rfl` is a tactic that tries to finish the proof by checking if both sides are the same.
rfl almost always closes a proof about equality

### Lean

```lean
-- Lean core source: lean4/src/Init/Prelude.lean (Eq, rfl)
-- "example" starts a small claim.
example : 1 = 1 := rfl
-- `:` introduces the claim.
-- `=` says "is equal to".
-- `:=` gives the proof of the claim.
-- `rfl` says both sides already match.
```

### Lean highlights

- `lean4/src/Init/Prelude.lean`
- `example`
- `:`
- `1 = 1`
- `:=`
- `rfl`

### Turn-Lang

```turn
// Turn-Lang source: reference/function-equality.turn
theorem "one_equals_one" {
    |- 1 = 1   
} proof {
    rfl
}
```

### Turn-Lang highlights

- `theorem`
- `1 = 1`
- `proof`
- `rfl`

### Chinese

我们来看 Lean 里的相等。`1 = 1` 是一个主张，意思是 1 等于 1。Lean 把这种表达式叫作命题。关键字 `example` 的意思是“这里有一个要证明的小命题”。冒号引出主张，不包含任何上下文变量。这里的 `:=` 引出它的证明。`rfl` 是一个 tactic，通过检查两边是否已经相同来完成证明。`rfl` 几乎总能结束关于相等的证明。

### Visual notes

<!-- beat-studio: {"template":"compare-dual","templateConfig":{"kind":"compare-dual","config":{"leanEnabled":true,"turnEnabled":true}}} -->

beat-template: compare-dual
layer: compare
lean-render: true
turn-render: true
typing: true

Reveal `example`, the colon, `1 = 1`, `:=`, and `rfl` one at a time. Add plain-language labels beside each token; do not introduce variables or addition yet.

## Beat 3: When Lean can simplify for us

<!--
font-scales: as before
pip-shape: circle
pip-size: 0.2137, 0.3799
pip-position: 0.1571, 0.5546
pip-crop: 0.4464, 0.42
pip-scale: 1.6767
-->

```beat-variants
{"selected":"A","candidates":[{"label":"A","template":"compare-dual","templateConfig":{"kind":"compare-dual","config":{"leanEnabled":true,"turnEnabled":true}},"content":{"title":"When Lean can simplify for us","say":"Our next example adds just one piece: a variable.\n`Nat` is Lean's name for natural numbers starting at zero.\n\nLook at how addition is defined in Lean's core.\n`Nat.add` is an ordinary two-argument function.\nThere is no special macro on it, and the cases use `=>`, not an equals sign.\nThe first case says: if the right argument is zero, return the left argument as-is.\n\nSo where does the `+` sign come from?\nLean's `+` notation asks for an `Add` instance.\nFor natural numbers, a short instance says: the `add` field is exactly `Nat.add`.\nThat is the only glue. After that, `n + 0` means `Nat.add n 0`.\n\nWhen we write `example (n : Nat) : n + 0 = n := rfl`, Lean does not need a rewrite theorem first.\nIt unfolds `+` to `Nat.add`, matches the first case, and the left side becomes `n`.\nAnd then both sides of the goal are the same term n, so `rfl` finishes.\n\nThat automatic unfolding only fires when a case is matched.\nThe next example will show you how it doesn't work","leanCode":"-- Lean core source: lean4/src/Init/Prelude.lean (Nat.add, Add Nat)\n-- Ordinary function + pattern match (=>), not a theorem with =.\nprotected def Nat.add : Nat → Nat → Nat\n  | a, Nat.zero   => a\n  | a, Nat.succ b => Nat.succ (Nat.add a b)\n\n-- The + sign for Nat is wired here — Add.add := Nat.add.\ninstance : Add Nat where\n  add := Nat.add\n\n-- So n + 0 means Nat.add n 0 → first case → n; then rfl.\nexample (n : Nat) : n + 0 = n := rfl","turnCode":"// Turn-Lang source: reference/function-equality.turn\nrelation Subset(T: Any, A B: Set<T>): Prop {\n    forall x: T\n    |- x in A -> x in B\n}","visualNotes":"beat-template: compare-dual\nlayer: compare\nlean-render: true\nturn-render: true\ntyping: true\n\nLabel three steps: (1) `Nat.add` cases, (2) `instance : Add Nat` wiring `+` → `Nat.add`, (3) `n + 0` unfolds to `n`, then `rfl`. Do not say “definitional equality.”"}}]}
```

Our next example adds just one piece: a variable.
`Nat` is Lean's name for natural numbers starting at zero.

Look at how addition is defined in Lean's core.
`Nat.add` is an ordinary two-argument function.
There is no special macro on it, and the cases use `=>`, not an equals sign.
The first case says: if the right argument is zero, return the left argument as-is.

So where does the `+` sign come from?
Lean's `+` notation asks for an `Add` instance.
For natural numbers, a short instance says: the `add` field is exactly `Nat.add`.
That is the only glue. After that, `n + 0` means `Nat.add n 0`.

When we write `example (n : Nat) : n + 0 = n := rfl`, Lean does not need a rewrite theorem first.
It unfolds `+` to `Nat.add`, matches the first case, and the left side becomes `n`.
And then both sides of the goal are the same term n, so `rfl` finishes.

That automatic unfolding only fires when a case is matched.
The next example will show you how it doesn't work

### Lean

```lean
-- Lean core source: lean4/src/Init/Prelude.lean (Nat.add, Add Nat)
-- Ordinary function + pattern match (=>), not a theorem with =.
protected def Nat.add : Nat → Nat → Nat
  | a, Nat.zero   => a
  | a, Nat.succ b => Nat.succ (Nat.add a b)

-- The + sign for Nat is wired here — Add.add := Nat.add.
instance : Add Nat where
  add := Nat.add

-- So n + 0 means Nat.add n 0 → first case → n; then rfl.
example (n : Nat) : n + 0 = n := rfl
```

### Lean highlights

- `Nat.add`
- `instance : Add Nat`
- `add := Nat.add`
- `n + 0`
- `rfl`

### Turn-Lang

```turn
// Turn-Lang source: reference/function-equality.turn
relation Subset(T: Any, A B: Set<T>): Prop {
    forall x: T
    |- x in A -> x in B
}
```

### Turn-Lang highlights

- `relation Subset`
- `forall x: T`
- `x in A`

### Chinese

下一个例子只多一个变量。`Nat` 是 Lean 对从 0 开始的自然数的叫法。来看 Lean 核心里加法是怎么定义的。`Nat.add` 是一个普通的两参数函数。上面没有特殊宏，分支用的是 `=>`，不是等号。第一种情形说：若右边是 0，就直接返回左边。那 `+` 号从哪来？Lean 的 `+` 记号需要一个 `Add` instance。对自然数，一个很短的 instance 说：`add` 字段就是 `Nat.add`。这就是全部胶水。之后 `n + 0` 就表示 `Nat.add n 0`。写 `example (n : Nat) : n + 0 = n := rfl` 时，Lean 不需要先引用重写定理。它把 `+` 展开成 `Nat.add`，命中第一种情形，左边变成 `n`。于是目标两边都是同一个项 n，`rfl` 就能结束。这种自动展开只在命中分支时才发生。下一个例子会说明它什么时候行不通。

### Visual notes

<!-- beat-studio: {"template":"compare-dual","templateConfig":{"kind":"compare-dual","config":{"leanEnabled":true,"turnEnabled":true}}} -->

beat-template: compare-dual
layer: compare
lean-render: true
turn-render: true
typing: true

Label three steps: (1) `Nat.add` cases, (2) `instance : Add Nat` wiring `+` → `Nat.add`, (3) `n + 0` unfolds to `n`, then `rfl`. Do not say “definitional equality.”

## Beat 4: When Lean needs a named fact

<!--
font-scales: as before
pip-shape: circle
pip-size: 0.2137, 0.3799
pip-position: 0.1571, 0.5546
pip-crop: 0.4464, 0.42
pip-scale: 1.6767
-->

If we reverse the addition to `0 + n = n`, the story changes.
`Nat.add` matches on the *right* argument, so with unknown `n` on the right there is no case to unfold.
`rfl` is not enough.

The library proves the missing fact by induction on `n`.
That theorem is named `Nat.zero_add`.
Base case `n = 0` is `rfl`.
Successor case reuses `Nat.zero_add` on the smaller number and wraps both sides with `succ`.

Once that theorem exists, our example is just an application: `Nat.zero_add n`.
Next comes one more rule about when Lean allows us to compare two things.

### Lean

```lean
-- Lean core source: lean4/src/Init/Data/Nat/Basic.lean
-- A theorem with = — proved by cases on n, not by unfolding Nat.add.
@[simp] protected theorem Nat.zero_add : ∀ (n : Nat), 0 + n = n
  | 0   => rfl
  | n+1 => congrArg succ (Nat.zero_add n)

-- Now the example can cite that fact by name.
example (n : Nat) : 0 + n = n := Nat.zero_add n
```

### Lean highlights

- `lean4/src/Init/Data/Nat/Basic.lean`
- `Nat.zero_add`
- `0 + n = n`
- `| 0   => rfl`
- `| n+1 =>`
- `Nat.zero_add n`

### Turn-Lang

```turn
// Turn-Lang source: reference/function-equality.turn
relation SetEq(T: Any, A B: Set<T>): Prop {
    |- {
        Subset(A, B);
        Subset(B, A);
    }
}
```

### Turn-Lang highlights

- `SetEq`
- `Subset(A, B)`
- `Subset(B, A)`

### Hint

`n + 0` hits `Nat.add`'s first case. `0 + n` does not — so the library *proves* `0 + n = n` by induction and names the proof `Nat.zero_add`.

<!-- target: lean-code; needle: Nat.zero_add; position: 26.95,57.983 -->

### Chinese

如果把加法改成 `0 + n = n`，情况就变了。`Nat.add` 按右边参数分情形，右边是未知的 n 时，没有可展开的分支。`rfl` 不够。库里用对 n 的归纳证明了这个缺失的事实。这个定理名叫 `Nat.zero_add`。基础情形 `n = 0` 用 `rfl`。后继情形在更小的数上递归使用 `Nat.zero_add`，两边再包上 `succ`。有了这个定理，例子只需应用：`Nat.zero_add n`。接下来还有一条规则，说明 Lean 什么时候允许我们比较两个东西。

### Visual notes

beat-template: compare-dual
layer: compare
lean-render: true
turn-render: true
typing: true

Show the theorem body first (two cases), then the `example` that applies `Nat.zero_add n`. Label it “proved by induction,” not “magic.”

## Beat 5: Equality needs matching kinds

<!--
font-scales: as before
pip-shape: circle
pip-size: 0.2137, 0.3799
pip-position: 0.1571, 0.5546
pip-crop: 0.4464, 0.42
pip-scale: 1.6767
-->

```beat-variants
{"selected":"A","candidates":[{"label":"A","template":"compare-dual","templateConfig":{"kind":"compare-dual","config":{"leanEnabled":true,"turnEnabled":true}},"content":{"title":"Equality needs matching kinds","say":"A type is Lean's label for what kind of thing a value is.\n`Nat` means natural numbers starting at zero.\n`Int` means integer that can also be negative.\nSo Lean will not compare a Nat two with an Int two until we convert one of them.\nThat is not a false statement; it is a statement Lean cannot ask yet.\n\nBut fortunately, Our two sets do have matching kinds, so we can now compare them directly.","leanCode":"-- Lean core source: lean4/src/Init/Prelude.lean (Nat)\n-- Lean core source: lean4/src/Init/Data/Int/Basic.lean (Int)\n-- Nat: 0, 1, 2, ...\n-- Int: ..., -1, 0, 1, 2, ...\n-- First convert values to one kind. Then compare them.","turnCode":"// Turn-Lang source: reference/function-equality.turn\n@notation({self} ~ fromTo({domain}, {range}))\nstructure Function<domain range: Set<Any>> {\n    @notation( {self} ~ \"(\" ~ {a} ~ \")\" )\n    apply(a: domain): range\n}","visualNotes":"beat-template: compare-dual\nlayer: compare\nlean-render: true\nturn-render: true\ntyping: true\n\nUse two labeled number cards: “Nat: 0, 1, 2, …” and “Int: …, -1, 0, 1, 2, …”. Show a conversion arrow before any equality sign; do not show nested type-annotation syntax yet."}}]}
```

A type is Lean's label for what kind of thing a value is.
`Nat` means natural numbers starting at zero.
`Int` means integer that can also be negative.
So Lean will not compare a Nat two with an Int two until we convert one of them.
That is not a false statement; it is a statement Lean cannot ask yet.

But fortunately, Our two sets do have matching kinds, so we can now compare them directly.

### Lean

```lean
-- Lean core source: lean4/src/Init/Prelude.lean (Nat)
-- Lean core source: lean4/src/Init/Data/Int/Basic.lean (Int)
-- Nat: 0, 1, 2, ...
-- Int: ..., -1, 0, 1, 2, ...
-- First convert values to one kind. Then compare them.
```

### Lean highlights

- `lean4/src/Init/Prelude.lean`
- `lean4/src/Init/Data/Int/Basic.lean`
- `Nat`
- `Int`
- `convert`

### Turn-Lang

```turn
// Turn-Lang source: reference/function-equality.turn
@notation({self} ~ fromTo({domain}, {range}))
structure Function<domain range: Set<Any>> {
    @notation( {self} ~ "(" ~ {a} ~ ")" )
    apply(a: domain): range
}
```

### Turn-Lang highlights

- `structure Function`
- `domain`
- `range`

### Chinese

类型是 Lean 给“这是什么东西”贴的标签。`Nat` 表示从 0 开始的自然数。`Int` 表示还可以是负数的整数。因此 Lean 不会直接比较 Nat 的 2 和 Int 的 2，除非先把其中一个转换成同一种。这不是假命题，而是 Lean 还无法提出的问题。幸好我们的两个集合种类已经匹配，现在可以直接比较它们。

### Visual notes

beat-template: compare-dual
layer: compare
lean-render: true
turn-render: true
typing: true

Use two labeled number cards: “Nat: 0, 1, 2, …” and “Int: …, -1, 0, 1, 2, …”. Show a conversion arrow before any equality sign; do not show nested type-annotation syntax yet.

## Beat 6: Sets already use the same `=`

<!--
font-scales: as before
pip-shape: circle
pip-size: 0.2137, 0.3799
pip-position: 0.157, 0.5544
pip-crop: 0.4464, 0.42
pip-scale: 1.6767
-->

Once A and B are both sets of the same kind, Lean already allows the equals sign.
`A = B` is ordinary `Eq A B` — the same equality we used for `1 = 1`.
There is no special typeclass wiring just to make `=` legal on sets.
The hard part is not permission. It is meaning: what does that equals claim ask us to prove?

### Lean

```lean
-- Lean core: Eq works for any type — including Set α.
-- Mathlib: mathlib4/Mathlib/Data/Set/Defs.lean
variable {α : Type _} {A B : Set α}

-- Same equals sign as 1 = 1. No new instance is required for = on sets.
-- A = B means Eq A B.
```

### Lean highlights

- `Set α`
- `A B : Set α`
- `A = B`
- `Eq A B`

### Turn-Lang

```turn
// Turn-Lang source: reference/function-equality.turn
// Turn-Lang also puts = on the screen — as a display for a named rule.
@notation({A} ~ " = " ~ {B})
relation SetEq(T: Any, A B: Set<T>): Prop {
    |- {
        Subset(A, B);
        Subset(B, A);
    }
}
```

### Turn-Lang highlights

- `@notation`
- `" = "`
- `SetEq`

### Hint

For sets, `=` is already allowed. Beat 7 shows what that equals claim embeds.

<!-- target: lean-code; needle: A = B; position: 27.209,54.55 -->

### Chinese

一旦 A 和 B 都是同一种集合，Lean 本来就允许写等号。`A = B` 就是普通的 `Eq A B`，和 `1 = 1` 用的是同一个相等。不需要为了合法使用 `=` 再给集合单独接 typeclass。难的部分不是“能不能写”，而是含义：这个相等主张到底要我们证明什么？

### Visual notes

beat-template: compare-dual
layer: compare
lean-render: true
turn-render: true
typing: true

Label two set cards both `Set α`, then light up `A = B` / `Eq A B` and Turn-Lang's `" = "` notation. Do not re-teach subset.

## Beat 7: What set equality embeds

<!--
font-scales: as before
portrait-bottom: lean-code
pip-shape: circle
pip-size: 0.2137, 0.3799
pip-position: 0.1571, 0.5546
pip-crop: 0.4464, 0.42
pip-scale: 1.6767
-->

The textbook answer is: each set fits inside the other.
Lean packages that into one equality claim.
`Set.ext` says: if every element is in A exactly when it is in B, conclude `A = B`.
So the equals sign is not empty decoration — it embeds that mutual-membership meaning.
Turn-Lang does the same packaging: `SetEq` is the named rule, and `@notation` shows it as `A = B`.
The two lines in the body are the embedded meaning of that equals display.
Next we will see the same pattern for functions, but comparing answers instead of members.

### Lean

```lean
-- Mathlib source: mathlib4/Mathlib/Data/Set/Defs.lean (Set.ext)
-- Mutual membership is enough to conclude set equality.
theorem ext {a b : Set α} (h : ∀ (x : α), x ∈ a ↔ x ∈ b) : a = b :=
  funext (fun x ↦ propext (h x))
-- Called Set.ext outside this namespace.
```

### Lean highlights

- `mathlib4/Mathlib/Data/Set/Defs.lean`
- `Set.ext`
- `x ∈ a ↔ x ∈ b`
- `a = b`

### Turn-Lang

```turn
// Turn-Lang source: reference/function-equality.turn
@notation({A} ~ " = " ~ {B})
relation SetEq(T: Any, A B: Set<T>): Prop {
    |- {
        Subset(A, B);
        Subset(B, A);
    }
}
```

### Turn-Lang highlights

- `@notation`
- `SetEq`
- `Subset(A, B)`
- `Subset(B, A)`

### Hint

`=` on sets is allowed by ordinary `Eq`. `Set.ext` / `SetEq` embed the mutual-containment meaning inside that equals claim.

<!-- target: turn-code; needle: Subset(B, A); position: 33.639,52.488 -->

### Chinese

课本的答案是：每个集合都装在另一个里面。Lean 把这一点打包成一个相等结论。`Set.ext` 说：若每个元素属于 A 当且仅当属于 B，就推出 `A = B`。所以等号不是空装饰，它嵌进了互相包含的含义。Turn-Lang 同样打包：`SetEq` 是规则名，`@notation` 把它显示成 `A = B`。主体里的两行就是这个等号显示的内核。接下来函数会用同一模式，但比较的是答案而不是成员。

### Visual notes

beat-template: compare-dual
layer: compare
lean-render: true
turn-render: true
typing: true
portrait-bottom: lean-code

Animate `x ∈ a ↔ x ∈ b` collapsing into `a = b` on Lean; on Turn-Lang, keep `" = "` lit while the two body lines are the embedded meaning — not a subset lesson.

## Beat 8: Functions are known by their answers

<!--
font-scales: as before
pip-shape: circle
pip-size: 0.2137, 0.3799
pip-position: 0.1571, 0.5546
pip-crop: 0.4464, 0.42
pip-scale: 1.6767
-->

A function is a rule that takes an input and gives an answer.
Two rules can look different but still give the same answer for every input.
Lean has a helper named `funext` for that situation.
It works when both functions accept the same kind of input and return the same kind of answer.
Turn-Lang will spell out those matching checks next.

### Lean

```lean
-- Lean core source: lean4/src/Init/Core.lean (funext)
-- Pick any input x.
-- If f and g give the same answer for every x,
-- Lean's helper funext lets us call the functions equal.
```

### Lean highlights

- `lean4/src/Init/Core.lean`
- `every x`
- `funext`

### Turn-Lang

```turn
// Turn-Lang source: reference/function-equality.turn
@notation({f} ~ " = " ~ {g})
relation FunctionEq(X Y: Set<Any>, f g: Function<X, Y>): Prop {
    forall x in X
    |- f(x) = g(x)
}
```

### Turn-Lang highlights

- `FunctionEq`
- `forall x in X`
- `f(x) = g(x)`

### Hint

`funext` is Lean's helper for “same answer for every input means same function.”

<!-- target: lean-code; needle: funext; position: 24.399,44.577 -->

### Chinese

函数是一条规则：拿一个输入，给一个答案。两条规则可以看起来不同，却在每个输入上给出相同答案。Lean 有一个叫 `funext` 的帮手处理这种情况。它要求两个函数接受相同种类的输入，并返回相同种类的答案。下一步 Turn-Lang 会把这些匹配检查写出来。

### Visual notes

beat-template: compare-dual
layer: compare
lean-render: true
turn-render: true
typing: true

Animate two visibly different recipe cards feeding one input/output table. Show several matching answers, then introduce `funext` as the helper name; do not show function-type notation yet.

## Beat 9: Turn-Lang lists the three checks

<!--
font-scales: as before
focus: turn
pip-shape: circle
pip-size: 0.2137, 0.3799
pip-position: 0.1571, 0.5546
pip-crop: 0.4464, 0.42
pip-scale: 1.6767
-->

```beat-variants
{"selected":"A","candidates":[{"label":"A","template":"compare-dual","templateConfig":{"kind":"compare-dual","config":{"leanEnabled":true,"turnEnabled":true}},"content":{"title":"Turn-Lang lists the three checks","say":"Turn-Lang calls its function rule `FuncEq`.\nIt lists three checks in order.\nDo the two functions accept the same kind of input?\nDo they return the same kind of answer?\nAnd do they give the same answer for every input?\nThat is the exact relation we want to prove.","leanCode":"-- Before comparing functions, match their inputs.\n-- Then match their answers.","turnCode":"// Turn-Lang source: AATA/01_preliminaries/02_sets_and_equivalence_relations.turn\n@notation({f} ~ \" = \" ~ {g})\nrelation FuncEq(X Y X' Y': Set<Any>, f: Function<X, Y>, g: Function<X', Y'>): Prop {\n    forall x in X |- {\n        SetEq(X, X');\n        SetEq(Y, Y');\n        f.apply(x) = g.apply(x);\n    }\n}","visualNotes":"beat-template: compare-dual\nlayer: compare\nlean-render: true\nturn-render: true\ntyping: true\nfocus: turn\n\nShow three large checklist cards: inputs, answers, and every input's answer. Introduce `FuncEq` only after the three cards are visible; hide raw Turn-Lang grammar for this beginner version."}}]}
```

Turn-Lang calls its function rule `FuncEq`.
It lists three checks in order.
Do the two functions accept the same kind of input?
Do they return the same kind of answer?
And do they give the same answer for every input?
That is the exact relation we want to prove.

### Lean

```lean
-- Before comparing functions, match their inputs.
-- Then match their answers.
```

### Lean highlights

- `inputs`
- `answers`

### Turn-Lang

```turn
// Turn-Lang source: AATA/01_preliminaries/02_sets_and_equivalence_relations.turn
@notation({f} ~ " = " ~ {g})
relation FuncEq(X Y X' Y': Set<Any>, f: Function<X, Y>, g: Function<X', Y'>): Prop {
    forall x in X |- {
        SetEq(X, X');
        SetEq(Y, Y');
        f.apply(x) = g.apply(x);
    }
}
```

### Turn-Lang highlights

- `FuncEq`
- `SetEq(X, X')`
- `SetEq(Y, Y')`
- `f.apply(x) = g.apply(x)`

### Chinese

Turn-Lang 把它的函数规则叫作 `FuncEq`。它按顺序列出三个检查。两个函数是否接受相同种类的输入？是否返回相同种类的答案？是否在每个输入上都给出相同答案？这正是我们要证明的关系。

### Visual notes

beat-template: compare-dual
layer: compare
lean-render: true
turn-render: true
typing: true
focus: turn

Show three large checklist cards: inputs, answers, and every input's answer. Introduce `FuncEq` only after the three cards are visible; hide raw Turn-Lang grammar for this beginner version.

## Beat 10: Same job does not mean same data

<!--
font-scales: as before
pip-shape: circle
pip-size: 0.2137, 0.3799
pip-position: 0.1571, 0.5546
pip-crop: 0.4464, 0.42
pip-scale: 1.6767
-->

Literal equality is not always the right choice, even when two objects play the same mathematical role.
A group is a collection with a rule for combining its elements.
Two groups can use different elements and still have the same structure.
An isomorphism is a reversible translation that respects the combining rule.
So “same structure” is not normally the same as “the exact same data.”

### Lean

```lean
-- Lean core source: lean4/src/Init/Prelude.lean (Eq)
-- Mathlib source: mathlib4/Mathlib/Algebra/Group/Equiv/Defs.lean (MulEquiv, notation ≃*)
-- G = H means: exactly the same data.
-- G ≃* H means: the same group structure.
-- The second statement is not automatically the first.
```

### Lean highlights

- `lean4/src/Init/Prelude.lean`
- `mathlib4/Mathlib/Algebra/Group/Equiv/Defs.lean`
- `same data`
- `same group structure`

### Turn-Lang

```turn
// Turn-Lang source: reference/function-equality.turn
@notation({A} ~ " = " ~ {B})
relation SetEq(T: Any, A B: Set<T>): Prop {
    |- {
        Subset(A, B);
        Subset(B, A);
    }
}

@notation({f} ~ " = " ~ {g})
relation FunctionEq(X Y: Set<Any>, f g: Function<X, Y>): Prop {
    forall x in X
    |- f(x) = g(x)
}
```

### Turn-Lang highlights

- `SetEq`
- `FunctionEq`
- `f(x) = g(x)`

### Hint

An isomorphism says two groups have matching structure. It does not normally say their stored data are identical.

<!-- target: lean-code; needle: same group structure; position: 28.99,53.213 -->

### Chinese

字面相等并不总是正确选择，即使两个对象承担相同的数学角色。群是一堆元素加上一条组合规则。两个群可以用不同元素，却有相同结构。同构是一种可逆翻译，它保持这条组合规则。所以“同样结构”通常不等于“完全同样的数据”。

### Visual notes

beat-template: compare-dual
layer: compare
lean-render: true
turn-render: true
typing: true

Build a ladder: members → answers → structure. Use ordinary-language cards “same data” and “same group structure” before showing any symbolic notation.

## Beat 11: One question to take away

<!--
font-scales: as before
pip-shape: circle
pip-size: 0.2137, 0.3799
pip-position: 0.1571, 0.5546
pip-crop: 0.4464, 0.42
pip-scale: 1.6767
-->

Later, we will meet advanced ideas that take equality even further.
For now, keep one ladder in mind.
Numbers match by value.
Sets match by members.
Functions match by answers.
Groups match by structure.
What must agree before we call two things the same?
Name that rule — then prove it.
Next time: the empty set.

### Lean

```lean

```

### Turn-Lang

```turn

```

### Manim

```manim-web
const title = new Text({
  text: "What must agree?",
  fontSize: 44,
  color: "#f8fafc",
});
title.moveTo([0, 2.6, 0]);
await scene.play(new FadeIn(title, { duration: 0.5 }));

const levels = [
  { label: "value", detail: "numbers · 1 = 1", color: "#38bdf8" },
  { label: "members", detail: "sets · A = B", color: "#34d399" },
  { label: "answers", detail: "functions · f = g", color: "#fbbf24" },
  { label: "structure", detail: "groups · isomorphism", color: "#f472b6" },
];

const cards = [];
for (let i = 0; i < levels.length; i += 1) {
  const y = 1.35 - i * 0.95;
  const plate = new Rectangle({
    width: 5.6,
    height: 0.72,
    color: levels[i].color,
    fillOpacity: 0.14,
    strokeWidth: 2,
  });
  plate.moveTo([0, y, 0]);
  const label = new Text({
    text: levels[i].label,
    fontSize: 30,
    color: levels[i].color,
  });
  label.moveTo([-1.6, y, 0]);
  const detail = new Text({
    text: levels[i].detail,
    fontSize: 22,
    color: "#cbd5e1",
  });
  detail.moveTo([1.05, y, 0]);
  const row = new VGroup(plate, label, detail);
  cards.push(row);
  await scene.play(new FadeIn(row, { duration: 0.35 }));
  await scene.wait(0.12);
}

const arrow = new Arrow({
  start: [0, 1.7, 0],
  end: [0, -1.85, 0],
  color: "#64748b",
  strokeWidth: 2,
});
await scene.play(new Create(arrow, { duration: 0.55 }));

const tip = new Text({
  text: "higher-level equality → choose the rule",
  fontSize: 24,
  color: "#e2e8f0",
});
tip.moveTo([0, -2.55, 0]);
await scene.play(new FadeIn(tip, { duration: 0.4 }));
await scene.wait(0.55);

await scene.play(new FadeOut(arrow, { duration: 0.25 }));
for (const card of cards) {
  await scene.play(new FadeOut(card, { duration: 0.12 }));
}

const next = new Text({
  text: "Next: the empty set  ∅",
  fontSize: 36,
  color: "#a5b4fc",
});
next.moveTo([0, -0.2, 0]);
await scene.play(new FadeIn(next, { duration: 0.55 }));
await scene.wait(0.8);
```

### Chinese

以后我们会遇到把相等推得更远的更高级想法。现在先记住这把梯子。数看数值。集合看成员。函数看答案。群看结构。在叫两个东西“相同”之前，先问哪些地方必须一致。选好规则，再去证明。下一期：空集。

### Visual notes

beat-template: manim-motion
layer: math-board
manim-sub: custom
manim-code: true
duration-seconds: 12
caption: What must agree?

Play the ### Manim ladder: value → members → answers → structure, then next-episode empty-set card.
