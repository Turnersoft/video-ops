export type BeatPosterCardLayout = {
  /** Always shrink-wrap — narrative is one short paragraph. */
  textCardFlex: number;
  /** Grow weight for the code card; 0 means shrink-wrap to editor content. */
  codeCardFlex: number;
  /** When true the editor card only spans its code lines (no empty body). */
  codeCardAutoHeight: boolean;
  paragraphFontSize: number;
  editorFontSize: number;
  /** Max code lines that fit without clipping the next-lead / footer. */
  maxCodeLines: number;
};

export function estimateTextUnits(text: string): number {
  let units = 0;
  for (const char of text) {
    units += char.charCodeAt(0) > 255 ? 1 : 0.58;
  }
  return units;
}

function baseParagraphSize(paragraphs: string[]): number {
  const joined = paragraphs.join(' ');
  const units = estimateTextUnits(joined);
  if (units <= 120) return 26;
  if (units <= 180) return 24;
  if (units <= 240) return 22;
  return 20;
}

/** Headline-scale copy when the editor is compact and text should dominate. */
function spaciousParagraphSize(paragraphs: string[]): number {
  const units = estimateTextUnits(paragraphs.join(' '));
  if (units <= 80) return 38;
  if (units <= 140) return 34;
  if (units <= 200) return 30;
  if (units <= 280) return 28;
  return 26;
}

function baseEditorFontSize(codeLines: number): number {
  if (codeLines <= 8) return 22;
  if (codeLines <= 12) return 21;
  if (codeLines <= 16) return 19;
  if (codeLines <= 20) return 18;
  return 17;
}

/**
 * Estimate non-code vertical share on a normalized 100-unit-tall poster (3:4).
 * Tuned so title + text + next-lead + footer always leave room for code.
 */
function estimateFixedHeightUnits(params: {
  paragraphCount: number;
  paragraphUnits: number;
  hasNextLead: boolean;
  hasCode: boolean;
  titleUnits: number;
}): number {
  const { paragraphCount, paragraphUnits, hasNextLead, hasCode, titleUnits } = params;
  let fixed = 12.5; // poster padding + column gaps
  fixed += 12 + Math.min(titleUnits * 0.38, 12); // title paper + heading
  fixed += 4.5; // footer strip
  if (hasNextLead) {
    fixed += 11.5;
  }
  const avgUnits = paragraphCount > 0 ? paragraphUnits / paragraphCount : 0;
  for (let i = 0; i < paragraphCount; i += 1) {
    fixed += 6.5 + Math.min(avgUnits * 0.14, 9.5);
  }
  if (hasCode) {
    fixed += 7.5; // editor logo row + pane header
  }
  return fixed;
}

/** How many code lines fit in the remaining vertical space. */
export function fitBeatPosterMaxCodeLines(params: {
  paragraphCount: number;
  paragraphUnits: number;
  hasNextLead: boolean;
  hasCode: boolean;
  titleUnits: number;
  requestedCodeLines: number;
}): number {
  if (!params.hasCode || params.requestedCodeLines <= 0) {
    return 0;
  }
  const fixed = estimateFixedHeightUnits(params);
  const available = Math.max(5, 100 - fixed);
  const perLine = 2.15;
  let budgetLines = Math.floor(available / perLine);
  if (params.hasNextLead && params.paragraphCount >= 2) {
    budgetLines = Math.min(budgetLines, 10);
  }
  return Math.max(3, Math.min(params.requestedCodeLines, budgetLines));
}

/**
 * Split poster card space between narrative text and a single code editor.
 * Text always shrink-wraps; code lines are capped to the vertical budget.
 */
export function fitBeatPosterCardLayout(params: {
  paragraphs: string[];
  codeLines: number;
  hasCode: boolean;
  hasNextLead?: boolean;
  titleUnits?: number;
}): BeatPosterCardLayout {
  const { paragraphs, hasCode } = params;
  const paragraphUnits = estimateTextUnits(paragraphs.join(' '));
  const hasNextLead = params.hasNextLead ?? false;
  const titleUnits = params.titleUnits ?? 24;
  const requestedCodeLines = params.codeLines;

  const maxCodeLines = fitBeatPosterMaxCodeLines({
    paragraphCount: paragraphs.length,
    paragraphUnits,
    hasNextLead,
    hasCode,
    titleUnits,
    requestedCodeLines,
  });
  const effectiveCodeLines = hasCode ? maxCodeLines : 0;

  // Shrink-wrap the editor to its code lines; maxCodeLines already enforces the budget.
  const codeCardAutoHeight = hasCode && effectiveCodeLines > 0;

  let codeCardFlex: number;
  let paragraphFontSize: number;
  let editorFontSize: number;

  if (!hasCode || effectiveCodeLines <= 0) {
    codeCardFlex = 0;
    paragraphFontSize = spaciousParagraphSize(paragraphs);
    editorFontSize = 19;
  } else {
    codeCardFlex = 0;
    paragraphFontSize = spaciousParagraphSize(paragraphs);
    editorFontSize = baseEditorFontSize(effectiveCodeLines);
  }

  // Narrative must always read larger than the code it explains.
  paragraphFontSize = Math.max(paragraphFontSize, editorFontSize + 2);

  // Tighten type when the vertical budget is almost full.
  if (hasNextLead && paragraphs.length >= 2 && effectiveCodeLines >= 8) {
    paragraphFontSize = Math.max(editorFontSize + 2, paragraphFontSize - 2);
    editorFontSize = Math.max(16, editorFontSize - 1);
  }

  return {
    textCardFlex: 0,
    codeCardFlex,
    codeCardAutoHeight,
    paragraphFontSize,
    editorFontSize,
    maxCodeLines: effectiveCodeLines,
  };
}
