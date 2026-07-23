---
videoOps: 1
scriptId: 01-trial-is-not-continuation
title: syntax_01_trial_is_not_continuation
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: Open the proof with trials

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Open the proof with trials

<!--
duration: 8
allow-script-change: false
-->

Hi friends, welcome back.
So this is a real proof in our AATA library, symmetric halves of an asymmetric difference.
You will see `#!` markers in the script. Those mark trial branches.

### Visual notes

Open the theorem starting at line 153. Show the `split_conjunction` proof with multiple `#!` lines.
Use proof-slide or branch map if available.

# Scene 2: Parallel proofs at the same fork

<!--
layout: code-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Parallel proofs at the same fork

<!--
duration: 12
focus: turn
allow-script-change: false
-->

Here is the idea.
At this fork I already have a default proof line.
When I add `#!`, I am plugging in another proof in parallel.
Same goal, different strategy — maybe `assume` and `split`, maybe `contradiction`.
I keep both in the file so I can compare them, fold the failed one, and move on.

### Turn

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

Highlights:

- `split_conjunction`
- `#!`

### Visual notes

Show branch map with default arm and trial arms side by side (`1`, `1#1`, `1#2`). Point out trials are parallel slots, not indented children of the last tactic.

turn-ide track: tracks/scene-2-ide.json

# Scene 3: Not a continuation of the line above

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Not a continuation of the line above

<!--
duration: 9
allow-script-change: false
-->

One mistake people make: they think the trial continues the tactic right above it.
It does not.
The trial is its own parallel proof from the same fork point.
That is why proof-slide lays trials beside the main rail, not underneath the previous step.

### Visual notes

Branch map focused on one fork: main column down, trial columns to the right on the same row.
Contrast a nested split subgoal (`1.1`) with a trial label (`1#1`).

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

So `#!` is for keeping experiments.
Plug in multiple proofs, compare them, keep the winner.
That is how we explore without throwing away the work.

### Visual notes

Fold failed trials command or collapsed trial block in the editor, main proof still visible.
End on branch map or folded trials, not a title card.

