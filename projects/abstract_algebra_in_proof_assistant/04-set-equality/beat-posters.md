# Beat Posters — 04-set-equality

<!--
  Poster copy for the infographic album. This file — not animation.md — is the
  source of truth for poster text. Matched by beat number.

  Social / publish captions (per platform) live in social-posts.json under
  the "infographic" key — not in this file. Video captions use "english"/"china".

  Per beat:
    ### Title zh    Chinese title override (EN title comes from the heading)
    ### English     Body card copy, EN. `code` spans render highlighted.
    ### Chinese     Body card copy, ZH. `code` 会渲染成高亮。
    ### Next en     "Up next" hook override, EN
    ### Next zh     「下一篇」钩子，ZH
    ### Lean        (optional) fenced code block overriding the poster's Lean pane
    ### Turn-Lang   (optional) fenced code block overriding the poster's Turn pane
    ### Editor      (optional) `lean` or `turn` — pins which code pane to show

  A blank line inside English/Chinese starts a new text card (max 3).
  Keep each block to 1–2 short sentences — the card auto-fits font size,
  always staying larger than the code font.
  Any field left out falls back to auto-derived copy from animation.md.
-->

## Beat 1: Textbook rule — and why Turn-Lang takes over

### Title zh
课本里的等号，Lean 藏太深

### English
Lean welded `=` into its kernel — `A = B` is just `Eq A B`, buried in Prelude.

**Turn-Lang** is the upgrade: same textbook beats, rules you can actually read. This album is the handoff.

### Chinese
课本上 `=` 一眼能懂。到 Lean 里，`A = B` 其实就是 Prelude 的 `Eq A B`，规则焊在内核，翻都翻不到。

所以这期咱们用 **Turn-Lang** 讲：同样的课本内容，规则摊开写，人能读。

### Next en
One last Lean ritual: what does `=` ask you to prove?

### Next zh
先看 Lean 证个相等，到底要你写啥

## Beat 2: What `=` asks us to prove

### Title zh
就证个 1=1，标点比证明还多

### English
`example : 1 = 1 := rfl` — colon, claim, proof, done. Peak Lean ceremony.

Turn-Lang proves the same thing without the punctuation homework. You'll see.

### Chinese
就证个 `1 = 1`，Lean 也得走完全套：`example : 1 = 1 := rfl`。冒号、命题、证明，一个都不能少。

同一件事，Turn-Lang 不先卡你标点。接着看就懂。

### Next en
When Lean still auto-simplifies — last cheap win.

### Next zh
不过有时候 Lean 也会自己化简

## Beat 3: When Lean can simplify for us

### Title zh
Lean 自己能化简的时候

### English
`n + 0 = n` — Lean unfolds `Nat.add`, hits a case, `rfl` closes it.

Neat party trick. Turn-Lang won't make you guess which branch saved you.

### Chinese
比如 `n + 0 = n`。Lean 把 `Nat.add` 展开，对上定义，`rfl` 直接过。

看着省事，问题是你不知道它走了哪条分支。Turn-Lang 不会让你猜。

### Next en
When Lean needs a named theorem instead.

### Next zh
可换个顺序，它就不肯自己过了

## Beat 4: When Lean needs a named fact

### Title zh
换个顺序，就得翻库搬定理

### English
`0 + n = n` breaks `rfl`. Lean inducts, names `Nat.zero_add`, calls it a day.

Hidden library facts are exactly why we're moving to Turn-Lang.

### Chinese
到了 `0 + n = n`，`rfl` 直接卡死。Lean 得归纳，再去库里点名 `Nat.zero_add`。

定理藏着，你得会找——后面换 Turn-Lang，图的就是少这层憋屈。

### Next en
Matching kinds first — then Turn-Lang shows you how labels should work.

### Next zh
还有更基本的：种类对不上，根本比不了

## Beat 5: Equality needs matching kinds

### Title zh
种类对不上，等号免谈

### English
Lean won't compare `Nat` and `Int` until you convert — types gate every `=`.

Turn-Lang labels inputs with sets: `Function<domain, range>`. Same idea, finally readable.

### Chinese
`Nat` 和 `Int`，你不先转换，Lean 理都不理。类型不对，`=` 免谈。

