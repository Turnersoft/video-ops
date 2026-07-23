# Click the Outline, Proof Slide Knows Your Leaf

Playlist: turn-lang syntax highlight

Title: Click the Outline, Proof Slide Knows Your Leaf

Promotional description: In the real `"basic set"` theorem, click `second` in the outline — proof-slide opens on that leaf with a breadcrumb like `basic set › p1 › second`, not a generic theorem title.

Status: Idea

Audience: Undergraduate STEM students, lecturers demoing proofs in class, proof-slide users

Series order: turn-lang syntax highlight #5

Builds on: syntax-02-theorem-is-a-folder

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (theorem `"basic set"`)

Source UI: `outlineSymbolProofFocus.ts`, `proofSlideNavTitle.ts`, proof-slide top bar

## Core Idea

syntax-02 showed the theorem as a folder in the outline. This video shows the round trip: click a leaf symbol → proof-slide mode opens focused on that claim → the top bar breadcrumb comes from Turn-Lang's `proof_block_nav` metadata, not guessed client-side paths.

## Scene 1: Big theorem, small target

Duration: 8s

Say:

> Hi friends, welcome back.
> Same `"basic set"` theorem in this chapter.
> Last time we used the outline as a folder.
> Today we click a leaf and proof-slide already knows which subproof we mean.

Show on screen:

Outline tree with `basic set` expanded → `p1` → `second` visible.

Visual notes:

AppPage `/app` with outline panel open.

## Scene 2: Outline click → proof slide

Duration: 12s

Say:

> I click `second` under `p1`.
> Proof-slide opens on that proof block — not the first identity, not the whole file.
> The editor and the slide stay aligned on one claim.

Show on screen:

Click `second` → proof-slide shell opens → first tactic visible is from `second`'s proof (`unfold Intersect.def` or similar).

Visual notes:

Show slide toggle if needed; one smooth click path.

## Scene 3: Breadcrumb from the language

Duration: 12s

Say:

> Look at the top bar.
> It does not just say "basic set."
> It shows `basic set › p1 › second` — the path Turn-Lang exported from the source.
> That breadcrumb travels with the proof; the UI does not reconstruct it by guessing.

Show on screen:

Proof-slide top bar `fullTitle` / breadcrumb segments. Optional: devtools or viz JSON snippet showing `nav_breadcrumb` array.

Visual notes:

Point at `›` separator between segments.

## Scene 4: Step through with context

Duration: 10s

Say:

> As I step tactics forward, I always know which leaf I am lecturing on.
> If I jump to `third`, the breadcrumb updates.
> Students are not lost inside a fifty-line theorem.

Show on screen:

Next/Previous tactic → breadcrumb stable except when switching to another outline leaf.

Visual notes:

Keep one theorem; do not tour the whole chapter.

## Scene 5: Close

Duration: 6s

Say:

> So the outline is not just navigation in the editor.
> It is the remote control for proof-slide on named claims.

Show on screen:

Outline + proof-slide side by side.

Visual notes:

Short close.

## Final Takeaway

Click an outline leaf and proof-slide opens with the correct subproof breadcrumb exported from Turn-Lang — folder navigation that survives replay.
