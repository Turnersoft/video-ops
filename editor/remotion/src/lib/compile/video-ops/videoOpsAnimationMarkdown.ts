import { parseVisualNotesDirective } from "../../../components/BeatDirectives/beatDirectives";
import type { CompareHintTarget } from "../../tracks/captionBeats";
import type { CompareFontScales } from "../../tracks/compareFontScale";
import {
  compareHintKey,
  type CompareHintLayout,
} from "../../tracks/compareHintLayout";

import {
  COMPARE_PANE_CODE_AS_BEFORE,
  VIDEO_OPS_ANIMATION_VERSION_V4,
  isComparePaneCodeAsBefore,
  resolveComparePaneCode,
  type CompareFocusSide,
  type ComparePortraitBottomTarget,
  type OutdoorPresenterMode,
  type VideoOpsAnimationSceneV4,
  type VideoOpsAnimationV4,
  type VideoOpsCompareBeatHint,
  type VideoOpsCompareOverlayDef,
  type VideoOpsComparePaneBeat,
  type VideoOpsCompareSceneBeatV4,
} from "./videoOpsAnimationBeats";

export const VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME = "animation.md";
export const VIDEO_OPS_ANIMATION_MARKDOWN_VERSION = 1;

type SourceLine = {
  number: number;
  text: string;
};

type DirectiveMap = Record<string, string>;

type ParsedSection = {
  heading: string;
  headingLine: number;
  lines: SourceLine[];
};

type ParsedSceneSource = {
  index: number;
  title?: string;
  headingLine: number;
  directives: DirectiveMap;
  overlays: Record<string, VideoOpsCompareOverlayDef>;
  beats: ParsedBeatSource[];
};

type ParsedBeatSource = {
  index: number;
  title?: string;
  headingLine: number;
  directives: DirectiveMap;
  say: string;
  sayZh?: string;
  visualNotes?: string;
  comment?: string;
  lean?: VideoOpsComparePaneBeat;
  turn?: VideoOpsComparePaneBeat;
  /** Editable manim-web scene body for `beat-template: manim-motion`. */
  manimWebCode?: string;
  hints: VideoOpsCompareBeatHint[];
  video?: VideoOpsCompareSceneBeatV4["video"];
};

type ParsedAnimationMarkdown = {
  metadata: DirectiveMap;
  scenes: ParsedSceneSource[];
};

export type CompileVideoOpsAnimationMarkdownOptions = {
  baseAnimation?: VideoOpsAnimationV4;
  expectedScriptId?: string;
};

export class VideoOpsAnimationMarkdownError extends Error {
  public readonly line?: number;

  public constructor(message: string, line?: number) {
    super(line === undefined ? message : `Line ${line}: ${message}`);
    this.name = "VideoOpsAnimationMarkdownError";
    this.line = line;
  }
}

function fail(message: string, line?: number): never {
  throw new VideoOpsAnimationMarkdownError(message, line);
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    return trimmed;
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizeDirectiveKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split(".")
    .map((part) => part.replace(/[\s_-]+/g, ""))
    .join(".");
}

const EDITOR_COMMENT_PATTERN = /<!--\s*comment:\s*([\s\S]*?)-->/gi;

function parseDirectiveEntries(raw: string): DirectiveMap {
  const directives: DirectiveMap = {};
  for (const entry of raw.split(/\n|;/)) {
    const match = entry.trim().match(/^([^:]+):\s*(.*)$/);
    if (!match) {
      continue;
    }
    const key = normalizeDirectiveKey(match[1]);
    if (key === "comment") {
      continue;
    }
    directives[key] = unquote(match[2]);
  }
  return directives;
}

function extractEditorComments(text: string): {
  stripped: string;
  comments: string[];
} {
  const comments: string[] = [];
  const stripped = text.replace(EDITOR_COMMENT_PATTERN, (_, body: string) => {
    const trimmed = body.trim();
    if (trimmed) {
      comments.push(trimmed);
    }
    return "";
  });
  return { stripped, comments };
}

function mergeEditorComments(parts: string[]): string | undefined {
  const merged = parts.map((part) => part.trim()).filter(Boolean);
  if (merged.length === 0) {
    return undefined;
  }
  return merged.join("\n\n");
}

function stripEditorCommentsFromCode(code: string): string {
  const { stripped } = extractEditorComments(code);
  return stripped
    .split("\n")
    .map((line) => line.replace(/\s+$/u, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function directivesFromLines(lines: SourceLine[]): DirectiveMap {
  const source = lines.map((line) => line.text).join("\n");
  const directives: DirectiveMap = {};
  const pattern = /<!--([\s\S]*?)-->/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const body = match[1].trim();
    // Beat variant payloads are JSON metadata, not layout directives.
    if (/^beat-variants\s*:/i.test(body) || /^beat-studio\s*:/i.test(body)) {
      continue;
    }
    Object.assign(directives, parseDirectiveEntries(match[1]));
  }
  return directives;
}

function withoutHtmlComments(lines: SourceLine[]): SourceLine[] {
  const result: SourceLine[] = [];
  let insideComment = false;
  for (const line of lines) {
    let text = line.text;
    let output = "";
    let cursor = 0;
    while (cursor < text.length) {
      if (insideComment) {
        const end = text.indexOf("-->", cursor);
        if (end < 0) {
          cursor = text.length;
          continue;
        }
        insideComment = false;
        cursor = end + 3;
        continue;
      }
      const start = text.indexOf("<!--", cursor);
      if (start < 0) {
        output += text.slice(cursor);
        cursor = text.length;
        continue;
      }
      output += text.slice(cursor, start);
      const end = text.indexOf("-->", start + 4);
      if (end < 0) {
        insideComment = true;
        cursor = text.length;
        continue;
      }
      cursor = end + 3;
    }
    result.push({ ...line, text: output });
  }
  return result;
}

function plainLines(lines: SourceLine[]): string[] {
  return withoutHtmlComments(lines)
    .map((line) => line.text.trim().replace(/^>\s?/, ""))
    .filter(Boolean);
}

/** Drop fenced code blocks (e.g. ```beat-variants) so they are not treated as spoken text. */
function withoutFencedCodeBlocks(lines: SourceLine[]): SourceLine[] {
  const result: SourceLine[] = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line.text)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    result.push(line);
  }
  return result;
}

const BEAT_STUDIO_COMMENT_RE = /<!--\s*beat-studio:\s*[\s\S]*?-->/gi;

/**
 * Visual notes may embed `<!-- beat-studio: {...} -->` for Remotion beat templates.
 * Preserve those blocks while stripping other HTML comments (directives, etc.).
 */
function visualNotesFromLines(lines: SourceLine[]): string {
  const studioBlocks: string[] = [];
  const masked = lines.map((line) => ({
    ...line,
    text: line.text.replace(BEAT_STUDIO_COMMENT_RE, (block) => {
      const token = `__BEAT_STUDIO_${studioBlocks.length}__`;
      studioBlocks.push(block.trim());
      return token;
    }),
  }));
  return plainLines(masked)
    .map((line) =>
      line.replace(/__BEAT_STUDIO_(\d+)__/g, (_, index: string) => {
        return studioBlocks[Number(index)] ?? "";
      }),
    )
    .join("\n");
}

