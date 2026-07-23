# Keep Assumptions Local — and Keep the Theorem Together

Playlist: turn-lang syntax highlight

Title: Keep Assumptions Local — and Keep the Theorem Together

Promotional description: Turn keeps related results in one theorem block while an extra assumption stays attached only to the statement that needs it. One `assume` brings that premise into the local proof context — cleaner source, faster review, and less maintenance.

Status: Script

Education core: L1–L2
Education refresh: L0 (shared assumptions versus one local exception)
Education work: none
Education horizon: L3 (theorem-folder navigation from syntax-12)
Patience: short (1 min)
Primary audience: Proof-assistant users, formalization teams, educators

Hook type: professional workflow → syntax wedge → local proof context → payoff
Turn wedge: `(abelian)G ->` stays on one leaf; `assume hAbelian` introduces it locally

Series order: turn-lang syntax highlight #13

Builds on: syntax-12-composition-theorem-four-leaves

Reference excerpt: `reference/exponent-3-23.turn`

## Core Idea

Professional formalization should make scope obvious at a glance. Turn writes the shared context once, keeps related results as named leaves, and attaches `(abelian)G ->` only to the exceptional leaf. In its proof, `assume hAbelian` introduces the premise locally. The payoff is less setup for the author, faster comprehension for reviewers, and no accidental strengthening of the other results.

## Scene 1: Scope should be obvious

Duration: 12s

Say:

> Professional formalization should make scope obvious before anyone reads the proof.
> Here, several related results belong in one theorem block, but only the final result needs an additional assumption.
> Turn keeps that dependency local.
> No duplicated declarations, no stronger context than necessary, and no time wasted tracing where an assumption came from.

Show on screen:

One shared theorem header with four named leaves; only the final leaf carries an “additional assumption” badge.

Visual notes:

Lead with professional source design, not the mathematical content.

## Scene 2: Read the dependency at a glance

Duration: 16s

Say:

> Look at the shape of the source.
> The shared context is written once, and each result is a named leaf.
> Only `abelian_distrib` carries `(abelian)G ->`.
> A reviewer sees the dependency immediately — without opening another theorem, comparing headers, or scanning a long proof.
> The syntax communicates scope before implementation begins.

Show on screen:

```turn
theorem "3.23 exponentiation on group" {
    forall G: Group,
    forall g h in G,
    forall m n: Integer
    |- {
        gm_plus_gn:
            G.op.apply([G.exponent(g, m), G.exponent(g, n)]) = G.exponent(g, m+n);
        power_tower:
            G.exponent(G.exponent(g, m), n) = G.exponent(g, m*n);
        product_inverse:
            G.exponent(G.op.apply([g, h]), n)
            = G.exponent(G.op.apply([G.inverse.apply(h), G.inverse.apply(g)]), -n);
        abelian_distrib:
            (abelian)G -> G.exponent(G.op.apply([g, h]), n)
            = G.op.apply([G.exponent(g, n), G.exponent(h, n)]);
    }
}
```

Highlight the shared quantifiers once, then `(abelian)G ->` on `abelian_distrib`.

Visual notes:

Outline shows four named leaves inside one theorem folder. Keep equation bodies visually secondary.

## Scene 3: Keep general proofs general

Duration: 11s

Say:

> Open any of the first three leaves and the context stays general: `G` is a `Group`, nothing more.
> That keeps proof search focused and the context panel quiet.
> It also means a future change to the special case cannot accidentally tighten the assumptions of the general results.

Show on screen:

Proof-slide on one general leaf. Context rows show `G: Group` and the shared variables; no `(abelian)G`.

Visual notes:

Briefly switch between two general leaves; the context stays unchanged.

## Scene 4: Introduce the premise locally

Duration: 12s

Say:

> When we reach the final leaf, the implication is handled with one line: `assume hAbelian`.
> That cleanly brings the extra premise into this proof’s local context — and nowhere else.
> No duplicated setup. No manual cleanup.
> The assumption appears at exactly the point where it becomes useful.

Show on screen:

```turn
abelian_distrib:
    (abelian)G -> ...
    proof {
        assume hAbelian
        ...
    };
```

Highlight `(abelian)G ->`, then `assume hAbelian`.

Visual notes:

Contrast the context before and after `assume hAbelian`. Breadcrumb: `3.23 exponentiation on group › abelian_distrib`.

## Scene 5: Close

Duration: 9s

Say:

> This small syntax choice has a large maintenance payoff.
> Related results stay together. Exceptional assumptions stay local. Each proof receives only the extra assumptions declared on its leaf.
> Less setup for the author, faster comprehension for the reviewer, and cleaner evolution for the library.

Show on screen:

One block → one local premise → the extra context appears exactly where it applies.

Visual notes:

Finish on the source and context panel, not a logo.

## Final Takeaway

Turn keeps related results together without broadening their shared context: the exceptional premise stays on one leaf and enters that proof through one explicit `assume`.

## Audience lanes

- **L0 / Refresh:** shared assumptions versus one local exception.
- **L1–L2 Core:** read one block; locate inline `(abelian)G ->`.
- **L3:** implication introduction with `assume hAbelian`.
- **Formalization teams:** faster review and safer maintenance.
- **Educators:** demonstrate precise scope without teaching the theorem itself.
- **Visual learners:** context panel diff before and after `assume`.
