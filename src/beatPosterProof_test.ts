import {
  extractLeanProofSteps,
  extractLeanTheoremDeclaration,
  extractTurnProofSteps,
  extractTurnTheoremDeclaration,
  formatProofGoalForDisplay,
  parseBeatPosterProofMarkdown,
  planBeatPosterProofParts,
  proofMovesFromRawSteps,
  proofAfterDisplay,
  proofMoveDisplay,
  proofStepHeadline,
  proofStepKindLabel,
  resolveBeatPosterProof,
  resolveBeatPosterProofSteps,
} from "./beatPosterProof.ts";

function assertEquals(actual: unknown, expected: unknown, label: string): void {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) {
    throw new Error(`${label}: expected ${right}, got ${left}`);
  }
}

Deno.test("parses authored proof blocks and compact :: lines", () => {
  const steps = parseBeatPosterProofMarkdown(`
open
forall S: Set<Any> |- Subset(EmptySet, S)

unfold Subset at goal
forall S: Set<Any> |- forall x: Any |- x in EmptySet -> x in S

assume_not :: forall S: Set<Any> |- forall x: Any |- not (x in EmptySet -> x in S)

contradiction goal.1 by EmptySet.no_members
`);
  assertEquals(steps.length, 4, "count");
  const moves = proofMovesFromRawSteps(steps);
  assertEquals(moves.length, 3, "tactic count");
  assertEquals(moves[0].label, "unfold Subset at goal", "first tactic");
  assertEquals(
    moves[0].before,
    "forall S: Set<Any> |- Subset(EmptySet, S)",
    "unfold before",
  );
  assertEquals(
    moves[0].after,
    "forall S: Set<Any> |- forall x: Any |- x in EmptySet -> x in S",
    "unfold after",
  );
  assertEquals(
    moves[1].before,
    moves[0].after,
    "assume_not before is unfold after",
  );
  assertEquals(
    moves[2].after,
    "",
    "contradiction has no invented sequent",
  );
  assertEquals(proofAfterDisplay(moves[2], true), "no goals", "closed display");
});

Deno.test("extracts Turn theorem proof with nested assume_not", () => {
  const steps = extractTurnProofSteps(`
theorem "Empty subset of every set" {
  forall S: Set<Any> |- Subset(EmptySet, S)
} proof {
  unfold Subset at goal
  assume_not {
    contradiction goal.1 by EmptySet.no_members
  }
}
`);
  assertEquals(steps.map((step) => step.label), [
    "open",
    "unfold Subset at goal",
    "assume_not",
    "contradiction goal.1 by EmptySet.no_members",
  ], "labels");
  const moves = proofMovesFromRawSteps(steps);
  assertEquals(
    moves[0].before,
    "forall S: Set<Any> |- Subset(EmptySet, S)",
    "theorem sequent is before unfold",
  );
  assertEquals(moves[0].after, "", "auto extract does not invent after");
  assertEquals(moves[1].before, "", "unknown after is not reused as the next before");
});

Deno.test("extracts Turn field proof with nested constructors", () => {
  const steps = extractTurnProofSteps(`
first: SetEq(Union(A, A), A) proof {
  unfold SetEq
  unfold Union.def at h
  split_assumption_disjunction h
}
`);
  assertEquals(steps[0], {
    label: "open",
    goal: "SetEq(Union(A, A), A)",
  }, "field claim");
  assertEquals(steps.map((step) => step.label).slice(1), [
    "unfold SetEq",
    "unfold Union.def at h",
    "split_assumption_disjunction h",
  ], "tactics");
});

Deno.test("Turn without proof { stays a code card", () => {
  assertEquals(
    extractTurnProofSteps(`
theorem "Empty subset of every set" {
    forall S: Set<Any> |- Subset(EmptySet, S)
}
`),
    [],
    "no proof block",
  );
});

Deno.test("extracts Lean := by tactics and skips rfl-only proofs", () => {
  const steps = extractLeanProofSteps(`
theorem empty_subset (s : Set α) : ∅ ⊆ s := by
  intro x hx
  exact False.elim hx
`);
  assertEquals(steps[0], { label: "open", goal: "∅ ⊆ s" }, "lean open");
  assertEquals(steps.map((step) => step.label).slice(1), [
    "intro x hx",
    "exact False.elim hx",
  ], "lean tactics");
  assertEquals(
    extractLeanProofSteps("theorem subset_def : s ⊆ t ↔ ∀ x, x ∈ s → x ∈ t := rfl"),
    [],
    "rfl only",
  );
});

