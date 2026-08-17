import type { VoxcpmBeatVoiceMetadata } from "./voxcpmScript.ts";

/**
 * Beat variant blocks embedded in animation.md (LLM-authored).
 *
 * Prefer a fenced block so nested `<!-- beat-studio: … -->` inside JSON
 * cannot close an outer HTML comment early:
 *
 * ```beat-variants
 * {"selected":"A","candidates":[…]}
 * ```
 *
 * Legacy HTML-comment form is still parsed for older files.
 */

export type BeatVariantContent = {
  title: string;
  say: string;
  leanCode: string;
  turnCode: string;
  visualNotes: string;
};

export type BeatVariantCandidateJson = {
  label: string;
  template: string;
  templateConfig: unknown;
  content: BeatVariantContent;
};

export type BeatVariantsBlock = {
  selected: string;
  candidates: BeatVariantCandidateJson[];
  /** AI-clone delivery metadata. Spoken text remains the canonical beat `say`. */
  voice?: VoxcpmBeatVoiceMetadata;
};

const BEAT_VARIANTS_FENCE_RE = /```beat-variants\s*\n([\s\S]*?)\n```/i;
const BEAT_VARIANTS_HTML_RE = /<!--\s*beat-variants:\s*([\s\S]*?)\s*-->/i;
/** Legacy escape used before fenced storage. */
const HTML_COMMENT_CLOSE_ESCAPE = "@@HTML_COMMENT_CLOSE@@";

function unescapeLegacyPayload(payload: string): string {
  return payload.split(HTML_COMMENT_CLOSE_ESCAPE).join("-->");
}

