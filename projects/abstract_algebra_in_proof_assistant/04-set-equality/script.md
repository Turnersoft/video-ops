# Set equality — what equals means in a proof assistant

Social title (English): 4. Set equality: what the equal sign means in a proof assistant
Social title (China): 4. 集合相等：证明助手里的等号是什么意思
Promotional description: Think = is obvious? Lean makes you earn it. We prove 1 = 1 with rfl, watch when Lean simplifies on its own and when it needs a library theorem, then climb the ladder: same members for sets, same answers for functions, same structure—not the same data—for groups. Episode 4 of Abstract Algebra in a Proof Assistant · #TurnLang #Lean4 #Mathlib #SetEquality #FormalMethods #ProofAssistant

Format: **v4 animated-PPT beats** · Editor: `/video-ops/editor/04-set-equality`

**Authoring:** edit [`animation.md`](./animation.md). It contains the spoken script, Lean/Turn-Lang code, highlights, positioned hints, visual notes, and AI comments; `npm run sync` compiles it to [`animation.json`](./animation.json) v4. See [`../../../docs/animation-markdown-language.md`](../../../docs/animation-markdown-language.md).

Assumes viewer just watched [sets-v2-03-proper-subset](../sets-v2-03-proper-subset/script-clean.md). **11 beats:** textbook rule → first equality claim → automatic simplification → named library fact → matching kinds → same set members → Turn-Lang's `SetEq` name → same function answers → Turn-Lang's `FuncEq` checklist → same structure versus same data → gentle takeaway.

**Lean excerpt:** `rfl`, `Nat.zero_add`, `Set.ext`, and `funext`, each introduced after a plain-language explanation.
**Turn-Lang excerpt:** the names `SetEq` and `FuncEq`, presented as readable labels before raw grammar.

Recompute beat timings after editing `say` text:

```bash
npx tsx tooling/recomputeAnimationBeatDurations.ts 04-set-equality
cd video_ops/remotion && npm run sync
```