Deno.test("authored Proof wins over auto extract", () => {
  const steps = resolveBeatPosterProofSteps({
    proofMarkdown: `open
Subset(EmptySet, S)

unfold Subset at goal
forall x |- x in EmptySet -> x in S`,
    leanCode: "",
    turnCode: `theorem t { forall S: Set<Any> |- Subset(EmptySet, S) } proof {
  unfold Subset at goal
}`,
    primaryEditor: "turn",
  });
  assertEquals(steps, [{
    label: "unfold Subset at goal",
    before: "Subset(EmptySet, S)",
    after: "forall x |- x in EmptySet -> x in S",
  }], "authored");
});

Deno.test("display goal uses the infoview turnstile", () => {
  assertEquals(
    formatProofGoalForDisplay("forall x: Any |- x in EmptySet -> x in S"),
    "forall x: Any ⊢ x in EmptySet -> x in S",
    "turnstile",
  );
});

Deno.test("tall before/after goals split to one tactic per poster", () => {
  const long = "forall S: Set<Any> |- forall x: Any |- forall y: Any |- ".repeat(8) +
    "Subset(EmptySet, S)";
  const parts = planBeatPosterProofParts({
    beatId: "beat-05",
    title: "The proof cites last clip’s law",
    paragraphs: [
      "Unfold Subset. Assume a counterexample. Contradict with EmptySet.no_members.",
      "That is how Turn uses the empty set: by name, not by rewriting nobody is in.",
    ],
    nextLead: "Later proofs copy this pattern.",
    moves: [
      { label: "unfold Subset at goal", before: long, after: long },
      { label: "assume_not", before: long, after: `not (${long})` },
      {
        label: "contradiction goal.1 by EmptySet.no_members",
        before: `not (${long})`,
        after: "",
      },
    ],
  });
  assertEquals(parts.length, 3, "one poster per tactic");
  assertEquals(parts[0].moves.length, 1, "first poster is one tactic");
  assertEquals(parts[1].moves.length, 1, "second poster is one tactic");
  assertEquals(parts[0].posterId, "beat-05-1", "first part id");
  assertEquals(parts[1].posterId, "beat-05-2", "second part id");
  assertEquals(parts[2].moves[0].label, "contradiction goal.1 by EmptySet.no_members", "last tactic");
  assertEquals(parts[1].nextLead, "", "continuation has no up-next");
  assertEquals(parts[0].paragraphs, [], "proof posters drop body copy");
  assertEquals(parts[2].paragraphs, [], "last split poster drops body copy");
});

Deno.test("each tactic is its own poster even when compact", () => {
  const parts = planBeatPosterProofParts({
    beatId: "beat-06",
    title: "The proof cites last clip’s law",
    paragraphs: ["Unfold Subset. Contradict with EmptySet.no_members."],
    nextLead: "Later proofs copy this pattern.",
    moves: [
      {
        label: "unfold Subset at goal",
        before: "forall S: Set<Any> |- Subset(EmptySet, S)",
        after: "forall S: Set<Any> |- forall x: Any |- x in EmptySet -> x in S",
      },
      {
        label: "contradiction goal.1 by EmptySet.no_members",
        before: "forall S: Set<Any> |- forall x: Any |- x in EmptySet -> x in S",
        after: "",
      },
    ],
  });
  assertEquals(parts.length, 2, "one poster per tactic");
  assertEquals(parts[0].posterId, "beat-06-1", "first part id");
  assertEquals(parts[0].moves.length, 1, "first poster is unfold only");
  assertEquals(parts[0].moves[0].label, "unfold Subset at goal", "first tactic");
  assertEquals(parts[1].posterId, "beat-06-2", "second part id");
  assertEquals(
    parts[1].moves[0].label,
    "contradiction goal.1 by EmptySet.no_members",
    "second tactic",
  );
  assertEquals(parts[0].nextLead, "", "continuation has no up-next");
});

Deno.test("Turn theorem declaration quotes the name and sequent", () => {
  const declaration = extractTurnTheoremDeclaration(`
theorem "Empty subset of every set" {
  forall S: Set<Any> |- Subset(EmptySet, S)
} proof {
  unfold Subset at goal
}
`);
  assertEquals(declaration, {
    header: 'theorem "Empty subset of every set"',
    sequent: "forall S: Set<Any> |- Subset(EmptySet, S)",
  }, "turn theorem");
});