function headingIndexes(
  lines: SourceLine[],
  pattern: RegExp,
): Array<{ offset: number; match: RegExpMatchArray }> {
  const indexes: Array<{ offset: number; match: RegExpMatchArray }> = [];
  let inFence = false;
  for (let offset = 0; offset < lines.length; offset += 1) {
    const text = lines[offset].text;
    if (/^\s*```/.test(text)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    const match = text.match(pattern);
    if (match) {
      indexes.push({ offset, match });
    }
  }
  return indexes;
}

function parseFrontmatter(lines: SourceLine[]): {
  metadata: DirectiveMap;
  body: SourceLine[];
} {
  const firstContent = lines.findIndex((line) => line.text.trim().length > 0);
  if (firstContent < 0 || lines[firstContent].text.trim() !== "---") {
    fail(
      "animation.md must start with a --- frontmatter block.",
      lines[firstContent]?.number ?? 1,
    );
  }
  const end = lines.findIndex(
    (line, index) => index > firstContent && line.text.trim() === "---",
  );
  if (end < 0) {
    fail("Frontmatter is missing its closing ---.", lines[firstContent].number);
  }
  const metadata: DirectiveMap = {};
  for (const line of lines.slice(firstContent + 1, end)) {
    const trimmed = line.text.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const match = trimmed.match(/^([^:]+):\s*(.*)$/);
    if (!match) {
      fail('Frontmatter entries must use "key: value".', line.number);
    }
    metadata[normalizeDirectiveKey(match[1])] = unquote(match[2]);
  }
  return { metadata, body: lines.slice(end + 1) };
}

function parseSections(lines: SourceLine[]): {
  intro: SourceLine[];
  sections: ParsedSection[];
} {
  const headings = headingIndexes(lines, /^###\s+(.+?)\s*$/);
  if (headings.length === 0) {
    return { intro: lines, sections: [] };
  }
  const sections = headings.map((heading, index) => {
    const nextOffset = headings[index + 1]?.offset ?? lines.length;
    return {
      heading: heading.match[1].trim(),
      headingLine: lines[heading.offset].number,
      lines: lines.slice(heading.offset + 1, nextOffset),
    };
  });
  return {
    intro: lines.slice(0, headings[0].offset),
    sections,
  };
}

function stripMarkdownCode(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("`") && trimmed.endsWith("`") && trimmed.length >= 2
    ? trimmed.slice(1, -1)
    : trimmed;
}

function parsePaneSection(
  section: ParsedSection,
  side: "lean" | "turn",
): VideoOpsComparePaneBeat {
  const directives = directivesFromLines(section.lines);
  assertKnownDirectives(
    directives,
    ["ref"],
    section.headingLine,
    `${side} section`,
  );

  const fenceStarts = section.lines
    .map((line, offset) => ({ line, offset }))
    .filter(({ line }) => /^\s*```/.test(line.text));
  if (fenceStarts.length !== 0 && fenceStarts.length !== 2) {
    fail(
      `${side} must contain one complete fenced code block.`,
      section.headingLine,
    );
  }

  let code: string | undefined;
  let contentWithoutFence = section.lines;
  if (fenceStarts.length === 2) {
    const start = fenceStarts[0];
    const end = fenceStarts[1];
    const language = start.line.text.trim().slice(3).trim().toLowerCase();
    if (language && language !== side) {
      fail(
        `${side} code fence must be tagged \`\`\`${side}, not \`\`\`${language}.`,
        start.line.number,
      );
    }
    if (end.offset <= start.offset) {
      fail(`Unclosed ${side} code fence.`, start.line.number);
    }
    code = stripEditorCommentsFromCode(
      section.lines
        .slice(start.offset + 1, end.offset)
        .map((line) => line.text)
        .join("\n"),
    );
    contentWithoutFence = [
      ...section.lines.slice(0, start.offset),
      ...section.lines.slice(end.offset + 1),
    ];
  }

  const fields: Pick<
    VideoOpsComparePaneBeat,
    "highlights" | "goal" | "knowledge"
  > = {};
  let activeList: keyof typeof fields | undefined;
  for (const line of withoutHtmlComments(contentWithoutFence)) {
    const trimmed = line.text.trim();
    if (!trimmed) {
      continue;
    }
    const label = trimmed.match(/^(Highlights|Goal|Knowledge):\s*$/i);
    if (label) {
      const key = label[1].toLowerCase();
      activeList =
        key === "highlights"
          ? "highlights"
          : key === "goal"
            ? "goal"
            : "knowledge";
      fields[activeList] = [];
      continue;
    }
    const item = trimmed.match(/^-\s+(.+)$/);
    if (item && activeList) {
      fields[activeList]!.push(stripMarkdownCode(item[1]));
      continue;
    }
    fail(
      `${side} content outside the code fence must be a Highlights, Goal, or Knowledge list.`,
      line.number,
    );
  }

  const ref = directives.ref?.trim();
  if (code === undefined && !ref) {
    fail(
      `${side} requires either a fenced code block or <!-- ref: ... -->.`,
      section.headingLine,
    );
  }
  if (code !== undefined && ref) {
    fail(`${side} cannot use both inline code and ref.`, section.headingLine);
  }

  return {
    ...(code === undefined ? {} : { code }),
    ...(ref ? { ref } : {}),
    ...(fields.highlights ? { highlights: fields.highlights } : {}),
    ...(fields.goal ? { goal: fields.goal } : {}),
    ...(fields.knowledge ? { knowledge: fields.knowledge } : {}),
  };
}

function parseHighlightListSection(section: ParsedSection): string[] {
  const highlights: string[] = [];
  for (const line of withoutHtmlComments(section.lines)) {
    const trimmed = line.text.trim();
    if (!trimmed || /^Highlights:\s*$/i.test(trimmed)) {
      continue;
    }
    const item = trimmed.match(/^-\s+(.+)$/);
    if (item) {
      highlights.push(stripMarkdownCode(item[1]));
      continue;
    }
    fail(
      "Highlight sections must contain a bullet list (optional Highlights: header).",
      line.number,
    );
  }
  if (highlights.length === 0) {
    fail(
      "Highlight sections must contain at least one bullet.",
      section.headingLine,
    );
  }
  return highlights;
}

function mergePaneHighlights(
  pane: VideoOpsComparePaneBeat | undefined,
  section: ParsedSection,
  side: "lean" | "turn",
): VideoOpsComparePaneBeat {
  if (!pane) {
    fail(
      `### ${side === "lean" ? "Lean" : "Turn-Lang"} highlights must follow a ### ${side === "lean" ? "Lean" : "Turn-Lang"} section.`,
      section.headingLine,
    );
  }
  const highlights = parseHighlightListSection(section);
  return {
    ...pane,
    highlights: [...(pane.highlights ?? []), ...highlights],
  };
}

function parseHintSection(
  section: ParsedSection,
  inferredSide: "lean" | "turn" | undefined,
): VideoOpsCompareBeatHint {
  const directives = directivesFromLines(section.lines);
  assertKnownDirectives(
    directives,
    ["target", "needle", "position"],
    section.headingLine,
    "hint",
  );
  const headingTarget = section.heading.match(/^Hint(?:\s*:\s*(.+))?$/i)?.[1];
  const targetRaw = directives.target ?? headingTarget;
  const target = targetRaw
    ? parseHintTarget(targetRaw, section.headingLine)
    : inferredSide === "lean"
      ? "lean-code"
      : inferredSide === "turn"
        ? "turn-code"
        : fail(
            "Hint needs target: ... because no Lean or Turn-Lang section precedes it.",
            section.headingLine,
          );
  const text = plainLines(section.lines).join(" ").trim();
  if (!text) {
    fail("Hint text cannot be empty.", section.headingLine);
  }

  const position = directives.position
    ? parseHintPosition(directives.position, section.headingLine)
    : undefined;
  return {
    target,
    text,
    ...(directives.needle ? { needle: directives.needle } : {}),
    ...(position ? { layout: position } : {}),
  };
}

function parseVideoSection(
  section: ParsedSection,
): VideoOpsCompareSceneBeatV4["video"] {
  const directives = directivesFromLines(section.lines);
  assertKnownDirectives(
    directives,
    ["objectfit", "label"],
    section.headingLine,
    "video section",
  );
  const body = plainLines(section.lines);
  if (body.length !== 1) {
    fail(
      "Video section must contain exactly one asset path line.",
      section.headingLine,
    );
  }
  const objectFit = directives.objectfit
    ? parseObjectFit(directives.objectfit, section.headingLine)
    : undefined;
  return {
    src: body[0],
    ...(objectFit ? { objectFit } : {}),
    ...(directives.label ? { label: directives.label } : {}),
  };
}

function extractOverlayFencedCode(
  section: ParsedSection,
  language: string,
  headingLine: number,
): string {
  const fenceStarts = section.lines
    .map((line, offset) => ({ line, offset }))
    .filter(({ line }) => /^\s*```/.test(line.text));
  if (fenceStarts.length !== 2) {
    fail(
      `${section.heading} must contain one complete fenced \`\`\`${language}\`\`\` block.`,
      section.headingLine,
    );
  }
  const start = fenceStarts[0];
  const end = fenceStarts[1];
  const tag = start.line.text.trim().slice(3).trim().toLowerCase();
  if (tag && tag !== language) {
    fail(
      `${section.heading} fence must be tagged \`\`\`${language}, not \`\`\`${tag}.`,
      start.line.number,
    );
  }
  if (end.offset <= start.offset) {
    fail(`Unclosed ${section.heading} code fence.`, start.line.number);
  }
  const trailing = section.lines.slice(end.offset + 1);
  if (plainLines(trailing).length > 0) {
    fail(
      `${section.heading} must contain only the fenced code block.`,
      headingLine,
    );
  }
  return section.lines
    .slice(start.offset + 1, end.offset)
    .map((line) => line.text)
    .join("\n")
    .trim();
}

