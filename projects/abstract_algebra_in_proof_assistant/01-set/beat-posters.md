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

## Beat 1: A set is a membership rule

### Title zh
集合，先把成员规则说清楚

### English
Textbook: a set is a well-defined collection. The objects are elements.

What we actually need is the rule: for each `x`, is it in or not?

### Chinese
课本：集合就是定义清楚的一堆对象，里面的东西叫元素。

咱们真正要写清楚的，是这条规则：每个 `x`，在不在里面？

### Turn-Lang
```turn
structure[T] Set<T: Any> {
}
```

### Editor
turn

### Next en
Lean does not store a bag. It stores a test.

### Next zh
Lean 不存一袋子东西，它存的是判定

## Beat 2: Lean's Set is a test, not a bag

### Title zh
Lean 的集合：α 进去，Prop 出来

### English
Mathlib writes `def Set (α : Type u) := α → Prop`.

One element in, true or false out. That is a membership test, not a list of members.

### Chinese
Mathlib 写成 `def Set (α : Type u) := α → Prop`。

丢进一个元素，吐出真或假。这是判定，不是成员清单。

### Lean
```lean
-- mathlib4/Mathlib/Data/Set/Defs.lean
def Set (α : Type u) := α → Prop
```

### Editor
lean

### Next en
Make one concrete set: odd integers.

### Next zh
先写一个具体的：奇数集合

## Beat 3: Name a concrete set

### Title zh
先给这个集合起个名

### English
`oddIntegers : Set Int` fixes the element type as `Int`.

The colon labels the name. `:=` says the definition continues.

### Chinese
`oddIntegers : Set Int` 把元素类型钉成 `Int`。

冒号是类型标签，`:=` 表示定义接着往下写。

### Lean
```lean
def Set (α : Type u) := α → Prop

def oddIntegers : Set Int :=
```

### Editor
lean

### Next en
The body is an anonymous function.

### Next zh
函数体是一个匿名函数

## Beat 4: Membership is a function body

### Title zh
成员条件，写在函数体里

### English
`fun n => n % 2 = 1` is Lean's anonymous function.

When that proposition is true, `n` belongs to the set.

### Chinese
`fun n => n % 2 = 1` 就是 Lean 的匿名函数。

这个命题为真，`n` 就在这个集合里。

### Lean
```lean
def oddIntegers : Set Int :=
  fun n => n % 2 = 1
```

### Editor
lean

### Next en
Apply the set, and you get a Prop — not a badge that says "member".

### Next zh
套上去，你得到的是 Prop，不是“成员”两个字

## Beat 5: The name Set is only a label

### Title zh
叫 Set，并不自动等于“属于”

### English
`oddIntegers n` is just a `Prop`. Lean does not force you to read it as membership.

Rename `def Set` and that story is gone. The name is a label, not extra meaning.

### Chinese
`oddIntegers n` 只是一个 `Prop`。Lean 不会强迫你把它读成“属于”。

把 `def Set` 改个名，这层意思就没了。名字是标签，不是额外语义。

### Lean
```lean
def Set (α : Type u) := α → Prop

def oddIntegers : Set Int :=
  fun n => n % 2 = 1
```

### Editor
lean

### Next en
Next: put a name on membership itself.

### Next zh
下一步：给“属于”单独起名

## Beat 6: Namespace gives you Set.Mem

### Title zh
namespace 一开，名字变成 Set.Mem

### English
Mathlib opens `namespace Set`. Names inside get the `Set.` prefix.

That is why you read `Set.Mem`, not bare `Mem`. `end Set` closes the block.

### Chinese
Mathlib 打开 `namespace Set`，里面的名字自动带 `Set.` 前缀。

所以你读到的是 `Set.Mem`，不是光秃秃的 `Mem`。`end Set` 关掉这块。

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
`protected` locks the name to the dotted form.

### Next zh
`protected` 把名字锁在带点的写法上

## Beat 7: Mem is just apply the set

### Title zh
Mem 其实就是把集合套上去

### English
`protected def Mem` takes a set `s` and an element `a`, and returns `s a`.

That is membership as a named function. The symbol `∈` is still missing.

### Chinese
`protected def Mem` 吃一个集合 `s` 和一个元素 `a`，返回 `s a`。

“属于”有了函数名。符号 `∈` 还没接上。

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
`∈` is a kernel notation wired to a typeclass.

### Next zh
`∈` 是内核记号，接到一个 typeclass 上

## Beat 8: ∈ lives on Membership

### Title zh
∈ 挂在 Membership 上

### English
`∈` is notation in Lean's core. It desugars to `Membership.mem`.

`outParam` on the element type means Lean infers it. Set still has to implement the class.

### Chinese
`∈` 是 Lean 内核里的记号，展开成 `Membership.mem`。

元素类型上的 `outParam` 让 Lean 自己推断。Set 还得实现这个类。

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
One instance wires Set to that class.

### Next zh
一个 instance，把 Set 接上去

## Beat 9: One instance, one field

### Title zh
一个 instance，只填一个字段

### English
`instance : Membership α (Set α) := ⟨Set.Mem⟩` fills the only field.

`α` is whatever `Set α` already allows. Angle brackets are the one-field shortcut.

### Chinese
`instance : Membership α (Set α) := ⟨Set.Mem⟩` 只填那一个字段。

