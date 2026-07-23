# Proper subset — the concept Lean never defines (continues sets-v2-02-subset)

No intro prep. Point at compare panels. Speak naturally; do not read punctuation aloud.

**Style:** no em dashes. Use which/that, so that means, otherwise, and short sentences. **Format:** v4 beats — one block per `compare.beats[]` entry in `animation.json`. **Video:** reconnect to the last clip (ordinary subset, `≤` is `⊆`, Turn default variant) because the audience cannot scroll back. **Point at on-screen source** — name the file (Init Prelude, Init Core, Order Defs, Set Basic) and the construct (`class LT`, `class HasSSubset`, `Preorder`, `lt :=`, `instDistribLattice`); do not read paths with slashes.

**Angle:** open with a genuine surprise from slide 1 — Lean has **no** clean concept of proper subset. Pull the real upstream source (same as the `Membership` reveal in the Set clip) to show `⊂` is inherited from generic order theory. Then answer *why* Mathlib did this: shallow reasons first (free lemmas, foundation-compatible — both side effects), then the real reason (definitional equality: `⊂` **is** the order's `<`, so all order/lattice lemmas fire with no glue and there is no `LT` diamond; payoff: `Set` is a complete Boolean algebra).

**13 beats:** SURPRISE textbook (no proper-subset concept) → reveal (borrow order theory) → subset recap (`≤` is `⊆`) → real source `class LT` + `class HasSSubset` slots → `Preorder.lt` default `a ≤ b ∧ ¬b ≤ a` (punchline) → Set `instDistribLattice` inherits + `HasSSubset` wires `⊂` → `ssubset_iff_subset_ne` / `ssubset_def` bridges → full 3-file picture → WHY shallow (free lemmas / foundation-compatible = side effects) → WHY deep (defeq, no diamond, complete Boolean algebra) → Turn `relation Subset` recap → `proper` ⊊ + `SetEq` → CTA set equality.

**Lean source shown:** `lean4/src/Init/Prelude.lean` (`class LT`), `lean4/src/Init/Core.lean` (`class HasSSubset`, `⊂` notation), `mathlib4/Mathlib/Order/Defs.lean` (`Preorder`, default `lt`, `lt_irrefl`/`lt_trans`/`lt_of_lt_of_le`/`lt_of_le_of_lt`), `mathlib4/Mathlib/Data/Set/Basic.lean` (`instDistribLattice`, `HasSSubset`, `ssubset_def`).
**Turn excerpt:** `script/shared/reference/02_sets_and_equivalence_relations.turn` (`proper` variant + `SetEq`)

---

Welcome back. Last clip was ordinary subset. Today, proper subset. The textbook definition looks innocent, A is a proper subset of B when A is a subset of B and A is not equal to B. But hold on, because Lean is about to get genuinely strange. Lean does not have a clean concept of proper subset at all. There is simply no definition of it anywhere. Let me show you.

Same pattern as subset, still not a new container. And still, nowhere in the library is proper subset spelled out. Instead Lean borrows generic order theory, and the strict subset symbol falls out of it. Let me pull up the real source and trace it.

Quick recap from last clip. On sets, less-than-or-equal is defined as subset. The LE instance points at Set dot Subset. So keep this substitution in mind, less-than-or-equal means subset.

Now the symbols. Just like Membership held the in operator last time, two built-in typeclasses hold the ordering. LT holds less-than, and HasSSubset holds the strict subset symbol. Look closely, both are empty slots. Neither one says what strict subset means.

Here is where the meaning actually lives, and it is nowhere near sets. In Mathlib's Preorder, less-than has a default definition for every ordered type. a less-than b means a less-than-or-equal b, and not b less-than-or-equal a. That one line is the true origin of proper subset.

But wait, why is less-than even available on sets? Here is the missing link. In Mathlib each order class extends the next one down. Distributive lattice extends lattice, lattice extends semilattice, semilattice extends partial order, and partial order extends preorder. So a distributive lattice is a preorder, and preorder is exactly where less-than was defined. Now it applies to Set. Set's less-than-or-equal is subset, so the inherited less-than becomes subset and not superset. Then HasSSubset points the strict subset symbol at less-than. So proper subset was never written for sets, it is inherited through this chain.

Mathlib then spells out the textbook forms, and one of them proves the whole point. ssubset_def says strict subset equals subset and not superset, and its proof is just rfl. That rfl means the two sides are the same by definition, not by a lemma. ssubset_iff_subset_ne then gives the subset and not equal version.

So this is the full picture. The symbol lives in Lean core, the meaning of strict less-than lives in Preorder in Mathlib's order theory, and Set only ever supplies less-than-or-equal equals subset. Three files, and proper subset appears without ever being defined directly.

So the real question, why less-than at all? The quick answer is free lemmas, and that is real, but it is a side effect. The actual reason is that subset is a genuine partial order. It is reflexive, it is transitive, and it is antisymmetric, and that last one, s inside t and t inside s forcing s equals t, is exactly set extensionality. Now the key fact, every partial order induces exactly one strict order, a less-than-or-equal b and a not equal b. Proper subset is precisely that strict order. So less-than is not borrowed, it literally is proper subset.

These are the lemmas you actually use. Proper subset is irreflexive, no set is a proper subset of itself. It is asymmetric. And transitive means a subset followed by a proper subset, or the reverse, still gives a proper subset. Sets are also a complete Boolean algebra, so union and intersection stay monotone, and complement flips strict containment. One honest caveat, arbitrary sets are not well-founded under proper subset, so strong induction over proper subsets is really a finite-set tool. And making the symbol be less-than, instead of a separate but merely equal definition, is what lets all of this apply with no glue.

Now Turn-Lang. Last clip introduced relation Subset with a default variant for ordinary subset. PropModified lets several variants share one relation name.

The proper variant reuses default and adds not SetEq. So A proper-subset B means ordinary subset holds and the sets are not equal. Turn states this directly, rather than deriving it as the strict order of a partial order. SetEq itself is mutual subset, which we formalize next clip.

Same mathematics, very different depth. Lean earns its power by inheriting an order-theory tower across three files, and that buys real reuse. Turn states proper subset as one named variant beside default. Different trade-offs, both machine-checked. Next clip is set equality. Comment if you are stuck, see you in the next one.