function parseOverlayResource(
  name: string,
  headingLine: number,
  lines: SourceLine[],
): VideoOpsCompareOverlayDef {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name)) {
    fail(
      `Overlay name "${name}" may only contain letters, numbers, hyphens, and underscores.`,
      headingLine,
    );
  }
  const { intro, sections } = parseSections(lines);
  const directives = directivesFromLines(intro);
  assertKnownDirectives(
    directives,
    [
      "type",
      "src",
      "objectfit",
      "label",
      "aataexcerpt",
      "placement",
      "definitionlabel",
      "source",
      "section",
      "booktitle",
      "bookauthor",
    ],
    headingLine,
    "overlay",
  );
  if (plainLines(intro).length > 0) {
    fail("Overlay settings must be inside an HTML comment.", headingLine);
  }
  const type = directives.type?.trim().toLowerCase();
  if (type === "textbook") {
    if (
      directives.placement &&
      !["top", "center"].includes(directives.placement)
    ) {
      fail("Textbook overlay placement must be top or center.", headingLine);
    }
    let latex: string | undefined;
    let definitionLabel = directives.definitionlabel?.trim();
    let source = directives.source?.trim();
    let sectionLabel = directives.section?.trim();
    let bookTitle = directives.booktitle?.trim();
    let bookAuthor = directives.bookauthor?.trim();
    for (const section of sections) {
      const heading = section.heading.toLowerCase();
      if (heading === "latex") {
        if (latex) {
          fail(
            "Overlay may contain only one ### LaTeX section.",
            section.headingLine,
          );
        }
        latex = extractOverlayFencedCode(section, "latex", headingLine);
        continue;
      }
      if (heading === "label" || heading === "definition label") {
        const text = plainLines(section.lines).join("\n").trim();
        if (!text) {
          fail(`${section.heading} must not be empty.`, section.headingLine);
        }
        definitionLabel = text;
        continue;
      }
      if (heading === "source") {
        const text = plainLines(section.lines).join("\n").trim();
        if (!text) {
          fail(`${section.heading} must not be empty.`, section.headingLine);
        }
        source = text;
        continue;
      }
      if (heading === "section") {
        const text = plainLines(section.lines).join("\n").trim();
        if (!text) {
          fail(`${section.heading} must not be empty.`, section.headingLine);
        }
        sectionLabel = text;
        continue;
      }
      if (heading === "footer") {
        const lines = plainLines(section.lines)
          .map((line) => line.trim())
          .filter(Boolean);
        if (lines.length === 0) {
          fail(`${section.heading} must not be empty.`, section.headingLine);
        }
        bookTitle = lines[0];
        bookAuthor = lines[1] ?? bookAuthor;
        continue;
      }
      fail(
        `Unknown overlay section "### ${section.heading}".`,
        section.headingLine,
      );
    }
    return {
      type: "textbook",
      ...(directives.aataexcerpt
        ? { aataExcerpt: directives.aataexcerpt }
        : {}),
      ...(directives.placement
        ? { placement: directives.placement as "top" | "center" }
        : {}),
      ...(latex ? { latex } : {}),
      ...(definitionLabel ? { definitionLabel } : {}),
      ...(source ? { source } : {}),
      ...(sectionLabel ? { section: sectionLabel } : {}),
      ...(bookTitle ? { bookTitle } : {}),
      ...(bookAuthor ? { bookAuthor } : {}),
    };
  }
  if (type === "video") {
    if (!directives.src) {
      fail("Video overlay requires src.", headingLine);
    }
    return {
      type: "video",
      src: directives.src,
      ...(directives.objectfit
        ? { objectFit: parseObjectFit(directives.objectfit, headingLine) }
        : {}),
      ...(directives.label ? { label: directives.label } : {}),
    };
  }
  fail(
    `Overlay type must be textbook or video, received "${directives.type ?? ""}".`,
    headingLine,
  );
}

function parseBeat(
  index: number,
  title: string | undefined,
  headingLine: number,
  lines: SourceLine[],
): ParsedBeatSource {
  const { intro, sections } = parseSections(lines);
  const directives = directivesFromLines(intro);
  const beatWideAllowScriptChange =
    directivesFromLines(lines).allowscriptchange;
  if (beatWideAllowScriptChange) {
    directives.allowscriptchange = beatWideAllowScriptChange;
  }
  assertKnownDirectives(
    directives,
    [
      "duration",
      "durationseconds",
      "focus",
      "overlay",
      "presenter",
      "scriptfullscreen",
      "pipshape",
      "pipsize",
      "pipposition",
      "pipscale",
      "pipcrop",
      "allowscriptchange",
      "fontscales",
      "font.editor",
      "font.lean",
      "font.render",
      "screenrecording",
      "portraitbottom",
    ],
    headingLine,
    "beat",
  );

  let say = plainLines(withoutFencedCodeBlocks(intro)).join("\n");
  let sayZh: string | undefined;
  let visualNotes: string | undefined;
  const commentParts: string[] = [];
  let lean: VideoOpsComparePaneBeat | undefined;
  let turn: VideoOpsComparePaneBeat | undefined;
  let manimWebCode: string | undefined;
  let video: VideoOpsCompareSceneBeatV4["video"];
  const hints: VideoOpsCompareBeatHint[] = [];
  let lastPane: "lean" | "turn" | undefined;

  for (const section of sections) {
    const normalized = section.heading.trim().toLowerCase();
    if (normalized === "script" || normalized === "say") {
      if (say) {
        fail(
          "Put script text either before subsections or under ### Script, not both.",
          section.headingLine,
        );
      }
      say = plainLines(section.lines).join("\n");
      continue;
    }
    if (normalized === "lean") {
      if (lean) {
        fail("A beat can only have one ### Lean section.", section.headingLine);
      }
      lean = parsePaneSection(section, "lean");
      lastPane = "lean";
      continue;
    }
    if (normalized === "turn" || normalized === "turn-lang" || normalized === "turn lang") {
      if (turn) {
        fail("A beat can only have one ### Turn-Lang section.", section.headingLine);
      }
      turn = parsePaneSection(section, "turn");
      lastPane = "turn";
      continue;
    }
    if (normalized === "lean highlights") {
      if (lean?.highlights?.length) {
        fail(
          "A beat can only have one ### Lean highlights section.",
          section.headingLine,
        );
      }
      lean = mergePaneHighlights(lean, section, "lean");
      continue;
    }
    if (
      normalized === "turn highlights" ||
      normalized === "turn-lang highlights" ||
      normalized === "turn lang highlights"
    ) {
      if (turn?.highlights?.length) {
        fail(
          "A beat can only have one ### Turn-Lang highlights section.",
          section.headingLine,
        );
      }
      turn = mergePaneHighlights(turn, section, "turn");
      continue;
    }
    if (/^hint(?:\s*:|$)/i.test(section.heading)) {
      hints.push(parseHintSection(section, lastPane));
      continue;
    }
    if (["chinese", "say zh", "script zh"].includes(normalized)) {
      if (sayZh !== undefined) {
        fail(
          "A beat can only have one Chinese script section.",
          section.headingLine,
        );
      }
      sayZh = plainLines(section.lines).join("\n");
      continue;
    }
    if (normalized === "manim" || normalized === "manim-web") {
      if (manimWebCode !== undefined) {
        fail("A beat can only have one ### Manim section.", section.headingLine);
      }
      manimWebCode = parseManimWebSection(section);
      continue;
    }
    if (normalized === "visual notes") {
      if (visualNotes !== undefined) {
        fail(
          "A beat can only have one Visual notes section.",
          section.headingLine,
        );
      }
      visualNotes = visualNotesFromLines(section.lines);
      continue;
    }
    if (normalized === "ai comment" || normalized === "comment") {
      const legacyComment = plainLines(section.lines).join("\n").trim();
      if (legacyComment) {
        commentParts.push(legacyComment);
      }
      Object.assign(directives, directivesFromLines(section.lines));
      assertKnownDirectives(
        directivesFromLines(section.lines),
        ["allowscriptchange"],
        section.headingLine,
        "comment",
      );
      continue;
    }
    if (normalized === "video") {
      if (video) {
        fail("A beat can only have one Video section.", section.headingLine);
      }
      video = parseVideoSection(section);
      continue;
    }
    fail(
      `Unknown beat subsection "### ${section.heading}".`,
      section.headingLine,
    );
  }

  for (const hint of hints) {
    if (hint.target.startsWith("lean-")) {
      lean = { ...lean, hints: [...(lean?.hints ?? []), hint] };
    } else {
      turn = { ...turn, hints: [...(turn?.hints ?? []), hint] };
    }
  }

  const beatSource = lines.map((line) => line.text).join("\n");
  const { comments: inlineComments } = extractEditorComments(beatSource);
  const comment = mergeEditorComments([...inlineComments, ...commentParts]);

  return {
    index,
    title,
    headingLine,
    directives,
    say,
    ...(sayZh === undefined ? {} : { sayZh }),
    ...(visualNotes === undefined ? {} : { visualNotes }),
    ...(comment === undefined ? {} : { comment }),
    ...(lean ? { lean } : {}),
    ...(turn ? { turn } : {}),
    ...(manimWebCode === undefined ? {} : { manimWebCode }),
    hints,
    ...(video ? { video } : {}),
  };
}

/** One fenced `manim-web` / `manim` block under ### Manim. */
function parseManimWebSection(section: ParsedSection): string {
  const fenceStarts = section.lines
    .map((line, offset) => ({ line, offset }))
    .filter(({ line }) => /^\s*```/.test(line.text));
  if (fenceStarts.length !== 2) {
    fail(
      "Manim must contain one complete fenced ```manim-web code block.",
      section.headingLine,
    );
  }
  const start = fenceStarts[0];
  const end = fenceStarts[1];
  const language = start.line.text.trim().slice(3).trim().toLowerCase();
  if (language && language !== "manim-web" && language !== "manim" && language !== "js") {
    fail(
      `Manim code fence must be tagged \`\`\`manim-web (got \`\`\`${language}).`,
      start.line.number,
    );
  }
  if (end.offset <= start.offset) {
    fail("Unclosed manim-web code fence.", start.line.number);
  }
  const code = stripEditorCommentsFromCode(
    section.lines
      .slice(start.offset + 1, end.offset)
      .map((line) => line.text)
      .join("\n"),
  ).trim();
  if (!code) {
    fail("Manim code fence is empty.", start.line.number);
  }
  return code;
}

