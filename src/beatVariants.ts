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
};

const BEAT_VARIANTS_FENCE_RE = /```beat-variants\s*\n([\s\S]*?)\n```/i;
const BEAT_VARIANTS_HTML_RE = /<!--\s*beat-variants:\s*([\s\S]*?)\s*-->/i;
/** Legacy escape used before fenced storage. */
const HTML_COMMENT_CLOSE_ESCAPE = '@@HTML_COMMENT_CLOSE@@';

function unescapeLegacyPayload(payload: string): string {
  return payload.split(HTML_COMMENT_CLOSE_ESCAPE).join('-->');
}

function stripHtmlComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

function normalizeCodeBody(code: string): string {
  let body = code.replace(/^\uFEFF/, '').replace(/\n+$/, '');
  if (!body.trim()) {
    return '';
  }
  const nested = body.match(/```(?:lean|turn)?\s*\n([\s\S]*?)\n```/i);
  if (nested) {
    body = nested[1].replace(/\n+$/, '');
  }
  return body
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return !/^```/.test(trimmed) && !/^###\s/.test(trimmed);
    })
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

/**
 * Strip leaked beat-variants / HTML-comment garbage from spoken text.
 * Compilers used to treat ```beat-variants as say; drafts can still carry that.
 */
export function sanitizeSay(say: string): string {
  let text = say.replace(/```beat-variants\s*\n[\s\S]*?\n```/gi, '').trim();
  text = text.replace(/<!--\s*\n?beat-variants:[\s\S]*?-->/gi, '').trim();
  const looksCorrupted =
    /","leanCode"|beat-variants:|"\}\}\]\}|-->\\+n|\\n\\nbeat-template:|-->/i.test(text) &&
    (/beat-template:|leanCode|visualNotes|\\n/i.test(text) || /"\}\}\]\}/.test(text));
  if (!looksCorrupted) {
    return text.replace(/\n{3,}/g, '\n\n').trim();
  }
  // Escaped spills often arrive as one line with literal \n / \".
  text = text.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  const afterJsonTail = text.split(/\}\}\]\}\s*/).pop() ?? text;
  const lines = afterJsonTail
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^```/.test(line) || /^[{[]/.test(line) || /^-->/.test(line)) return false;
      if (/beat-template:|layer:|turn-render:|lean-render:|manim-sub:|manim-code:/i.test(line)) {
        return false;
      }
      if (/","|"leanCode"|"turnCode"|"visualNotes"/.test(line)) return false;
      return true;
    });
  if (lines.length > 0) {
    return lines[lines.length - 1] ?? '';
  }
  return '';
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
  const safe = contentForStorage(candidate.content);
  if (/<!--\s*beat-studio:/i.test(candidate.content.visualNotes)) {
    return {
      ...safe,
      visualNotes: candidate.content.visualNotes.trim(),
    };
  }
  if (!candidate.template) {
    return safe;
  }
  const payload = JSON.stringify({
    template: candidate.template,
    templateConfig: candidate.templateConfig,
  });
  const block = `<!-- beat-studio: ${payload} -->`;
  return {
    ...safe,
    visualNotes: safe.visualNotes ? `${block}\n\n${safe.visualNotes}` : block,
  };
}

function candidateForStorage(candidate: BeatVariantCandidateJson): BeatVariantCandidateJson {
  return {
    ...candidate,
    content: contentForStorage(candidate.content),
  };
}

function blockForStorage(block: BeatVariantsBlock): BeatVariantsBlock {
  return {
    selected: block.selected,
    candidates: block.candidates.map(candidateForStorage),
  };
}

function parseVariantsJson(raw: string): BeatVariantsBlock | null {
  try {
    const parsed = JSON.parse(unescapeLegacyPayload(raw.trim())) as BeatVariantsBlock;
    if (
      !parsed ||
      typeof parsed.selected !== 'string' ||
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
    .filter((chunk) => chunk.trim().startsWith('## Beat'));
  return { prefix, sections };
}

export function parseBeatVariantsBlock(section: string): BeatVariantsBlock | null {
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
  let next = section.replace(BEAT_VARIANTS_FENCE_RE, '');
  next = next.replace(BEAT_VARIANTS_HTML_RE, '');
  // Unclosed legacy HTML comment + spilled JSON tail.
  next = next.replace(/<!--\s*\n?beat-variants:[\s\S]*?(?=\n## |\n### |$)/gi, '');
  next = next.replace(/^\s*-->\\n\\n[\s\S]*?"\}\}\]\}\s*$/gm, '');
  next = next.replace(/^\s*-->\\\\n\\\\n[\s\S]*$/gm, '');
  next = next.replace(/^\s*-->\s*$/gm, '');
  next = next.replace(/\n{3,}/g, '\n\n');
  return next;
}

export function upsertBeatVariantsComment(section: string, block: BeatVariantsBlock): string {
  const comment = beatVariantsComment(block);
  const next = stripBeatVariantsArtifacts(section);
  const lines = next.split('\n');
  let insertAt = 1;
  while (insertAt < lines.length) {
    const line = lines[insertAt]?.trim() ?? '';
    if (!line) {
      insertAt += 1;
      continue;
    }
    if (line.startsWith('<!--')) {
      while (insertAt < lines.length && !lines[insertAt]?.includes('-->')) {
        insertAt += 1;
      }
      insertAt += 1;
      continue;
    }
    if (line.startsWith('```')) {
      insertAt += 1;
      while (insertAt < lines.length && lines[insertAt]?.trim() !== '```') {
        insertAt += 1;
      }
      insertAt += 1;
      continue;
    }
    break;
  }
  return [...lines.slice(0, insertAt), comment, '', ...lines.slice(insertAt)].join('\n');
}

