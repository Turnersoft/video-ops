# Set — compare (Lean vs Turn-Lang)

No intro prep. Point at compare panels. Speak naturally; do not read punctuation aloud.

**Style:** no em dashes. Use which/that, so that means, otherwise, and short sentences. **Breath openers:** start each beat with a short cue (So, Now, For example, Next, Then, But, Similarly) so you can inhale before the line — vary them, do not repeat the same word every beat. **Point, don't read:** when code or a file path is already on screen, name the location (Init Prelude, Init Notation, Mathlib Set Defs) — never spell out slashes or recite the visible line. **Beats:** numbered 1–18 in editor, tracks, and goal panel.

---

So a set is just a well-defined collection of objects. For any x you can decide whether x belongs to it. Those objects are called elements, or members.

Now on the Lean side, the gray line at the top is a block comment. It is not code, just a note tying the file back to the textbook definition. Below that, def Set declares a new name. Parentheses hold a type parameter: alpha colon Type u means alpha is a type living in universe u. The thin arrow on the right is a function type, alpha to Prop. That is different from the fat arrow you will see on the lambda line later. Prop is Lean's type of true-or-false statements. The colon equals sign binds the name Set to that function type on the right.

Next, namespace Set opens a scoped block. Names inside get the Set dot prefix, which is why you read Set dot Mem instead of bare Mem. end Set at the bottom closes that block.

For example, oddIntegers colon Set Int fixes Int as the element type for this one concrete set. Colon here is a type label on the name. The colon equals on the same line says the definition continues on the next line.

Then fun n fat-arrow is Lean's anonymous function, like a JavaScript arrow function. The percent sign is integer remainder, so n mod 2 equals 1 is the membership test. When that proposition is true, n belongs in the set.

But if you apply oddIntegers to n directly, you get a Prop, a membership question. Lean never forces you to treat that Prop as container language. Rename def Set and the story disappears. That semantic gap is a real pitfall in formal methods.

After that, Mathlib adds protected def Mem. protected means downstream files should prefer the Set dot Mem path. On the parameters, s colon Set alpha labels the set and a colon alpha is one element. The return type after the second colon is Prop again. The body is s a with no dot and no extra parentheses. In Lean you apply a function by writing the argument right after the name.

So look at the teaching excerpt just above the instance line. That block is Init Prelude on screen. The Membership class there is the type-class hook for elementhood. Notice outParam on the element type so Lean can infer it from the container. The mem field puts container first, then element. That is the hook every belongs-to implementation must fill in.

Next, the Init Notation excerpt on screen. That notation line wires the in symbol to Membership dot mem. The parser reads element first, container second, but the call swaps to container first, then element. That is how the infix symbol connects to the type class.

Back in the Mathlib Set Defs block on screen, the instance line registers Set dot Mem as that mem field. Angle brackets supply the implementation without writing mem equals by hand. So for sets, the chain lands on s applied to a.

For example, the first example line is a sandbox. Lean type-checks it locally but does not export it as a theorem. Any set s, any element a, and a in s in the body — watch the goal panel for the full desugar chain. Still type Prop.

And the second example is the concrete case we built earlier. Same belongs-to question from the opening, now written with the readable in operator instead of calling the set like a bare function.

So that is the full wiring: Prelude class, Notation infix, Mathlib instance, and Set dot Mem as the set-specific implementation.

On the Turn side, Turn-Lang keeps the container story upfront. structure Set directly, square brackets for type T, and built-in in for membership without a Mem wrapper or a separate instance line.

For example, EmptySet puts belonging in laws. no_members means for every x, not x in self, so nothing belongs to the empty set.

Similarly, Union follows the same pattern. Its law def says x in the union when x is in A or x is in B.

So I hope you enjoyed this video. Leave a comment if you need help with the link.

Finally, next clip is subset. Subscribe and see you in the next one.
