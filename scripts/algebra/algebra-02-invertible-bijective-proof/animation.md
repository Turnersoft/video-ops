---
videoOps: 1
scriptId: algebra-02-invertible-bijective-proof
title: algebra_02_invertible_bijective_proof
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
duration: 22
allow-script-change: false
-->

Hi friends, welcome back.
You have probably heard the slogan: invertible means bijective.
But a slogan is not a proof.
If I say a machine has an undo button, what evidence do I actually get?
I get a second machine that sends outputs back to inputs.
And I get two promises: doing, then undoing, gets you back; undoing, then doing, also gets you back.
That is the background you need before the formal proof makes sense.

### Visual notes

Picture: A --f--> B and B --g--> A, with two round-trip arrows back to identity.

Do not open the theorem yet. Make the inverse feel like an undo machine with two receipts.

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
duration: 14
allow-script-change: false
-->

Turn-Lang makes the evidence inspectable.
The proof starts from the word invertible, unfolds it, and unpacks an inverse witness.
After that, the proof is not magic — it uses the composition equations carried by that witness.

### Turn

```turn
theorem "invertible mapping must be injective" {
    forall f: Function
    |- (invertible)f <-> (injective, surjective)f
} proof {
    split_conjunction {
        assume hInv
        unfold Function.invertible at hInv
        witness gInv for inv in hInv
        ...
    } { ... }
}
```

### Visual notes

Collapse the backward direction for now. Highlight `unfold Function.invertible` and `witness gInv`.

turn-ide track: tracks/scene-2-ide.json

# Scene 3: Math receipt

<!--
layout: code-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Math receipt

<!--
duration: 10
allow-script-change: false
-->

In the injective branch, two different inputs cannot land at the same output, because the inverse would send that same output back to two different places.
In the surjective branch, the preimage of b is simply gInv of b.
That is the proof idea hiding behind the slogan.

### Turn

```turn
split_conjunction {
    unfold Function.injective at goal
    assume hneq
    unfold Composition.def at hGf
    specialize hGf for x as a_1 into hLeft
    specialize hGf for x as a_2 into hRight
    ...
    contradiction hneq hRight
} {
    unfold Function.surjective at goal
    witness gInv.apply(b) for a
    exact hCover
}
```

### Visual notes

Do not read every line — point at `witness gInv for inv` and `contradiction`.

turn-ide track: tracks/scene-3-ide.json

# Scene 4: Close

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
duration: 6
allow-script-change: false
-->

This is why Turn proofs are longer than slogans.
They show the evidence the slogan depends on.
Open the file, replay the proof, pause where you need.

### Visual notes

Theorem name in tab + checkmark if proof complete.

Encourage replay in workspace.

