# Saying It Exists Is Still a Claim You Owe the Checker

Playlist: pitfalls of formal method

Title: Saying It Exists Is Still a Claim You Owe the Checker

Promotional description: Textbooks often assume a structure is consistent. Formal methods separate “the laws of a witness type” from “you actually have a witness” — Turn makes existence a proposition the checker can challenge.

Status: Script

Education core: L1–L2
Education refresh: L0 (hope vs proof — plain language)
Education work: L5 (invertible calibration / solver blow-up tease)
Education horizon: L3–L4 (axiom vs theorem, consistency)
Patience: short (2 min)
Work link: invertible material calibration
Primary audience: Students past first proofs, self-learners

Hook type: experience → turn-wedge → math-confirm
Turn wedge: `exists` on a structure is a claim you may still need to prove

Series order: pitfalls of formal method #5

Builds on: syntax-11-laws-vs-properties-inside-structures

Clip source: published/2026-6-17-  1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang.md (12:34–14:20, trim empty-set tangent, reframe)

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (`Function.invertible`, `InverseFunction`)

## Core Idea

The pitfall is smuggling hope into a definition. “There is an inverse” is not the same as listing composition laws — existence is a claim you may still need to prove. Turn splits witness type laws from the existence proposition.

## Scene 1: The experience

Duration: 20s

Say:

> Hi friends, welcome back.
> The textbook says: let g be the inverse of f.
> On paper that line costs nothing.
> But “there is an inverse” is a real claim — with laws attached.
> If f is not invertible, you cannot smuggle g in for free.
> Formal work makes you earn that sentence or reject it.

Show on screen:

Generic: “assume inverse exists” on whiteboard → red question mark. No tool names.

Visual notes:

L5 tease: calibration inverse that fails at runtime — one line optional.

## Scene 2: The Turn wedge

Duration: 14s

Say:

> Turn-Lang splits the job on purpose.
> One place defines what an inverse *would* satisfy — the composition laws.
> Another place on the map only says: there exists such an inverse for *this* map.
> Exists means you are claiming you can instantiate that structure and the laws check.
> That is a proposition — not a silent axiom in the header.

Show on screen:

Outline: `InverseFunction` structure (laws) separate from `Function.invertible` property (`exists`).

```turn
        invertible: Prop {
            |- exists InverseFunction<self>
        }
```

Zoom `InverseFunction` `laws { def { ... } }` briefly.

Visual notes:

Arrow: laws on witness type, claim on function.

## Scene 3: Math confirm and close

Duration: 12s

Say:

> In this chapter, invertible is a property; the inverse is a structure with composition laws.
> Exists means you still owe a witness that checks.
> Full walkthrough in the description.

Show on screen:

`theorem "invertible mapping must be injective"` header only — do not prove live.

Visual notes:

Tease algebra-02 / pitfalls-02.

## Final Takeaway

Existence in formal work is a claim with a witness type behind it — Turn keeps laws and `exists` separate so consistency cannot hide in a definition.

## Audience lanes

- **L0 / Refresh:** hope vs proof — no symbols required in hook.
- **L1–L2 Core:** read split between property and structure laws.
- **L3–L4 Horizon:** axiom vs theorem, consistency checking.
- **L5 Work:** invertible calibration / Jacobian (one inspiring line).
- **Self-learners:** “the checker is on your side when you assumed too much.”
