# Export Your Proof as a Tree You Can Share

Playlist: turn-lang syntax highlight

Title: Export Your Proof as a Tree You Can Share

Promotional description: The symmetric-halves proof in AATA has real trial branches — export the branch forest as txt or svg for slides, grading, or office hours.

Status: Idea

Audience: Instructors, TAs, content creators

Series order: turn-lang syntax highlight #3

Builds on: syntax-02-theorem-is-a-folder

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (symmetric halves theorem with `#!` trials)

## Core Idea

A tactic proof is a tree. The symmetric-halves example already has trial forks in the real file. Turn-Lang can export that branch structure so you can share the reasoning shape without screen recording.

## Scene 1: Open the branched proof

Duration: 8s

Say:

> Hi friends, welcome back.
> Same symmetric-halves proof in this chapter.
> This time we care about the tree shape, not just the QED.

Show on screen:

Proof-slide branch map for `"Symmetric halves of asymmetric difference disjoint"`.

Visual notes:

If branch map is not visible, open proof-slide mode first.

## Scene 2: Export

Duration: 10s

Say:

> From here I can export the branch forest.
> Text for notes, SVG for a slide.
> Students see which trials I tried and which branch survived.

Show on screen:

Export menu → save branch map as `.txt` or `.svg`. Show a snippet of the exported tree listing `#!` nodes.

Visual notes:

Show one exported file briefly in finder or preview.

## Scene 3: Close

Duration: 6s

Say:

> So the proof is not trapped in the editor.
> The real library proof exports like documentation.

Show on screen:

Exported svg thumbnail beside the source file tab.

Visual notes:

Calm close.

## Final Takeaway

The real symmetric-halves proof exports as a shareable branch tree.
