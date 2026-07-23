# You Cannot Name an Object the Proof Has Not Given You

Playlist: pitfalls of formal method

Title: You Cannot Name an Object the Proof Has Not Given You

Promotional description: Treating “witness” as “pick any element” is a common trap. Turn ties `witness … for x in h` to the existential you already earned — unpack the receipt, do not invent the object.

Status: Script

Education core: L1
Education refresh: L0 (receipt vs invention metaphor)
Education work: none
Education horizon: L2 (sound existential elimination)
Patience: short (90 s)
Work link: none
Primary audience: Proof students, self-learners

Hook type: experience → turn-wedge → math-confirm
Turn wedge: `witness … for x in h` ties unpack to the hypothesis

Series order: pitfalls of formal method #2

Builds on: pitfalls-01-surjective-quantifier-order

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (`disjoint` branch of Judson 1.25 proof)

## Core Idea

The pitfall is typing a witness line as creative writing. Formal methods only let you name what a prior step promised. Turn’s witness form ties the new name to the hypothesis that carried the existential.

## Scene 1: The experience

Duration: 20s

Say:

> Hi friends, welcome back.
> Suppose a proof says: there exists someone in this room with a receipt.
> If I now say “let that person be w,” I am not inventing a new person.
> I am unpacking the existence statement I already had.
> But when you are writing proof scripts, it is very tempting to type a fresh name and move on.
> The proof looks like it progressed.
> In reality, you named a ghost unless some earlier hypothesis actually promised that witness.

Show on screen:

Generic proof scratch: `witness w` with no prior `exists` — optional error/diagnostic if available.

Visual notes:

Receipt/person metaphor first. No Judson chapter number in the hook.

## Scene 2: The Turn wedge

Duration: 12s

Say:

> In Turn-Lang, witness is unpack, not provide.
> You specialize a theorem you already have into a hypothesis.
> Then `witness hRep.witness for x in hRep` says: take the witness the hypothesis already promised and bind the variable it was about.
> No hypothesis, no witness line.

Show on screen:

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

Visual notes:

Zoom witness pair lines after specialize.

## Scene 3: Math confirm and close

Duration: 8s

Say:

> The partition proof in this chapter does the same thing twice.
> Witness means unpack the receipt, not invent the object.
> Subscribe for more traps formal work catches early.

Show on screen:

Both witness lines highlighted.

Visual notes:

End in file.

## Final Takeaway

Witness in formal work unpacks an existential you already earned — Turn’s `for x in h` syntax makes that binding explicit.

## Audience lanes

- **L0 / Refresh:** receipt vs invention — no file required to understand hook.
- **L1 Core:** read specialize → witness chain.
- **L2:** sound existential elimination in a real proof.
- **Proof-assistant users:** invented binders vs hypothesis-linked witnesses.
- **Self-learners:** “the tool refused my ghost name” as a feature.