function parseBeatTitle(section: string, beatIndex: number): string {
  const match = section.match(/^## Beat\s+\d+:\s*(.*)$/m);
  return match?.[1]?.trim() ?? `Beat ${beatIndex + 1}`;
}

function skipPrefixedBlocks(lines: string[], start: number): number {
  let i = start;
  while (i < lines.length) {
    const line = lines[i]?.trim() ?? '';
    if (!line) {
      i += 1;
      continue;
    }
    if (line.startsWith('<!--')) {
      while (i < lines.length && !lines[i]?.includes('-->')) {
        i += 1;
      }
      i += 1;
      continue;
    }
    if (line.startsWith('```')) {
      i += 1;
      while (i < lines.length && lines[i]?.trim() !== '```') {
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
  const lines = section.split('\n');
  const sayStart = skipPrefixedBlocks(lines, 1);
  let i = sayStart;
  while (i < lines.length && !/^###\s/.test(lines[i] ?? '') && !/^##\s/.test(lines[i] ?? '')) {
    i += 1;
  }
  return sanitizeSay(lines.slice(sayStart, i).join('\n').trim());
}

function parseFencedCode(section: string, lang: 'lean' | 'turn'): string {
  const fence = '```' + lang;
  const pattern = new RegExp(`${fence}\\s*\\n([\\s\\S]*?)\\n\`\`\``, 'i');
  const match = section.match(pattern);
  return normalizeCodeBody(match?.[1] ?? '');
}

function parseVisualNotes(section: string): string {
  const heading = '### Visual notes';
  const pattern = new RegExp(`${heading}\\s*\\n([\\s\\S]*?)(?=\\n### |\\n## |$)`, 'i');
  const match = section.match(pattern);
  return match?.[1]?.trim() ?? '';
}

export function extractBeatContentFromSection(
  section: string,
  beatIndex: number,
): BeatVariantContent {
  return {
    title: parseBeatTitle(section, beatIndex),
    say: parseSay(section),
    leanCode: parseFencedCode(section, 'lean'),
    turnCode: parseFencedCode(section, 'turn'),
    visualNotes: parseVisualNotes(section),
  };
}

function replaceHeadingTitle(section: string, title: string, beatIndex: number): string {
  return section.replace(/^## Beat\s+\d+:\s*.*$/m, `## Beat ${beatIndex + 1}: ${title}`);
}

function replaceSayInBeat(section: string, say: string): string {
  const lines = section.split('\n');
  const sayStart = skipPrefixedBlocks(lines, 1);
  let i = sayStart;
  while (i < lines.length && !/^###\s/.test(lines[i] ?? '') && !/^##\s/.test(lines[i] ?? '')) {
    i += 1;
  }
  const sayLines = say.replace(/\n+$/, '').split('\n');
  return [...lines.slice(0, sayStart), ...sayLines, '', ...lines.slice(i)].join('\n');
}

function removePaneSection(section: string, heading: string): string {
  const lines = section.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if ((lines[i] ?? '').trim() === heading) {
      i += 1;
      while (
        i < lines.length &&
        !/^###\s/.test(lines[i] ?? '') &&
        !/^##\s/.test(lines[i] ?? '')
      ) {
        i += 1;
      }
      continue;
    }
    out.push(lines[i] ?? '');
    i += 1;
  }
  return out.join('\n');
}

function replaceFencedCode(section: string, lang: 'lean' | 'turn', code: string): string {
  const heading = lang === 'lean' ? '### Lean' : '### Turn';
  const fence = '```' + lang;
  const body = normalizeCodeBody(code);
  const block = `${heading}\n\n${fence}\n${body}\n\`\`\`\n`;

  let next = removePaneSection(section, heading);
  next = next.replace(/\n{3,}/g, '\n\n');

  const beforeChinese = next.search(/^### Chinese/m);
  if (beforeChinese >= 0) {
    return `${next.slice(0, beforeChinese).trimEnd()}\n\n${block}\n${next.slice(beforeChinese)}`;
  }
  const beforeVisual = next.search(/^### Visual notes/m);
  if (beforeVisual >= 0) {
    return `${next.slice(0, beforeVisual).trimEnd()}\n\n${block}\n${next.slice(beforeVisual)}`;
  }
  return `${next.trimEnd()}\n\n${block}`;
}

function replaceVisualNotes(section: string, visualNotes: string): string {
  const heading = '### Visual notes';
  const pattern = new RegExp(`(${heading}\\s*\\n)([\\s\\S]*?)(?=\\n### |\\n## |$)`, 'i');
  const body = visualNotes.replace(/\n+$/, '');
  if (pattern.test(section)) {
    return section.replace(pattern, `$1${body}\n`);
  }
  return `${section.trimEnd()}\n\n${heading}\n\n${body}\n`;
}

function applyContentToSection(
  section: string,
  beatIndex: number,
  content: BeatVariantContent,
): string {
  let next = section;
  if (content.title.trim()) {
    next = replaceHeadingTitle(next, content.title.trim(), beatIndex);
  }
  next = replaceSayInBeat(next, content.say);
  next = replaceFencedCode(next, 'lean', content.leanCode);
  next = replaceFencedCode(next, 'turn', content.turnCode);
  next = replaceVisualNotes(next, content.visualNotes);
  return next;
}

function findCandidate(
  block: BeatVariantsBlock,
  label: string,
): BeatVariantCandidateJson | null {
  return block.candidates.find((candidate) => candidate.label === label) ?? null;
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
  leanCode?: string;
  turnCode?: string;
  visualNotes?: string;
  selectedVariant?: string;
  /** Append a new candidate and switch the beat section to its content. */
  addVariant?: BeatVariantCandidateJson;
};

function defaultBlockFromSection(section: string, beatIndex: number): BeatVariantsBlock {
  const extracted = extractBeatContentFromSection(section, beatIndex);
  return {
    selected: 'A',
    candidates: [
      {
        label: 'A',
        template: 'compare-dual',
        templateConfig: {
          kind: 'compare-dual',
          config: { leanEnabled: true, turnEnabled: true },
        },
        content: contentForStorage(extracted),
      },
    ],
  };
}

/** Apply beat edits and keep beat-variants block in sync with the active variant. */
export function patchBeatSectionVariants(
  section: string,
  beatIndex: number,
  patch: BeatVariantPatch,
): string {
  let block = parseBeatVariantsBlock(section) ?? defaultBlockFromSection(section, beatIndex);

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
      // Apply the full inbound content (may include beat-studio) to the visible beat body.
      let next = upsertBeatVariantsComment(section, block);
      next = applyContentToSection(next, beatIndex, contentForApply({
        ...entry,
        content: patch.addVariant.content,
      }));
      return next;
    }
  }

  if (typeof patch.selectedVariant === 'string' && patch.selectedVariant.trim()) {
    const label = patch.selectedVariant.trim();
    const candidate = findCandidate(block, label);
    if (candidate) {
      block = { ...block, selected: label };
      let next = upsertBeatVariantsComment(section, block);
      next = applyContentToSection(next, beatIndex, contentForApply(candidate));
      return patchBeatSectionVariants(next, beatIndex, {
        title: patch.title,
        say: patch.say,
        leanCode: patch.leanCode,
        turnCode: patch.turnCode,
        visualNotes: patch.visualNotes,
      });
    }
  }

  let next = section;
  if (typeof patch.title === 'string' && patch.title.trim()) {
    next = replaceHeadingTitle(next, patch.title.trim(), beatIndex);
  }
  if (typeof patch.say === 'string') {
    next = replaceSayInBeat(next, sanitizeSay(patch.say));
  }
  if (typeof patch.leanCode === 'string') {
    next = replaceFencedCode(next, 'lean', patch.leanCode);
  }
  if (typeof patch.turnCode === 'string') {
    next = replaceFencedCode(next, 'turn', patch.turnCode);
  }
  if (typeof patch.visualNotes === 'string') {
    next = replaceVisualNotes(next, patch.visualNotes);
  }

  const syncedContent = extractBeatContentFromSection(next, beatIndex);
  block = syncActiveCandidateContent(block, syncedContent);
  return upsertBeatVariantsComment(next, block);
}

export function applySelectedVariantToSection(
  section: string,
  beatIndex: number,
  label: string,
): string {
  return patchBeatSectionVariants(section, beatIndex, { selectedVariant: label });
}