function parseScene(
  index: number,
  title: string | undefined,
  headingLine: number,
  lines: SourceLine[],
): ParsedSceneSource {
  const levelTwoHeadings = headingIndexes(lines, /^##\s+(.+?)\s*$/);
  const beatHeadings = headingIndexes(
    lines,
    /^##\s+Beat\s+(\d+)(?:\s*(?::|—|-)\s*(.*))?\s*$/i,
  );
  if (beatHeadings.length === 0) {
    fail("Each scene needs at least one ## Beat section.", headingLine);
  }
  const firstLevelTwoOffset =
    levelTwoHeadings[0]?.offset ?? beatHeadings[0].offset;
  const intro = lines.slice(0, firstLevelTwoOffset);
  const unexpectedIntro = plainLines(intro);
  if (unexpectedIntro.length > 0) {
    fail(
      "Scene-level settings must be inside an HTML comment before the first beat.",
      intro.find((line) => line.text.trim())?.number ?? headingLine,
    );
  }
  const directives = directivesFromLines(intro);
  assertKnownDirectives(
    directives,
    [
      "layout",
      "burncaptions",
      "visualnotes",
      "teleprompter.position",
      "pace.syllablespersecond",
      "pace.wordspersecond",
      "pace.pauseafterbeat",
      "pace.minbeatseconds",
      "pace.pacefactor",
      "display.editorfontscale",
      "display.leaneditorfontscale",
      "display.renderfontscale",
      "presentation.src",
      "presentation.objectfit",
      "presentation.label",
      "presentation.trimin",
      "presentation.trimout",
    ],
    headingLine,
    "scene",
  );

  const overlays: Record<string, VideoOpsCompareOverlayDef> = {};
  let hasSeenBeat = false;
  for (
    let headingIndex = 0;
    headingIndex < levelTwoHeadings.length;
    headingIndex += 1
  ) {
    const heading = levelTwoHeadings[headingIndex];
    if (/^Beat\s+\d+/i.test(heading.match[1])) {
      hasSeenBeat = true;
      continue;
    }
    const overlayMatch = heading.match[1].match(
      /^Overlay\s*(?::|—|-)\s*([A-Za-z0-9][A-Za-z0-9_-]*)\s*$/i,
    );
    if (!overlayMatch) {
      fail(
        `Unknown scene section "## ${heading.match[1]}".`,
        lines[heading.offset].number,
      );
    }
    if (hasSeenBeat) {
      fail(
        "Overlay resources must be declared before the first beat.",
        lines[heading.offset].number,
      );
    }
    const name = overlayMatch[1];
    if (overlays[name]) {
      fail(
        `Duplicate overlay resource "${name}".`,
        lines[heading.offset].number,
      );
    }
    const end = levelTwoHeadings[headingIndex + 1]?.offset ?? lines.length;
    overlays[name] = parseOverlayResource(
      name,
      lines[heading.offset].number,
      lines.slice(heading.offset + 1, end),
    );
  }

  const beats = beatHeadings.map((beatHeading, beatOffset) => {
    const declaredIndex = Number.parseInt(beatHeading.match[1], 10);
    const expectedIndex = beatOffset + 1;
    if (declaredIndex !== expectedIndex) {
      fail(
        `Beat headings must be sequential. Expected Beat ${expectedIndex}, found Beat ${declaredIndex}.`,
        lines[beatHeading.offset].number,
      );
    }
    const end = beatHeadings[beatOffset + 1]?.offset ?? lines.length;
    return parseBeat(
      declaredIndex,
      beatHeading.match[2]?.trim() || undefined,
      lines[beatHeading.offset].number,
      lines.slice(beatHeading.offset + 1, end),
    );
  });

  return { index, title, headingLine, directives, overlays, beats };
}

function parseAnimationMarkdown(markdown: string): ParsedAnimationMarkdown {
  const lines = markdown
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((text, offset) => ({
      number: offset + 1,
      text,
    }));
  const { metadata, body } = parseFrontmatter(lines);
  const sceneHeadings = headingIndexes(
    body,
    /^#\s+Scene\s+(\d+)(?:\s*(?::|—|-)\s*(.*))?\s*$/i,
  );
  if (sceneHeadings.length === 0) {
    fail('animation.md needs at least one "# Scene 1" heading.');
  }
  const beforeFirstScene = plainLines(body.slice(0, sceneHeadings[0].offset));
  if (beforeFirstScene.length > 0) {
    fail("Content before the first scene is not allowed.", body[0]?.number);
  }
  const scenes = sceneHeadings.map((sceneHeading, sceneOffset) => {
    const declaredIndex = Number.parseInt(sceneHeading.match[1], 10);
    const expectedIndex = sceneOffset + 1;
    if (declaredIndex !== expectedIndex) {
      fail(
        `Scene headings must be sequential. Expected Scene ${expectedIndex}, found Scene ${declaredIndex}.`,
        body[sceneHeading.offset].number,
      );
    }
    const end = sceneHeadings[sceneOffset + 1]?.offset ?? body.length;
    return parseScene(
      declaredIndex,
      sceneHeading.match[2]?.trim() || undefined,
      body[sceneHeading.offset].number,
      body.slice(sceneHeading.offset + 1, end),
    );
  });
  return { metadata, scenes };
}

function assertKnownDirectives(
  directives: DirectiveMap,
  known: string[],
  line: number,
  context: string,
): void {
  const allowed = new Set(known);
  for (const key of Object.keys(directives)) {
    if (!allowed.has(key)) {
      fail(`Unknown ${context} directive "${key}".`, line);
    }
  }
}

function parseNumber(value: string, line: number, name: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    fail(`${name} must be a number, received "${value}".`, line);
  }
  return parsed;
}

function parsePositiveNumber(
  value: string,
  line: number,
  name: string,
): number {
  const parsed = parseNumber(value, line, name);
  if (parsed <= 0) {
    fail(`${name} must be greater than zero.`, line);
  }
  return parsed;
}

function parseBoolean(value: string, line: number, name: string): boolean {
  if (value.trim().toLowerCase() === "true") {
    return true;
  }
  if (value.trim().toLowerCase() === "false") {
    return false;
  }
  return fail(`${name} must be true or false, received "${value}".`, line);
}

function parseHintTarget(value: string, line: number): CompareHintTarget {
  const normalized = value.trim().toLowerCase();
  const targets: CompareHintTarget[] = [
    "lean-code",
    "lean-goal",
    "turn-code",
    "turn-knowledge",
  ];
  if (!targets.includes(normalized as CompareHintTarget)) {
    fail(`Invalid hint target "${value}".`, line);
  }
  return normalized as CompareHintTarget;
}

function parseHintPosition(
  value: string,
  line: number,
): VideoOpsCompareBeatHint["layout"] {
  const values = value
    .split(",")
    .map((part) => parseNumber(part.trim(), line, "Hint position"));
  if (values.length !== 2 && values.length !== 4) {
    fail("Hint position needs x,y or x,y,highlightX,highlightY.", line);
  }
  if (values.some((part) => part < 0 || part > 100)) {
    fail("Hint position values must be percentages from 0 to 100.", line);
  }
  return {
    xPct: values[0],
    yPct: values[1],
    ...(values.length === 4
      ? { highlightAnchorX: values[2], highlightAnchorY: values[3] }
      : {}),
  };
}

function parseObjectFit(value: string, line: number): "contain" | "cover" {
  const normalized = value.trim().toLowerCase();
  if (normalized !== "contain" && normalized !== "cover") {
    fail(`object-fit must be contain or cover, received "${value}".`, line);
  }
  return normalized;
}

function parseFocus(value: string, line: number): CompareFocusSide {
  const normalized = value.trim().toLowerCase();
  if (normalized !== "lean" && normalized !== "turn" && normalized !== "both") {
    fail(`focus must be lean, turn, or both, received "${value}".`, line);
  }
  return normalized;
}

function parsePortraitBottom(
  value: string,
  line: number,
): ComparePortraitBottomTarget {
  const normalized = value.trim().toLowerCase();
  if (normalized !== "lean-code" && normalized !== "turn-render") {
    fail(
      `portrait-bottom must be lean-code or turn-render, received "${value}".`,
      line,
    );
  }
  return normalized;
}

function parsePresenter(value: string, line: number): OutdoorPresenterMode {
  const normalized = value.trim().toLowerCase();
  if (normalized !== "split-crop" && normalized !== "full-clip") {
    fail(
      `presenter must be split-crop or full-clip, received "${value}".`,
      line,
    );
  }
  return normalized;
}

function parsePipShape(value: string, line: number): "circle" | "rectangle" {
  const normalized = value.trim().toLowerCase();
  if (
    normalized !== "circle" &&
    normalized !== "rectangle" &&
    normalized !== "rect"
  ) {
    fail(`pip-shape must be circle or rectangle, received "${value}".`, line);
  }
  return normalized === "circle" ? "circle" : "rectangle";
}

