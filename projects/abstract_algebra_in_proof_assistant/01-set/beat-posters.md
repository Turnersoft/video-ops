# Beat Posters — 01-set

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

## Beat 1: You already know what a set is

### Title zh
集合，你早就见过

### English
A set is a well-defined collection. The things inside are its elements.

The interesting part: “well-defined” means you can answer, for every object, in or not.

### Chinese
课本里，集合就是定义清楚的一堆对象，里面的叫元素。

有意思的地方在于：定义清楚，就是对每个东西都能回答——在，还是不在。

### Turn-Lang
```turn
structure[T] Set<T: Any> {
}
```

### Editor
turn

### Next en
So a set is less a bag, more a question.

### Next zh
所以集合不太像袋子，更像一个问题

## Beat 2: A set is a yes-or-no question

### Title zh
集合是一句能不能进的问话

### English
Think of a set as a question you can ask about every object: does it belong?

Not a bag you rummage through. A test with a yes or a no.

### Chinese
把集合想成一句能对每个东西问的话：它算不算里面的？

不是去袋子里翻。是一次能回答“在”或“不在”的判定。

### Lean
```lean
-- mathlib4/Mathlib/Data/Set/Defs.lean
def Set (α : Type u) := α → Prop
```

### Editor
lean

### Next en
Make it concrete: the odd integers.

### Next zh
先看一个你熟的：奇数

## Beat 3: Name a set you already like

### Title zh
先给奇数集合起个名

### English
Call it `oddIntegers`. The elements are integers — the set you already picture.

A name lets you point at the idea before you write the rule.

### Chinese
先叫它 `oddIntegers`。元素是整数——就是你脑子里那堆奇数。

先起名，再写规则。这样你知道自己在谈哪一个集合。

### Lean
```lean
def Set (α : Type u) := α → Prop

def oddIntegers : Set Int :=
```

### Editor
lean

### Next en
The rule is the one from class: is n odd?

### Next zh
规则就是课堂上那句：n 是不是奇数？

## Beat 4: Membership is the rule you already say

### Title zh
成员条件，就是那句“是不是奇数”

### English
An integer belongs when it is odd. That is the whole set.

Write the test once. Every later claim is just asking it again.

### Chinese
一个整数在不在里面，就看它是不是奇数。集合就是这句。

规则只写一次。后面每一次“属于”，都是再问同一句话。

### Lean
```lean
def oddIntegers : Set Int :=
  fun n => n % 2 = 1
```

### Editor
lean

### Next en
The name “set” does not add extra magic.

### Next zh
叫“集合”，并不会多出一层魔法

## Beat 5: The name is a label, not extra meaning

### Title zh
名字是标签，不是额外含义

### English
Calling it a set does not smuggle in new mathematics.

The set is the question. The name just lets you talk about it.

### Chinese
把它叫做集合，并不会偷偷多出新的数学。

集合就是那句问话。名字只是方便你提起它。

### Lean
```lean
def Set (α : Type u) := α → Prop

def oddIntegers : Set Int :=
  fun n => n % 2 = 1
```

### Editor
lean

### Next en
Next: give “belongs to” its own name.

### Next zh
下一步：给“属于”单独起名

## Beat 6: Give “belongs to” a name

### Title zh
给“属于”起个能说出口的名字

### English
Mathematicians name the membership test so they can say it out loud.

Same question as before: is this object in that set?

### Chinese
给“属于”起个名字，你才能把那句话拿出来讲。

问的还是同一件事：这个东西，在不在那个集合里？

### Lean
```lean
namespace Set
  def Mem (s : Set α) (a : α) : Prop :=
    s a
end Set
```

### Editor
lean

### Next en
Membership is just asking the question.

### Next zh
“属于”其实就是再问那句话

## Beat 7: Belonging is just asking the question

### Title zh
属于，就是把问话再问一遍

### English
“a belongs to s” means: ask s about a.

The familiar symbol `∈` is still waiting. The idea is already here.

### Chinese
“a 属于 s”，意思就是：拿 s 去问 a。

课本上的 `∈` 还没出场。意思已经在了。

### Lean
```lean
namespace Set
  protected def Mem (s : Set α) (a : α) : Prop :=
    s a
end Set
-- still no a ∈ s
```

### Editor
lean

### Next en
Now hang the symbol you already use in class.

### Next zh
把课堂上那个 ∈ 接上去

## Beat 8: ∈ is the symbol from class

### Title zh
∈，就是课堂上那个符号

### English
`∈` is the mark you already write on paper.

Underneath, it still asks the same yes-or-no question.

### Chinese
`∈` 就是你本子上一直在写的那个符号。

底下问的，还是同一句：在，还是不在。

### Lean
```lean
-- lean4/src/Init/Prelude.lean
class Membership (α : outParam (Type u)) (γ : Type v) where
  mem : γ → α → Prop

-- lean4/src/Init/Notation.lean
notation:50 a:50 " ∈ " b:50 => Membership.mem b a
```

### Editor
lean

### Next en
One connection, and the sentence from class works.

### Next zh
接上一次，课堂上那句话就能写了

## Beat 9: One connection, and the sentence works

### Title zh
接上一次，那句话就能写

### English
Connect the symbol to the membership test, and `a ∈ s` means what you think it means.

No new set theory. Just the notation you already trust.