function stripHtmlComments(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeCodeBody(code: string): string {
  let body = code.replace(/^\uFEFF/, "").replace(/\n+$/, "");
  if (!body.trim()) {
    return "";
  }
  const nested = body.match(/```(?:lean|turn)?\s*\n([\s\S]*?)\n```/i);
  if (nested) {
    body = nested[1].replace(/\n+$/, "");
  }
  return body
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !/^```/.test(trimmed) && !/^###\s/.test(trimmed);
    })
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}

/**
 * Strip leaked beat-variants / HTML-comment garbage from spoken text.
 * Compilers used to treat ```beat-variants as say; drafts can still carry that.
 */
export function sanitizeSay(say: string): string {
  let text = say.replace(/```beat-variants\s*\n[\s\S]*?\n```/gi, "").trim();
  text = text.replace(/<!--\s*\n?beat-variants:[\s\S]*?-->/gi, "").trim();
  const looksCorrupted =
    /","leanCode"|beat-variants:|"\}\}\]\}|-->\\+n|\\n\\nbeat-template:|-->/i.test(
      text,
    ) &&
    (/beat-template:|leanCode|visualNotes|\\n/i.test(text) ||
      /"\}\}\]\}/.test(text));
  if (!looksCorrupted) {
    return text.replace(/\n{3,}/g, "\n\n").trim();
  }
  // Escaped spills often arrive as one line with literal \n / \".
  text = text.replace(/\\n/g, "\n").replace(/\\"/g, '"');
  const afterJsonTail = text.split(/\}\}\]\}\s*/).pop() ?? text;
  const lines = afterJsonTail
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^```/.test(line) || /^[{[]/.test(line) || /^-->/.test(line))
        return false;
      if (
        /beat-template:|layer:|turn-render:|lean-render:|manim-sub:|manim-code:/i.test(
          line,
        )
      ) {
        return false;
      }
      if (/","|"leanCode"|"turnCode"|"visualNotes"/.test(line)) return false;
      return true;
    });
  if (lines.length > 0) {
    return lines[lines.length - 1] ?? "";
  }
  return "";
}

/** Store candidates without nested HTML comments (template fields carry studio meta). */
function contentForStorage(content: BeatVariantContent): BeatVariantContent {
  return {
    title: content.title,
    say: sanitizeSay(content.say),
    leanCode: normalizeCodeBody(content.leanCode),
    turnCode: normalizeCodeBody(content.turnCode),
    visualNotes: stripHtmlComments(content.visualNotes),
  };
}

function contentForApply(candidate: BeatVariantCandidateJson): BeatVariantContent {
  // Keep visual notes as plain hint lines + prose. Do not inject JSON into markdown.
  return contentForStorage(candidate.content);
}

function candidateForStorage(
  candidate: BeatVariantCandidateJson,
): BeatVariantCandidateJson {
  return {
    ...candidate,
    content: contentForStorage(candidate.content),
  };
}

function blockForStorage(block: BeatVariantsBlock): BeatVariantsBlock {
  return {
    selected: block.selected,
    candidates: block.candidates.map(candidateForStorage),
    ...(block.voice ? { voice: block.voice } : {}),
  };
}

function parseVariantsJson(raw: string): BeatVariantsBlock | null {
  try {
    const parsed = JSON.parse(
      unescapeLegacyPayload(raw.trim()),
    ) as BeatVariantsBlock;
    if (
      !parsed ||
      typeof parsed.selected !== "string" ||
      !Array.isArray(parsed.candidates) ||
      parsed.candidates.length === 0
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function splitAnimationBeatSections(markdown: string): {
  prefix: string;
  sections: string[];
} {
  const match = markdown.match(/^([\s\S]*?)(?=^## Beat\s)/m);
  if (!match) {
    return { prefix: markdown, sections: [] };
  }
  const prefix = match[1];
  const rest = markdown.slice(prefix.length);
  const sections = rest
    .split(/(?=^## Beat\s)/m)
    .filter((chunk) => chunk.trim().startsWith("## Beat"));
  return { prefix, sections };
}

export function parseBeatVariantsBlock(
  section: string,
): BeatVariantsBlock | null {
  const fence = section.match(BEAT_VARIANTS_FENCE_RE);
  if (fence) {
    return parseVariantsJson(fence[1]);
  }
  const html = section.match(BEAT_VARIANTS_HTML_RE);
  if (html) {
    return parseVariantsJson(html[1]);
  }
  return null;
}

export function beatVariantsComment(block: BeatVariantsBlock): string {
  return `\`\`\`beat-variants\n${JSON.stringify(blockForStorage(block))}\n\`\`\``;
}