function parseNormalizedPair(
  value: string,
  line: number,
  label: string,
): { first: number; second: number } {
  const parts = value.split(",").map((part) => part.trim());
  if (parts.length !== 2) {
    fail(
      `${label} must be two comma-separated numbers, received "${value}".`,
      line,
    );
  }
  const first = Number(parts[0]);
  const second = Number(parts[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    fail(`${label} must be numeric, received "${value}".`, line);
  }
  return { first, second };
}

function parseBeatPipMask(
  directives: DirectiveMap,
  line: number,
): import("./videoOpsAnimationBeats").OutdoorBeatPipMask | undefined {
  const hasMaskDirective =
    directives.pipshape ||
    directives.pipsize ||
    directives.pipposition ||
    directives.pipscale ||
    directives.pipcrop;
  if (!hasMaskDirective) {
    return undefined;
  }
  const size = directives.pipsize
    ? parseNormalizedPair(directives.pipsize, line, "pip-size")
    : { first: 0.28, second: 0.38 };
  const position = directives.pipposition
    ? parseNormalizedPair(directives.pipposition, line, "pip-position")
    : { first: 0.02, second: 0.55 };
  const crop = directives.pipcrop
    ? parseNormalizedPair(directives.pipcrop, line, "pip-crop")
    : { first: 0.62, second: 0.42 };
  return {
    shape: directives.pipshape
      ? parsePipShape(directives.pipshape, line)
      : "rectangle",
    x: position.first,
    y: position.second,
    w: size.first,
    h: size.second,
    objectPositionX: crop.first,
    objectPositionY: crop.second,
    scale: directives.pipscale
      ? parsePositiveNumber(directives.pipscale, line, "pip-scale")
      : 1.28,
  };
}

function compileBeat(
  source: ParsedBeatSource,
  baseBeat: VideoOpsCompareSceneBeatV4 | undefined,
): VideoOpsCompareSceneBeatV4 {
  const directives = source.directives;
  const durationRaw = directives.durationseconds ?? directives.duration;
  const durationSeconds =
    durationRaw && durationRaw.trim().toLowerCase() !== "auto"
      ? parsePositiveNumber(durationRaw, source.headingLine, "duration")
      : (baseBeat?.durationSeconds ?? 1);
  const focus = directives.focus
    ? parseFocus(directives.focus, source.headingLine)
    : undefined;
  const portraitBottomRaw =
    directives.portraitbottom ??
    (source.visualNotes
      ? parseVisualNotesDirective(source.visualNotes, "portrait-bottom")
      : undefined);
  const portraitBottom = portraitBottomRaw
    ? parsePortraitBottom(portraitBottomRaw, source.headingLine)
    : undefined;
  const presenter = directives.presenter
    ? parsePresenter(directives.presenter, source.headingLine)
    : undefined;
  const scriptFullscreen = directives.scriptfullscreen
    ? parseBoolean(
        directives.scriptfullscreen,
        source.headingLine,
        "script-fullscreen",
      )
    : undefined;
  const pipMask = parseBeatPipMask(directives, source.headingLine);
  const allowScriptChange = directives.allowscriptchange
    ? parseBoolean(
        directives.allowscriptchange,
        source.headingLine,
        "allow-script-change",
      )
    : undefined;
  const fontScales =
    directives.fontscales?.trim().toLowerCase() === COMPARE_PANE_CODE_AS_BEFORE
      ? COMPARE_PANE_CODE_AS_BEFORE
      : directives["font.editor"] ||
          directives["font.lean"] ||
          directives["font.render"]
        ? {
            ...(directives["font.editor"]
              ? {
                  editorFontScale: parsePositiveNumber(
                    directives["font.editor"],
                    source.headingLine,
                    "font.editor",
                  ),
                }
              : {}),
            ...(directives["font.lean"]
              ? {
                  leanEditorFontScale: parsePositiveNumber(
                    directives["font.lean"],
                    source.headingLine,
                    "font.lean",
                  ),
                }
              : {}),
            ...(directives["font.render"]
              ? {
                  renderFontScale: parsePositiveNumber(
                    directives["font.render"],
                    source.headingLine,
                    "font.render",
                  ),
                }
              : {}),
          }
        : undefined;

  return {
    say: source.say,
    durationSeconds,
    ...(source.sayZh === undefined ? {} : { sayZh: source.sayZh }),
    ...(source.visualNotes === undefined
      ? {}
      : { visualNotes: source.visualNotes }),
    ...(source.lean ? { lean: source.lean } : {}),
    ...(source.turn ? { turn: source.turn } : {}),
    ...(source.manimWebCode ? { manimWebCode: source.manimWebCode } : {}),
    ...(directives.overlay ? { overlay: directives.overlay } : {}),
    ...(focus ? { focus } : {}),
    ...(portraitBottom ? { portraitBottom } : {}),
    ...(fontScales ? { fontScales } : {}),
    ...(presenter ? { presenter } : {}),
    ...(scriptFullscreen ? { scriptFullscreen } : {}),
    ...(pipMask ? { pipMask } : {}),
    ...(source.video ? { video: source.video } : {}),
    ...(directives.screenrecording?.trim()
      ? { screenRecording: directives.screenrecording.trim() }
      : {}),
    ...(source.comment === undefined ? {} : { comment: source.comment }),
    ...(allowScriptChange === undefined ? {} : { allowScriptChange }),
  };
}

function scenePaceFromDirectives(
  directives: DirectiveMap,
  line: number,
): NonNullable<VideoOpsAnimationSceneV4["teleprompter"]>["pace"] | undefined {
  const values = {
    syllablesPerSecond: directives["pace.syllablespersecond"],
    wordsPerSecond: directives["pace.wordspersecond"],
    pauseAfterBeat: directives["pace.pauseafterbeat"],
    minBeatSeconds: directives["pace.minbeatseconds"],
    paceFactor: directives["pace.pacefactor"],
  };
  if (!Object.values(values).some((value) => value !== undefined)) {
    return undefined;
  }
  return {
    ...(values.syllablesPerSecond
      ? {
          syllablesPerSecond: parsePositiveNumber(
            values.syllablesPerSecond,
            line,
            "pace.syllables-per-second",
          ),
        }
      : {}),
    ...(values.wordsPerSecond
      ? {
          wordsPerSecond: parsePositiveNumber(
            values.wordsPerSecond,
            line,
            "pace.words-per-second",
          ),
        }
      : {}),
    ...(values.pauseAfterBeat
      ? {
          pauseAfterBeat: parseNumber(
            values.pauseAfterBeat,
            line,
            "pace.pause-after-beat",
          ),
        }
      : {}),
    ...(values.minBeatSeconds
      ? {
          minBeatSeconds: parsePositiveNumber(
            values.minBeatSeconds,
            line,
            "pace.min-beat-seconds",
          ),
        }
      : {}),
    ...(values.paceFactor
      ? {
          paceFactor: parsePositiveNumber(
            values.paceFactor,
            line,
            "pace.pace-factor",
          ),
        }
      : {}),
  };
}

function dropStaleBeatAlignment(
  baseScene: VideoOpsAnimationSceneV4 | undefined,
  beatCount: number,
): VideoOpsAnimationSceneV4 | undefined {
  if (!baseScene) {
    return undefined;
  }
  let scene = baseScene;
  if (
    scene.voiceEdit?.beatDurationsSeconds &&
    scene.voiceEdit.beatDurationsSeconds.length !== beatCount
  ) {
    const { voiceEdit: _voiceEdit, ...rest } = scene;
    scene = rest as VideoOpsAnimationSceneV4;
  }
  if (
    scene.outdoorEdit?.beatDurationsSeconds &&
    scene.outdoorEdit.beatDurationsSeconds.length !== beatCount
  ) {
    const { outdoorEdit: _outdoorEdit, ...rest } = scene;
    scene = rest as VideoOpsAnimationSceneV4;
  }
  return scene;
}

function compileScene(
  source: ParsedSceneSource,
  baseScene: VideoOpsAnimationSceneV4 | undefined,
): VideoOpsAnimationSceneV4 {
  baseScene = dropStaleBeatAlignment(baseScene, source.beats.length);

  const beats = source.beats.map((beat, index) =>
    compileBeat(beat, baseScene?.compare.beats[index]),
  );
  const directives = source.directives;
  const existingTeleprompter = baseScene?.teleprompter;
  const pace = scenePaceFromDirectives(directives, source.headingLine);
  const position = directives["teleprompter.position"];
  if (
    position &&
    position !== "bottom" &&
    position !== "lower-third" &&
    position !== "below-canvas"
  ) {
    fail(`Invalid teleprompter position "${position}".`, source.headingLine);
  }
  const displayOverrides = {
    ...(directives["display.editorfontscale"]
      ? {
          editorFontScale: parsePositiveNumber(
            directives["display.editorfontscale"],
            source.headingLine,
            "display.editor-font-scale",
          ),
        }
      : {}),
    ...(directives["display.leaneditorfontscale"]
      ? {
          leanEditorFontScale: parsePositiveNumber(
            directives["display.leaneditorfontscale"],
            source.headingLine,
            "display.lean-editor-font-scale",
          ),
        }
      : {}),
    ...(directives["display.renderfontscale"]
      ? {
          renderFontScale: parsePositiveNumber(
            directives["display.renderfontscale"],
            source.headingLine,
            "display.render-font-scale",
          ),
        }
      : {}),
  };
  const hasDisplayOverrides = Object.keys(displayOverrides).length > 0;
  const presentationSrc = directives["presentation.src"];
  const presentation = presentationSrc
    ? {
        type: "video-clip" as const,
        src: presentationSrc,
        ...(directives["presentation.objectfit"]
          ? {
              objectFit: parseObjectFit(
                directives["presentation.objectfit"],
                source.headingLine,
              ),
            }
          : {}),
        ...(directives["presentation.label"]
          ? { label: directives["presentation.label"] }
          : {}),
        ...(directives["presentation.trimin"]
          ? {
              trimIn: parseNumber(
                directives["presentation.trimin"],
                source.headingLine,
                "presentation.trim-in",
              ),
            }
          : {}),
        ...(directives["presentation.trimout"]
          ? {
              trimOut: parseNumber(
                directives["presentation.trimout"],
                source.headingLine,
                "presentation.trim-out",
              ),
            }
          : {}),
      }
    : baseScene?.presentation;
  const durationSeconds = beats.reduce(
    (sum, beat) => sum + beat.durationSeconds,
    0,
  );
  const scene: VideoOpsAnimationSceneV4 = {
    ...(baseScene ?? {
      index: source.index,
      durationSeconds,
      layout: "dual-panel",
      burnCaptions: true,
      compare: { beats: [] },
    }),
    index: source.index,
    ...(source.title ? { title: source.title } : {}),
    durationSeconds,
    ...(directives.layout
      ? { layout: directives.layout as VideoOpsAnimationSceneV4["layout"] }
      : {}),
    ...(directives.burncaptions
      ? {
          burnCaptions: parseBoolean(
            directives.burncaptions,
            source.headingLine,
            "burn-captions",
          ),
        }
      : {}),
    ...(directives.visualnotes ? { visualNotes: directives.visualnotes } : {}),
    ...(position || pace
      ? {
          teleprompter: {
            ...existingTeleprompter,
            ...(position
              ? {
                  position: position as NonNullable<
                    VideoOpsAnimationSceneV4["teleprompter"]
                  >["position"],
                }
              : {}),
            ...(pace
              ? { pace: { ...existingTeleprompter?.pace, ...pace } }
              : {}),
          },
        }
      : {}),
    ...(presentation ? { presentation } : {}),
    compare: {
      ...baseScene?.compare,
      ...(Object.keys(source.overlays).length > 0
        ? {
            overlays: {
              ...baseScene?.compare.overlays,
              ...source.overlays,
            },
          }
        : {}),
      ...(hasDisplayOverrides
        ? {
            display: {
              ...baseScene?.compare.display,
              ...displayOverrides,
            },
          }
        : {}),
      beats,
    },
  };
  const authoredComparePanes = beats.some((beat) =>
    Boolean(beat.lean || beat.turn || beat.overlay),
  );
  if (scene.layout === "dual-panel" && authoredComparePanes) {
    delete scene.legacyCompareLayer;
  }
  validateCompiledScene(source, scene);
  return scene;
}

function validateCompiledScene(
  source: ParsedSceneSource,
  scene: VideoOpsAnimationSceneV4,
): void {
  let previousLean = "";
  let previousTurn = "";
  for (let index = 0; index < scene.compare.beats.length; index += 1) {
    const beat = scene.compare.beats[index];
    const sourceBeat = source.beats[index];
    if (beat.overlay && !scene.compare.overlays?.[beat.overlay]) {
      fail(`Unknown overlay "${beat.overlay}".`, sourceBeat.headingLine);
    }

    previousLean = validatePane(
      beat.lean,
      scene,
      "lean",
      previousLean,
      sourceBeat.headingLine,
    );
    previousTurn = validatePane(
      beat.turn,
      scene,
      "turn",
      previousTurn,
      sourceBeat.headingLine,
    );
  }
}

function validatePane(
  pane: VideoOpsComparePaneBeat | undefined,
  scene: VideoOpsAnimationSceneV4,
  side: "lean" | "turn",
  previousCode: string,
  line: number,
): string {
  if (!pane) {
    return previousCode;
  }
  if (isComparePaneCodeAsBefore(pane.code) && !previousCode) {
    fail(`The first ${side} pane cannot use "as before".`, line);
  }
  if (pane.ref && !scene.compare.blocks?.[pane.ref]?.[side]) {
    fail(`Unknown ${side} code block ref "${pane.ref}".`, line);
  }
  const code = resolveComparePaneCode(
    pane,
    scene.compare.blocks,
    side,
    previousCode,
  );
  for (const needle of pane.highlights ?? []) {
    if (!code.includes(needle)) {
      fail(
        `${side} highlight "${needle}" does not occur in the displayed code.`,
        line,
      );
    }
  }
  for (const hint of pane.hints ?? []) {
    if (!hint.needle) {
      continue;
    }
    const haystack =
      hint.target === "lean-code" || hint.target === "turn-code"
        ? code
        : hint.target === "lean-goal"
          ? (pane.goal ?? []).join("\n")
          : (pane.knowledge ?? []).join("\n");
    if (!haystack.includes(hint.needle)) {
      fail(
        `${hint.target} hint needle "${hint.needle}" does not occur in its target.`,
        line,
      );
    }
  }
  return code || previousCode;
}

/**
 * Compile the author-facing animation.md language into animation.json v4.
 * Existing scene resources and recording alignment are retained from baseAnimation.
 */
export function compileVideoOpsAnimationMarkdown(
  markdown: string,
  options: CompileVideoOpsAnimationMarkdownOptions = {},
): VideoOpsAnimationV4 {
  const parsed = parseAnimationMarkdown(markdown);
  assertKnownDirectives(
    parsed.metadata,
    [
      "videoops",
      "scriptid",
      "title",
      "format",
      "fps",
      "width",
      "height",
      "socialtitleenglish",
      "socialtitlechina",
      "promotionaldescription",
      "promotionaldescriptionchina",
    ],
    1,
    "frontmatter",
  );
  const languageVersion = Number.parseInt(parsed.metadata.videoops ?? "", 10);
  if (languageVersion !== VIDEO_OPS_ANIMATION_MARKDOWN_VERSION) {
    fail(
      `videoOps must be ${VIDEO_OPS_ANIMATION_MARKDOWN_VERSION}, received "${parsed.metadata.videoops ?? ""}".`,
      1,
    );
  }
  const scriptId =
    parsed.metadata.scriptid ??
    options.baseAnimation?.scriptId ??
    options.expectedScriptId ??
    fail("Frontmatter requires scriptId.", 1);
  if (options.expectedScriptId && scriptId !== options.expectedScriptId) {
    fail(
      `scriptId "${scriptId}" does not match folder script "${options.expectedScriptId}".`,
      1,
    );
  }
  if (options.baseAnimation && options.baseAnimation.scriptId !== scriptId) {
    fail(
      `Base animation scriptId "${options.baseAnimation.scriptId}" does not match "${scriptId}".`,
      1,
    );
  }

  const baseSceneIndexes =
    options.baseAnimation?.scenes.map((scene) => scene.index) ?? [];
  const sourceSceneIndexes = parsed.scenes.map((scene) => scene.index);
  if (
    baseSceneIndexes.length > 0 &&
    (baseSceneIndexes.length !== sourceSceneIndexes.length ||
      baseSceneIndexes.some(
        (index, offset) => index !== sourceSceneIndexes[offset],
      ))
  ) {
    fail(
      `animation.md scenes [${sourceSceneIndexes.join(", ")}] do not match animation.json scenes [${baseSceneIndexes.join(", ")}].`,
    );
  }

  const baseComposition = options.baseAnimation?.composition;
  const format =
    parsed.metadata.format ?? baseComposition?.format ?? "landscape";
  if (format !== "short" && format !== "landscape" && format !== "long") {
    fail(`format must be short, landscape, or long, received "${format}".`, 1);
  }
  const fps = parsed.metadata.fps
    ? parsePositiveNumber(parsed.metadata.fps, 1, "fps")
    : (baseComposition?.fps ?? 30);
  const width = parsed.metadata.width
    ? parsePositiveNumber(parsed.metadata.width, 1, "width")
    : (baseComposition?.width ?? 1920);
  const height = parsed.metadata.height
    ? parsePositiveNumber(parsed.metadata.height, 1, "height")
    : (baseComposition?.height ?? 1080);

  return {
    version: VIDEO_OPS_ANIMATION_VERSION_V4,
    scriptId,
    ...(parsed.metadata.title || options.baseAnimation?.title
      ? { title: parsed.metadata.title ?? options.baseAnimation?.title }
      : {}),
    composition: {
      ...baseComposition,
      format,
      fps,
      width,
      height,
    },
    scenes: parsed.scenes.map((scene) =>
      compileScene(
        scene,
        options.baseAnimation?.scenes.find(
          (baseScene) => baseScene.index === scene.index,
        ),
      ),
    ),
  };
}

type LocatedMarkdownBeat = {
  lines: string[];
  beatHeadingOffset: number;
  beatEndOffset: number;
  sectionHeadings: Array<{ offset: number; heading: string }>;
};

function locateMarkdownBeat(
  markdown: string,
  sceneArrayIndex: number,
  beatArrayIndex: number,
): LocatedMarkdownBeat {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const numbered = lines.map((text, offset) => ({ number: offset + 1, text }));
  const { body } = parseFrontmatter(numbered);
  const sceneHeadings = headingIndexes(
    body,
    /^#\s+Scene\s+(\d+)(?:\s*(?::|—|-)\s*(.*))?\s*$/i,
  );
  const sceneHeading = sceneHeadings[sceneArrayIndex];
  if (!sceneHeading) {
    fail(`Scene ${sceneArrayIndex + 1} is missing from animation.md.`);
  }
  const nextSceneOffset =
    sceneHeadings[sceneArrayIndex + 1]?.offset ?? body.length;
  const sceneLines = body.slice(sceneHeading.offset + 1, nextSceneOffset);
  const beatHeadings = headingIndexes(
    sceneLines,
    /^##\s+Beat\s+(\d+)(?:\s*(?::|—|-)\s*(.*))?\s*$/i,
  );
  const beatHeading = beatHeadings[beatArrayIndex];
  if (!beatHeading) {
    fail(
      `Beat ${beatArrayIndex + 1} is missing from Scene ${sceneArrayIndex + 1} in animation.md.`,
    );
  }
  const beatHeadingLine = sceneLines[beatHeading.offset].number;
  const nextBeatOffset =
    beatHeadings[beatArrayIndex + 1]?.offset ?? sceneLines.length;
  const beatEndLine =
    nextBeatOffset < sceneLines.length
      ? sceneLines[nextBeatOffset].number
      : nextSceneOffset < body.length
        ? body[nextSceneOffset].number
        : lines.length + 1;
  const beatBody = sceneLines.slice(beatHeading.offset + 1, nextBeatOffset);
  const sections = headingIndexes(beatBody, /^###\s+(.+?)\s*$/).map(
    (section) => ({
      offset: beatBody[section.offset].number - 1,
      heading: section.match[1].trim(),
    }),
  );
  return {
    lines,
    beatHeadingOffset: beatHeadingLine - 1,
    beatEndOffset: beatEndLine - 1,
    sectionHeadings: sections,
  };
}

function markdownContentLines(value: string): string[] {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      if (/^\s*(?:#{1,3}\s|<!--)/.test(line)) {
        return `> ${line}`;
      }
      return line;
    });
}

