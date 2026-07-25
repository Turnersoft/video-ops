# Set equality — what equals means in a proof assistant

No intro prep. Point at compare panels. Speak naturally; do not read punctuation aloud.

**Style:** same as subset and proper subset. Assume the viewer has never read Lean. Short sentences. Explain every new symbol in ordinary language before displaying it; introduce each technical term only when it resolves a concrete confusion.

**Angle:** the equals glyph is not itself a complete mathematical meaning. Start with a claim as small as `1 = 1`, explain `rfl`, then show that Lean sometimes simplifies and sometimes needs a library fact. Sets are compared by members, functions by answers, and groups by structure.

**11 beats:** textbook rule -> first equality claim -> automatic simplification -> named library fact -> matching kinds -> same set members -> Turn-Lang's `SetEq` name -> same function answers -> Turn-Lang's `FuncEq` checklist -> same structure versus same data -> gentle takeaway.

**Lean:** `rfl`, `Nat.zero_add`, `Set.ext`, `funext`, introduced only after a plain-language explanation.
**Turn-Lang:** the names `SetEq` and `FuncEq`, explained as readable labels before any raw grammar.

---

## Beat 1 — Textbook rule + how `=` is wired
State the textbook mutual-subset rule on the overlay panel. Show Prelude's `inductive Eq` (not a typeclass); contrast subset's `LE` instances; preview Turn-Lang's `@notation` on `SetEq`.

## Beat 2 — First equality claim
Read `example : 1 = 1 := rfl` token by token: a small claim, an equality, the proof connector, and evidence that both sides already match.

## Beat 3 — Automatic simplification
Define `Nat` and `(n : Nat)` in everyday language, then show Lean simplifying `n + 0` to `n`, which lets `rfl` work.

## Beat 4 — A named library fact
Reverse the sum. Explain that Lean needs the named library fact `Nat.zero_add` when it cannot simplify `0 + n` by itself.

## Beat 5 — Matching kinds
Define a type as Lean's label for a kind of value. A Nat and an Int must be converted to one matching kind before Lean can compare them.

## Beat 6 — Sets already use the same `=`
Once kinds match, `A = B` is ordinary `Eq` — no special wiring required for equals on sets.

## Beat 7 — What set equality embeds
`Set.ext` / `SetEq` package mutual containment into that equals claim; the `=` display is not empty decoration.

## Beat 8 — Same function answers
Define a function as a rule from an input to an answer. `funext` is Lean's helper for matching answers at every input.

## Beat 9 — Explicit function checklist
`FuncEq` checks matching inputs, matching answers, and matching outputs for every input.

## Beat 10 — Same structure
Define a group minimally and explain an isomorphism as a reversible structure-respecting translation, not necessarily identical data.

## Beat 11 — The takeaway
manim-web ladder: value → members → answers → structure. Ask what must agree, name the rule, prove it. Next: the empty set.
