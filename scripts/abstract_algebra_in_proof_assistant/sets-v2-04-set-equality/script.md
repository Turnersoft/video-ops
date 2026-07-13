# Set equality — what equals means in a proof assistant

Social title (English): 4. Set equality: what the equal sign means in a proof assistant
Social title (China): 4. 集合相等：证明助手里的等号是什么意思
Promotional description: Hook: an equals glyph is not yet a complete meaning of sameness. We move from Lean’s definitional versus propositional equality, through Set.ext and homogeneous Eq, to Turn-Lang’s notation-backed SetEq / FunctionEq and the higher notion of isomorphism. Series episode 4 of Abstract Algebra in a Proof Assistant · #TurnLang #Lean4 #Mathlib #SetEquality #FormalMethods #ProofAssistant

Format: **v4 animated-PPT beats** · Editor: `/video-ops/editor/sets-v2-04-set-equality`

**Authoring:** edit [`animation.md`](./animation.md). It contains the spoken script, Lean/Turn code, highlights, positioned hints, visual notes, and AI comments; `npm run sync` compiles it to [`animation.json`](./animation.json) v4. See [`../../../docs/animation-markdown-language.md`](../../../docs/animation-markdown-language.md).

Assumes viewer just watched [sets-v2-03-proper-subset](../sets-v2-03-proper-subset/script-clean.md). **6 beats:** textbook `SetEq` hook → definitional versus propositional equality → homogeneous Lean `Eq` and `Set.ext` → notation-backed Turn `SetEq` → Turn `FunctionEq` pointwise equality → isomorphism and higher sameness.

**Lean excerpt:** `rfl`, `Nat.zero_add`, `Set.ext`, `funext`, informal univalence `(A ≃ B) → (A = B)`
**Turn excerpt:** `relation SetEq`, `relation FunctionEq` from `reference/function-equality.turn`

Recompute beat timings after editing `say` text:

```bash
npx tsx tooling/recomputeAnimationBeatDurations.ts sets-v2-04-set-equality
cd video_ops/remotion && npm run sync
```
