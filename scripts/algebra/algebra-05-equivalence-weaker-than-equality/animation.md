---
videoOps: 1
scriptId: algebra-05-equivalence-weaker-than-equality
title: algebra_05_equivalence_weaker_than_equality
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: The concept — set-builder language

<!--
layout: beat-focus
burn-captions: true
visual-notes: math-board sequential reveal — One concept → Set-builder → Membership → Representative.
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: One concept

<!-- allow-script-change: false -->

Hi friends, welcome back. This is Turner.
One concept today: membership in an equivalence class.

### Visual notes

math-board heading: Equivalence class membership
reveal: One concept — Membership in [x], the equivalence class of x.

## Beat 2: Set-builder

<!-- allow-script-change: false -->

Pick a representative x. The class is every y tied to x by the relation.
Textbook set-builder: all y such that x is related to y.

### Visual notes

math-board: [x] = { y ∈ X | x ~ y }
emphasis: [x], ∈, ~

## Beat 3: Membership biconditional

<!-- allow-script-change: false -->

Formal membership: y is in the class of x if and only if x is related to y.
That biconditional is the whole idea — nothing else in this clip.

### Visual notes

math-board: y ∈ [x]  ↔  x ~ y
emphasis: ↔, ∈
then Representative — x is the chosen label for the bucket.

# Scene 2: Turn-Lang vs Lean — same biconditional

<!--
layout: dual-panel
burn-captions: true
visual-notes: Side-by-side compare — caption beats on both sides at each say line.
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
display.editor-font-scale: 0.7
display.lean-editor-font-scale: 0.8
display.render-font-scale: 0.85
-->

## Beat 1: Same concept, two assistants

<!-- focus: both; allow-script-change: false -->

Same concept in Turn-Lang and Lean — who reads closer to the textbook?

### Lean

```lean
theorem eqvClass_mem_iff (x y : α) :
  y ∈ s.eqvClass x ↔ s x y := by
  simp [Setoid.eqvClass]
```

Highlights:

- `eqvClass_mem_iff`

Goal:

- `eqvClass`

### Turn

```turn
structure EquivalenceClass<
    X: Set<Any>,
    E: EquivalenceRelation<X>,
    x in X,
>: Set<Any> {
    laws {
        def {
            forall y in X |- y in self <-> [x y] in E;
        },
```

Highlights:

- `EquivalenceClass`

Knowledge:

- `EquivalenceClass`

### Visual notes

Open both panes. Point at the named Turn structure versus Lean theorem title.

## Beat 2: Turn names the bucket

<!-- focus: both; allow-script-change: false -->

Turn names the bucket: EquivalenceClass, with representative x and relation E.

### Lean

```lean
as before
```

Highlights:

- `Setoid`

Goal:

- `Setoid`

### Turn

```turn
as before
```

Highlights:

- `x in X`
- `E: EquivalenceRelation`

Knowledge:

- `EquivalenceClass`

### Visual notes

Highlight representative x and relation E on Turn; Setoid packaging on Lean.

## Beat 3: Def law is set-builder membership

<!-- focus: both; allow-script-change: false -->

The def law is exactly set-builder membership: y in the class if and only if x is related to y.

### Lean

```lean
as before
```

Highlights:

- `↔`

Goal:

- `↔`

### Turn

```turn
as before
```

Highlights:

- `def`
- `<->`

Knowledge:

- `Def`

### Visual notes

Caption both sides on the biconditional / def law.

## Beat 4: Lean packages the relation

<!-- focus: both; allow-script-change: false -->

Lean packages the relation in a Setoid — the class is eqvClass x, a computed set.

### Lean

```lean
as before
```

Highlights:

- `eqvClass`

Goal:

- `eqvClass`
- `s x y`

### Turn

```turn
as before
```

Highlights:

- `y in self`
- `[x y] in E`

Knowledge:

- `Def`

### Visual notes

Contrast Turn membership law with Lean computed eqvClass.

## Beat 5: Same biconditional, different packaging

<!-- focus: both; allow-script-change: false -->

Membership is still a biconditional — but the bucket is not its own structure with an explicit law block.

### Lean

```lean
as before
```

Highlights:

- `Setoid`

Goal:

- `Setoid`
- `eqvClass`

### Turn

```turn
as before
```

Highlights:

- `laws`
- `def`

Knowledge:

- `Def`

### Visual notes

Keep both panes; stress Turn's named law block versus Lean infrastructure.

## Beat 6: Unfold versus state the law

<!-- focus: both; allow-script-change: false -->

Lean proves it by unfolding eqvClass; Turn states the law where the book puts the definition.

### Lean

```lean
as before
```

Highlights:

- `simp`
- `Setoid.eqvClass`

Goal:

- `Setoid.eqvClass`

### Turn

```turn
as before
```

Highlights:

- `def`

Knowledge:

- `Def`

### Visual notes

Lean simp unfold vs Turn def law in source.

## Beat 7: Teaching verdict setup

<!-- focus: both; allow-script-change: false -->

For teaching the meaning of equivalence class, Turn's named structure matches the book line for line.

### Lean

```lean
as before
```

Highlights:

- `eqvClass_mem_iff`

Goal:

- `↔`

### Turn

```turn
as before
```

Highlights:

- `EquivalenceClass`

Knowledge:

- `EquivalenceClass`

### Visual notes

Hold both panes for the teaching claim; next scene is the math-board verdict.

# Scene 3: Verdict — who is closer to the original meaning?

<!--
layout: beat-focus
burn-captions: true
visual-notes: math-board verdict — Textbook → Turn-Lang → Lean 4 → Verdict callout.
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Textbook

<!-- allow-script-change: false -->

Textbook: a set of y values, membership spelled as a biconditional with the relation.

### Visual notes

math-board heading: Who matches the textbook?
Textbook: [x] = { y | x ~ y } and y ∈ [x] ↔ x ~ y

## Beat 2: Turn-Lang

<!-- allow-script-change: false -->

Turn: EquivalenceClass is that set, def law is the biconditional — visible in source and render.

### Visual notes

math-board: Turn-Lang — EquivalenceClass + def law: y ∈ self ↔ (x,y) ∈ E

## Beat 3: Lean 4

<!-- allow-script-change: false -->

Lean: correct math, but eqvClass is infrastructure — you unfold to see the set-builder meaning.

### Visual notes

math-board: Lean 4 — y ∈ s.eqvClass x ↔ s x y (unfold eqvClass to see the set)

## Beat 4: Verdict

<!-- allow-script-change: false -->

Verdict: Turn-Lang stays closer to how the concept is introduced on the page.

### Visual notes

math-board Verdict: Turn names the bucket where the book does
callout: Turn-Lang — Closer to set-builder introduction
