# Keep or Reject Before AI Edits Your Proof

Playlist: why we need turn-lang

Title: Keep or Reject Before AI Edits Your Proof

Promotional description: When the Turn agent proposes a change, Monaco shows a git-style preview — Keep or Reject on the exact lines, not a surprise rewrite after you blink.

Status: Idea

Audience: Software engineers exploring verification, AI researchers, students using the agent workbench

Series order: why we need turn-lang #5

Builds on: why-need-04-daily-quiz-for-trustworthy-ai

Source demo: `basic_ui` AppPage agent workbench + `agent-editor-change-preview.ts` inline Keep/Reject widgets

## Core Idea

"AI should not surprise-edit your proof" is a product rule, not a slogan. Pending agent patches render inline in the editor with removed lines highlighted and Keep / Reject controls on each block — same mental model as reviewing a pull request, but on the theorem you are formalizing.

## Scene 1: The fear we are fixing

Duration: 9s

Say:

> Hi friends, welcome back.
> So you asked the agent to help formalize a lemma.
> In most tools the file just changes.
> You are left diffing from memory.
> Turn does not do that.

Show on screen:

Generic "file updated" toast (mock) vs Turn editor with pending change banner.

Visual notes:

Stay calm — name the UX problem, not a competitor.

## Scene 2: Pending changes bar

Duration: 10s

Say:

> The agent workbench shows pending changes before anything is final.
> I can see how many blocks are waiting and open the preview.

Show on screen:

Agent workbench → pending changes bar → list of proposed blocks with titles.

Visual notes:

Use a small real `.turn` file edit if available.

## Scene 3: Inline Keep / Reject

Duration: 14s

Say:

> In the editor, removed text is highlighted like a git diff.
> Each block has Keep and Reject right on the line.
> I read the tactic change, reject the wrong branch, keep the one that closes the goal.
> Nothing else in the file moves without my click.

Show on screen:

Monaco with red/green preview zones → click Reject on one block → click Keep on another → file settles.

Visual notes:

Zoom on one block; do not scroll through a huge patch.

## Scene 4: Tie back to formalization

Duration: 10s

Say:

> Formalization is already hard.
> The agent can search the library and suggest a patch.
> But the verifier and you stay in charge — the edit is a proposal until you keep it.

Show on screen:

Proof panel goal unchanged until Keep → then tactic line updates and checker runs.

Visual notes:

Optional: agent timeline panel in background.

## Scene 5: Close

Duration: 7s

Say:

> So trustworthy AI math needs previews, not surprises.
> Try the workbench, and tell me what theorem you want the agent to formalize next.

Show on screen:

Workbench + outline of a real AATA theorem.

Visual notes:

CTA: sign up, comment your theorem.

## Final Takeaway

Turn shows agent edits as reviewable blocks with Keep / Reject on the exact lines — you accept changes deliberately, not by accident.
