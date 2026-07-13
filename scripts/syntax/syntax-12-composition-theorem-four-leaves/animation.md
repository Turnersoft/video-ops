---
videoOps: 1
scriptId: syntax-12-composition-theorem-four-leaves
title: syntax_12_composition_theorem_four_leaves
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: The experience

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: The experience

<!--
duration: 18
allow-script-change: false
-->

Hi friends, welcome back.
Imagine you open a textbook section called “rules for composition.”
Inside it are several related facts.
One fact says composition is associative.
Another says injective functions stay injective.
Another says surjective functions stay surjective.
These belong together, but they are not the same proof.
So the right mental model is not a wall of text — it is a folder with named pages.

### Visual notes

Generic “wall of text” proof vs folder icon with four tabs (conceptual).
Cross-reference 1.1 Sets folder pattern verbally.

# Scene 2: The Turn wedge

<!--
layout: code-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: The Turn wedge

<!--
duration: 12
focus: turn
allow-script-change: false
-->

In this chapter, four composition facts live in one theorem — `"composition's rules"`.
Associative, injective, surjective, bijective — each a named leaf with its own proof block.
The outline is the navigation. You click the fact you need.

### Turn

```turn
theorem "composition's rules" {
    forall A B C D: Set<Any>,
    forall f: Function<A, B>,
    forall g: Function<B, C>,
    forall h: Function<C, D>,
    |- {
        associative: ... proof { ... };
        injective: ... proof { ... };
        surjective: ... proof { ... };
        bijective: ... proof { ... };
    }
}
```

Highlights:

- `associative`
- `injective`
- `surjective`
- `bijective`

### Visual notes

Outline expanded to four leaves.
Click `surjective` leaf — flash `unfold Function.surjective at goal`.

turn-ide track: tracks/scene-2-ide.json

# Scene 3: Close

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
duration: 8
allow-script-change: false
-->

Merging unrelated proofs helps nobody.
Adding a fifth leaf does not rewrite the other four.
That is how a proof library stays teachable — link to full file below.

### Visual notes

Outline tree collapsed then expanded.
Inspiring: navigable library.

