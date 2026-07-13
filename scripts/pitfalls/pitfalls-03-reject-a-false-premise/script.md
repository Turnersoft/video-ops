# When the Homework Setup Is Already Wrong

Playlist: pitfalls of formal method

Title: When the Homework Setup Is Already Wrong

Promotional description: Sometimes the exercise assumes something false — and no proof can fix that. Turn makes you notice before you waste an hour inventing steps.

Status: Script

Education core: L0–L1
Education refresh: L0 (forced to answer anyway)
Education work: none
Education horizon: L2 (assumptions must match the goal)
Patience: short (~90 s)
Work link: none
Primary audience: Undergraduate students, self-learners, anyone stuck on a “impossible” problem

Hook type: stuck student → name the trap → turn diagnostic
Turn wedge: checker refuses a premise that does not typecheck / does not follow from definitions
Compare: paper proofs that let you assume anything

Series order: pitfalls of formal method #3

Builds on: pitfalls-05-exists-on-structure-is-a-claim (optional — same chapter file)

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (`Function.invertible` — contrast fair use vs impossible assumption)

## Core Idea

The pitfall is treating every exercise as well-posed. On paper you can silently assume an inverse exists. Formal work asks: **did the problem actually give you that?** Sometimes the honest move is to say the setup is wrong.

## Scene 1: The trap

Duration: 14s

Say:

> Hi friends, welcome back. This is Turner.
> Homework says: let g be the inverse of f, and prove something about g.
> Sounds normal.
> But what if f is not invertible?
> On paper you might still write g and hope the grader looks away.
> You are not stuck because you are bad at proofs.
> You are stuck because the exercise smuggled in a false premise.

Show on screen:

Homework line: “Let g be the inverse of f.” Under it, a map that fails invertibility (e.g. f(x)=x² on ℝ→ℝ) — one picture, no lecture.

Visual notes:

Empathy first. No product UI yet.

## Scene 2: The honest move

Duration: 12s

Say:

> The honest move is not to force a proof.
> It is to name what the question assumed.
> Invertible is not a vibe — it means an inverse actually exists with the right laws.
> If f does not have one, every line after “let g” is built on air.

Show on screen:

Short checklist: premise stated? → premise true? → only then prove.

Visual notes:

Keep abstract. One flowchart, three boxes.

## Scene 3: Turn receipt

Duration: 14s

Say:

> In Turn-Lang, invertible is a real property on the function — not a comment you can paste in.
> It says there exists an inverse structure, and that structure has laws to check.
> Try to use invertible on a map that does not qualify, and the checker will not let you treat the assumption as free.
> That is the point: catch the bad premise before you “prove” nonsense.

Show on screen:

`Function.invertible` property and `exists InverseFunction<self>` in the chapter file.

Visual notes:

Link to pitfalls-05 for depth; here only show that invertible is checkable.

## Scene 4: Close

Duration: 6s

Say:

> Formal method is not only proving theorems.
> Sometimes it is saying: this question assumed too much.
> Comment a homework problem that felt ill-posed. Link to the chapter in the description.

Show on screen:

Return to `invertible` line in outline.

Visual notes:

Warm CTA. No dev tooling on screen.

## Final Takeaway

A false premise is not a proof problem — Turn makes invertibility a checkable claim so you can reject the setup before you invent an inverse.

## Audience lanes

- **L0 / Refresh:** “let g be the inverse” when f isn’t invertible — one story.
- **L1 Core:** invertible is a property you must earn, not assume.
- **Self-learners:** permission to push back on the exercise, not only on yourself.