function replaceMarkdownLines(
  lines: string[],
  startOffset: number,
  endOffset: number,
  replacement: string[],
): string {
  return [
    ...lines.slice(0, startOffset),
    ...replacement,
    ...lines.slice(endOffset),
  ].join("\n");
}

function leadingBeatDirectiveEnd(
  lines: string[],
  startOffset: number,
  endOffset: number,
): number {
  let offset = startOffset;
  let inComment = false;
  while (offset < endOffset) {
    const text = lines[offset];
    const trimmed = text.trim();
    if (inComment) {
      if (trimmed.includes("-->")) {
        inComment = false;
      }
      offset += 1;
      continue;
    }
    if (!trimmed) {
      offset += 1;
      continue;
    }
    if (trimmed.startsWith("<!--")) {
      inComment = !trimmed.includes("-->");
      offset += 1;
      continue;
    }
    break;
  }
  return offset;
}

/** Update one spoken beat while retaining all visual Markdown sections. */
export function updateVideoOpsAnimationMarkdownBeatSay(
  markdown: string,
  sceneArrayIndex: number,
  beatArrayIndex: number,
  say: string,
): string {
  const located = locateMarkdownBeat(markdown, sceneArrayIndex, beatArrayIndex);
  const scriptSectionIndex = located.sectionHeadings.findIndex(({ heading }) =>
    /^(?:script|say)$/i.test(heading),
  );
  const replacement = ["", ...markdownContentLines(say), ""];
  if (scriptSectionIndex >= 0) {
    const section = located.sectionHeadings[scriptSectionIndex];
    const nextSection = located.sectionHeadings[scriptSectionIndex + 1];
    return replaceMarkdownLines(
      located.lines,
      section.offset + 1,
      nextSection?.offset ?? located.beatEndOffset,
      replacement,
    );
  }

  const firstSectionOffset =
    located.sectionHeadings[0]?.offset ?? located.beatEndOffset;
  const scriptStart = leadingBeatDirectiveEnd(
    located.lines,
    located.beatHeadingOffset + 1,
    firstSectionOffset,
  );
  return replaceMarkdownLines(located.lines, scriptStart, firstSectionOffset, [
    ...markdownContentLines(say),
    "",
  ]);
}

