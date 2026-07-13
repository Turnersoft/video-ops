# Turner filming voice profile

Distilled from published transcripts vs teleprompter scripts. LLMs should read this plus the specific script’s `## Voice lessons` and the matching `published/` transcript before drafting new `Say:` lines.

Sources:
- `published/2026-5-26-  1.1 Sets: Abstract Algebra formalized from scratch with Turn-Lang.md`
- `published/2026-6-17-  1.2 Functions, Relations, and Equivalence: formalized from scratch with Turn-Lang.md`

## Openings

- “Hi friends, welcome back **to my channel**. This is Turner.”
- Recap the **last video in one breath**, then “now we pick up the **same Turn-Lang file**.”
- Point to **description link** for the full source early.

## Rhythm

- Heavy use of **“So”**, **“Okay”**, **“Um”** — do not over-polish.
- Ask the question the viewer is thinking, then answer on screen.
- **Longer than the script** is normal: tangents that build intuition are kept, not cut.

## On-screen language

- Say **“internally”** / **“in Turn-Lang”** while pointing at the editor.
- Walk **generic-by-generic** and **law-by-law**; name `properties` vs `laws` explicitly.
- When notation is reversed (e.g. `g ∘ f`), **explain order on the diagram**, not just the formula.

## Digressions I keep (not in draft scripts)

- **Empty set / identity function** edge cases when they appear in the file.
- **Philosophy of `exists` on structures** — turning axioms into things to prove; tease **pitfalls of formal method** playlist.
- **Contrapositive equivalence** when defining injective.
- **Round-bracket property bundles** `(surjective, injective)` tied to syntax before types.
- **Partition container** `structure[ C where { ... } ]` — assumptions on generics vs parallel laws.

## What I shorten vs draft

- Skip **full proof walkthroughs** when proof is unfinished — promise a **dedicated follow-up video**.
- Skip **book examples** (matrices, ℝⁿ, calculus) with one sentence + **which chapter later**.

## Closes

- “Please hit the **like button**” when teasing another series (Tao, pitfalls).
- End with **reading questions / next video** + subscribe.

## Words to avoid in drafts

- Over-written textbook voice (“Judson defines…”, “Next in the book:”).
- Tight teleprompter sentences that do not leave room for “Okay” and re-phrasing on screen.

## 3Blue1Brown seasoning (Turner stays primary)

Borrow the **teacher arc**, not the **animation format**:

1. **Familiar situation first** — a table, route map, sorting bins, folder, receipt, or bad quiz question.
2. **Question second** — “So what is well-defined really buying us?”
3. **One picture in words** — pipeline, cake, bag of pairs, folder, checklist, receipt (Turn’s stand-in until Manim-style visuals exist).
4. **Name the object on screen** — scroll to the structure; outline click = concept edge.
5. **One surprising link** — e.g. Function refines Relation; partition laws match the metaphor.
6. **Why it matters** — homework step, pitfalls tease, or **Work link** for L5.

For shorts, do **not** compress the setup into one abstract sentence. Give the viewer 2-4 plain-language lines of background before the Turn file appears.

Keep: live workspace, um/okay, description link, channel warmth. Skip: voiceover-only proof with a static slide.

## Pitfalls shorts (experience → wedge → math)

Turner stays primary; the **first sentence** is never “open the AATA file.”

1. **Experience** — “So you have been here…” (wrong MC answer, proof that looked done, invented witness, quantifier swap in your head).
2. **Turn wedge** — scroll to **one** inspectable artifact (named obligation, trial arm, diagnostic, option Z).
3. **Math confirm** — “and that is why the file says…” — 10 s max on symbols.

Fair compare line when useful: name a **student-visible** pain (hidden subgoals, invented witnesses), not insider PL jargon. Never dunk on Lean/Coq in shorts aimed at learners.

## User-facing scripts (not dev demos)

Write for **students and curious viewers**, not for agent pipelines or repo tourists.

- **Do:** homework traps, exam wording, textbook hand-waves, one concrete math picture, then the chapter file on screen.
- **Don’t:** `/agent-quiz`, JSON export, `is_bad_question`, training corpora, typeclasses, elaboration, LSP, “proof-engineers,” or `q001`-style internal IDs in `Say:` lines.
- **One example per beat** — sharp words, cut to the chase.
- **Turn wedge** = what the **viewer** sees in the workspace (definition, diagnostic, named proof step) — not what we ship to developers.

## Industry L5 (MATLAB / CAE / numerics)

When `Work link` is set:

- Open with **their artifact** (input deck, UMAT, convergence, BC) or a one-line job pain.
- Refresh lane = 15 s “you already use this idea” (single-valued response, domain split).
- Do not require Judson chapter context in the title.
- Horizon = Turn roadmap: applied math, algorithms, numerical computing, systems tools — same checker as the textbook.

## Workflow for new scripts

1. Draft `Say:` in `script/` (plan).
2. Film; export YouTube transcript into `published/YYYY-M-D- Title.md`.
3. Add `Published: <file>.md` on the script; write `## Voice lessons` (diff summary).
4. In Cursor: **Copy voice prompt** on `/video-ops` or paste `buildVoiceCursorPrompt` output.
5. Revise *next* script using transcript phrasing, not only the old draft.