### Chinese
把符号接到那句问话上，`a ∈ s` 就是你想的那个意思。

没有新的集合论。只是把你早就信任的记号接好。

### Lean
```lean
instance : Membership α (Set α) :=
  ⟨Set.Mem⟩
```

### Editor
lean

### Next en
Now `a ∈ s` is a claim you can check.

### Next zh
现在 `a ∈ s` 是一句能检查的话

## Beat 10: a ∈ s is a claim you can check

### Title zh
a ∈ s，是一句能判定的话

### English
`a ∈ s` is not a decoration. It is a claim: true, or not.

That is why a set can enter a proof. You can be right or wrong about membership.

### Chinese
`a ∈ s` 不是装饰。它是一句断言：对，或者不对。

集合能走进证明，就是因为“属于”可以判对错。

### Lean
```lean
example (s : Set α) (a : α) : Prop := a ∈ s
```

### Editor
lean

### Next en
Same symbol on the odd integers.

### Next zh
奇数集合，用的还是同一个 ∈

## Beat 11: Same ∈ on the odd integers

### Title zh
奇数集合，同一个 ∈

### English
`n ∈ oddIntegers` is the same symbol, now on a set you already like.

No new operator. Oddness is still the only test.

### Chinese
`n ∈ oddIntegers` 还是同一个符号，只是问的是奇数集合。

没有新算符。判定还是那一句：是不是奇数。

### Lean
```lean
example (n : Int) : Prop := n ∈ oddIntegers
```

### Editor
lean

### Next en
Three layers, one idea.

### Next zh
三层写法，一个意思

## Beat 12: Three layers, one idea

### Title zh
三层写法，一个意思

### English
A question about every object. A name for belonging. The symbol `∈`.

That is the whole picture of a set in this clip.

### Chinese
对每个东西的一句问话。给“属于”起的名。再加上符号 `∈`。

这期对集合的理解，就这一幅图。

### Lean
```lean
def Set (α : Type u) := α → Prop

namespace Set
  protected def Mem (s : Set α) (a : α) : Prop := s a
end Set

instance : Membership α (Set α) := ⟨Set.Mem⟩
```

### Editor
lean

### Next en
Another way to write a set: start with a box.

### Next zh
另一种写法：先摆出一个盒子

## Beat 13: Or start with a box, then the rule

### Title zh
也可以先摆盒子，再写规矩

### English
You can also start with a container, then write who may enter.

`x in s` is the same membership idea, said from the box outward.

### Chinese
也可以先摆一个容器，再写谁能进去。

`x in s` 还是“属于”，只是从盒子往外说。

### Turn-Lang
```turn
structure[T] Set<T: Any> {
}

// x in s is built-in
```

### Editor
turn

### Next en
Empty set: the box nobody enters.

### Next zh
空集：谁都不许进的盒子

## Beat 14: Empty set — nobody is in

### Title zh
空集：谁都不在里面

### English
The empty set is not a mystery. It is a rule: for every `x`, `x` is not in.

Once membership is a question, “nobody” is just answering no every time.

### Chinese
空集并不神秘。它就是一条规矩：对每个 `x`，都不在里面。

“属于”变成问句之后，“谁都没有”只是每次都答不。

### Turn-Lang
```turn
@notation("∅")
structure EmptySet: Set<Any> {
    relations {
        law no_members: Prop {
            forall x: Any |- not (x in self)
        }
    }
}
```

### Editor
turn

### Next en
Union uses the same kind of rule.

### Next zh
并集，也是同一类规矩

## Beat 15: Union is the same kind of rule

### Title zh
并集：在 A 或在 B

### English
`x` is in the union when `x` is in `A` or in `B`.

Same kind of question as oddness. Only the answer changes.

### Chinese
`x` 在并集里，意思是它在 `A` 里，或在 `B` 里。

和“是不是奇数”是同一类问句。变的只是怎么回答。

### Turn-Lang
```turn
@notation({A} ~ " ∪ " ~ {B})
structure Union<T: Any, A B: Set<T>>: Set<T> {
    relations {
        law def: Prop {
            forall x in self |- x in A or x in B
        }
    }
}
```

### Editor
turn

### Next en
Keep both pictures. Next: subset.

### Next zh
两张图先记住。下一期：子集

## Beat 16: Same set, two ways to write it

### Title zh
同一个集合，两种写法

### English
One picture starts from a test. The other starts from a box, then a rule.

Same textbook object. You choose where to put the membership sentence.

### Chinese
一张图从判定写起。另一张先摆盒子，再写规矩。

课本是同一个对象。成员那句话，放的位置可以不一样。

### Lean
```lean
def Set (α : Type u) := α → Prop
instance : Membership α (Set α) := ⟨Set.Mem⟩
```

### Editor
lean

### Next en
Next clip: when is one set inside another?

### Next zh
下期：一个集合什么时候在另一个里面？

## Beat 17: Next: when is one set inside another?

### Title zh
下期：什么时候算“在里面”

### English
We have a set. Next we relate two of them: every element of `A` already lies in `B`.

That is subset — the next sentence you already know.

### Chinese
集合有了。下一步是两个集合的关系：`A` 里的每个元素，都已经在 `B` 里。

那就是子集。下一句你其实也会。

### Turn-Lang
```turn
structure[T] Set<T: Any> {
}
```

### Editor
turn

### Next en
Next: subset.

### Next zh
下期：子集
