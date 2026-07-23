# Subset — compare (continues sets-v2-01-set)

No intro prep. Point at compare panels. Speak naturally; do not read punctuation aloud.

**Style:** no em dashes. Use which/that, so that means, otherwise, and short sentences. **Format:** v4 beats — one block per `compare.beats[]` entry in `animation.json`. Each beat is one teleprompter paragraph (sentences split on `\n`). **Video:** reconnect to the last clip (Set, Mem wrapper, Turn structure/laws) because the audience cannot scroll back. **Point at on-screen code** — name the construct (`protected def Subset`, `instance LE`, `theorem subset_def`); do not read paths with slashes.

**15 beats:** textbook subset → hook → Lean foundation recap → `protected def Subset` → `∀ ⦃a⦄` body → `∈` from `Set.Mem` → `instance LE` → `instance HasSubset` → `theorem subset_def` / `rfl` → full Lean picture → Turn `relation Subset` → `default` ⊆ → `proper` ⊊ + `SetEq` → layout compare → CTA proper subset.

**Lean excerpt:** `script/shared/reference/mathlib/Data/Set/Subset60sExcerpt.lean`
**Turn excerpt:** `script/shared/reference/turn/subset-relation.turn`

---

Welcome back. Last clip we formalized the set, and saw Lean wrap membership in Set dot Mem while Turn names the container and puts rules in laws. Today we formalize subset. The textbook says A is a subset of B when every element of A is already in B.

Here is the key idea, just like last time. Subset is not a new container. It is a proposition about two sets you already have. B is not built from A.

Quick reminder, this is the same Mathlib file from the last clip. You still have def Set, Set dot Mem, and the Membership instance. Subset is going to build right on top of these.

First, protected def Subset. It takes s one and s two, both of type Set alpha. So it relates two sets, it does not create one.

The body is for all a, a in s one implies a in s two. That is exactly the textbook rule. The double braces around a make it instance-implicit, so Lean fills in the element for you.

Notice the in symbols here. They still come from Set dot Mem in the last video. So subset is just chaining those membership tests together.

Now the registration, the same idea as Membership before. instance LE for Set alpha says less-than-or-equal on sets means Set dot Subset. The angle brackets drop Set dot Subset into the slot LE expects.

Then instance HasSubset registers the subset symbol itself. It points at that same ordering. So s subset t desugars to Set dot Subset of s and t.

Finally, theorem subset_def. theorem introduces a named fact, unlike def which builds an object. It claims s subset t equals for all x, x in s implies x in t. The proof is rfl, reflexivity, because both sides unfold to the same proposition.

So that is Lean's modelling of subset. One def for the rule, two instances to register the ordering and the symbol, and a theorem tying the notation to the for-all form.

Now Turn-Lang, same rule, declared as a relation. relation Subset takes a type T and two sets A and B of type Set of T. PropModified means several proposition variants share the name.

The default variant is ordinary subset. default colon Prop: for all x of type T, x in A implies x in B. The at-notation on the block attaches the subset symbol.

The same block also declares proper subset with a different notation. proper is built from default and not SetEq. That strict kind is the next clip.

Same mathematics, two layouts. Lean splits protected def Subset and the instance lines apart. Turn keeps the relation and its notation together in one block on screen.

Next clip is proper subset, the strict kind, with extra drama. Comment if anything stuck, and subscribe to see you in the next one.
