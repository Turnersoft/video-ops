# An Inverse Is Evidence You Can Use, Not Just a Word

Playlist: abstract algebra: formalized from scratch with turn-lang

Title: An Inverse Is Evidence You Can Use, Not Just a Word

Promotional description: Textbooks say invertible means bijective, but the proof needs evidence: an inverse witness and composition laws. Turn lets you step through that evidence instead of trusting the slogan.

Status: Idea

Audience: Abstract algebra students past Judson 1.25, anyone learning function proofs

Series order: abstract algebra: formalized from scratch with turn-lang #4

Builds on: algebra-01-spread-classes-into-partition

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (theorem `"invertible mapping must be injective"`)

## Core Idea

Bijection slogans are easy; the proof needs evidence. An inverse is not a label — it gives equations you use. This chapter unpacks `invertible`, witnesses the inverse, then proves injective and surjective with composition laws.

## Scene 1: The experience

Duration: 22s

Say:

> Hi friends, welcome back.
> You have probably heard the slogan: invertible means bijective.
> But a slogan is not a proof.
> If I say a machine has an undo button, what evidence do I actually get?
> I get a second machine that sends outputs back to inputs.
> And I get two promises: doing, then undoing, gets you back; undoing, then doing, also gets you back.
> That is the background you need before the formal proof makes sense.

Show on screen:

Picture: A --f--> B and B --g--> A, with two round-trip arrows back to identity.

Visual notes:

Do not open the theorem yet. Make the inverse feel like an undo machine with two receipts.

## Scene 2: The Turn wedge

Duration: 14s

Say:

> Turn-Lang makes the evidence inspectable.
> The proof starts from the word invertible, unfolds it, and unpacks an inverse witness.
> After that, the proof is not magic — it uses the composition equations carried by that witness.

Show on screen:

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

Visual notes:

Collapse the backward direction for now. Highlight `unfold Function.invertible` and `witness gInv`.

## Scene 3: Math receipt

Duration: 10s

Say:

> In the injective branch, two different inputs cannot land at the same output, because the inverse would send that same output back to two different places.
> In the surjective branch, the preimage of b is simply gInv of b.
> That is the proof idea hiding behind the slogan.

Show on screen:

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

Visual notes:

Do not read every line — point at `witness gInv for inv` and `contradiction`.

## Scene 4: Close

Duration: 6s

Say:

> This is why Turn proofs are longer than slogans.
> They show the evidence the slogan depends on.
> Open the file, replay the proof, pause where you need.

Show on screen:

Theorem name in tab + checkmark if proof complete.

Visual notes:

Encourage replay in workspace.

## Final Takeaway

The real invertible↔bijective proof in AATA uses named witnesses and composition unfolds you can step through in the editor.
