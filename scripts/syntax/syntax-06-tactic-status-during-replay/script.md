# Tactic Status During Proof Replay

Playlist: turn-lang syntax highlight

Title: Tactic Status During Proof Replay

Promotional description: In proof-slide mode on the symmetric-halves proof, each step shows whether the tactic succeeded, failed, or branched — so replay is not a blind slideshow.

Status: Idea

Audience: Students studying for exams, instructors recording proof walkthroughs

Series order: turn-lang syntax highlight #6

Builds on: syntax-01-trial-is-not-continuation

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (symmetric halves + `#!` trials)

Source UI: `ProofSlideTacticStatusBanner.tsx`, `ProofSlideTacticStatusBadge.tsx`

## Core Idea

Proof-slide is for learning, not theater. When you step through tactics, a status banner and per-tactic badges show success, failure, or branch context — so a failed trial arm is visible during replay, matching Turn's "failed routes stay in the record" promise.

## Scene 1: Replay without guessing

Duration: 8s

Say:

> Hi friends, welcome back.
> Proof-slide lets you walk a proof like slides.
> But you still need to know: did this tactic actually work?
> Turn shows that on the step itself.

Show on screen:

Proof-slide on symmetric-halves theorem — forward one tactic.

Visual notes:

Open from published tactics video file if possible.

## Scene 2: Status banner

Duration: 10s

Say:

> At each step there is a status line — closed goal, branch fork, error detail.
> I am not inferring from the goal panel alone.
> The slide tells me what the checker thought.

Show on screen:

`ProofSlideTacticStatusBanner` visible after stepping `split_conjunction` or `assume`.

Visual notes:

Pause on one step long enough to read the banner.

## Scene 3: Trials show failure honestly

Duration: 12s

Say:

> When I reach a `#!` trial arm that does not close, the badge shows it failed.
> That is the point — I keep the dead branch in the file and I see it in replay.
> Compare with the surviving branch on the main line.

Show on screen:

Step into a trial arm → failure status → step back to main arm → success status. Branch map optional in corner.

Visual notes:

Do not delete trials on camera — show them folded or marked failed.

## Scene 4: Close

Duration: 6s

Say:

> So proof-slide is a study tool.
> Status on every step — like a TA who tells you if the move actually worked.

Show on screen:

Tactic chips with badges + banner on final QED step.

Visual notes:

CTA: try proof-slide on your library theorem.

## Final Takeaway

Proof-slide replay shows tactic success and failure on each step — failed trials stay visible, not hidden behind animation.
