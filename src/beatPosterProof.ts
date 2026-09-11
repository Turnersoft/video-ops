/**
 * Proof-panel steps for beat posters.
 *
 * Each tactic is a move: the sequent before the tactic, the tactic, then the
 * sequent after. Authored `### Proof` in beat-posters.md is a chain of
 * (label + after-goal) blocks; `open` seeds the first before-goal. Auto-extract
 * from Turn `proof { … }` / Lean `:= by` supplies tactic labels and the open
 * claim — intermediate after-goals stay empty unless authored.
 *
 * One poster is one tactic. The goal card keeps the full sequent: unused
 * context stays visible but grayed as a flip-clock stack; the current claim
 * is the face. The tactic sits between before and after. Highlights mark the
 * name the tactic uses and the formula it rewrote. Display only — frames are
 * the authored `|-` / `⊢` split, not a new proof rule.
 *
 * A beat with several tactics becomes several posters. Proof posters are
 * title + goals; body copy is dropped.
 */

export type BeatPosterProofRawStep = {
  label: string;
  /** After-goal for this block; `open` stores the initial claim. */
  goal: string;
};

export type BeatPosterProofStep = {
  label: string;
  before: string;
  after: string;
};

export type BeatPosterProofDeclaration = {
  /** `theorem "Name"` / Lean signature / field claim. Empty if only a sequent is known. */
  header: string;
  sequent: string;
};

export type BeatPosterProof = {
  declaration: BeatPosterProofDeclaration | null;
  moves: BeatPosterProofStep[];
};

export type BeatPosterProofPart = {
  posterId: string;
  moves: BeatPosterProofStep[];
  partIndex: number;
  partCount: number;
  paragraphs: string[];
  nextLead: string;
};

export type ProofDisplayMark = "plain" | "dim" | "changed" | "used";

export type ProofDisplaySpan = {
  text: string;
  mark: ProofDisplayMark;
};

/** One nested-sequent frame shown as a flip-clock card in the context stack. */
export type ProofContextFlap = {
  text: string;
  mark: ProofDisplayMark;
  /** Shared/unused context: stacked and gray. New context is the current flap. */
  stacked: boolean;
};

/** Infoview-style goal: context stack + current claim. Never drops frames. */
export type ProofGoalCardView = {
  closed: boolean;
  flaps: ProofContextFlap[];
  claim: ProofDisplaySpan[];
};

export type ProofMoveView = {
  before: ProofGoalCardView;
  after: ProofGoalCardView;
  /** Tactic names that do not appear in the before-goal, shown as chips. */
  usedOutsideGoal: string[];
};

/** Infoview-style closed proof; display only, not a sequent. */
export const PROOF_NO_GOALS = "no goals";

const TACTIC_STOPWORDS = new Set([
  "unfold",
  "at",
  "by",
  "goal",
  "contradiction",
  "assume_not",
  "assume",
  "intro",
  "exact",
  "apply",
  "rw",
  "simp",
  "have",
  "let",
  "cases",
  "induction",
  "constructor",
  "rfl",
  "sorry",
  "split",
  "from",
  "using",
  "with",
  "on",
  "in",
  "of",
  "to",
  "for",
  "and",
  "or",
  "split_conjunction",
  "split_assumption_disjunction",
  "split_disjunction",
  "witness",
]);

function sequentFrames(goal: string): string[] {
  return goal
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s*(?:\|-|⊢)\s*/)
    .map((frame) => frame.trim())
    .filter((frame) => frame.length > 0);
}

function splitContextAndClaim(frames: string[]): { context: string[]; claim: string } {
  if (frames.length === 0) {
    return { context: [], claim: "" };
  }
  return {
    context: frames.slice(0, -1),
    claim: frames[frames.length - 1],
  };
}

function commonPrefixCount(left: string[], right: string[]): number {
  const n = Math.min(left.length, right.length);
  let count = 0;
  while (count < n && left[count] === right[count]) {
    count += 1;
  }
  return count;
}

