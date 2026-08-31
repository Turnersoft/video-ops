export type BeatPosterCardLayout = {
  /** Always shrink-wrap — narrative is one short paragraph. */
  textCardFlex: number;
  /** Grow weight for the code card; 0 means shrink-wrap to editor content. */
  codeCardFlex: number;
  /** When true the editor card only spans its code lines (no empty body). */
  codeCardAutoHeight: boolean;
  paragraphFontSize: number;
  editorFontSize: number;
  /** Authored code line count shown in the editor. Font shrinks to the floor, then wraps. */
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

/**
 * Layout editor size. Preview CSS is this times PREVIEW_FONT_SCALE (420px frame);
 * export multiplies that by 1080/420. Keep the floor in layout units, not CSS px —
 * MIN 8 used to become 3.36px on the carousel.
 */
export const BEAT_POSTER_PREVIEW_FONT_SCALE = 0.42;
export const MIN_EDITOR_FONT_SIZE = 22;
const MAX_EDITOR_FONT_SIZE = 48;
const PREVIEW_FRAME_WIDTH = 420;
const EXPORT_POSTER_WIDTH = 1080;
const CODE_TEXT_WIDTH_PX = 920;
const MONO_CHAR_EM = 0.62;
const EDITOR_LINE_UNITS_AT_MIN = 2.15;

function longestCodeLineLength(codeText: string): number {
  let longest = 0;
  for (const line of codeText.replace(/\r\n/g, '\n').split('\n')) {
    if (line.length > longest) {
      longest = line.length;
    }
  }
  return longest;
}

/** Largest layout font whose longest line still fits the editor width. */
function maxEditorFontWithoutWrap(codeText: string): number {
  const longest = longestCodeLineLength(codeText);
  if (longest <= 0) {
    return MAX_EDITOR_FONT_SIZE;
  }
  const maxDisplayPx = CODE_TEXT_WIDTH_PX / (longest * MONO_CHAR_EM);
  const size = Math.floor(
    maxDisplayPx / (BEAT_POSTER_PREVIEW_FONT_SCALE * (EXPORT_POSTER_WIDTH / PREVIEW_FRAME_WIDTH)),
  );
  return Math.max(MIN_EDITOR_FONT_SIZE, Math.min(MAX_EDITOR_FONT_SIZE, size));
}

function displayEditorPx(editorFontSize: number): number {
  return editorFontSize * BEAT_POSTER_PREVIEW_FONT_SCALE * (EXPORT_POSTER_WIDTH / PREVIEW_FRAME_WIDTH);
}

function charsThatFit(editorFontSize: number): number {
  return Math.max(1, Math.floor(CODE_TEXT_WIDTH_PX / (displayEditorPx(editorFontSize) * MONO_CHAR_EM)));
}

function visualCodeLineCount(codeText: string, editorFontSize: number): number {
  const maxChars = charsThatFit(editorFontSize);
  const lines = codeText.replace(/\r\n/g, '\n').split('\n');
  let total = 0;
  for (const line of lines) {
    total += Math.max(1, Math.ceil(Math.max(line.length, 1) / maxChars));
  }
  return Math.max(1, total);
}

function editorHeightFits(
  visualLines: number,
  editorFontSize: number,
  availableUnits: number,
): boolean {
  const perLine = EDITOR_LINE_UNITS_AT_MIN * (editorFontSize / MIN_EDITOR_FONT_SIZE);
  return visualLines * perLine <= availableUnits;
}

function minEditorHeightUnits(codeText: string): number {
  if (!codeText.trim()) {
    return 0;
  }
  return visualCodeLineCount(codeText, MIN_EDITOR_FONT_SIZE) * EDITOR_LINE_UNITS_AT_MIN;
}

function fitEditorFontSize(params: {
  codeLines: number;
  codeText: string;
  availableUnits: number;
}): number {
  if (!params.codeText.trim()) {
    return MIN_EDITOR_FONT_SIZE;
  }
  let editorFontSize = maxEditorFontWithoutWrap(params.codeText);
  while (editorFontSize > MIN_EDITOR_FONT_SIZE) {
    const visualLines = visualCodeLineCount(params.codeText, editorFontSize);
    if (editorHeightFits(visualLines, editorFontSize, params.availableUnits)) {
      return editorFontSize;
    }
    editorFontSize -= 1;
  }
  return MIN_EDITOR_FONT_SIZE;
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
  fixed += 10 + Math.min(titleUnits * 0.3, 8); // title paper + heading
  fixed += 4.5; // footer strip
  if (hasNextLead) {
    fixed += 8;
  }
  const avgUnits = paragraphCount > 0 ? paragraphUnits / paragraphCount : 0;
  for (let i = 0; i < paragraphCount; i += 1) {
    fixed += 5.5 + Math.min(avgUnits * 0.12, 7);
  }
  if (hasCode) {
    fixed += 7.5; // editor logo row + pane header
  }
  return fixed;
}

/** Authored line count — never drop lines; the editor font shrinks instead. */
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
  return params.requestedCodeLines;
}

/**
 * Split poster card space between narrative text and a single code editor.
 * Text shrink-wraps. Editor type uses the largest font whose longest line
 * still fits on one row, then shrinks toward the floor if height is tight.
 * It never goes below MIN_EDITOR_FONT_SIZE; leftover width overflow wraps.
 */
export function fitBeatPosterCardLayout(params: {
  paragraphs: string[];
  codeLines: number;
  hasCode: boolean;
  hasNextLead?: boolean;
  titleUnits?: number;
  codeText?: string;
}): BeatPosterCardLayout {
  const { paragraphs, hasCode } = params;
  const paragraphUnits = estimateTextUnits(paragraphs.join(' '));
  const hasNextLead = params.hasNextLead ?? false;
  const titleUnits = params.titleUnits ?? 24;
  const requestedCodeLines = params.codeLines;
  const codeText = params.codeText ?? '';

  const maxCodeLines = fitBeatPosterMaxCodeLines({
    paragraphCount: paragraphs.length,
    paragraphUnits,
    hasNextLead,
    hasCode,
    titleUnits,
    requestedCodeLines,
  });
  const effectiveCodeLines = hasCode ? maxCodeLines : 0;

  // Shrink-wrap the editor to its code lines. Never starve it below the readable floor.
  const codeCardAutoHeight = hasCode && effectiveCodeLines > 0;
  const availableUnits = Math.max(
    minEditorHeightUnits(codeText),
    100 - estimateFixedHeightUnits({
      paragraphCount: paragraphs.length,
      paragraphUnits,
      hasNextLead,
      hasCode,
      titleUnits,
    }),
  );

  let codeCardFlex: number;
  let paragraphFontSize: number;
  let editorFontSize: number;

  if (!hasCode || effectiveCodeLines <= 0) {
    codeCardFlex = 0;
    paragraphFontSize = spaciousParagraphSize(paragraphs);
    editorFontSize = MIN_EDITOR_FONT_SIZE;
  } else {
    codeCardFlex = 0;
    paragraphFontSize = spaciousParagraphSize(paragraphs);
    editorFontSize = fitEditorFontSize({
      codeLines: effectiveCodeLines,
      codeText,
      availableUnits,
    });
  }

  // Narrative must always read larger than the code it explains.
  paragraphFontSize = Math.max(paragraphFontSize, editorFontSize + 2);

  if (hasNextLead && paragraphs.length >= 2 && effectiveCodeLines >= 8) {
    paragraphFontSize = Math.max(editorFontSize + 2, paragraphFontSize - 2);
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
