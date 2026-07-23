---
videoOps: 1
scriptId: 02-witness-is-unpack-not-provide
title: pitfalls_02_witness_is_unpack_not_provide
format: landscape
fps: 30
width: 1920
height: 1080
---

# Scene 1: The experience

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
duration: 20
allow-script-change: false
-->

Hi friends, welcome back.
Suppose a proof says: there exists someone in this room with a receipt.
If I now say “let that person be w,” I am not inventing a new person.
I am unpacking the existence statement I already had.
But when you are writing proof scripts, it is very tempting to type a fresh name and move on.
The proof looks like it progressed.
In reality, you named a ghost unless some earlier hypothesis actually promised that witness.

### Visual notes

Generic proof scratch: `witness w` with no prior `exists` — optional error/diagnostic if available.
Receipt/person metaphor first. No Judson chapter number in the hook.

# Scene 2: The Turn wedge

<!--
layout: code-focus
burn-captions: true
teleprompter.position: below-canvas
pace.syllables-per-second: 3.6
pace.pause-after-beat: 0.4
pace.min-beat-seconds: 4
pace.pace-factor: 1.25
-->

## Beat 1

<!--
duration: 12
focus: turn
allow-script-change: false
-->

In Turn-Lang, witness is unpack, not provide.
You specialize a theorem you already have into a hypothesis.
Then `witness hRep.witness for x in hRep` says: take the witness the hypothesis already promised and bind the variable it was about.
No hypothesis, no witness line.

### Turn

```turn
disjoint {
    ...
    specialize Classes.1 for C as A into hRepA
    witness hRepA.witness for x in hRepA
    specialize Classes.1 for C as B into hRepB
    witness hRepB.witness for x in hRepB
    ...
}
```

Highlights:

- `witness hRepA.witness for x in hRepA`
- `witness hRepB.witness for x in hRepB`

### Visual notes

Zoom witness pair lines after specialize.

turn-ide track: tracks/scene-2-ide.json

# Scene 3: Math confirm and close

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
duration: 8
allow-script-change: false
-->

The partition proof in this chapter does the same thing twice.
Witness means unpack the receipt, not invent the object.
Subscribe for more traps formal work catches early.

### Visual notes

Both witness lines highlighted.
End in file.

