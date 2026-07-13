# 1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang

Playlist: abstract algebra: formalized from scratch with turn-lang

Title: 1.2 Functions, Relations, and Equivalence — formalized from scratch with Turn-Lang

Promotional description: Part two of AATA Chapter 1 — Cartesian products, mappings, composition, inverses, equivalence relations, partitions, and Theorem 1.25, formalized in the same Turn-Lang file as video 1.1. Full source in the description link.

Status: Published

Published: 2026-6-17-  1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang.md

Audience: Abstract algebra students following the AATA playlist, Turn-Lang beginners who finished 1.1 Sets

Series order: abstract algebra: formalized from scratch with turn-lang #3

Builds on: (published) 2026-5-26-  1.1 Sets: Abstract Algebra formalized from scratch with Turn-Lang

Source file: `language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn`

Textbook source: `language_server/examples/AATA/aata/src/sets.xml` — subsections *Cartesian Products and Mappings* and *Equivalence Relations and Partitions*

## Core Idea

Same file as video 1.1 (`02_sets_and_equivalence_relations.turn`). Video 1.1 covered sets through De Morgan. This video follows section 1.2 in textbook order: products, relations, functions, well-definedness, injective/surjective/bijective, composition, identity and inverses, then equivalence, partition, equivalence class, Theorem 1.25. Skip matrix, ℝⁿ, and calculus examples — they belong to later chapters.

## Scene 1: Pick up where 1.1 stopped

Duration: 12s

Say:

> Hi friends, welcome back. This is Turner.
> In video 1.1 we formalized sets in this file — union, intersection, De Morgan, all of that.
> Now we pick up in the same Turn-Lang file and finish section 1.2 of the book.
> The full source is in the description link if you want to follow along.

Show on screen:

Open `02_sets_and_equivalence_relations.turn`. Scroll past the set-algebra block to `CartesianProduct`.

Visual notes:

Title card at open: **1.2 Functions, Relations, and Equivalence**. Not on the final slide.

## Scene 2: Follow the textbook subsection

Duration: 12s

Say:

> Same workflow as 1.1.
> Open `sets.xml` at *Cartesian Products and Mappings*.
> Mark each bold term as we go: new structure, relation, or property on something we already have?
> We follow the book’s order and skip examples that need matrices, ℝⁿ, or calculus.

Show on screen:

`sets.xml` subsection `sets-subsection-cartesian-products`. Sidebar defer: linear maps, inverse matrices, equivalent matrices, ℝ³.

Visual notes:

Split screen: XML left, turn file tab right.

## Scene 3: Cartesian product

Duration: 20s

Say:

> The book starts with the Cartesian product.
> A times B is the set of ordered pairs — take one element from A, one from B, pair them up.
> In Turn-Lang that is `CartesianProduct`.
> The `for i in 1..n` block lists the factor sets A₁ through Aₙ.
> `@notation(chain(...))` renders them as A₁ × A₂ × … in math.
> For the binary case — a relation from A to B — note we can just use an array: `CartesianProduct<[A, B]>`, same structure, n equals two.

Show on screen:

```turn
@notation(chain({A_{i}}, " × "))
structure CartesianProduct<n: Int, for i in 1..n [A_{i}: Set<Any>]>: Set<Any> {
    laws {
        def {
            forall x_{i} in A_{i} |- [x_{i}] in self
        }
    }
}
```

Visual notes:

Highlight `for i in 1..n`, `@notation(chain`, and `CartesianProduct<[A, B]>` callout.

## Scene 4: ℝⁿ waits for Tao

Duration: 8s

Say:

> The book then mentions ℝ cubed as an example of Aⁿ.
> Real numbers are their own formalization — Tao Analysis in our library, in a later video.
> Here we keep the generic `CartesianProduct` pattern.

Show on screen:

`sets.xml` ℝ³ sentence. Turn file cursor on `CartesianProduct`.

Visual notes:

Sticky note: Tao real analysis — next video in that playlist.

## Scene 5: Relations

Duration: 16s

Say:

> Next, we have relations.
> Think of a bag of ordered pairs — each pair picks something from A and something from B.
> The book says that is a subset of A times B.
> In Turn-Lang, `Relation` is itself a `Set` — and the `subset` law says every member of self must already be a pair in `CartesianProduct<[A, B]>`.
> So the law is really a membership rule: nothing outside A × B can sneak in.

Show on screen:

