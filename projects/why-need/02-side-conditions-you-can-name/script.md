# Side Conditions You Can Name

Playlist: why we need turn-lang

Title: Side Conditions You Can Name in Turn-Lang

Promotional description: Judson Theorem 1.25 ends with `witness confirm { C.1; C.2; cover; disjoint }` — each partition obligation stays named in the proof you can step through.

Status: Idea

Audience: Students, instructors, proof assistant users formalizing Judson

Series order: why we need turn-lang #2

Builds on: why-need-01-cauchy-where-bundle

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn`

## Core Idea

Proving equivalence classes form a partition is not one step. The checker needs nonempty cells, subset cells, cover, and disjointness. In our real Judson 1.25 proof, Turn-Lang keeps each obligation named inside `witness confirm`, instead of anonymous subgoals.

## Scene 1: Open the real Judson proof

Duration: 9s

Say:

> Hi friends, welcome back. This is Turner.
> So we are in the chapter file, at Judson Theorem 1.25.
> The statement says equivalence classes form a partition.
> The interesting part is not the headline. It is what the proof has to check.

Show on screen:

Open `02_sets_and_equivalence_relations.turn`. Scroll to theorem `"equivalence classes form a partition (Judson Theorem 1.25 forward)"`.

Visual notes:

Show the theorem statement ending in `|- exists Partition<X>[..Classes]`.

## Scene 2: Point at the Partition structure first

Duration: 9s

Say:

> Before the proof, look at how `Partition` is defined.
> Each cell must be nonempty and a subset of X.
> The laws ask for cover and disjointness.
> These names are already in the structure.

Show on screen:

```turn
structure[
    C: Set<Any> where {
        |- C != EmptySet;
        |- Subset(C, X)
    }
] Partition<X: Set<Any>>: Set<Set<Any>> {
    laws {
        disjoint { ... },
        cover { ... }
    }
}
```

Visual notes:

Briefly show structure, then jump to the proof's `witness confirm`.

## Scene 3: The named confirm block

Duration: 12s

Say:

> Now the proof.
> `witness confirm` is doing the real work.
> `C.1` and `C.2` discharge the cell conditions.
> `cover` and `disjoint` discharge the partition laws.
> You always know which obligation you are paying for.

Show on screen:

```turn
} proof {
    witness confirm {
        at goal {
            C.1 { ... }
            C.2 { ... }
            cover { ... }
            disjoint { ... }
        }
    }
}
```

Visual notes:

Expand one branch briefly, e.g. `witness hRep.witness for x in hRep` inside `C.1`, then collapse. The names are the hero.

## Scene 4: Close

Duration: 7s

Say:

> So this is what I mean by side conditions you can name.
> The partition proof in our real library is readable because the obligations keep their names.
> Tell me which Judson theorem you want next.

Show on screen:

Cursor on `disjoint {` inside the confirm block.

Visual notes:

End in the file, not on a logo.

## Final Takeaway

In the real Judson 1.25 proof, `witness confirm` keeps partition obligations named: C.1, C.2, cover, disjoint.