/** Remove fence, legacy HTML comment, and leaked corruption from nested-comment bugs. */
function stripBeatVariantsArtifacts(section: string): string {
  let next = section.replace(BEAT_VARIANTS_FENCE_RE, "");
  next = next.replace(BEAT_VARIANTS_HTML_RE, "");
  // Unclosed legacy HTML comment + spilled JSON tail.
  next = next.replace(
    /<!--\s*\n?beat-variants:[\s\S]*?(?=\n## |\n### |$)/gi,
    "",
  );
  next = next.replace(/^\s*-->\\n\\n[\s\S]*?"\}\}\]\}\s*$/gm, "");
  next = next.replace(/^\s*-->\\\\n\\\\n[\s\S]*$/gm, "");
  next = next.replace(/^\s*-->\s*$/gm, "");
  next = next.replace(/\n{3,}/g, "\n\n");
  return next;
}

export function upsertBeatVariantsComment(
  section: string,
  block: BeatVariantsBlock,
): string {
  const comment = beatVariantsComment(block);
  const next = stripBeatVariantsArtifacts(section);
  const lines = next.split("\n");
  const insertAt = skipPrefixedBlocks(lines, 1);
  return [
    ...lines.slice(0, insertAt),
    comment,
    "",
    ...lines.slice(insertAt),
  ].join("\n");
}

function parseBeatTitle(section: string, beatIndex: number): string {
  const match = section.match(/^## Beat\s+\d+:\s*(.*)$/m);
  return match?.[1]?.trim() ?? `Beat ${beatIndex + 1}`;
}

function isBeatDirectiveLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return true;
  }
  if (trimmed === "<!--") {
    return true;
  }
  return /^[a-z][a-z0-9.-]*:/i.test(trimmed);
}

/** Skip one opening HTML comment without swallowing ### / ## sections on unclosed comments. */
function skipOneHtmlCommentBlock(lines: string[], start: number): number {
  const opener = lines[start]?.trim() ?? "";
  if (!opener.startsWith("<!--")) {
    return start;
  }
  if (opener.includes("-->")) {
    return start + 1;
  }
  const commentStart = start;
  let i = start + 1;
  while (i < lines.length) {
    const current = lines[i] ?? "";
    if (current.includes("-->")) {
      return i + 1;
    }
    if (/^###\s/.test(current) || /^##\s/.test(current)) {
      i = commentStart + 1;
      while (i < lines.length && isBeatDirectiveLine(lines[i] ?? "")) {
        i += 1;
      }
      return i;
    }
    i += 1;
  }
  return commentStart + 1;
}

function skipPrefixedBlocks(lines: string[], start: number): number {
  let i = start;
  while (i < lines.length) {
    const line = lines[i]?.trim() ?? "";
    if (!line) {
      i += 1;
      continue;
    }
    if (line.startsWith("<!--")) {
      i = skipOneHtmlCommentBlock(lines, i);
      continue;
    }
    if (line.startsWith("```")) {
      i += 1;
      while (i < lines.length && lines[i]?.trim() !== "```") {
        i += 1;
      }
      i += 1;
      continue;
    }
    break;
  }
  return i;
}

function parseSay(section: string): string {
  const lines = section.split("\n");
  const sayStart = skipPrefixedBlocks(lines, 1);
  let i = sayStart;
  while (
    i < lines.length &&
    !/^###\s/.test(lines[i] ?? "") &&
    !/^##\s/.test(lines[i] ?? "")
  ) {
    i += 1;
  }
  return sanitizeSay(lines.slice(sayStart, i).join("\n").trim());
}

function parseFencedCode(section: string, lang: "lean" | "turn"): string {
  const fence = "```" + lang;
  const pattern = new RegExp(`${fence}\\s*\\n([\\s\\S]*?)\\n\`\`\``, "i");
  const match = section.match(pattern);
  return normalizeCodeBody(match?.[1] ?? "");
}

function parseVisualNotes(section: string): string {
  const heading = "### Visual notes";
  const pattern = new RegExp(
    `${heading}\\s*\\n([\\s\\S]*?)(?=\\n### |\\n## |$)`,
    "i",
  );
  const match = section.match(pattern);
  return stripBeatVariantsArtifacts(match?.[1]?.trim() ?? "");
}

function extractBeatContentFromMarkdown(
  section: string,
  beatIndex: number,
): BeatVariantContent {
  return {
    title: parseBeatTitle(section, beatIndex),
    say: parseSay(section),
    leanCode: parseFencedCode(section, "lean"),
    turnCode: parseFencedCode(section, "turn"),
    visualNotes: parseVisualNotes(section),
  };
}

function sayFromStoredOrMarkdown(jsonSay: string, markdownSay: string): string {
  const fromJson = sanitizeSay(jsonSay);
  if (fromJson && !/^beat-template:/i.test(fromJson)) {
    return fromJson;
  }
  return sanitizeSay(markdownSay);
}

export function extractBeatContentFromSection(
  section: string,
  beatIndex: number,
): BeatVariantContent {
  const block = parseBeatVariantsBlock(section);
  if (block) {
    const active = findCandidate(block, block.selected);
    if (active) {
      const markdown = extractBeatContentFromMarkdown(section, beatIndex);
      const stored = active.content;
      return {
        title: stored.title?.trim() || markdown.title,
        say: sayFromStoredOrMarkdown(stored.say, markdown.say),
        leanCode: normalizeCodeBody(stored.leanCode) || markdown.leanCode,
        turnCode: normalizeCodeBody(stored.turnCode) || markdown.turnCode,
        visualNotes:
          stripHtmlComments(stored.visualNotes) || markdown.visualNotes,
      };
    }
  }
  return extractBeatContentFromMarkdown(section, beatIndex);
}

function extractPaneBodies(section: string): Map<string, string> {
  const panes = new Map<string, string>();
  const lines = stripBeatVariantsArtifacts(section).split("\n");
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^###\s+(.+?)\s*$/);
    if (match) {
      if (currentHeading) {
        panes.set(currentHeading, currentLines.join("\n").trimEnd());
      }
      currentHeading = match[1].trim();
      currentLines = [];
      continue;
    }
    if (currentHeading) {
      currentLines.push(line);
    }
  }

  if (currentHeading) {
    panes.set(currentHeading, currentLines.join("\n").trimEnd());
  }
  return panes;
}