```turn
structure Relation<A B: Set<Any>>: Set<Any> {
    laws {
        subset {
            |- Subset(self, CartesianProduct<[A, B]>)
        }
    }
```

Visual notes:

Show math render of ⊆ A × B. Animate `[a b] in self` → pair in A × B.

## Scene 6: Functions as mappings

Duration: 18s

Say:

> A function is not a separate species — it is a relation that behaves like a machine.
> Feed in a, get exactly one b back; the pair [a b] is in the relation.
> Turn-Lang puts the uniqueness check on `Relation` as `well_defined`, then `Function` refines `(well_defined)Relation`.
> Instead of writing pairs by hand, we write f(a) — that is `apply` when you plug in a specific element a from the domain.

Show on screen:

```turn
    properties {
        well_defined: Prop {
            forall a in A,
            exists unique b in B
            |- { [a b] in self; }
        }
    }

@notation({self} ~ " from " ~ {domain} ~ " to " ~ {range})
structure Function<domain range: Set<Any>>: (well_defined)Relation<domain, range> {
    @notation( {self} ~ "(" ~ {a} ~ ")" )
    apply(a: domain): range,
```

Visual notes:

Flash `sets-figure-mappings` — f is a mapping, g is not. Highlight `apply(a: domain)`.

## Scene 7: Well-defined

Duration: 14s

Say:

> The book’s classic trap is f(p/q) equals p on rationals.
> One half and two fourths are the same input, but the rule would output 1 and 2 — two different answers for one number.
> That is what “not well-defined” means in plain language: one input, more than one output.
> Our `well_defined` property formalizes exactly that — for each a, exists unique b with [a b] in the relation.
> We do not need polynomial syntax in this video; the property already carries the intuition.

Show on screen:

`well_defined` block on `Relation`. Cross out f(p/q) paragraph in XML.

Visual notes:

Side-by-side: ambiguous outputs vs unique b.

## Scene 8: Onto, one-to-one, bijective

Duration: 18s

Say:

> Next the book defines onto, one-to-one, and bijective maps.
> In Turn-Lang these live in a `properties` block on `Function` — adjectives you can attach to a map, not the `Subset` relation from video 1.1.
> Surjective: for every b in the range, some a maps to it — forall b, then exists a.
> Injective: distinct inputs give distinct outputs.
> Bijective bundles surjective and injective.
> The `domain_def` law says apply(a) always lands in the range.

Show on screen:

```turn
    properties {
        @notation(adjective)
        surjective: Prop {
            forall b in range,
            exists a in domain
            |- apply(a) = b
        }
        @notation(adjective)
        injective: Prop {
            forall a_1 a_2 in domain
            |- a_1 != a_2 -> apply(a_1) != apply(a_2)
        }
        @notation(adjective)
        bijective: (surjective, injective)
        ...
    }
    laws {
        domain_def {
            forall a in domain |- apply(a) in range
        }
    }
```

Visual notes:

Pause on surjective quantifier order.

## Scene 9: Composition

Duration: 10s

Say:

> The book defines composition next: f from A to B, g from B to C, and (g ∘ f)(x) equals g(f(x)).
> Turn-Lang: structure `Composition` — when you `apply` on a specific x, you run f first, then g.

Show on screen:

```turn
@notation({g} ~ " ∘ " ~ {f})
structure Composition<A B C: Set<Any>, f: Function<A, B>, g: Function<B, C>>: Function<A, C> {
    apply(domain: A): C
    laws {
        def {
            forall x in A
            |- apply(x) = g.apply(f.apply(x))
        }
    }
}
```

Visual notes:

Flash `sets-figure-composition` from XML.

## Scene 10: Skip to the composition theorem

Duration: 10s

Say:

> The book inserts linear maps, permutations, and polynomial composition examples here.
> We skip those — linear maps wait for vector spaces, permutations for chapter five.
> What comes next is the theorem on composition: associative, and injective, surjective, bijective preserved under composition.

Show on screen:

Defer list in sidebar. Jump in XML to the composition theorem. Turn file on `theorem "composition's rules"`.

Visual notes:

Optional informal {1,2,3} permutation picture only.

## Scene 11: Composition theorem

Duration: 14s

Say:

> In Turn-Lang this is one theorem folder: `"composition's rules"`.
> Four leaves — associative, injective, surjective, bijective — each with its own proof block.
> Same pattern as `"basic set"` in video 1.1.

Show on screen:

