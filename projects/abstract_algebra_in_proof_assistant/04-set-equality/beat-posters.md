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

## Beat 1: What is the equals sign asking?

### Title zh

等号到底在比什么

### English

On the page, `A = B` looks obvious. The interesting question is: what has to match?

This album walks the textbook beats, with that question written where you can read it.

### Chinese

课本上 `A = B` 一眼能懂。有意思的是：两边到底要一样在哪？

这期还是课本上的相等，只是把那句问话摊开，人能读。

### Next en

Start with numbers: same value.

### Next zh

先从数说起：值一样

## Beat 2: For numbers, = means the same value

### Title zh

对数字来说，= 就是同一个值

### English

Even `1 = 1` is naming a rule: these two values are the same.

Once you see that, equality stops being a magic mark and becomes a claim.

### Chinese

连 `1 = 1` 也是在点名一条规则：这两个值是同一个。

看清这一点，等号就不再是魔法，而是一句断言。

### Next en

Sometimes the definition already contains the step.

### Next zh

有时候，定义里已经藏着这一步

## Beat 3: Sometimes the definition already has the step

### Title zh

有时候，定义里已经有这一步

### English

`n + 0 = n` feels free, because adding zero is already in the definition of addition.

A proof can be short when the meaning you need is sitting in the words you used.

### Chinese

`n + 0 = n` 显得不费劲，因为“加零”本来就写在加法的定义里。

你用的那些词里已经有你要的意思，证明就可以很短。

### Next en

Change the order, and you need a real reason.

### Next zh

换个顺序，就得有真正的理由

## Beat 4: Change the order, and you need a reason

### Title zh

换个顺序，就得讲理由

### English

`0 + n = n` is the same number fact, but the definition no longer hands it to you.

That is a feature of mathematics: the order of writing can hide the reason, or reveal it.

### Chinese

`0 + n = n` 还是同一个数字事实，可定义不会再把它递到你手上。

这正是数学好玩的地方：书写顺序，能把理由藏起来，也能把它亮出来。

### Next en

You can only compare the same kind of thing.

### Next zh

只能拿同类的东西来比

## Beat 5: Only compare the same kind of thing

### Title zh

只能拿同类的东西来比

### English

A natural number and an integer are not automatically the same kind of object.

Before `=` can speak, you decide what universe the two sides live in.

### Chinese

自然数和整数，并不会自动算作同一种对象。

等号要开口，得先说清：两边住在哪个世界里。

### Next en

On sets, = still means the same members.

### Next zh

落到集合上，= 仍然表示成员一样

## Beat 6: On sets, = means the same members

### Title zh

集合相等，比的是成员

### English

Two sets can use the same `=`. The meaning you were taught is: the same members.

That meaning is often tucked into an extensionality lemma. Next we write it in the open.

### Chinese

两个集合也能写同一个 `=`。你学过的意思是：成员一样。

这层意思常常藏在外延定理里。下一张把它写到明面上。

### Next en

Write the rule first, then spend the symbol.

### Next zh

先写规则，再动用符号

## Beat 7: Write the rule, then spend the symbol

### Title zh

先写规则，再动用符号

### English

Name the relation first, then display it as `A = B`.

Rule first, glyph second. You should see what “same set” is asking before you spend the symbol.

### Chinese

先给相等关系起名，再把它显示成 `A = B`。

规则在前，符号在后。写等号之前，先看见“同一个集合”在问什么。

### Editor

turn

### Next en

Functions next: same answers.

### Next zh

下一张：函数看每个答案

## Beat 8: Functions are known by their answers

### Title zh

函数相等，看每个答案

### English

Two functions are equal when they give the same answer on every input.

That is the rule you already believe. A checker just needs it said out loud.

### Chinese

两个函数相等，意思是每个输入上的答案都一样。

这是你本来就信的规则。要检查，只差把它说出口。

### Editor

lean

### Next en

Write every check, so you can see it.

### Next zh

把每一项检查摊开写

## Beat 9: Write every check you are making

### Title zh

你在检查什么，就写什么

### English

Bind `=` to a named relation: input sets, answer sets, every output — visible.

You prove what you can see. No hidden helper guessing the checks.

### Chinese

把 `=` 绑到一个有名字的关系上：定义域、值域、每个输出，全摊开。

你看见什么，就证什么。不必靠背后的助手替你猜。

### Editor

turn

### Next en

Same job does not mean same data.

### Next zh

干同一件事，不等于是同一份数据

## Beat 10: Same job does not mean same data

### Title zh

干同一件事，不等于是同一份数据

### English

`G = H` is identical data. `G ≃* H` is the same structure only.

Name the level before you touch `=`. Same job does not mean same object.

### Chinese

`G = H` 是数据一模一样。`G ≃* H` 只是结构一样。

写 `=` 之前，先告诉你这是哪一层。干同一件事，不等于是同一个对象。

### Next en

One question to take away.

### Next zh

最后留一句

## Beat 11: Name the layer, then prove it

### Title zh

先点名层次，再去证

### English

Value → numbers. Members → sets. Answers → functions. Structure → groups.

Name the rule, then prove it. That is the whole lesson.

### Chinese

数看值，集合看成员，函数看每个答案，群看结构。层次不同，`=` 的意思就不同。

先点名规则，再去证。记住这一句就够了。

### Next en

Next: the empty set.

### Next zh

下期：空集