Turn-Lang 换个说法：用集合给输入贴标签，写成 `Function<domain, range>`。道理一样，但这回人能读。

### Next en
Sets use Lean's `=` — one more slide, then the real thing.

### Next zh
集合在 Lean 里，其实还是这个 `=`

## Beat 6: Sets already use the same `=`

### Title zh
Lean 的集合相等，还是那个 =

### English
`A B : Set α` → `A = B` is ordinary `Eq A B`. Lean stuffs the meaning into `Set.ext`.

Next slide: **Turn-Lang** puts `SetEq` on the label. Finally.

### Chinese
`A B : Set α`，写 `A = B`，还是普通的 `Eq A B`。真正“成员一样才相等”，被塞进 `Set.ext` 里了。

别急，下一张就露馅：**Turn-Lang** 把 `SetEq` 写在明面上。

### Next en
Here it is — Turn-Lang set equality. This is what we wanted.

### Next zh
来了，Turn-Lang 的集合相等

## Beat 7: Turn-Lang set equality — the upgrade

### Title zh
Turn-Lang 集合相等，这才看懂

### English
**This is it.** Name `SetEq`, bind `@notation` to `A = B`.

Rule first, glyph second — no kernel dig. Lean keeps the rule in the library; Turn-Lang writes it on the page.

### Chinese
**划重点。** 先给关系起名 `SetEq`，再用 `@notation` 显示成 `A = B`。

规则在前，符号在后，不用去翻内核。Lean 把这条规则放在库定理里；Turn-Lang 写在你眼前。

### Editor
turn

### Next en
Functions next — Lean's version, then Turn-Lang's.

### Next zh
函数也一样，先看 Lean 怎么糊过去

## Beat 8: Functions are known by their answers

### Title zh
函数相等，Lean 先糊弄一回

### English
Same answer on every input → Lean's `funext` declares `f = g`.

Works, but it's a black box. Next slide: Turn-Lang lists every check out loud.

### Chinese
每个输入答案都一样，Lean 就用 `funext` 宣布 `f = g`。

能用，但你看不见它查了啥。下一张，Turn-Lang 一项一项写给你看。

### Editor
lean

### Next en
Turn-Lang function equality — this is the replacement.

### Next zh
Turn-Lang 的函数相等，这回写全了

## Beat 9: Turn-Lang function equality — spelled out

### Title zh
Turn-Lang 函数相等，一项不落

### English
**Turn-Lang replaces this whole dance.** Bind `=` to a named relation; input sets, answer sets, every output — visible.

No more Lean helpers guessing for you. This is the future we ship.

### Chinese
**这才是换写法的意义。** `=` 绑到一个有名字的关系上：定义域、值域、每个输出，全摊开。

不用靠 Lean 在背后替你猜。你看见什么，就证什么。

### Editor
turn

### Next en
Same job, different data — Turn-Lang keeps the levels honest.

### Next zh
活一样，不代表数据一样

## Beat 10: Same job does not mean same data

### Title zh
干同一件事，不等于是同一份数据

### English
`G = H` is identical data; `G ≃* H` is same structure only. Lean blurs the ladder.

Turn-Lang names the level before you touch `=`. That's the whole point of switching.

### Chinese
`G = H` 是数据一模一样；`G ≃* H` 只是结构一样。Lean 经常把这两层搅在一起。

Turn-Lang 写 `=` 之前，先告诉你这是哪一层。换它，图的就是这个。

### Next en
One question — and why Turn-Lang wins long-term.

### Next zh
最后留一句，也把这期收住

## Beat 11: One question to take away

### Title zh
走之前就记这一句

### English
Value → numbers. Members → sets. Answers → functions. Structure → groups.

Turn-Lang makes you name the rule, then prove it. Lean had its run — we're on Turn-Lang now.

### Chinese
数看值，集合看成员，函数看每个答案，群看结构。层次不同，`=` 的意思就不同。

Turn-Lang 逼你先点名规则，再去证。Lean 该谢幕了，后面咱们跟 Turn-Lang 走。

### Next en
Next: the empty set — Turn-Lang style.

### Next zh
下期：空集，Turn-Lang 怎么写
