# You Can Use a Witness You Cannot Compute

Playlist: why we need turn-lang

Title: You Can Use a Witness You Cannot Compute

Promotional description: In Judson 1.25 the hypothesis gives `exists x in X`, not a concrete value. Turn-Lang's `witness hRep.witness for x in hRep` unpacks that existential honestly in the real proof file.

Status: Idea

Audience: Students learning existential elimination, proof assistant users

Series order: why we need turn-lang #3

Builds on: why-need-02-side-conditions-you-can-name

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (Judson 1.25 proof, `C.1` branch)

## Core Idea

Sometimes a hypothesis guarantees an object exists without telling you which one. That is normal mathematics. The outstanding syntax move is `witness hRep.witness for x in hRep`: unpack the existential binder `x` from hypothesis `hRep`, and carry `w in X` as evidence.

## Scene 1: The situation in the real proof

Duration: 9s

Say:

> Hi friends, welcome back.
> So in the partition proof, we are inside obligation `C.1`.
> We specialized `Classes.1` and got a representation hypothesis `hRep`.
> That hypothesis does not give us a concrete element. It gives us an existential.

Show on screen:

Inside `C.1` in the Judson 1.25 proof:

```turn
specialize Classes.1 for C as D into hRep
witness hRep.witness for x in hRep
```

Visual notes:

Start zoomed into `C.1` only.

## Scene 2: What the tactic is really doing

Duration: 10s

Say:

> `witness hRep.witness for x in hRep` is not inventing a number.
> It says: take the witness promised by this existential, and name it.
> The name `hRep.witness` is the scoped realization unpacked from binder `x`.

Show on screen:

Keep the witness line highlighted. Show proof state if available: `w in X` or domain evidence after witness.

Visual notes:

If proof panel shows context rows, point at the witness receipt.

## Scene 3: Why this matters for teaching

Duration: 9s

Say:

> Students often think a witness must be something you can compute.
> But generic sets do not work that way.
> Turn-Lang makes the unpack visible in the script, so the proof step is honest.

Show on screen:

Scroll slightly to `C.2` showing the same witness pattern repeated.

Visual notes:

Same file, same theorem. Reinforce pattern recognition.

## Scene 4: Close

Duration: 6s

Say:

> So existential elimination is a real move, and the syntax should show it.
> Subscribe if you want more of these proof-state details from the real library.

Show on screen:

End on `witness hRep.witness for x in hRep`.

Visual notes:

Short close.

## Final Takeaway

`witness w for x in hRep` unpacks an existential you cannot compute, and the real Judson proof uses it in plain sight.
