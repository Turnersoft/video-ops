# Trial Branches Keep Parallel Proof Experiments

Playlist: turn-lang syntax highlight

Title: Trial Branches Keep Parallel Proof Experiments

Promotional description: In the real symmetric-halves proof, `#!` opens a parallel trial — another proof plugged in at the same fork, while your main line stays in the file.

Status: Idea

Audience: Proof-slide users, students learning tactic proofs in Turn-Lang

Series order: turn-lang syntax highlight #1

Builds on: (published) How to manage tactics in proof assistants?: with turn-lang

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (theorem `"Symmetric halves of asymmetric difference disjoint (example in Judson sect. 1.2)"`)

## Core Idea

`#!` is how you keep proof experiments in the source. At a fork you can plug in multiple parallel proofs: the default line plus one or more trials. Trials are siblings at the same goal, not a nested continuation of the tactic above, and they do not erase the main proof — they sit beside it so you can compare strategies.

## Scene 1: Open the proof with trials

Duration: 8s

Say:

> Hi friends, welcome back.
> So this is a real proof in our AATA library, symmetric halves of an asymmetric difference.
> You will see `#!` markers in the script. Those mark trial branches.

Show on screen:

Open the theorem starting at line 153. Show the `split_conjunction` proof with multiple `#!` lines.

Visual notes:

Use proof-slide or branch map if available.

## Scene 2: Parallel proofs at the same fork

Duration: 12s

Say:

> Here is the idea.
> At this fork I already have a default proof line.
> When I add `#!`, I am plugging in another proof in parallel.
> Same goal, different strategy — maybe `assume` and `split`, maybe `contradiction`.
> I keep both in the file so I can compare them, fold the failed one, and move on.

Show on screen:

```turn
split_conjunction {
    assume h1
    assume h2
        assume g1
            assume x1
                assume y1
                assume y2
            #!
            assume x2
        assume g2
        #!
        ...
} {
    assume h1
    #!
    assume h2
    ...
}
```

Visual notes:

Show branch map with default arm and trial arms side by side (`1`, `1#1`, `1#2`). Point out trials are parallel slots, not indented children of the last tactic.

## Scene 3: Not a continuation of the line above

Duration: 9s

Say:

> One mistake people make: they think the trial continues the tactic right above it.
> It does not.
> The trial is its own parallel proof from the same fork point.
> That is why proof-slide lays trials beside the main rail, not underneath the previous step.

Show on screen:

Branch map focused on one fork: main column down, trial columns to the right on the same row.

Visual notes:

Contrast a nested split subgoal (`1.1`) with a trial label (`1#1`).

## Scene 4: Close

Duration: 6s

Say:

> So `#!` is for keeping experiments.
> Plug in multiple proofs, compare them, keep the winner.
> That is how we explore without throwing away the work.

Show on screen:

Fold failed trials command or collapsed trial block in the editor, main proof still visible.

Visual notes:

End on branch map or folded trials, not a title card.

## Final Takeaway

`#!` keeps parallel proof experiments at the same fork — multiple strategies in one file, not a replacement that deletes your main line.