function extractBeatDirectives(section: string): string {
  const lines = section.split("\n");
  const directives: string[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const trimmed = lines[i]?.trim() ?? "";
    if (!trimmed) {
      continue;
    }
    if (
      trimmed.startsWith("```") ||
      /^###\s/.test(trimmed) ||
      /^##\s/.test(trimmed)
    ) {
      break;
    }
    if (trimmed.startsWith("<!--") && trimmed.includes("-->")) {
      const inner = trimmed
        .replace(/^<!--\s*/, "")
        .replace(/\s*-->$/, "")
        .trim();
      if (!/^beat-(variants|studio):/i.test(inner)) {
        directives.push(inner);
      }
      continue;
    }
    if (trimmed.startsWith("<!--")) {
      let j = i + 1;
      while (j < lines.length) {
        const current = lines[j] ?? "";
        if (current.includes("-->")) {
          const beforeClose = current.split("-->")[0]?.trim() ?? "";
          if (beforeClose && !/^beat-(variants|studio):/i.test(beforeClose)) {
            directives.push(beforeClose);
          }
          break;
        }
        if (/^###\s/.test(current) || /^##\s/.test(current)) {
          break;
        }
        if (isBeatDirectiveLine(current)) {
          directives.push(current.trim());
        }
        j += 1;
      }
      break;
    }
    if (!isBeatDirectiveLine(lines[i] ?? "")) {
      break;
    }
    directives.push(trimmed);
  }

  return directives.join("\n");
}

function stripMarkdownCode(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("`") && trimmed.endsWith("`") && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** Drop highlight bullets that no longer appear in the pane code (prevents sync failures after edits). */
function sanitizePaneHighlights(highlights: string[], code: string): string[] {
  return highlights.filter(
    (needle) => needle.trim() && code.includes(needle.trim()),
  );
}

function parseHighlightsList(text: string): string[] {
  if (!text.trim()) {
    return [];
  }
  const highlights: string[] = [];
  let inHighlights = false;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (/^Highlights:\s*$/i.test(trimmed)) {
      inHighlights = true;
      continue;
    }
    const item = trimmed.match(/^-\s+(.+)$/);
    if (item) {
      highlights.push(stripMarkdownCode(item[1] ?? ""));
      continue;
    }
    if (inHighlights && trimmed) {
      inHighlights = false;
    }
  }
  return highlights.filter(Boolean);
}

function collectPaneHighlights(
  lang: "lean" | "turn",
  codePane: string | undefined,
  highlightsPane: string | undefined,
): string[] {
  const fromDedicated = parseHighlightsList(highlightsPane ?? "");
  if (fromDedicated.length > 0) {
    return fromDedicated;
  }
  return parseHighlightsList(extractNonCodePaneSuffix(codePane ?? "", lang));
}

function formatHighlightsSection(
  heading: "Lean highlights" | "Turn highlights",
  highlights: string[],
): string {
  if (highlights.length === 0) {
    return "";
  }
  const bullets = highlights.map((item) => `- \`${item}\``).join("\n");
  return `### ${heading}\n\n${bullets}\n`;
}

