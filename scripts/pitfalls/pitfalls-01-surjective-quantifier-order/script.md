# Formal Work Punishes What You Thought the Definition Said

Playlist: pitfalls of formal method

Title: Formal Work Punishes What You Thought the Definition Said

Promotional description: In lecture you memorize a definition in words. In formal work, quantifier order *is* the definition — and Turn keeps that contract in the chapter file where you can read it.

Status: Script

Education core: L0–L1
Education refresh: L0 (forall/exists order in plain language)
Education work: L5 (every output needs a driving input — one line)
Education horizon: L2 (same pattern in later proofs)
Patience: short (90 s)
Work link: none
Primary audience: First-year proof students, self-learners

Hook type: experience → turn-wedge → math-confirm
Turn wedge: surjective definition visible in the chapter file

Series order: pitfalls of formal method #1

Builds on: none (entry clip)

Clip source: published/2026-6-17-  1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang.md (4:38–5:11, reframe)

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (`Function` structure, `surjective` property)

## Core Idea

The pitfall is trusting a verbal shorthand. Formal methods bind you to the exact order and placement of quantifiers. Turn’s wedge: the contract sits in a named property block you read before writing tactics — the file is the referee.

## Scene 1: The experience

Duration: 20s

Say:

> Hi friends, welcome back. This is Turner.
> Suppose I say every room in a hotel has a guest.
> That does not mean every guest has their own room.
> The order of “for every” and “there exists” changes the picture.
> This is the same trap in proof courses.
> We remember a definition in English — “onto,” “covers everything” — but formal work asks for the exact quantifier direction.
> If that direction is wrong, you are not a little wrong. You are proving a different statement.

Show on screen:

Hotel rooms / guests sketch, then a generic checker mismatch.

Visual notes:

Empathy beat — “this happens to everyone.” Keep the hotel example visual and fast.

## Scene 2: The Turn wedge

Duration: 14s

Say:

> In Turn-Lang the definition is in the file next to the function — not buried in tactic output.
> Open surjective and read the quantifiers before you prove.
> That block is the contract.

Show on screen:

Scroll to `structure Function` → `@notation(adjective)` → `surjective: Prop` block (do not open with this).

Visual notes:

Highlight that definitions live beside the structure, not only in memory.

## Scene 3: Math confirm (one example)

Duration: 10s

Say:

> Here is how surjective is written in this chapter.
> For every output in the range, there exists an input hitting it — b first, then a.
> Swap that order and you are proving a different theorem.
> Later proofs unfold this exact block at the goal.

Show on screen:

```turn
surjective: Prop {
    forall b in range,
    exists a in domain
    |- apply(a) = b
}
```

Brief flash: `unfold Function.surjective at goal` in `"composition's rules"`.

Visual notes:

Math is receipt, not lecture.

## Scene 4: Close

Duration: 6s

Say:

> So before tactics: read the named property in the file.
> Full chapter in the description. Subscribe for more pitfalls where formal work catches traps early.

Show on screen:

Return to `surjective: Prop`.

Visual notes:

Short close.

## Final Takeaway

Formal methods bind you to the definition in the source — Turn keeps that contract visible so quantifier order cannot hide in your memory.

## Audience lanes

- **L0 / Refresh:** forall/exists swap in plain language — no symbol pile-up.
- **L1 Core:** read adjective block before proving.
- **L2:** see the same law unfolded in a real proof.
- **L5 Work:** every output DOF needs a driving input (optional one line).
- **Self-learners:** “not your fault — lecture shorthand is lossy.”
