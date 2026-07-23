---
videoOps: 1
scriptId: 05-keep-or-reject-before-ai-edits
title: why_need_05_keep_or_reject_before_ai_edits
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: The fear we are fixing

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1

<!--
duration: 9
allow-script-change: false
-->

Hi friends, welcome back.
So you asked the agent to help formalize a lemma.
In most tools the file just changes.
You are left diffing from memory.
Turn does not do that.

### Visual notes

Generic "file updated" toast (mock) vs Turn editor with pending change banner.
Stay calm — name the UX problem, not a competitor.

# Scene 2: Pending changes bar

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1

<!--
duration: 10
allow-script-change: false
-->

The agent workbench shows pending changes before anything is final.
I can see how many blocks are waiting and open the preview.

### Visual notes

Agent workbench → pending changes bar → list of proposed blocks with titles.
Use a small real `.turn` file edit if available.

# Scene 3: Inline Keep / Reject

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1

<!--
duration: 14
allow-script-change: false
-->

In the editor, removed text is highlighted like a git diff.
Each block has Keep and Reject right on the line.
I read the tactic change, reject the wrong branch, keep the one that closes the goal.
Nothing else in the file moves without my click.

### Visual notes

Monaco with red/green preview zones → click Reject on one block → click Keep on another → file settles.
Zoom on one block; do not scroll through a huge patch.

# Scene 4: Tie back to formalization

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1

<!--
duration: 10
allow-script-change: false
-->

Formalization is already hard.
The agent can search the library and suggest a patch.
But the verifier and you stay in charge — the edit is a proposal until you keep it.

### Visual notes

Proof panel goal unchanged until Keep → then tactic line updates and checker runs.
Optional: agent timeline panel in background.

# Scene 5: Close

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1

<!--
duration: 7
allow-script-change: false
-->

So trustworthy AI math needs previews, not surprises.
Try the workbench, and tell me what theorem you want the agent to formalize next.

### Visual notes

Workbench + outline of a real AATA theorem.
CTA: sign up, comment your theorem.

