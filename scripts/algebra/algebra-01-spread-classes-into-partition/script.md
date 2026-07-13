# Reuse the Definition Instead of Reproving the Shape

Playlist: abstract algebra: formalized from scratch with turn-lang

Title: Reuse the Definition Instead of Reproving the Shape

Promotional description: Judson 1.25 does not restate partition laws. Turn defines `Partition<X>` once — nonempty cells, subset, disjoint, cover — then the theorem asks for `exists Partition<X>[..Classes]`. Spread the family; prove the obligations.

Status: Script

Audience: Abstract algebra students on Judson 1.25, library maintainers

Series order: abstract algebra: formalized from scratch with turn-lang #3

Builds on: (published) 1.1 Sets: Abstract Algebra formalized from scratch with Turn-Lang

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (`Partition` structure + Judson 1.25 statement)

## Core Idea

A partition is a reusable shape, not text to copy. Define `Partition<X>` once with cell bounds plus `disjoint` and `cover` laws. The theorem only spreads `Classes` into that type: `exists Partition<X>[..Classes]`.

## Scene 1: The Turn wedge

Duration: 14s

Say:

> Turn-Lang defines `Partition` once.
> Each cell is nonempty and sits inside the ambient set.
> The structure carries `disjoint` and `cover` as laws — not as prose you paste into every theorem.
> When Judson 1.25 gives us a family `Classes`, we do not rewrite that checklist.
> We reuse this definition.

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

Left: Turn editor types the structure. Right: scoped knowledge panel — Definition 15 Partition with axioms (same render as `/app`). No hook card, no checklist montage.

## Scene 2: Math receipt

Duration: 12s

Say:

> Here is the receipt in the theorem statement.
> `exists Partition<X>[..Classes]` means: spread this class family into the partition type.
> The data is `Classes`. The reusable shape is `Partition<X>`.
> The spread syntax is the bridge between them.

Show on screen:

```turn
theorem "equivalence classes form a partition (Judson Theorem 1.25 forward)" {
    forall X: Set<Any>,
    forall E: EquivalenceRelation<X>,
    exists Classes: Set<Set<Any>> where { ... },
    |- exists Partition<X>[..Classes]
}
```

Visual notes:

Highlight `[..Classes]` once the line types. Proof panel may show the open goal after `theorem` appears. No split-receipt close card.

## Final Takeaway

Define partition laws once on the structure. Spread `Classes` at the theorem. Prove cover and disjoint as named obligations — do not duplicate the definition in every proof.