function extractNonCodePaneSuffix(
  paneBody: string,
  lang: "lean" | "turn",
): string {
  const fence = "```" + lang;
  const pattern = new RegExp(`${fence}\\s*\\n[\\s\\S]*?\\n\`\`\``, "i");
  return paneBody.replace(pattern, "").trim();
}

function formatCodePane(
  heading: "Lean" | "Turn",
  lang: "lean" | "turn",
  code: string,
  codePane: string | undefined,
  highlightsPane: string | undefined,
): string {
  const body = normalizeCodeBody(code);
  const highlights = sanitizePaneHighlights(
    collectPaneHighlights(lang, codePane, highlightsPane),
    body,
  );
  let block = `### ${heading}\n\n\`\`\`${lang}\n${body}\n\`\`\`\n`;
  const highlightHeading =
    heading === "Lean" ? "Lean highlights" : "Turn highlights";
  const highlightBlock = formatHighlightsSection(highlightHeading, highlights);
  if (highlightBlock) {
    block += `\n${highlightBlock}`;
  }
  return block;
}

function renderBeatSection(
  beatIndex: number,
  block: BeatVariantsBlock,
  applied: BeatVariantContent,
  directives: string,
  panes: Map<string, string>,
): string {
  const title = applied.title.trim() || `Beat ${beatIndex + 1}`;
  const parts: string[] = [`## Beat ${beatIndex + 1}: ${title}`, ""];

  if (directives.trim()) {
    parts.push("<!--", directives.trim(), "-->", "");
  }

  parts.push(beatVariantsComment(block), "");

  if (applied.say.trim()) {
    parts.push(applied.say.trim(), "");
  }

  parts.push(
    formatCodePane(
      "Lean",
      "lean",
      applied.leanCode,
      panes.get("Lean"),
      panes.get("Lean highlights"),
    ),
  );
  parts.push(
    formatCodePane(
      "Turn",
      "turn",
      applied.turnCode,
      panes.get("Turn"),
      panes.get("Turn highlights"),
    ),
  );

  const hint = panes.get("Hint");
  if (hint?.trim()) {
    parts.push("### Hint", "", hint.trim(), "");
  }

  const chinese = panes.get("Chinese");
  if (chinese?.trim()) {
    parts.push("### Chinese", "", chinese.trim(), "");
  }

  parts.push("### Visual notes", "", applied.visualNotes.trim(), "");
  return `${parts
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd()}\n\n`;
}

function findCandidate(
  block: BeatVariantsBlock,
  label: string,
): BeatVariantCandidateJson | null {
  return (
    block.candidates.find((candidate) => candidate.label === label) ?? null
  );
}

function syncActiveCandidateContent(
  block: BeatVariantsBlock,
  content: BeatVariantContent,
): BeatVariantsBlock {
  const active = findCandidate(block, block.selected);
  if (!active) {
    return block;
  }
  return {
    ...block,
    candidates: block.candidates.map((candidate) =>
      candidate.label === block.selected
        ? {
            ...candidate,
            content: contentForStorage({
              ...candidate.content,
              ...content,
            }),
          }
        : candidate,
    ),
  };
}

export type BeatVariantPatch = {
  title?: string;
  say?: string;
  chinese?: string;
  leanCode?: string;
  turnCode?: string;
  visualNotes?: string;
  voice?: VoxcpmBeatVoiceMetadata;
  selectedVariant?: string;
  /** Append a new candidate and switch the beat section to its content. */
  addVariant?: BeatVariantCandidateJson;
};

function defaultBlockFromSection(
  section: string,
  beatIndex: number,
): BeatVariantsBlock {
  const extracted = extractBeatContentFromMarkdown(section, beatIndex);
  return {
    selected: "A",
    candidates: [
      {
        label: "A",
        template: "compare-dual",
        templateConfig: {
          kind: "compare-dual",
          config: { leanEnabled: true, turnEnabled: true },
        },
        content: contentForStorage(extracted),
      },
    ],
  };
}