function changedMiddle(before: string, after: string): { prefix: number; suffix: number } {
  let prefix = 0;
  const limit = Math.min(before.length, after.length);
  while (prefix < limit && before[prefix] === after[prefix]) {
    prefix += 1;
  }
  let suffix = 0;
  const suffixLimit = Math.min(before.length - prefix, after.length - prefix);
  while (
    suffix < suffixLimit &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  return { prefix, suffix };
}

function highlightAfterFocus(beforeFocus: string, afterFocus: string): ProofDisplaySpan[] {
  if (!afterFocus) {
    return [];
  }
  if (!beforeFocus || beforeFocus === afterFocus) {
    return [{ text: afterFocus, mark: "plain" }];
  }
  const { prefix, suffix } = changedMiddle(beforeFocus, afterFocus);
  const spans: ProofDisplaySpan[] = [];
  if (prefix > 0) {
    spans.push({ text: afterFocus.slice(0, prefix), mark: "plain" });
  }
  const midEnd = afterFocus.length - suffix;
  if (midEnd > prefix) {
    spans.push({ text: afterFocus.slice(prefix, midEnd), mark: "changed" });
  }
  if (suffix > 0) {
    spans.push({ text: afterFocus.slice(midEnd), mark: "plain" });
  }
  return spans;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function tacticUsedNeedles(label: string): string[] {
  const tokens = label.match(/[A-Za-z_][\w'.]*/g) ?? [];
  const needles: string[] = [];
  for (const token of tokens) {
    if (token.length < 2 || TACTIC_STOPWORDS.has(token)) {
      continue;
    }
    if (!needles.includes(token)) {
      needles.push(token);
    }
  }
  return needles;
}

function tacticTargetsCurrentClaim(label: string): boolean {
  return /\bat\s+goal\b/.test(label) ||
    /^(assume_not|assume|intro|constructor|rfl)\b/.test(label.trim());
}

function spansWithNeedles(text: string, needles: string[]): ProofDisplaySpan[] {
  if (!text) {
    return [];
  }
  const usable = needles
    .filter((needle) => needle.length >= 2)
    .sort((left, right) => right.length - left.length);
  if (usable.length === 0) {
    return [{ text, mark: "plain" }];
  }
  const pattern = new RegExp(
    usable
      .map((needle) => `(?<![A-Za-z0-9_])${escapeRegExp(needle)}(?![A-Za-z0-9_])`)
      .join("|"),
    "g",
  );
  const spans: ProofDisplaySpan[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) {
      spans.push({ text: text.slice(last, index), mark: "plain" });
    }
    spans.push({ text: match[0], mark: "used" });
    last = index + match[0].length;
  }
  if (last < text.length) {
    spans.push({ text: text.slice(last), mark: "plain" });
  }
  return spans.length > 0 ? spans : [{ text, mark: "plain" }];
}

function markBeforeClaim(claim: string, needles: string[], targetsClaim: boolean): ProofDisplaySpan[] {
  if (!claim) {
    return [];
  }
  const spans = spansWithNeedles(claim, needles);
  if (spans.some((span) => span.mark === "used")) {
    return spans;
  }
  if (targetsClaim) {
    return [{ text: claim, mark: "used" }];
  }
  return [{ text: claim, mark: "plain" }];
}

function contextFlaps(frames: string[], sharedCount: number, afterSide: boolean): ProofContextFlap[] {
  return frames.map((frame, index) => {
    const stacked = index < sharedCount;
    let mark: ProofDisplayMark = "plain";
    if (stacked) {
      mark = "dim";
    } else if (afterSide) {
      mark = "changed";
    }
    return { text: frame, mark, stacked };
  });
}

function emptyGoalView(): ProofGoalCardView {
  return { closed: false, flaps: [], claim: [] };
}

function goalViewLayoutText(view: ProofGoalCardView): string {
  const flaps = view.flaps.map((flap) => flap.text);
  const claim = view.claim.map((span) => span.text).join("");
  return [...flaps, claim].filter((line) => line.length > 0).join("\n");
}

function textContainsNeedle(text: string, needle: string): boolean {
  const pattern = new RegExp(
    `(?<![A-Za-z0-9_])${escapeRegExp(needle)}(?![A-Za-z0-9_])`,
  );
  return pattern.test(text);
}

export function proofMoveDisplay(
  step: BeatPosterProofStep,
  isLastMove: boolean,
): ProofMoveView {
  const beforeRaw = step.before.trim();
  const afterRaw = step.after.trim();
  const afterText = proofAfterDisplay(step, isLastMove);
  const afterClosed = afterText === PROOF_NO_GOALS;
  const needles = tacticUsedNeedles(step.label);
  const targetsClaim = tacticTargetsCurrentClaim(step.label);
  const beforeParts = splitContextAndClaim(sequentFrames(beforeRaw));
  const afterParts = afterClosed
    ? { context: beforeParts.context, claim: PROOF_NO_GOALS }
    : splitContextAndClaim(sequentFrames(afterRaw));
  const shared = afterClosed
    ? beforeParts.context.length
    : commonPrefixCount(beforeParts.context, afterParts.context);
  const beforeClaim = markBeforeClaim(beforeParts.claim, needles, targetsClaim);
  const before: ProofGoalCardView = {
    closed: false,
    flaps: contextFlaps(beforeParts.context, shared, false),
    claim: beforeClaim,
  };
  const beforeText = [beforeParts.context.join(" "), beforeParts.claim].join(" ");
  const usedOutsideGoal = needles.filter((needle) => !textContainsNeedle(beforeText, needle));

  if (!afterRaw && !afterClosed) {
    return {
      before: beforeRaw
        ? {
          closed: false,
          flaps: contextFlaps(beforeParts.context, 0, false),
          claim: beforeParts.claim
            ? markBeforeClaim(beforeParts.claim, needles, targetsClaim)
            : [{ text: formatProofGoalForDisplay(beforeRaw), mark: "plain" }],
        }
        : emptyGoalView(),
      after: emptyGoalView(),
      usedOutsideGoal,
    };
  }

  const after: ProofGoalCardView = afterClosed
    ? {
      closed: true,
      flaps: contextFlaps(beforeParts.context, beforeParts.context.length, false),
      claim: [{ text: PROOF_NO_GOALS, mark: "plain" }],
    }
    : {
      closed: false,
      flaps: contextFlaps(afterParts.context, shared, true),
      claim: highlightAfterFocus(beforeParts.claim, afterParts.claim),
    };
  return { before, after, usedOutsideGoal };
}

export function proofPanelLayoutText(params: {
  moves: BeatPosterProofStep[];
  closingLast?: boolean;
  declaration?: BeatPosterProofDeclaration | null;
}): string {
  const closingLast = params.closingLast !== false;
  const lines: string[] = [];
  for (let index = 0; index < params.moves.length; index += 1) {
    const step = params.moves[index];
    const view = proofMoveDisplay(
      step,
      closingLast && index === params.moves.length - 1,
    );
    lines.push(step.label);
    const before = goalViewLayoutText(view.before);
    if (before) {
      lines.push("before", before);
    }
    const after = goalViewLayoutText(view.after);
    if (after) {
      lines.push("after", after);
    }
    if (view.usedOutsideGoal.length > 0) {
      lines.push("uses", view.usedOutsideGoal.join(" "));
    }
  }
  return lines.join("\n");
}

export function proofStepsLayoutText(
  steps: BeatPosterProofStep[],
  closingLast = true,
): string {
  return proofPanelLayoutText({ moves: steps, closingLast });
}

/** Poster proof panel uses the infoview turnstile. */
export function formatProofGoalForDisplay(goal: string): string {
  if (goal.trim() === PROOF_NO_GOALS) {
    return PROOF_NO_GOALS;
  }
  return goal.replaceAll("|-", "⊢");
}

export function proofAfterDisplay(step: BeatPosterProofStep, isLastMove: boolean): string {
  if (step.after.trim()) {
    return formatProofGoalForDisplay(step.after);
  }
  if (isLastMove) {
    return PROOF_NO_GOALS;
  }
  return "";
}

export function proofPanelMeta(params: {
  partIndex: number;
  partCount: number;
  stepCount: number;
}): string {
  if (params.partCount > 1) {
    return `${params.partIndex + 1} / ${params.partCount}`;
  }
  return `${params.stepCount} ${params.stepCount === 1 ? "step" : "steps"}`;
}

export function proofStepHeadline(params: {
  lang: "en" | "zh";
  partIndex: number;
  partCount: number;
}): string {
  const n = params.partIndex + 1;
  const m = params.partCount;
  if (params.lang === "zh") {
    return m > 1 ? `第 ${n} / ${m} 步` : "证明步骤";
  }
  return m > 1 ? `Step ${n} of ${m}` : "Proof step";
}

export function proofStepKindLabel(
  dialect: "lean" | "turn",
  _lang: "en" | "zh",
): string {
  return dialect === "lean" ? "Lean 4" : "Turn-Lang";
}

export function proofGoalKicker(lang: "en" | "zh", side: "before" | "after"): string {
  if (lang === "zh") {
    return side === "before" ? "之前" : "之后";
  }
  return side === "before" ? "Before" : "After";
}

export function proofUsesKicker(lang: "en" | "zh"): string {
  return lang === "zh" ? "引用" : "uses";
}

export function parseBeatPosterProofMarkdown(raw: string): BeatPosterProofRawStep[] {
  const blocks = raw
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const steps: BeatPosterProofRawStep[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) {
      continue;
    }
    const first = lines[0].replace(/^-\s+/, "");
    const sep = first.indexOf(" :: ");
    if (sep >= 0 && lines.length === 1) {
      steps.push({
        label: first.slice(0, sep).trim(),
        goal: first.slice(sep + 4).trim(),
      });
      continue;
    }
    steps.push({
      label: first,
      goal: lines.slice(1).join("\n"),
    });
  }
  return steps.filter((step) => step.label.length > 0);
}

export function proofMovesFromRawSteps(raw: BeatPosterProofRawStep[]): BeatPosterProofStep[] {
  const moves: BeatPosterProofStep[] = [];
  let cursor = "";
  for (const step of raw) {
    if (step.label === "open") {
      cursor = step.goal.trim();
      continue;
    }
    const after = step.goal.trim();
    moves.push({
      label: step.label,
      before: cursor,
      after,
    });
    cursor = after;
  }
  return moves;
}

function extractBalanced(source: string, openBraceIndex: number): string | null {
  if (source[openBraceIndex] !== "{") {
    return null;
  }
  let depth = 0;
  for (let i = openBraceIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openBraceIndex + 1, i);
      }
    }
  }
  return null;
}

