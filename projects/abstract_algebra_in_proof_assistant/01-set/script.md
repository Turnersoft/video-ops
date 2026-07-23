# Set — Lean vs Turn-Lang

Social title (English): 1. Set: Lean don't model it as a container
Social title (China): 1. Set：Lean 不把它建模成容器
Promotional description: Hook: Lean does not treat a set like a bag you drop things into. In this episode we open Membership / ∈ wiring and show why the proof-assistant model is a predicate on types — then compare the same idea in Turn-Lang so you can film the intuition outdoors and verify it on screen. Tags and series: Abstract Algebra in a Proof Assistant · Judson §1.2 · #TurnLang #Lean4 #Mathlib #FormalMethods

Duration: **~120s** · Editor: `/video-ops/editor/01-set`

**Teleprompter:** [`script-clean.md`](./script-clean.md) (edit this file; `npm run sync` copies lines into `animation.json` `compare.beats[].say` when beat count matches). **Authoring:** edit beats in [`animation.json`](./animation.json) (v4) — one object per line with `say`, `lean`, `turn`, hints. See [`../../docs/animation-beat-schema.md`](../../docs/animation-beat-schema.md). **No em dashes** in spoken lines. **Point at on-screen code** — name the block (Init Prelude, Init Notation, Mathlib Set Defs); do not read paths with slashes or recite visible lines.

Phone-recording narrative. **18 beats:** textbook → Lean syntax → **`lean4/src/Init/Prelude.lean` `Membership` on screen** → **`lean4/src/Init/Notation.lean` `∈` wiring on screen** → **`mathlib4/Mathlib/Data/Set/Defs.lean` `instance`/`⟨Set.Mem⟩`** → desugar chain → Turn → CTA.

**Displayed sources:** `lean4/src/Init/Prelude.lean`, `lean4/src/Init/Notation.lean`, and `mathlib4/Mathlib/Data/Set/Defs.lean`. Local excerpt file is only the render carrier: `script/shared/reference/SetMembershipWiringExcerpt.lean`.

| Beat | Topic | Lean focus |
|------|--------|------------|
| 1 | Textbook set | overlay |
| 2 | `def Set`, `Type u`, `→`, `Prop` | L3–4 |
| 3 | `namespace Set` / `end Set` | L6, L34 |
| 4–6 | `oddIntegers`, `fun`, semantic gap | L8–9 |
| 7 | `protected def Mem`, `s a` | L11–12 |
| 8 | **`class Membership`, `mem : γ → α → Prop`** | L15–18 |
| 9 | **`notation … ∈ … => Membership.mem b a`** | L19–21 |
| 10 | `instance`, `⟨Set.Mem⟩` | L23–27 |
| 11 | desugar `a ∈ s` chain | L29 |
| 12 | `n ∈ oddIntegers` | L31 |
| 13 | Lean recap | L14–31 |
| 14–16 | Turn Set / EmptySet / Union | turn track |
| 17–18 | CTA / subset teaser | — |

## STT fixes

| Heard | Intended |
|-------|----------|
| dev | `def` |
| in | `∈` |
| Init dot Prelude | Init.Prelude |
| Init dot Notation | Init.Notation |
| Membership dot mem | `Membership.mem` |
| Set dot Mem | `Set.Mem` |
