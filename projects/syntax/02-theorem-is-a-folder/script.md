# Your Theorem Is a Folder of Named Claims

Playlist: turn-lang syntax highlight

Title: Your Theorem Is a Folder of Named Claims

Promotional description: The real `"basic set"` theorem in AATA is one statement with named leaves `p1`, `first`, `second` — navigate like a folder, not one wall of text.

Status: Idea

Audience: Students, instructors building multi-part lemmas

Series order: turn-lang syntax highlight #2

Builds on: syntax-01-trial-is-not-continuation

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn` (theorem `"basic set"`)

## Core Idea

Multi-part set identities are one theorem with named subclaims. Turn-Lang's outline and proof navigation treat `p1.first`, `p1.second`, etc. as leaves you can jump to — shown in the real Judson sets formalization.

## Scene 1: Open basic set

Duration: 8s

Say:

> Hi friends, welcome back.
> So here is `"basic set"` in the chapter we have been building.
> It is one theorem, but look at the shape.
> `p1` holds several identities, each with its own proof block.

Show on screen:

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

Visual notes:

Use outline panel if available to show nested symbols.

## Scene 2: Navigate like a folder

Duration: 10s

Say:

> I do not scroll through fifty lines to find the second identity.
> I click `second` in the outline.
> Each leaf is a small proof file inside the big theorem.

Show on screen:

Click `second` under `p1` in outline. Jump editor to that proof block (`unfold Intersect.def`).

Visual notes:

Show cursor landing inside `second` proof only.

## Scene 3: Close

Duration: 6s

Say:

> So think of a big theorem as a folder.
> Turn-Lang already names the tabs for you.

Show on screen:

Outline tree with `basic set` expanded.

Visual notes:

Short close.

## Final Takeaway

The real `"basic set"` theorem is a folder of named claims you can jump to individually.