```turn
theorem "composition's rules" {
    forall A B C D: Set<Any>,
    forall f: Function<A, B>,
    forall g: Function<B, C>,
    forall h: Function<C, D>,
    |- {
        associative: ... proof { intro x in A; ... };
        injective: ... proof { ... };
        surjective: ... proof { ... };
        bijective: ... proof { ... };
    }
}
```

Visual notes:

Outline panel: composition's rules → four leaves.

## Scene 12: Identity and inverse

Duration: 18s

Say:

> The book defines the identity map id_S and then an inverse g with g ∘ f and f ∘ g both identity.
> Turn-Lang splits this cleanly.
> `IdentityFunction` — id_S sends s to itself.
> On `Function`, the `invertible` property just says there exists an `InverseFunction`.
> The actual composition laws live inside `InverseFunction` — that structure is the witness type the property asks for.

Show on screen:

```turn
@notation("id"_{S})
structure IdentityFunction<S: Set<Any>>: Function<S, S> { ... }

        invertible: Prop {
            |- exists InverseFunction<self>
        }

structure InverseFunction<A B: Set<Any>, f: Function<A, B>>: Function<B, A> {
    laws {
        def {
            |- {
                Composition<self, f> = IdentityFunction<B>;
                Composition<f, self> = IdentityFunction<A>;
            }
        }
    }
}
```

Visual notes:

Arrow from `exists InverseFunction` to the structure’s `def` block.

## Scene 13: Invertible iff bijective

Duration: 10s

Say:

> Next theorem in the book: a map is invertible if and only if it is one-to-one and onto.
> Turn-Lang: `"invertible mapping must be injective"` — invertible iff injective and surjective.
> The proof is in the file; we will not read every tactic in this video.

Show on screen:

```turn
theorem "invertible mapping must be injective" {
    forall f: Function
    |- (invertible)f <-> (injective, surjective)f
} proof { ... }
```

Visual notes:

Scroll proof header only; share link for full walkthrough.

## Scene 14: Equivalence Relations and Partitions

Duration: 10s

Say:

> Now we open the second subsection: *Equivalence Relations and Partitions*.
> Same turn file, new topic — relations on one set X, not maps between two sets.
> We follow the book again and skip fraction, derivative, and matrix examples.

Show on screen:

`sets.xml` subsection `sets-subsection-equivalence-relations`. Turn file on `EquivalenceRelation`.

Visual notes:

Clear transition — different subsection, not “the next chunk in the file.”

## Scene 15: Equivalence relation

Duration: 14s

Say:

> The book defines an equivalence relation on X: reflexive, symmetric, transitive.
> Turn-Lang: `EquivalenceRelation` refines `Relation<X, X>` — always one ambient set, pairs from X × X.
> The `basic` law packages all three properties in one block.

Show on screen:

```turn
structure EquivalenceRelation<X: Set<Any>>: Relation<X, X> {
    laws {
        basic {
            forall x y z in X
            |- {
                reflexive: [x x] in self;
                symmetric: [x y] in self -> [y x] in self;
                transitive: ([x y] in self and [y z] in self) -> [x z] in self;
            }
        },
```

Visual notes:

Match the book’s bullet list on screen.

## Scene 16: Examples we defer

Duration: 8s

Say:

> Equivalent fractions, derivatives mod constants, circles in ℝ² — good motivation in the book.
> Congruence mod n needs integers — that is chapter 2 in a later video.
> For this video we need the definitions and Theorem 1.25.

Show on screen:

Cross out calculus and matrix examples in XML. Point at `02_integers` in library tree.

Visual notes:

Mention {[0],[1],[2]} mod 3 verbally.

## Scene 17: Partition

Duration: 16s

Say:

> In the book, partition comes next in the same paragraph as equivalence class.
> A partition of X is a family of nonempty subsets that are pairwise disjoint and cover X.
> Turn-Lang: structure `Partition` — first the container says each cell C is nonempty and a subset of X, then laws `disjoint` and `cover`.

Show on screen:

```turn
structure[
    C: Set<Any> where {
        |- C != EmptySet;
        |- Subset(C, X)
    }
] Partition<X: Set<Any>>: Set<Set<Any>> {
    laws {
        disjoint { ... }
        cover { ... }
    }
}
```

Visual notes:

Expand disjoint and cover bodies briefly.

## Scene 18: Equivalence class

Duration: 12s

Say:

> Right after partition, the book defines the equivalence class of x: all y with y related to x.
> Turn-Lang: structure `EquivalenceClass` with laws `def`, `from_relation`, and `subset_of_X`.

