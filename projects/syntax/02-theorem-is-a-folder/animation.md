---
videoOps: 1
scriptId: 02-theorem-is-a-folder
title: syntax_02_theorem_is_a_folder
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: Open basic set

<!--
layout: code-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Open basic set

<!--
duration: 8
focus: turn
allow-script-change: false
-->

Hi friends, welcome back.
So here is `"basic set"` in the chapter we have been building.
It is one theorem, but look at the shape.
`p1` holds several identities, each with its own proof block.

### Turn

```turn
theorem "basic set" {
    forall A B C: Set<Any> |- {
        p1: {
            first: SetEq(Union(A, A), A) proof { ... };
            second: SetEq(Intersect(A, A), A) proof { ... };
            ...
        };
        ...
    }
}
```

Highlights:

- `p1`
- `first`
- `second`

### Visual notes

Use outline panel if available to show nested symbols.

turn-ide track: tracks/scene-1-ide.json

# Scene 2: Navigate like a folder

<!--
layout: beat-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1: Navigate like a folder

<!--
duration: 10
allow-script-change: false
-->

I do not scroll through fifty lines to find the second identity.
I click `second` in the outline.
Each leaf is a small proof file inside the big theorem.

### Visual notes

Click `second` under `p1` in outline. Jump editor to that proof block (`unfold Intersect.def`).
Show cursor landing inside `second` proof only.

# Scene 3: Close

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

So think of a big theorem as a folder.
Turn-Lang already names the tabs for you.

### Visual notes

Outline tree with `basic set` expanded.
Short close.

