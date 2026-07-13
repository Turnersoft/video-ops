# When the Textbook Skips the Checklist, You Should Still See It

Playlist: why we need turn-lang

Title: When the Textbook Skips the Checklist, You Should Still See It

Promotional description: “Clearly a partition” hides four checks. Turn keeps the same names from the definition on screen when you prove Theorem 1.25 — C.1, C.2, cover, disjoint.

Status: Script

Education core: L2
Education refresh: L1 (partition in one sentence)
Education work: none
Education horizon: L2 (partition design)
Patience: short (~2 min)
Work link: none
Primary audience: Students on Judson 1.25, self-learners who want to see every step

Hook type: homework hand-wave → named checklist → turn-receipt
Turn wedge: `witness confirm` uses names from `Partition`

Series order: why we need turn-lang #6

Builds on: algebra-07-theorem-125-what-formed-means

Clip source: published/2026-6-17-  1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang.md (22:49–24:30, reframe)

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (`Partition` + Theorem 1.25 proof)

## Core Idea

Textbooks compress partition proofs into one line. The real work is a short checklist. Turn copies that checklist into the proof so you see what “clearly” meant.

## Scene 1: The hand-wave

Duration: 14s

Say:

> Hi friends, welcome back.
> Homework says: clearly these sets form a partition.
> You nod — but what was checked?
> Nonempty pieces. Pieces inside X. Cover everything. No overlap.
> That is the whole proof, hidden in one adverb.

Show on screen:

“Clearly a partition.” → four short labels appear.

Visual notes:

One textbook line, one checklist. No tool yet.

## Scene 2: Names from the definition

Duration: 12s

Say:

> Turn-Lang names those checks where the partition is defined.
> C.1, C.2, cover, disjoint — not invented in the proof.
> When you prove Theorem 1.25, you discharge the same names at the goal.

Show on screen:

`Partition` structure with container + laws; overlay C.1 / C.2.

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

Proof-slide branch map if available.

## Scene 3: Close

Duration: 8s

Say:

> Longer, yes — but you see every obligation.
> That is the trade formal work offers.
> Open the chapter file in the description and click through the proof yourself.

Show on screen:

Return to `Partition` in outline.

Visual notes:

CTA subscribe / code along.

## Final Takeaway

Turn turns “clearly a partition” into a visible checklist — the proof uses the same names as the definition.

## Audience lanes

- **L1 Refresh:** cover + disjoint in one sentence.
- **L1–L2 Core:** map definition fields to proof branches.
- **Self-learners:** verify each piece without trusting the adverb.