function mergeBeatContent(
  section: string,
  beatIndex: number,
  block: BeatVariantsBlock,
  patch: BeatVariantPatch,
): BeatVariantContent {
  const active = findCandidate(block, block.selected);
  const base = active
    ? {
        title:
          active.content.title?.trim() || parseBeatTitle(section, beatIndex),
        say: sayFromStoredOrMarkdown(active.content.say, parseSay(section)),
        leanCode:
          normalizeCodeBody(active.content.leanCode) ||
          parseFencedCode(section, "lean"),
        turnCode:
          normalizeCodeBody(active.content.turnCode) ||
          parseFencedCode(section, "turn"),
        visualNotes: active.content.visualNotes || parseVisualNotes(section),
      }
    : extractBeatContentFromMarkdown(section, beatIndex);

  return {
    title: patch.title?.trim() || base.title,
    say: typeof patch.say === "string" ? sanitizeSay(patch.say) : base.say,
    leanCode:
      typeof patch.leanCode === "string" ? patch.leanCode : base.leanCode,
    turnCode:
      typeof patch.turnCode === "string" ? patch.turnCode : base.turnCode,
    visualNotes:
      typeof patch.visualNotes === "string"
        ? patch.visualNotes
        : base.visualNotes,
  };
}

function renderPatchedBeatSection(
  section: string,
  beatIndex: number,
  block: BeatVariantsBlock,
  content: BeatVariantContent,
  chineseOverride?: string,
): string {
  const syncedBlock = syncActiveCandidateContent(
    block,
    contentForStorage(content),
  );
  const active = findCandidate(syncedBlock, syncedBlock.selected);
  if (!active) {
    return section;
  }
  const applied = contentForApply({
    ...active,
    content: {
      ...contentForStorage(content),
      visualNotes: content.visualNotes,
    },
  });
  const panes = extractPaneBodies(section);
  if (typeof chineseOverride === 'string') {
    panes.set('Chinese', chineseOverride);
  }
  return renderBeatSection(
    beatIndex,
    syncedBlock,
    applied,
    extractBeatDirectives(section),
    panes,
  );
}

/** Apply beat edits and re-render the beat section in canonical layout. */
export function patchBeatSectionVariants(
  section: string,
  beatIndex: number,
  patch: BeatVariantPatch,
): string {
  let block =
    parseBeatVariantsBlock(section) ??
    defaultBlockFromSection(section, beatIndex);
  if (patch.voice) {
    block = { ...block, voice: patch.voice };
  }

  if (patch.addVariant) {
    const label = patch.addVariant.label.trim();
    if (label && !findCandidate(block, label)) {
      const entry: BeatVariantCandidateJson = {
        ...patch.addVariant,
        label,
        content: contentForStorage(patch.addVariant.content),
      };
      block = {
        ...block,
        selected: label,
        candidates: [...block.candidates, entry],
      };
      return renderPatchedBeatSection(section, beatIndex, block, {
        title: patch.addVariant.content.title,
        say: patch.addVariant.content.say,
        leanCode: patch.addVariant.content.leanCode,
        turnCode: patch.addVariant.content.turnCode,
        visualNotes: patch.addVariant.content.visualNotes,
      });
    }
  }

  if (
    typeof patch.selectedVariant === "string" &&
    patch.selectedVariant.trim()
  ) {
    const label = patch.selectedVariant.trim();
    const candidate = findCandidate(block, label);
    if (candidate) {
      block = { ...block, selected: label };
      return patchBeatSectionVariants(section, beatIndex, {
        title: patch.title,
        say: patch.say,
        leanCode: patch.leanCode,
        turnCode: patch.turnCode,
        visualNotes: patch.visualNotes,
        voice: patch.voice,
      });
    }
  }

  const content = mergeBeatContent(section, beatIndex, block, patch);
  return renderPatchedBeatSection(section, beatIndex, block, content, patch.chinese);
}