Show on screen:

```turn
structure EquivalenceClass<
    X: Set<Any>,
    E: EquivalenceRelation<X>,
    x in X,
>: Set<Any> {
    laws {
        def { forall y in self |- [x y] in E; }
        from_relation { forall y in X |- [x y] in E -> y in self; }
        subset_of_X { forall y: Any |- (y in self) -> (y in X); }
    }
}
```

Visual notes:

Book’s [x] notation on screen.

## Scene 19: Lemma before Theorem 1.25

Duration: 8s

Say:

> Small supporting lemma in our file: members of an equivalence class lie in X.
> Theorem 1.25’s proof calls this when discharging subset obligations.

Show on screen:

```turn
theorem "equivalence class members lie in the ambient set" { ... }
```

Visual notes:

Do not prove live.

## Scene 20: Theorem 1.25

Duration: 16s

Say:

> This is the capstone of section 1.2 — Theorem 1.25.
> Statement: from equivalence relation E, build the family of classes, then there exists a partition on X with those cells.
> Bird’s-eye on our proof: `witness confirm` closes that existence and splits obligations C.1, C.2, cover, disjoint — named from the Partition definition.

Show on screen:

```turn
theorem "equivalence classes form a partition (Judson Theorem 1.25 forward)" {
    forall X: Set<Any>,
    forall E: EquivalenceRelation<X>,
    exists Classes: Set<Set<Any>> where { ... },
    |- exists Partition<X>[..Classes]
} proof {
    witness confirm {
        at goal {
            C.1 { ... }
            C.2 { ... }
            cover { ... }
            disjoint { ... }
        }
    }
}
```

Visual notes:

Proof-slide branch map if available. Teaser: separate video on `witness confirm`.

## Scene 21: Close

Duration: 10s

Say:

> That is chapter 1 section 1.2 in one file — from Cartesian products through partition.
> In video 1.3 we tackle the reading questions and see if the formalization holds up.
> Link to this `.turn` file is in the description — open it, click through the proofs, and tell me which theorem you want next.

Show on screen:

File tab `02_sets_and_equivalence_relations.turn` with outline checkmarks. End card: turn-lang.com / share URL.

Visual notes:

Relief beat. No recap of skipped topics.

## Final Takeaway

`02_sets_and_equivalence_relations.turn` continues after video 1.1 in textbook order: CartesianProduct, Relation, Function, Composition, equivalence, Partition, EquivalenceClass, and Theorem 1.25 — one continuous formalization file.

## Slide comments

Per-slide director notes from pre-filming. Superseded by `## Voice lessons` after publish.

## Voice lessons

Filmed transcript: `published/2026-6-17-  1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang.md`

### What I added on camera (keep in future drafts)

- Open with **“welcome back to my channel”**, not only workspace recap.
- **Like-button CTA** when deferring Tao / analysis series.
- **Composition notation**: explain f is closer to input, g ∘ f applies f then g (reverse of left-to-right reading).
- **Injective**: contrapositive equivalence tangent (f(a₁)=f(a₂) ↔ a₁=a₂).
- **Bijective brackets** `(surjective, injective)` — link to multi-property syntax before instantiating types.
- **Laws vs properties** mini-lecture: laws connect everything inside a structure (self, generics, methods).
- **Identity on empty set** digression (~1 min) — apply never runs, trivial for now.
- **`exists InverseFunction`** philosophy (~2 min) — axioms vs theorems, consistency, tease **pitfalls of formal method** video.
- **Theorem 1.25**: long existential walkthrough — what “form a partition” means, C.1/C.2/cover/disjoint from partition container, parallel assumptions vs laws.
- **Proof vs textbook** beat: our proof is longer because the book skips steps.

### What I cut or deferred

- Full **invertible iff bijective** proof — stated theorem, said proof unfinished, **promised algebra-02-style follow-up**.
- Book examples (linear maps, permutations, polynomials, fractions, derivatives, matrices) — one-line defer only.

### Phrasing that sounded more like me than the draft

- “**Next we have** relations” not “Next in the book”.
- “**Think of a bag of ordered pairs**”.
- “**Pipeline from A to C**” for composition.
- “**Cutting the cake**” for partition disjointness.
- “**Internally**” / “**in Turn-Lang**” constantly while scrolling.

### Next script pass

When writing algebra-04 / reading questions: read `voice_profile.md` + this transcript; budget **2× draft length** for digressions on exists, container `where`, and proof obligations.