Deno.test("Lean theorem declaration is the signature before := by", () => {
  const declaration = extractLeanTheoremDeclaration(`
theorem empty_subset (s : Set α) : ∅ ⊆ s := by
  intro x hx
  exact False.elim hx
`);
  assertEquals(declaration, {
    header: "theorem empty_subset (s : Set α) : ∅ ⊆ s",
    sequent: "∅ ⊆ s",
  }, "lean theorem");
});

Deno.test("resolve keeps authored sequent and code theorem header", () => {
  const proof = resolveBeatPosterProof({
    proofMarkdown: `open
forall S: Set<Any> |- Subset(EmptySet, S)

unfold Subset at goal
forall S: Set<Any> |- forall x: Any |- x in EmptySet -> x in S`,
    leanCode: "",
    turnCode: `theorem "Empty subset of every set" {
  forall S: Set<Any> |- Subset(EmptySet, S)
} proof {
  unfold Subset at goal
}`,
    primaryEditor: "turn",
  });
  assertEquals(proof.declaration?.header, 'theorem "Empty subset of every set"', "header");
  assertEquals(
    proof.declaration?.sequent,
    "forall S: Set<Any> |- Subset(EmptySet, S)",
    "open sequent",
  );
});

Deno.test("before keeps full context as a gray stack; after highlights the change", () => {
  const unfold = proofMoveDisplay({
    label: "unfold Subset at goal",
    before: "forall S: Set<Any> |- Subset(EmptySet, S)",
    after: "forall S: Set<Any> |- forall x: Any |- x in EmptySet -> x in S",
  }, false);
  assertEquals(
    unfold.before.flaps.map((flap) => ({ text: flap.text, stacked: flap.stacked, mark: flap.mark })),
    [{ text: "forall S: Set<Any>", stacked: true, mark: "dim" }],
    "unfold before context",
  );
  assertEquals(
    unfold.before.claim.some((span) => span.mark === "used" && span.text === "Subset"),
    true,
    "Subset is what unfold uses",
  );
  assertEquals(
    unfold.after.flaps.map((flap) => ({ text: flap.text, stacked: flap.stacked, mark: flap.mark })),
    [
      { text: "forall S: Set<Any>", stacked: true, mark: "dim" },
      { text: "forall x: Any", stacked: false, mark: "changed" },
    ],
    "unfold after context",
  );
  const afterClaim = unfold.after.claim.map((span) => span.text).join("");
  assertEquals(afterClaim, "x in EmptySet -> x in S", "unfold after claim");
  assertEquals(
    unfold.after.claim.some((span) => span.mark === "changed" && span.text.includes("x in EmptySet")),
    true,
    "unfold change marked",
  );

  const assume = proofMoveDisplay({
    label: "assume_not",
    before: "forall S: Set<Any> |- forall x: Any |- x in EmptySet -> x in S",
    after: "forall S: Set<Any> |- forall x: Any |- not (x in EmptySet -> x in S)",
  }, false);
  assertEquals(
    assume.before.flaps.every((flap) => flap.stacked && flap.mark === "dim"),
    true,
    "assume_not context ignored",
  );
  assertEquals(
    assume.before.claim[0]?.mark,
    "used",
    "assume_not uses the current claim",
  );
  assertEquals(
    assume.after.claim.map((span) => span.text).join(""),
    "not (x in EmptySet -> x in S)",
    "assume_not after",
  );
  assertEquals(
    assume.after.claim.some((span) => span.mark === "changed" && span.text.includes("not")),
    true,
    "not is the change",
  );

  const closed = proofMoveDisplay({
    label: "contradiction goal.1 by EmptySet.no_members",
    before: "forall S: Set<Any> |- forall x: Any |- not (x in EmptySet -> x in S)",
    after: "",
  }, true);
  assertEquals(closed.after.closed, true, "closed");
  assertEquals(closed.after.claim[0]?.text, "no goals", "no goals");
  assertEquals(
    closed.usedOutsideGoal.includes("EmptySet.no_members"),
    true,
    "law cited as a uses chip",
  );
});

Deno.test("proof step posters are numbered Turn-Lang titles", () => {
  assertEquals(
    proofStepHeadline({ lang: "en", partIndex: 0, partCount: 3 }),
    "Step 1 of 3",
    "en",
  );
  assertEquals(
    proofStepHeadline({ lang: "zh", partIndex: 1, partCount: 3 }),
    "第 2 / 3 步",
    "zh",
  );
  assertEquals(
    proofStepKindLabel("turn", "en"),
    "Turn-Lang",
    "kind",
  );
});
