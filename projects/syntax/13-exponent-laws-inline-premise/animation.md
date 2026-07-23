---
videoOps: 1
scriptId: 13-exponent-laws-inline-premise
title: syntax_13_exponent_laws_inline_premise
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: Scope should be obvious

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: One shared theorem header with four named leaves; only the final leaf carries an “additional assumption” badge

<!--
duration: 12
allow-script-change: false
-->

Good formalization should make scope obvious before anyone reads the proof.
Here, several related statement belong in one theorem block, but only the final result needs an additional assumption.
Turn keeps that dependency local.
No duplicated declarations, no stronger context than necessary, and no time wasted tracing where an assumption came from.


### Lean

```lean

```

### Turn

```turn

```
### Visual notes

One shared theorem header with four named leaves; only the final leaf carries an “additional assumption” badge.
Lead with professional source design, not the mathematical content.

# Scene 2: Read the dependency at a glance

<!--
layout: code-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 2: Outline shows four named leaves inside one theorem folder

<!--
duration: 16
focus: turn
allow-script-change: false
-->

Look at the shape of the source.
The shared context is written once, and each result is a named leaf.
Only `abelian_distrib` carries `(abelian)G ->`.
A reviewer sees the dependency immediately — without opening another theorem, comparing headers, or scanning a long proof.
The syntax communicates scope before implementation begins.

### Turn

```turn
theorem "3.23 exponentiation on group" {
    forall G: Group,
    forall g h in G,
    forall m n: Integer
    |- {
        G.op.apply([G.exponent(g, m), G.exponent(g, n)]) = G.exponent(g, m+n);
        G.exponent(G.exponent(g, m), n) = G.exponent(g, m*n);
        G.exponent(G.op.apply([g, h]), n) = G.exponent(G.op.apply([G.inverse.apply(h), G.inverse.apply(g)]), -n);
        (abelian)G -> G.exponent(G.op.apply([g, h]), n) = G.op.apply([G.exponent(g, n), G.exponent(h, n)]);
    }
}
```

Highlights:

- `forall G: Group`
- `(abelian)G ->`
- `abelian_distrib`


### Lean

```lean

```
### Visual notes

Outline shows four named leaves inside one theorem folder.
Keep equation bodies visually secondary.

turn-ide track: tracks/scene-2-ide.json

# Scene 3: Keep general proofs general

<!--
layout: code-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Smallest useful context

<!--
duration: 11
focus: turn
allow-script-change: false
-->

Open any of the first three leaves and the context stays general: `G` is a `Group`, nothing more.
That keeps proof search focused and the context panel quiet.
It also means a future change to the special case cannot accidentally tighten the assumptions of the general results.

### Visual notes

Proof-slide on one general leaf.
Context rows show `G: Group` and the shared variables; no `(abelian)G`.
Briefly switch between two general leaves; the context stays unchanged.

# Scene 4: Introduce the premise locally

<!--
layout: code-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: One explicit assume

<!--
duration: 12
focus: turn
allow-script-change: false
-->

When we reach the final leaf, the implication is handled with one line: `assume hAbelian`.
That cleanly brings the extra premise into this proof’s local context — and nowhere else.
No duplicated setup. No manual cleanup.
The assumption appears at exactly the point where it becomes useful.

### Turn

```turn
abelian_distrib:
    (abelian)G -> ...
    proof {
        assume hAbelian
        ...
    };
```

Highlights:

- `(abelian)G ->`
- `assume hAbelian`

### Visual notes

Contrast the context before and after `assume hAbelian`.
Breadcrumb: `3.23 exponentiation on group › abelian_distrib`.

# Scene 5: Close

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Close

<!--
duration: 9
allow-script-change: false
-->

This small syntax choice has a large maintenance payoff.
Related results stay together.
Exceptional assumptions stay local.
Each proof receives only the extra assumptions declared on its leaf.
Less setup for the author, faster comprehension for the reviewer, and cleaner evolution for the library.

### Visual notes

One block → one local premise → the extra context appears exactly where it applies.
Finish on the source and context panel, not a logo.