export function applySelectedVariantToSection(
  section: string,
  beatIndex: number,
  label: string,
): string {
  return patchBeatSectionVariants(section, beatIndex, {
    selectedVariant: label,
  });
}

type BeatSubsection = { heading: string; body: string };

function parseBeatSubsections(section: string): {
  prefix: string;
  subsections: BeatSubsection[];
} {
  const lines = section.split("\n");
  const prefixLines: string[] = [];
  const subsections: BeatSubsection[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const match = line.match(/^###\s+(.+?)\s*$/);
    if (match) {
      const heading = match[1].trim();
      i += 1;
      const bodyLines: string[] = [];
      while (i < lines.length && !/^###\s/.test(lines[i] ?? "")) {
        bodyLines.push(lines[i] ?? "");
        i += 1;
      }
      subsections.push({
        heading,
        body: bodyLines.join("\n").replace(/\n+$/, ""),
      });
      continue;
    }
    prefixLines.push(line);
    i += 1;
  }
  return {
    prefix: prefixLines.join("\n").replace(/\n+$/, ""),
    subsections,
  };
}

function stripInlineHighlightsBlock(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^Highlights:\s*$/i.test(trimmed)) {
      skipping = true;
      continue;
    }
    if (skipping) {
      if (/^-\s+/.test(trimmed)) {
        continue;
      }
      if (!trimmed) {
        continue;
      }
      skipping = false;
    }
    out.push(line);
  }
  return out.join("\n").replace(/\n+$/, "");
}

function formatHighlightBullets(highlights: string[]): string {
  return highlights.map((item) => `- \`${item}\``).join("\n");
}

function splitPaneSubsection(
  sub: BeatSubsection,
  paneName: "Lean" | "Turn",
  lang: "lean" | "turn",
  hasDedicatedHighlights: boolean,
): BeatSubsection[] {
  if (
    sub.heading.toLowerCase() !== paneName.toLowerCase() ||
    hasDedicatedHighlights
  ) {
    return [sub];
  }
  const highlights = parseHighlightsList(
    extractNonCodePaneSuffix(sub.body, lang),
  );
  if (highlights.length === 0) {
    return [sub];
  }
  return [
    { heading: paneName, body: stripInlineHighlightsBlock(sub.body) },
    {
      heading: `${paneName} highlights`,
      body: formatHighlightBullets(highlights),
    },
  ];
}

function migrateBeatSectionHighlights(section: string): string {
  const { prefix, subsections } = parseBeatSubsections(section);
  const headings = new Set(subsections.map((entry) => entry.heading.toLowerCase()));
  const next: BeatSubsection[] = [];
  for (const sub of subsections) {
    if (sub.heading.toLowerCase() === "lean") {
      next.push(
        ...splitPaneSubsection(sub, "Lean", "lean", headings.has("lean highlights")),
      );
      continue;
    }
    if (sub.heading.toLowerCase() === "turn") {
      next.push(
        ...splitPaneSubsection(sub, "Turn", "turn", headings.has("turn highlights")),
      );
      continue;
    }
    next.push(sub);
  }
  const parts = [prefix];
  for (const sub of next) {
    parts.push(`### ${sub.heading}`, "", sub.body);
  }
  return `${parts.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n\n`;
}

/** Move inline Highlights lists under ### Lean / ### Turn into dedicated ### … highlights sections. */
export function migrateInlinePaneHighlightsInMarkdown(markdown: string): string {
  const { prefix, sections } = splitAnimationBeatSections(markdown);
  if (sections.length === 0) {
    return markdown.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
  }
  const migrated = sections.map(migrateBeatSectionHighlights).join("");
  return `${prefix}${migrated}`.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
