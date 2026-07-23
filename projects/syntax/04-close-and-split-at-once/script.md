# Close and Split at Once with witness confirm

Playlist: turn-lang syntax highlight

Title: Close and Split at Once with witness confirm

Promotional description: Judson 1.25 uses `witness confirm { at goal { C.1; C.2; cover; disjoint } }` to close the existential and discharge every partition law in one structured block.

Status: Idea

Audience: Proof assistant users, abstract algebra students on Judson 1.25

Series order: turn-lang syntax highlight #4

Builds on: syntax-03-export-proof-as-tree

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (Judson 1.25 forward proof)

## Core Idea

Introducing a partition witness and proving cover/disjoint is usually two mental phases. In the real proof, `witness confirm` does both: close `exists Partition<X>[..Classes]` and split the named obligations in one place.

## Scene 1: The goal before confirm

Duration: 8s

Say:

> Hi friends, welcome back.
> End of Judson 1.25 forward proof.
> The goal is `exists Partition<X>[..Classes]`.
> We already built the class family `Classes` in the statement.

Show on screen:

Theorem conclusion:

```turn
|- exists Partition<X>[..Classes]
```

Visual notes:

Show `[..Classes]` spread syntax on screen.

## Scene 2: One block, four named jobs

Duration: 12s

Say:

> `witness confirm` closes the existential and immediately opens the checklist.
> Cell nonempty, cell subset, cover, disjoint.
> All in one block, all named.

Show on screen:

```turn
witness confirm {
    at goal {
        C.1 { specialize Classes.1 for C as D into hRep ... }
        C.2 { ... }
        cover { witness EquivalenceClass<X, E, x> for C ... }
        disjoint { witness hRepA.witness for x in hRepA ... }
    }
}
```

Visual notes:

Expand `cover` and `disjoint` briefly — point at law names matching the `Partition` structure.

## Scene 3: Close

Duration: 6s

Say:

> That is close-and-split in one move.
> The real file is the reference implementation.

Show on screen:

Cursor on `at goal {`.

Visual notes:

End in workspace.

## Final Takeaway

`witness confirm` in the real Judson 1.25 proof closes the existential and splits partition laws by name in one block.
