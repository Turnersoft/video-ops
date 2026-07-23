# A Rule That Gives Two Answers Is Not Legitimate

Playlist: pitfalls of formal method

Title: A Rule That Gives Two Answers Is Not Legitimate

Promotional description: Formal work forces you to ask “is this rule even well-posed?” before you prove anything. Turn names that check in the chapter — one input cannot map to two outputs.

Status: Script

Education core: L0–L1
Education refresh: L0 (one input, two outputs story)
Education work: L5 (lookup tables, constitutive laws)
Education horizon: L2 (only well-posed relations become functions)
Patience: short (90 s)
Work link: constitutive map ambiguity
Primary audience: Self-learners, STEM students, simulation engineers

Hook type: experience → turn-wedge → math-confirm
Turn wedge: well-posedness as a named property before “function”

Series order: pitfalls of formal method #4

Builds on: syntax-07-function-refines-well-defined-relation

Clip source: published/2026-6-17-  1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang.md (3:40–4:05, reframe)

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (`Relation.well_defined`)

## Core Idea

The pitfall is treating “well-defined” as pedantry. In formal methods it is the gate: a rule must not assign two answers to one input. Turn makes that gate a checkable property you see before anything is called a function.

## Scene 1: The experience

Duration: 20s

Say:

> Hi friends, welcome back.
> Imagine I give you a rule and call it a function.
> You test it on one example, and it gives a nice answer.
> But then the same input shows up in a different disguise, and the rule gives a different answer.
> A calculator would not know which answer to trust.
> A proof checker should not know either.
> This is why “well-defined” is not a teacher being picky — it is the gate before the word function is even legal.

Show on screen:

Whiteboard: same input via two labels → two outputs (classic half vs two-fourths story, no jargon).

Visual notes:

Use 1/2 = 2/4 only as the picture, not as a rational-number lecture. Industry viewers: same beat for tabulated material data.

## Scene 2: The Turn wedge

Duration: 12s

Say:

> Turn-Lang does not bury that in a footnote.
> On `Relation` there is a named property: for each input, there exists a unique output in the relation.
> Only after that passes do we refine to `Function`.
> The checker can reject the rule before you waste a proof.

Show on screen:

```turn
        well_defined: Prop {
            forall a in A,
            exists unique b in B
            |- { [a b] in self; }
        }
```

Outline: `Relation` → `well_defined` → `Function` refines relation.

Visual notes:

Side-by-side trap and property.

## Scene 3: Work beat and close

Duration: 10s

Say:

> Same class of bug in simulation — two strain paths that should be the same state returning different stresses.
> Formal methods make you name the obligation up front.
> Link to the full formalization in the description.

Show on screen:

Return to `well_defined` block.

Visual notes:

L5 one sentence; short subscribe CTA.

## Final Takeaway

Formal work starts with legitimacy — Turn’s `well_defined` property is the check that one input cannot get two answers.

## Audience lanes

- **L0 / Refresh:** one input, two outputs — shareable without symbols.
- **L1 Core:** connect story to `exists unique b`.
- **L2:** see `Function` as refinement of a well-posed relation.
- **L5 Work:** constitutive / table ambiguity.
- **Self-learners:** “textbooks hand-wave this — formal work does not.”
- **Educators:** motivate well-posedness before definitions.
