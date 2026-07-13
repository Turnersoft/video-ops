# Set equality — what equals means in a proof assistant

No intro prep. Point at compare panels. Speak naturally; do not read punctuation aloud.

**Style:** same as subset and proper subset. Short sentences. Explain the surprise first. Introduce each technical term only when it resolves a concrete confusion.

**Angle:** the equals glyph is not itself a complete mathematical meaning. Lean has homogeneous `Eq`, with definitional equality handled by reduction and propositional equality proved explicitly. Turn can attach `=` notation to named domain relations. Higher mathematics then asks for sameness at the appropriate structural level.

**6 beats:** textbook SetEq hook -> definitional versus propositional equality -> homogeneous Lean `Eq` and `Set.ext` -> notation-backed Turn `SetEq` -> pointwise function equality -> isomorphism and higher sameness.

**Lean:** `rfl`, `Nat.zero_add`, `Set.ext`, `funext`, informal univalence.
**Turn:** `SetEq`, pointwise `FunctionEq` from `reference/function-equality.turn`.

---

Hi friends, welcome back. The best way to really understand a math concept is to formalize it. So last clip ended with set equality. And the textbook definition looks really simple. Two sets are equal when each one is a subset of the other. But if we want to formalize this statement, first we have to understand what this equals sign actually means inside a proof assistant.

First of all, let's separate the equals sign from the idea of sameness. On the Lean side, we can write a equals b when both sides have the same type. And notice, we do not implement an equality typeclass first. But there are two layers here. Definitional equality means both sides reduce to the same term. That is why rfl can finish the proof. Propositional equality is an actual statement, a equals b. When reduction is not enough, we have to provide a proof for that statement. So think about definition versus theorem, not axiom versus theorem. And if you have used Mathematica, this idea is familiar. Assignment, symbolic equality, and exact sameness use different operators.

Now the question is, when can we even write the equals sign in Lean? Both sides must have exactly the same type. So two as a natural number and two as an integer cannot be compared directly. They look like the same number to us, but Lean sees two different types. We first cast the natural number into an integer, and then equality makes sense. Now sets A and B both have type Set alpha. So A equals B is a valid statement, and again, no equality typeclass is needed. But how do we prove it? Set dot ext says, do not compare the entire set all at once. Pick any x. If x belongs to A exactly when x belongs to B, for every x, then the two sets are equal. And in our textbook, this is exactly mutual subset.

Now Turn-Lang makes a different choice. We do not want to use the equals sign everywhere, and silently assume every structure has the same meaning of equality. So look at the at-notation here. It binds the visible A equals B to a named relation called SetEq. That means the equals sign is only the notation. SetEq is the actual mathematical meaning. And when we unfold SetEq, we get exactly two goals. A subset B. And B subset A. Later for functions, we can reuse the same equals sign, but bind it to FunctionEq instead. So this is intentional overloading. We choose the relation first, and then we choose the notation.

Next, functions have the same kind of problem. Two functions can be written using completely different code. But if every input gives the same output, mathematically we want to treat them as the same function. On the Lean side, funext turns this pointwise statement into function equality. So for every x, prove f of x equals g of x, and then Lean gives us f equals g. On the Turn side, we name this relation FunctionEq. And again, the visible equals sign is attached by notation. So the relation tells us exactly which observation must agree, the output on every input.

Finally, let's move one level higher. In category theory, we have to be very careful not to say two objects are literally equal, when what we really mean is isomorphic. For example, two groups can use completely different underlying elements. So as raw data, they are not equal. But if there is an isomorphism that preserves multiplication, identity, and inverse, then from the group theory perspective, they have the same structure. And this connects back to everything we just did. For sets, we compare members. For functions, we compare outputs. For structured objects, we compare structure-preserving maps. And in higher category theory, even those maps can have higher comparisons. In homotopy type theory, equality proofs behave like paths. So the real question is not only, are these two things equal? The real question is, at which level of mathematics should we treat them as the same? So that is the real lesson of equality. Next clip, we finally move to the empty set.
