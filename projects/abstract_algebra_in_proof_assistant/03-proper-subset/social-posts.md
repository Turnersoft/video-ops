{
"version": 1,
"scriptId": "03-proper-subset",
"titleEnglish": "Proper subset — the concept Lean never defines",
"titleChina": "真子集：Lean 从未直接定义 ⊂",
"title": "Proper subset — the concept Lean never defines",
"generatedAt": "2026-07-02T18:00:00.000Z",
"source": {
"playlist": "abstract algebra: formalized from scratch with turn-lang",
"promotionalDescription": "Textbook proper subset looks innocent — A ⊊ B means A ⊆ B and A ≠ B. Lean 4 has no direct definition. We trace ⊂ through order theory (Init → Preorder → Set) and compare Turn-Lang's one-line proper variant.",
"socialTitleEnglish": "Proper subset — the concept Lean never defines",
"socialTitleChina": "真子集：Lean 从未直接定义 ⊂"
},
"english": {
"youtube": {
"title": "Proper Subset in Lean 4 Has No Definition — We Traced ⊂ to Order Theory (vs Turn-Lang)",
"body": "The textbook definition looks simple: A is a proper subset of B when every element of A lies in B and A ≠ B.\n\nThen you open Mathlib… and there is no proper-subset definition for sets at all.\n\nIn this clip (part 3 of our Sets series, after ordinary subset):\n→ Search for `def SSubset` — nothing\n→ Where ⊂ actually lives: generic order theory, not the set-theory folder\n→ The punchline: `a < b := a ≤ b ∧ ¬ (b ≤ a`, and on sets `≤` IS `⊆`\n→ Why `ssubset_def` proves with `rfl` (definitional equality, not glue lemmas)\n→ Turn-Lang side: `proper` variant states the textbook condition in one named block\n\nSame mathematics. Lean inherits an order-theory tower across three files. Turn states the intent where you read it.\n\nNext up: set equality.\n\n#TurnLang #Lean4 #Mathlib #FormalMethods #FormalMathematics #ProofAssistant #AbstractAlgebra #InteractiveTheoremProving #TypeTheory #SetTheory"
},
"x": {
"title": "Lean 4 never defines proper subset for sets.",
"body": "Textbook: A ⊊ B ⇔ A ⊆ B ∧ A ≠ B.\n\nMathlib: no `SSubset` def. ⊂ is wired as `<` because `≤` on Set = `⊆`, and `<` = `≤ ∧ ¬≥` from generic order theory.\n\n`ssubset_def` closes with rfl.\n\nTurn-Lang names `proper` directly.\n\nFull trace in the clip ↓\n\n#Lean4 #Mathlib #TurnLang #FormalMethods"
},
"linkedin": {
"title": "Proper subset in Lean 4 is not defined in set theory — it is the strict order induced by ⊆",
"body": "**Short answer for practitioners:** In Lean 4 / Mathlib, strict subset on sets is not a standalone definition. It is the generic strict order `<` from order theory, because `Set` declares `≤` to mean subset.\n\nSo:\n**s ⊂ t ↔ s ⊆ t ∧ ¬ (t ⊆ s)** (equivalently **s ⊆ t ∧ s ≠ t**).\n\nThat is not a Mathlib quirk — it is the correct mathematical fact. Subset is a partial order (antisymmetry is set extensionality). Every partial order induces exactly one strict order. Lean defines that strict order once, for all preorders:\n\n`a < b := a ≤ b ∧ ¬ (b ≤ a)`\n\nSet only supplies `≤ = Subset`. The symbol ⊂ in notation is then wired to `<`. When Mathlib proves `ssubset_def`, the proof is `rfl`: the textbook definition holds **by definition**, which is why the entire lattice / Boolean-algebra library applies to sets without duplicate APIs or `LT` instance conflicts.\n\n**What we show in the video:** Side-by-side source — Init (empty `HasSSubset` slot), Mathlib `Preorder` (where `<` gets its meaning), and `Set.Basic` (where `≤` becomes `⊆`) — then the shallow vs deep reasons Mathlib chose this design, including the honest caveat that arbitrary sets are not well-founded under ⊂.\n\n**Turn-Lang contrast:** Same relation, stated locally — a `proper` variant on `relation Subset`: ordinary subset plus `not SetEq`. One block you can point at; no three-file inheritance tour.\n\nDifferent readability trade-offs. Both machine-checked.\n\nIf you teach formal methods or maintain Mathlib-facing curriculum, this clip is the “why ⊂ feels borrowed” moment made explicit.\n\n#Lean4 #Mathlib #FormalMethods #InteractiveTheoremProving #ComputerScience #Mathematics #TurnLang"
},
"instagram": {
"title": "Lean never defines proper subset. So what is ⊂?",
"body": "You learned: A ⊊ B means A ⊆ B and A ≠ B.\n\nSimple. Textbook-clean.\n\nThen you search Lean 4 / Mathlib for a proper-subset definition… and it is not there.\n\nNot hidden. Not renamed. **Never written for sets.**\n\nInstead:\n• `≤` on sets = subset\n• `<` on any preorder = `≤` but not the reverse\n• ⊂ notation points at that `<`\n\nThree files. Zero direct def. Full Boolean-algebra power.\n\nWe trace the real source on screen — Init → Order theory → Set — then show Turn-Lang naming `proper` in one place beside ordinary `⊆`.\n\nPart 3 of Sets, formalized from scratch.\n\nSave this if Mathlib notation ever felt like magic.\n\n#TurnLang #Lean4 #Mathlib #FormalMethods #ProofAssistant #AbstractAlgebra #SetTheory #MathTok #STEM #ComputerScience #InteractiveTheoremProving"
},
"tiktok": {
"title": "Lean 4 has NO proper subset definition 😳",
"body": "POV: textbook says A ⊊ B = A ⊆ B + A ≠ B\n\nYou open Mathlib…\n\nNo `SSubset` def. Zero.\n\n⊂ comes from ORDER THEORY:\n≤ on Set = subset\n< = ≤ but not reverse\n\nProof of ssubset_def? rfl. By definition.\n\nTurn-Lang just writes `proper` next to `default`.\n\nSame math. Wildly different depth.\n\nFull side-by-side trace in the long clip — link in bio.\n\n#Lean4 #Mathlib #FormalMethods #STEM #MathTok #TurnLang #ProofAssistant #LearnOnTikTok"
},
"facebook": {
"title": "Proper subset — the concept Lean never defines (Lean 4 vs Turn-Lang)",
"body": "The textbook definition is innocent: A is a proper subset of B when A ⊆ B and A ≠ B.\n\nLean 4 does not define proper subset for sets directly. There is no `def SSubset` in Mathlib — we search live in the video.\n\nInstead, ⊂ is the strict order `<` from generic order theory, because sets declare `≤` to mean subset. One line in `Preorder` defines `<` for every ordered type; Set only plugs in `≤ = ⊆`.\n\nThat is why Mathlib's `ssubset_def` proves with `rfl` — the textbook meaning is built in, not bolted on.\n\nTurn-Lang states the same idea as a named `proper` variant: subset holds and the sets are not equal.\n\nSide-by-side source tour. Part 3 of our Sets series.\n\n#TurnLang #Lean4 #Mathlib #FormalMethods #FormalMathematics #ProofAssistant #AbstractAlgebra"
},
"bluesky": {
"title": "Lean 4: no proper-subset def for sets",
"body": "Textbook: A ⊊ B ⇔ A ⊆ B ∧ A ≠ B.\n\nMathlib: ⊂ = order `<` because `≤` on Set is `⊆`. `ssubset_def` is rfl.\n\nTurn-Lang: `proper` variant beside `default`.\n\nClip traces Init → Preorder → Set.Basic.\n\n#Lean4 #Mathlib #TurnLang #FormalMethods"
}
},
"china": {
"bilibili": {
"title": "真子集：Lean 从未定义 ⊂，它从序理论继承而来",
"body": "教材定义很简单：A 真包含于 B 当且仅当 A ⊆ B 且 A ≠ B。\n\n打开 Mathlib 搜索 proper subset 的定义——集合论里没有直接写。\n\n⊂ 来自序理论：在 Set 上 `≤` 就是 `⊆`，而 `<` 的默认定义是 `a ≤ b ∧ ¬(b ≤ a)`。`ssubset_def` 的证明是 rfl。\n\n视频里并排对比 Lean 4 真实源码与 Turn-Lang 的 `proper` 变体。\n\nSets 系列第 3 集（接 ordinary subset）。\n\n#TurnLang #Lean4 #Mathlib #形式化方法 #形式化数学 #证明助手 #抽象代数 #集合论\n（请翻译为中文后发布）"
},
"douyin": {
"title": "Lean 没有真子集定义？⊂ 从哪来",
"body": "教材：A ⊊ B = A ⊆ B 且 A ≠ B\n\nMathlib：搜不到 sets 的真子集 def\n\n真相：Set 上 ≤ 就是 ⊆，< 来自序论默认式\n\nTurn-Lang 一行 `proper` 变体写清楚\n\nSets 系列第3集 | Lean vs Turn 源码对照\n\n#TurnLang #Lean4 #形式化方法 #抽象代数 #数学 #编程"
},
"xiaohongshu": {
"title": "Lean没定义真子集",
"body": "教材说 A ⊊ B 很简单\n\n打开 Lean/Mathlib：集合论里没有 proper subset 的 def\n\n⊂ 其实是序理论里的 `<`\n因为 Set 的 ≤ 就是 ⊆\n\nssubset_def 证明是 rfl（定义相等）\n\nTurn-Lang 用 proper 变体直接写 textbook 条件\n\nSets 系列第3集 | 并排源码\n\n#TurnLang #Lean4 #形式化数学 #抽象代数 #程序员 #数学"
},
"weibo": {
"title": "真子集：Lean 4 从未直接定义 ⊂（vs Turn-Lang）",
"body": "【直接结论】Lean 4 / Mathlib 里，集合的真子集 ⊂ 不是单独定义的集合概念，而是序关系 `<`：因为在 Set 上 `≤` 被实例化为 `⊆`，而 `<` 对所有 Preorder 统一定义为 `a ≤ b ∧ ¬(b ≤ a)`。\n\n视频追溯 Init → Order/Defs → Set/Basic 三段源码，并对比 Turn-Lang 的 `proper` 变体（default + not SetEq）。\n\nSets 系列第 3 集，接 ordinary subset。\n\n#TurnLang #Lean4 #Mathlib #形式化方法 #抽象代数"
},
"wechat_channels": {
"title": "真子集：Lean 从未定义 ⊂",
"body": "教材定义：A ⊊ B ⇔ A ⊆ B 且 A ≠ B。\n\nLean 4 在集合论里没有直接写 proper subset；⊂ 通过序理论继承：Set 的 ≤ 是 ⊆，< 是通用的严格序。\n\nMathlib 的 ssubset_def 用 rfl 证明——textbook 含义是定义层就成立的。\n\nTurn-Lang 用 proper 变体在同一 relation 里直接声明。\n\nSets 系列第 3 集，Lean 与 Turn 源码并排讲解。\n\n#TurnLang #Lean4 #形式化方法 #抽象代数"
},
"kuaishou": {
"title": "Lean没有真子集定义",
"body": "A ⊊ B 教材一句话\n\nMathlib 搜不到 SSubset\n\n⊂ = 序论里的 <，因为 ≤ 就是 ⊆\n\nTurn-Lang proper 变体一行搞定\n\nSets 第3集 源码对照\n\n#TurnLang #Lean4 #形式化 #数学 #编程"
}
}
}

"Proper Subset" requires 5× more effort to model than "Subset" in Lean. And Mathlib never models it directly at all! But why!?

The answer: proper subset isn't a separate definition — it's the strict order < that every Preorder already knows how to talk about.

⊂ inherits the lemmas you'd otherwise prove by hand:
• irreflexivity (nothing is a proper subset of itself)
• transitivity
• asymmetry
• lt_of_le_of_lt and lt_of_lt_of_le — the mixed chaining rules (⊆ then ⊂, or ⊂ then ⊆)
• (Antisymmetry? That lives on ⊆, not ⊂ — and it's literally set extensionality.)

So Lean doesn't rewrite those theorems just for proper subset. It installs ≤ = ⊆ on Set, and the generic < becomes ⊂ automatically.

But here's the twist: Mathlib can't stop at Preorder alone — because Set is also a Boolean algebra (α → Prop), not "just" an ordered type. The instance climbs a whole tower:

           BooleanAlgebra → … → PartialOrder → Preorder

Preorder is inherited from above. Set only relabels the fields: le → ⊆, lt → ⊂.

On the contrary, Turn-Lang just use a simple block.

#InteractiveTheoremProving #Lean4 #Mathlib #FormalMethods #TurnLang