`α` 就是 `Set α` 已经允许的元素类型。尖括号是单字段的省事写法。

### Lean
```lean
instance : Membership α (Set α) :=
  ⟨Set.Mem⟩
```

### Editor
lean

### Next en
Now `a ∈ s` is a proposition.

### Next zh
现在 `a ∈ s` 才是一个命题

## Beat 10: a ∈ s is a proposition

### Title zh
写成 a ∈ s，得到的是命题

### English
After the instance, `a ∈ s` constructs a `Prop`.

It is `Membership.mem s a`, which is `Set.Mem s a`, which is `s a`.

### Chinese
实例接上之后，`a ∈ s` 构造的是一个 `Prop`。

它就是 `Membership.mem s a`，也就是 `Set.Mem s a`，也就是 `s a`。

### Lean
```lean
example (s : Set α) (a : α) : Prop := a ∈ s
```

### Editor
lean

### Next en
Same notation on the odd-integer set.

### Next zh
奇数集合也是这套记号

## Beat 11: Same ∈ on oddIntegers

### Title zh
奇数集合，同一个 ∈

### English
`n ∈ oddIntegers` is the same notation, now on a concrete set.

No new operator. The instance already covers every `Set α`.

### Chinese
`n ∈ oddIntegers` 还是同一个记号，只是套在具体集合上。

没有新算符。那个 instance 已经覆盖所有 `Set α`。

### Lean
```lean
example (n : Int) : Prop := n ∈ oddIntegers
```

### Editor
lean

### Next en
Three layers: constructor, wrapper, notation.

### Next zh
三层：构造、包装、记号

## Beat 12: Lean's three layers

### Title zh
Lean 的集合，就这三层

### English
Function type first: `Set α := α → Prop`. Then `Mem` wraps apply. Then the instance gives `∈`.

That is the whole Lean model of a set in this clip.

### Chinese
先是函数类型：`Set α := α → Prop`。再是 `Mem` 把套用包起来。最后 instance 给出 `∈`。

这期 Lean 这边的集合模型，就这三层。

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
Turn-Lang starts from a container.

### Next zh
Turn-Lang 从容器讲起

## Beat 13: Turn writes a container

### Title zh
Turn-Lang 直接写成容器

### English
Turn-Lang models `Set` as a `structure`. The `[T]` mark makes it a container, so `in` is available.

No `Mem`, no `Membership` instance. `x in s` is built-in.

### Chinese
Turn-Lang 用 `structure` 建 `Set`。方括号 `[T]` 标明这是容器，所以能用 `in`。

没有 `Mem`，也没有 `Membership` 实例。`x in s` 是内建的。

### Turn-Lang
```turn
structure[T] Set<T: Any> {
}

// x in s is built-in
```

### Editor
turn

### Next en
A law states what belongs — starting with empty.

### Next zh
定律写清谁在里面——先看空集

## Beat 14: EmptySet is a law

### Title zh
空集：一条定律就写完

### English
`EmptySet` inherits `Set`. The law `no_members` says: for every `x`, `x` is not in `self`.

A law is a requirement every instance of the structure must satisfy.

### Chinese
`EmptySet` 继承 `Set`。定律 `no_members` 说：对每个 `x`，`x` 都不在 `self` 里。

定律就是这个结构的每个实例都必须满足的要求。

### Turn-Lang
```turn
@notation("∅")
structure EmptySet: Set<Any> {
    laws {
        no_members {
            forall x: Any |- not (x in self)
        }
    }
}
```

### Editor
turn

### Next en
Union uses the same pattern.

### Next zh
并集也是同一套写法

## Beat 15: Union is the same pattern

### Title zh
并集：还是定律写成员

### English
`Union` is a `Set` whose law says: `x` is in the union when `x` is in `A` or in `B`.

Same container, different law. That is how this clip models a set on both sides.

### Chinese
`Union` 也是一个 `Set`，定律写：`x` 在并集里，当且仅当它在 `A` 或在 `B`。

同一个容器，换一条定律。两边的集合模型，这期就对到这儿。

### Turn-Lang
```turn
@notation({A} ~ " ∪ " ~ {B})
structure Union<T: Any, A B: Set<T>>: Set<T> {
    laws {
        def {
            forall x in self |- x in A or x in B
        }
    }
}
```

### Editor
turn

### Next en
Keep the two pictures. Next clip is subset.

### Next zh
两张图先记住。下期讲子集

## Beat 16: Two pictures of the same set

### Title zh
同一集合，两种写法

### English
Lean: a test `α → Prop`, then `Mem`, then `∈`. Turn-Lang: a container, then laws.

Same textbook object. Different place to put the membership rule.

### Chinese
Lean：先写成判定 `α → Prop`，再接 `Mem` 和 `∈`。Turn-Lang：先写成容器，再用定律。

课本是同一个对象。成员规则放的位置不一样。

### Lean
```lean
def Set (α : Type u) := α → Prop
instance : Membership α (Set α) := ⟨Set.Mem⟩
```

### Editor
lean

### Next en
Next clip: subset.

### Next zh
下期：子集

## Beat 17: Next clip is subset

### Title zh
下期：子集

### English
We have a set. Next we relate two of them: every element of `A` already lies in `B`.

That is subset. See you in the next clip.

### Chinese
集合有了。下一步是两个集合的关系：`A` 里的每个元素，都已经在 `B` 里。

那就是子集。下期见。

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