function flattenTurnTactics(body: string): string[] {
  const tactics: string[] = [];
  for (const raw of body.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line || line === "{" || line === "}") {
      continue;
    }
    const stripped = line.replace(/\{$/, "").replace(/,$/, "").trim();
    if (stripped) {
      tactics.push(stripped);
    }
  }
  return tactics;
}

function extractTurnOpenGoal(codeBeforeProof: string): string {
  const trimmed = codeBeforeProof.trim();
  const colon = trimmed.lastIndexOf(":");
  if (colon >= 0) {
    const afterColon = trimmed.slice(colon + 1).replace(/\s+/g, " ").trim();
    if (afterColon && !afterColon.includes("|-") && /^[A-Za-z]/.test(afterColon)) {
      return afterColon;
    }
  }
  const lastBrace = trimmed.lastIndexOf("{");
  if (lastBrace >= 0) {
    const inner = extractBalanced(trimmed, lastBrace);
    if (inner && inner.includes("|-")) {
      return inner.replace(/\s+/g, " ").trim();
    }
  }
  const sequent = trimmed.match(/((?:forall\b[\s\S]*?)?\|-[\s\S]+)$/);
  if (sequent) {
    return sequent[1].replace(/\s+/g, " ").trim();
  }
  return "";
}

export function extractTurnProofSteps(code: string): BeatPosterProofRawStep[] {
  const match = /\bproof\s*\{/i.exec(code);
  if (!match) {
    return [];
  }
  const brace = code.indexOf("{", match.index);
  if (brace < 0) {
    return [];
  }
  const inner = extractBalanced(code, brace);
  if (inner == null) {
    return [];
  }
  const tactics = flattenTurnTactics(inner);
  if (tactics.length === 0) {
    return [];
  }
  const goal = extractTurnOpenGoal(code.slice(0, match.index));
  const steps: BeatPosterProofRawStep[] = [];
  if (goal) {
    steps.push({ label: "open", goal });
  }
  for (const tactic of tactics) {
    steps.push({ label: tactic, goal: "" });
  }
  return steps;
}

function lastTypeAnnotation(before: string): string {
  const trimmed = before.trim();
  const colon = trimmed.lastIndexOf(":");
  if (colon < 0) {
    return "";
  }
  return trimmed.slice(colon + 1).replace(/\s+/g, " ").trim();
}

export function extractLeanProofSteps(code: string): BeatPosterProofRawStep[] {
  const byMatch = /:=\s*by\b/.exec(code);
  if (!byMatch) {
    return [];
  }
  const rest = code.slice(byMatch.index + byMatch[0].length).trim();
  const tacticLines = rest.includes("\n")
    ? rest.split("\n").map((line) => line.trim()).filter((line) =>
      line.length > 0 && !line.startsWith("--")
    )
    : rest
    ? [rest]
    : [];
  if (tacticLines.length === 0) {
    return [];
  }
  if (tacticLines.length === 1 && /^(sorry|rfl)\b/.test(tacticLines[0])) {
    return [];
  }
  const goal = lastTypeAnnotation(code.slice(0, byMatch.index));
  const steps: BeatPosterProofRawStep[] = [];
  if (goal) {
    steps.push({ label: "open", goal });
  }
  for (const tactic of tacticLines) {
    steps.push({ label: tactic, goal: "" });
  }
  return steps;
}

export function extractTurnTheoremDeclaration(code: string): BeatPosterProofDeclaration | null {
  const proofMatch = /\bproof\s*\{/i.exec(code);
  if (!proofMatch) {
    return null;
  }
  const before = code.slice(0, proofMatch.index).trim();
  const theorem = /\btheorem\s+("(?:[^"\\]|\\.)*"|[A-Za-z_][\w']*)/i.exec(before);
  if (theorem) {
    const brace = before.indexOf("{", theorem.index + theorem[0].length);
    const inner = brace >= 0 ? extractBalanced(before, brace) : null;
    return {
      header: `theorem ${theorem[1]}`,
      sequent: (inner ?? "").replace(/\s+/g, " ").trim(),
    };
  }
  const field = /(?:^|\n)\s*([\w.]+)\s*:\s*([^\n{]+)$/.exec(before);
  if (field) {
    const sequent = field[2].trim();
    return {
      header: `${field[1]}: ${sequent}`,
      sequent,
    };
  }
  return null;
}

export function extractLeanTheoremDeclaration(code: string): BeatPosterProofDeclaration | null {
  const byMatch = /:=\s*by\b/.exec(code);
  if (!byMatch) {
    return null;
  }
  const header = code.slice(0, byMatch.index).replace(/\s+/g, " ").trim();
  if (!header) {
    return null;
  }
  return {
    header,
    sequent: lastTypeAnnotation(code.slice(0, byMatch.index)),
  };
}

function declarationFromSource(params: {
  raw: BeatPosterProofRawStep[];
  leanCode: string;
  turnCode: string;
  primaryEditor: "lean" | "turn";
}): BeatPosterProofDeclaration | null {
  const fromCode = params.primaryEditor === "lean"
    ? extractLeanTheoremDeclaration(params.leanCode)
    : extractTurnTheoremDeclaration(params.turnCode);
  const open = params.raw.find((step) => step.label === "open");
  const sequent = (open?.goal.trim() || fromCode?.sequent || "").trim();
  const header = (fromCode?.header ?? "").trim();
  if (!header && !sequent) {
    return null;
  }
  return { header, sequent };
}

export function resolveBeatPosterProof(params: {
  proofMarkdown?: string;
  leanCode: string;
  turnCode: string;
  primaryEditor: "lean" | "turn";
}): BeatPosterProof {
  const authored = parseBeatPosterProofMarkdown(params.proofMarkdown ?? "");
  const raw = authored.length > 0
    ? authored
    : params.primaryEditor === "lean"
    ? extractLeanProofSteps(params.leanCode)
    : extractTurnProofSteps(params.turnCode);
  return {
    declaration: declarationFromSource({
      raw,
      leanCode: params.leanCode,
      turnCode: params.turnCode,
      primaryEditor: params.primaryEditor,
    }),
    moves: proofMovesFromRawSteps(raw),
  };
}

export function resolveBeatPosterProofSteps(params: {
  proofMarkdown?: string;
  leanCode: string;
  turnCode: string;
  primaryEditor: "lean" | "turn";
}): BeatPosterProofStep[] {
  return resolveBeatPosterProof(params).moves;
}

export function beatPosterPartId(
  beatId: string,
  partIndex: number,
  partCount: number,
): string {
  if (partCount <= 1) {
    return beatId;
  }
  return `${beatId}-${partIndex + 1}`;
}

export function parentBeatIdFromPosterId(
  posterId: string,
  knownBeatIds: string[],
): string {
  if (knownBeatIds.includes(posterId)) {
    return posterId;
  }
  const match = posterId.match(/^(.*)-(\d+)$/);
  if (match && knownBeatIds.includes(match[1])) {
    return match[1];
  }
  return posterId;
}

/**
 * One poster per tactic. Proof posters are the step title plus before/after
 * goals — body copy is dropped so the sequent stays readable. `Up next` stays
 * on the last part.
 */
export function planBeatPosterProofParts(params: {
  beatId: string;
  moves: BeatPosterProofStep[];
  paragraphs: string[];
  nextLead: string;
  title: string;
  declaration?: BeatPosterProofDeclaration | null;
}): BeatPosterProofPart[] {
  const { beatId, moves, nextLead } = params;
  if (moves.length === 0) {
    return [{
      posterId: beatId,
      moves: [],
      partIndex: 0,
      partCount: 1,
      paragraphs: params.paragraphs,
      nextLead,
    }];
  }

  const partCount = moves.length;
  return moves.map((move, partIndex) => {
    return {
      posterId: beatPosterPartId(beatId, partIndex, partCount),
      moves: [move],
      partIndex,
      partCount,
      paragraphs: [],
      nextLead: "",
    };
  });
}
