---
videoOps: 1
scriptId: syntax-06-tactic-status-during-replay
title: syntax_06_tactic_status_during_replay
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: Replay without guessing

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Replay without guessing

<!--
duration: 8
allow-script-change: false
-->

Hi friends, welcome back.
Proof-slide lets you walk a proof like slides.
But you still need to know: did this tactic actually work?
Turn shows that on the step itself.

### Visual notes

Proof-slide on symmetric-halves theorem — forward one tactic.
Open from published tactics video file if possible.

# Scene 2: Status banner

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Status banner

<!--
duration: 10
allow-script-change: false
-->

At each step there is a status line — closed goal, branch fork, error detail.
I am not inferring from the goal panel alone.
The slide tells me what the checker thought.

### Visual notes

`ProofSlideTacticStatusBanner` visible after stepping `split_conjunction` or `assume`.
Pause on one step long enough to read the banner.

# Scene 3: Trials show failure honestly

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Trials show failure honestly

<!--
duration: 12
allow-script-change: false
-->

When I reach a `#!` trial arm that does not close, the badge shows it failed.
That is the point — I keep the dead branch in the file and I see it in replay.
Compare with the surviving branch on the main line.

### Visual notes

Step into a trial arm → failure status → step back to main arm → success status. Branch map optional in corner.
Do not delete trials on camera — show them folded or marked failed.

# Scene 4: Close

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Close

<!--
duration: 6
allow-script-change: false
-->

So proof-slide is a study tool.
Status on every step — like a TA who tells you if the move actually worked.

### Visual notes

Tactic chips with badges + banner on final QED step.
CTA: try proof-slide on your library theorem.