function formatEditorCommentBlock(comment: string): string[] {
  const trimmed = comment.trim();
  if (!trimmed) {
    return [];
  }
  return ["", "<!-- comment:", ...markdownContentLines(trimmed), "-->", ""];
}

/** Update beat-level editor comments and script-change permission in animation.md. */
export function updateVideoOpsAnimationMarkdownBeatEditorNotes(
  markdown: string,
  sceneArrayIndex: number,
  beatArrayIndex: number,
  comment: string,
  allowScriptChange: boolean,
): string {
  const located = locateMarkdownBeat(markdown, sceneArrayIndex, beatArrayIndex);
  const beatBodyStart = located.beatHeadingOffset + 1;
  const beatBodyEnd = located.beatEndOffset;
  let beatBodyLines = located.lines.slice(beatBodyStart, beatBodyEnd);

  const numberedBeatBody = beatBodyLines.map((text, offset) => ({
    number: beatBodyStart + offset + 1,
    text,
  }));
  const sectionStarts = headingIndexes(numberedBeatBody, /^###\s+(.+?)\s*$/);
  for (const section of sectionStarts) {
    if (/^(?:ai comment|comment)$/i.test(section.match[1].trim())) {
      const nextOffset =
        sectionStarts.find((candidate) => candidate.offset > section.offset)
          ?.offset ?? beatBodyLines.length;
      beatBodyLines = [
        ...beatBodyLines.slice(0, section.offset),
        ...beatBodyLines.slice(nextOffset),
      ];
      break;
    }
  }

  const strippedBody = extractEditorComments(
    beatBodyLines.join("\n"),
  ).stripped.replace(/\n{3,}/g, "\n\n");
  let rebuiltBeatBody = strippedBody.split("\n");

  const firstSectionOffset =
    headingIndexes(
      rebuiltBeatBody.map((text, offset) => ({ number: offset + 1, text })),
      /^###\s+(.+?)\s*$/,
    )[0]?.offset ?? rebuiltBeatBody.length;
  const directiveEnd = leadingBeatDirectiveEnd(
    rebuiltBeatBody,
    0,
    firstSectionOffset,
  );
  const directiveLines = rebuiltBeatBody
    .slice(0, directiveEnd)
    .map((text, offset) => ({
      number: offset + 1,
      text,
    }));
  const directives = directivesFromLines(directiveLines);
  directives.allowscriptchange = allowScriptChange ? "true" : "false";
  rebuiltBeatBody = [
    "<!--",
    ...formatBeatDirectives(directives),
    "-->",
    "",
    ...rebuiltBeatBody.slice(directiveEnd),
  ];
  rebuiltBeatBody.push(...formatEditorCommentBlock(comment));

  return replaceMarkdownLines(
    located.lines,
    beatBodyStart,
    beatBodyEnd,
    rebuiltBeatBody,
  );
}

const BEAT_DIRECTIVE_NAMES: Record<string, string> = {
  duration: "duration",
  durationseconds: "duration",
  focus: "focus",
  overlay: "overlay",
  presenter: "presenter",
  scriptfullscreen: "script-fullscreen",
  pipshape: "pip-shape",
  pipsize: "pip-size",
  pipposition: "pip-position",
  pipscale: "pip-scale",
  pipcrop: "pip-crop",
  allowscriptchange: "allow-script-change",
  fontscales: "font-scales",
  "font.editor": "font.editor",
  "font.lean": "font.lean",
  "font.render": "font.render",
  screenrecording: "screen-recording",
  portraitbottom: "portrait-bottom",
};

function formatBeatDirectives(directives: DirectiveMap): string[] {
  return Object.entries(directives).map(([key, value]) => {
    const name = BEAT_DIRECTIVE_NAMES[key] ?? key;
    return `${name}: ${value}`;
  });
}

/** Persist the Studio's per-beat pane zoom controls in animation.md. */
export function updateVideoOpsAnimationMarkdownBeatFontScales(
  markdown: string,
  sceneArrayIndex: number,
  beatFontScales: CompareFontScales[],
): string {
  const parsed = parseAnimationMarkdown(markdown);
  const scene = parsed.scenes[sceneArrayIndex];
  if (!scene) {
    fail(`Scene ${sceneArrayIndex + 1} is missing from animation.md.`);
  }
  if (scene.beats.length !== beatFontScales.length) {
    fail(
      `Expected ${scene.beats.length} beat font scales, received ${beatFontScales.length}.`,
      scene.headingLine,
    );
  }

  let updated = markdown;
  for (
    let beatIndex = beatFontScales.length - 1;
    beatIndex >= 0;
    beatIndex -= 1
  ) {
    const located = locateMarkdownBeat(updated, sceneArrayIndex, beatIndex);
    const firstSectionOffset =
      located.sectionHeadings[0]?.offset ?? located.beatEndOffset;
    const directiveEnd = leadingBeatDirectiveEnd(
      located.lines,
      located.beatHeadingOffset + 1,
      firstSectionOffset,
    );
    const directiveLines = located.lines
      .slice(located.beatHeadingOffset + 1, directiveEnd)
      .map((text, offset) => ({
        number: located.beatHeadingOffset + offset + 2,
        text,
      }));
    const directives = directivesFromLines(directiveLines);
    delete directives.fontscales;
    const scales = beatFontScales[beatIndex];
    directives["font.editor"] = String(scales.editorFontScale);
    directives["font.lean"] = String(scales.leanEditorFontScale);
    directives["font.render"] = String(scales.renderFontScale);
    updated = replaceMarkdownLines(
      located.lines,
      located.beatHeadingOffset + 1,
      directiveEnd,
      ["", "<!--", ...formatBeatDirectives(directives), "-->", ""],
    );
  }
  return updated;
}

function formatHintPosition(layout: CompareHintLayout): string {
  const values = [layout.xPct, layout.yPct];
  if (
    layout.highlightAnchorX !== undefined &&
    layout.highlightAnchorY !== undefined
  ) {
    values.push(layout.highlightAnchorX, layout.highlightAnchorY);
  }
  return values.map((value) => Number(value.toFixed(3))).join(",");
}

function updateHintPositionInSection(
  lines: string[],
  startOffset: number,
  endOffset: number,
  position: string,
): string[] {
  const section = lines.slice(startOffset, endOffset);
  const source = section.join("\n");
  if (/(\bposition\s*:\s*)[^;\n]*?(?=\s*(?:;|-->|$))/i.test(source)) {
    return source
      .replace(
        /(\bposition\s*:\s*)[^;\n]*?(?=\s*(?:;|-->|$))/i,
        `$1${position}`,
      )
      .split("\n");
  }
  const commentEnd = source.lastIndexOf("-->");
  if (commentEnd >= 0) {
    const before = source.slice(0, commentEnd).trimEnd();
    const separator =
      before.endsWith("<!--") || before.endsWith(";") ? " " : "; ";
    return `${before}${separator}position: ${position} ${source.slice(commentEnd)}`.split(
      "\n",
    );
  }
  return [...section, `<!-- position: ${position} -->`];
}

/**
 * Copy draggable hint-panel positions into each hint's trailing Markdown comment.
 * Layout keys use the same stable beat/target/needle/text identity as the renderer.
 */
export function updateVideoOpsAnimationMarkdownHintLayouts(
  markdown: string,
  sceneArrayIndex: number,
  layouts: Record<string, CompareHintLayout>,
): string {
  let updated = markdown;
  const compiledSource = parseAnimationMarkdown(markdown);
  const scene = compiledSource.scenes[sceneArrayIndex];
  if (!scene) {
    fail(`Scene ${sceneArrayIndex + 1} is missing from animation.md.`);
  }

  for (let beatIndex = scene.beats.length - 1; beatIndex >= 0; beatIndex -= 1) {
    const located = locateMarkdownBeat(updated, sceneArrayIndex, beatIndex);
    const hintSections = located.sectionHeadings
      .map((section, sectionIndex) => ({
        ...section,
        endOffset:
          located.sectionHeadings[sectionIndex + 1]?.offset ??
          located.beatEndOffset,
      }))
      .filter(({ heading }) => /^hint(?:\s*:|$)/i.test(heading));
    let inferredSide: "lean" | "turn" | undefined;
    const parsedHints: Array<{
      section: (typeof hintSections)[number];
      hint: VideoOpsCompareBeatHint;
    }> = [];
    for (
      let sectionIndex = 0;
      sectionIndex < located.sectionHeadings.length;
      sectionIndex += 1
    ) {
      const section = located.sectionHeadings[sectionIndex];
      if (/^lean$/i.test(section.heading)) {
        inferredSide = "lean";
        continue;
      }
      if (/^turn$/i.test(section.heading)) {
        inferredSide = "turn";
        continue;
      }
      if (!/^hint(?:\s*:|$)/i.test(section.heading)) {
        continue;
      }
      const endOffset =
        located.sectionHeadings[sectionIndex + 1]?.offset ??
        located.beatEndOffset;
      parsedHints.push({
        section: { ...section, endOffset },
        hint: parseHintSection(
          {
            heading: section.heading,
            headingLine: section.offset + 1,
            lines: located.lines
              .slice(section.offset + 1, endOffset)
              .map((text, offset) => ({
                number: section.offset + offset + 2,
                text,
              })),
          },
          inferredSide,
        ),
      });
    }

    const replacements = parsedHints
      .map(({ section, hint }) => ({
        section,
        layout: layouts[compareHintKey(beatIndex, hint)],
      }))
      .filter(
        (
          item,
        ): item is {
          section: (typeof hintSections)[number];
          layout: CompareHintLayout;
        } => item.layout !== undefined,
      )
      .sort((left, right) => right.section.offset - left.section.offset);
    for (const { section, layout } of replacements) {
      const lines = updated.replace(/\r\n?/g, "\n").split("\n");
      const replacement = updateHintPositionInSection(
        lines,
        section.offset + 1,
        section.endOffset,
        formatHintPosition(layout),
      );
      updated = replaceMarkdownLines(
        lines,
        section.offset + 1,
        section.endOffset,
        replacement,
      );
    }
  }
  return updated;
}

function formatPipDirectiveNumber(value: number): string {
  return String(Number(value.toFixed(4)));
}

/** Persist filmed-avatar mask box for one beat in animation.md directive comments. */
export function updateVideoOpsAnimationMarkdownBeatPipMask(
  markdown: string,
  sceneArrayIndex: number,
  beatArrayIndex: number,
  pipMask: import("./videoOpsAnimationBeats").OutdoorBeatPipMask,
): string {
  const located = locateMarkdownBeat(markdown, sceneArrayIndex, beatArrayIndex);
  const firstSectionOffset =
    located.sectionHeadings[0]?.offset ?? located.beatEndOffset;
  const directiveEnd = leadingBeatDirectiveEnd(
    located.lines,
    located.beatHeadingOffset + 1,
    firstSectionOffset,
  );
  const directiveLines = located.lines
    .slice(located.beatHeadingOffset + 1, directiveEnd)
    .map((text, offset) => ({
      number: located.beatHeadingOffset + offset + 2,
      text,
    }));
  const directives = directivesFromLines(directiveLines);
  directives.pipshape = pipMask.shape;
  directives.pipsize = `${formatPipDirectiveNumber(pipMask.w)}, ${formatPipDirectiveNumber(pipMask.h)}`;
  directives.pipposition = `${formatPipDirectiveNumber(pipMask.x)}, ${formatPipDirectiveNumber(pipMask.y)}`;
  directives.pipcrop = `${formatPipDirectiveNumber(pipMask.objectPositionX ?? 0.5)}, ${formatPipDirectiveNumber(pipMask.objectPositionY ?? 0.5)}`;
  if (pipMask.scale !== undefined && Math.abs(pipMask.scale - 1) > 0.001) {
    directives.pipscale = formatPipDirectiveNumber(pipMask.scale);
  } else {
    delete directives.pipscale;
  }
  return replaceMarkdownLines(
    located.lines,
    located.beatHeadingOffset + 1,
    directiveEnd,
    ["", "<!--", ...formatBeatDirectives(directives), "-->", ""],
  );
}

function beatBodyUsesFilmedComparePipMask(located: LocatedMarkdownBeat): boolean {
  const start = located.beatHeadingOffset + 1;
  const end = located.beatEndOffset;
  const body = located.lines
    .slice(start, end)
    .map((line) => (typeof line === "string" ? line : line.text))
    .join("\n");
  if (/beat-template:\s*manim-motion/i.test(body)) {
    return false;
  }
  if (/beat-template:\s*compare-dual/i.test(body)) {
    return true;
  }
  if (/"template"\s*:\s*"compare-dual"/i.test(body)) {
    return true;
  }
  if (/"kind"\s*:\s*"compare-dual"/i.test(body)) {
    return true;
  }
  if (/layer:\s*compare/i.test(body) && /lean-render:\s*true/i.test(body)) {
    return true;
  }
  return false;
}

function beatHasPipMaskDirectives(directives: DirectiveMap): boolean {
  return Boolean(
    directives.pipshape ||
      directives.pipsize ||
      directives.pipposition ||
      directives.pipscale ||
      directives.pipcrop,
  );
}

/**
 * Seed the filmed-footage PIP preset onto compare-dual beats that lack pip directives.
 * Used when align generates the edited take animation.
 */
export function seedOutdoorCompareBeatPipMasksInAnimationMarkdown(
  markdown: string,
  sceneArrayIndex: number,
  pipMask: import("./videoOpsAnimationBeats").OutdoorBeatPipMask,
): { markdown: string; seededBeatIndexes: number[] } {
  const parsed = parseAnimationMarkdown(markdown);
  const scene = parsed.scenes[sceneArrayIndex];
  if (!scene) {
    return { markdown, seededBeatIndexes: [] };
  }

  let updated = markdown;
  const seededBeatIndexes: number[] = [];
  for (let beatIndex = 0; beatIndex < scene.beats.length; beatIndex += 1) {
    const located = locateMarkdownBeat(updated, sceneArrayIndex, beatIndex);
    if (!beatBodyUsesFilmedComparePipMask(located)) {
      continue;
    }
    const firstSectionOffset =
      located.sectionHeadings[0]?.offset ?? located.beatEndOffset;
    const directiveEnd = leadingBeatDirectiveEnd(
      located.lines,
      located.beatHeadingOffset + 1,
      firstSectionOffset,
    );
    const directiveLines = located.lines
      .slice(located.beatHeadingOffset + 1, directiveEnd)
      .map((text, offset) => ({
        number: located.beatHeadingOffset + offset + 2,
        text,
      }));
    const directives = directivesFromLines(directiveLines);
    if (beatHasPipMaskDirectives(directives)) {
      continue;
    }
    updated = updateVideoOpsAnimationMarkdownBeatPipMask(
      updated,
      sceneArrayIndex,
      beatIndex,
      pipMask,
    );
    seededBeatIndexes.push(beatIndex);
  }
  return { markdown: updated, seededBeatIndexes };
}
