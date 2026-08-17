import type { LiveBeat } from '../live-script.ts';
import type { BeatPosterCoverSpec, BeatPosterLang, BeatPosterSpec } from './types.ts';
import { BEAT_POSTER_HEIGHT, BEAT_POSTER_WIDTH } from './types.ts';
import { fitCodeLines } from './code-highlight.ts';
import { estimateTextUnits, fitBeatPosterCardLayout } from '../../../../src/beatPosterLayout.ts';
import { pickPrimaryEditor, tokenInCode } from '../../../../src/beatPosterEditorPick.ts';
import { buildNextLeadSentence } from '../../../../src/beatPosterNextLead.ts';
import type { BeatPosterMdEntry } from '../../../../src/beatPosterMd.ts';
import {
  buildBeatPosterCoverContent,
  coverDecorations,
  fitCoverHeadlineSize,
  fitCoverSubtitleSize,
  fitCoverTaglineSize,
} from '../../../../src/beatPosterCover.ts';

const TITLE_FALLBACK_ZH: Record<string, string> = {
  'Textbook rule and how = is wired': '课本公式里，等号是怎么接线的',
  'What = asks us to prove': '写下 = 后，Lean 到底要你证明什么',
  'When Lean can simplify for us': '什么时候 Lean 能顺手化简',
  'When Lean needs a named fact': '什么时候必须点名一条定理',
  'Equality needs matching kinds': '先对种类 · Turn-Lang 贴标签',
  'Sets already use the same =': 'Lean 集合相等 · 最后一课',
  'Turn-Lang set equality — the upgrade': 'Turn-Lang 集合相等 · 升级到了',
  'Turn-Lang function equality — spelled out': 'Turn-Lang 函数相等 · 全写清楚',
  'Textbook rule — and why Turn-Lang takes over': '课本公式 · Turn-Lang 接棒',
  'Functions are known by their answers': '函数相等 · Lean 版（快换台）',
  'One question to take away': '带走一个问题 · Turn-Lang 已接班',
  'Same job does not mean same data': '相等分层次 · Turn-Lang 不糊弄',
};

export function parseAnimationFrontmatter(markdown: string): Record<string, string> {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const colon = trimmed.indexOf(':');
    if (colon <= 0) {
      continue;
    }
    const key = trimmed.slice(0, colon).trim();
    let value = trimmed.slice(colon + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[。！？])|(?<=[.!?])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function excerpt(text: string, maxLen: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) {
    return normalized;
  }
  return normalized.slice(0, maxLen).trim();
}

/** Truncate at a sentence boundary; never cut mid-sentence or mid-`code`. */
function excerptSentence(text: string, maxLen: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) {
    return normalized;
  }
  // Chinese punctuation always ends a sentence; Latin .!? only when followed
  // by a space or the end, so identifiers like `Nat.add` don't false-trigger.
  let boundary = -1;
  const limit = Math.min(normalized.length, maxLen);
  for (let i = 0; i < limit; i++) {
    const ch = normalized[i];
    if (ch === '。' || ch === '！' || ch === '？') {
      boundary = i;
    } else if (ch === '.' || ch === '!' || ch === '?') {
      const next = normalized[i + 1];
      if (next === undefined || next === ' ') {
        boundary = i;
      }
    }
  }
  let cut = (boundary > 0 ? normalized.slice(0, boundary + 1) : normalized.slice(0, maxLen)).trim();
  if ((cut.match(/`/g) ?? []).length % 2 === 1) {
    const lastTick = cut.lastIndexOf('`');
    cut = cut.slice(0, lastTick).trim() || cut.slice(lastTick + 1).trim();
  }
  return cut;
}

export function excerptBeatBody(text: string, maxLen = 340): string {
  const parts = sentences(text);
  const body = parts.slice(0, 2).join(' ');
  return excerpt(body || text, maxLen);
}

function stripMathFences(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~([^~]+)~/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}

function stripParagraphMarkup(text: string): string {
  return text
    .replace(/~([^~]+)~/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}

function makeNativeChineseSentence(sentence: string): string {
  const cleaned = sentence.trim();
  if (!cleaned) {
    return cleaned;
  }
  let out = cleaned;
  out = out.replaceAll('是相等的意思', '就是“相等”');
  out = out.replaceAll('我们要证明', '我们得先证明');
  out = out.replaceAll('我们需要证明', '我们得先证明');
  out = out.replaceAll('等于', '就是');
  out = out.replaceAll('叫作', '叫');
  out = out.replaceAll('主张', '命题');
  out = out.replaceAll('意思是', '就是');
  if (!/[。！？]$/.test(out)) {
    out = `${out}。`;
  }
  return out;
}

function isFillerSentence(sentence: string, lang: BeatPosterLang): boolean {
  const lower = sentence.toLowerCase();
  if (lang === 'zh') {
    return /大家好|欢迎回来|欢迎|今天我们要|今天我们来|接下来我们|大家好啊/.test(sentence);
  }
  return /^(hi|hello|hey|welcome|welcome back|hi friends|hello friends|let'?s look|today we)\b/.test(lower);
}

function narrativeSentences(text: string, lang: BeatPosterLang): string[] {
  return sentences(text)
    .map(stripParagraphMarkup)
    .map((part) => (lang === 'zh' ? makeNativeChineseSentence(part) : part))
    .filter((part) => !isFillerSentence(part, lang))
    .filter(Boolean);
}

function posterParagraphs(parts: string[], lang: BeatPosterLang, shownCode = ''): string[] {
  if (!parts.length) {
    return [];
  }
  // Prefer sentences whose `code` tokens appear in the displayed editor, so
  // the card explains the code on the poster — not the hidden dialect.
  const codeRefParts = parts.filter((part) => /`[^`]+`/.test(part));
  const shownCodeParts = shownCode.trim()
    ? codeRefParts.filter((part) =>
        [...part.matchAll(/`([^`]+)`/g)].some((match) => tokenInCode(match[1], shownCode)),
      )
    : [];
  const pool = shownCodeParts.length ? shownCodeParts : codeRefParts.length ? codeRefParts : parts;
  const maxChars = lang === 'zh' ? 56 : 110;
  const maxCards = 2;
  const cards: string[] = [];
  let current = '';
  for (const sentence of pool) {
    const shortened = excerptSentence(sentence, maxChars);
    const candidate = current ? `${current} ${shortened}` : shortened;
    if (candidate.length > maxChars && current) {
      cards.push(current);
      current = shortened;
    } else {
      current = candidate;
    }
    if (cards.length >= maxCards) {
      current = '';
      break;
    }
  }
  if (current && cards.length < maxCards) {
    cards.push(current);
  }
  return cards.slice(0, maxCards);
}

/** Authored beat-posters.md body: blank line = new card (max 3). */
function authoredParagraphs(body: string): string[] {
  const blocks = body
    .split(/\n\s*\n/)
    .map((block) => stripParagraphMarkup(block.replace(/\s+/g, ' ').trim()))
    .filter(Boolean);
  if (blocks.length <= 3) {
    return blocks;
  }
  return [...blocks.slice(0, 2), blocks.slice(2).join(' ')];
}

function seededVariant(seedText: string): number {
  let hash = 0;
  for (const char of seedText) {
    hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  }
  return hash;
}

function tiltFor(seedText: string, slot: number): number {
  const value = (seededVariant(seedText) + slot * 17) % 9;
  return (value - 4) * 0.75;
}

function chineseTitle(beat: LiveBeat): string {
  const base = stripMathFences(beat.title).trim();
  const mapped = TITLE_FALLBACK_ZH[base];
  if (mapped) {
    return mapped;
  }
  const candidate = stripMathFences(beat.chinese)
    .split(/(?<=[。！？])/u)
    .map((part) => part.trim())
    .find((part) => part.length >= 8);
  if (!candidate) {
    return base;
  }
  return excerpt(candidate, 18);
}

function fitTitleSize(title: string): number {
  const units = estimateTextUnits(title);
  if (units <= 22) return 46;
  if (units <= 30) return 42;
  if (units <= 38) return 38;
  return 34;
}

export function buildBeatPosterSpec(params: {
  scriptId: string;
  beat: LiveBeat;
  nextBeat?: LiveBeat | null;
  lang: BeatPosterLang;
  seriesTitle: string;
  episodeTitleEn: string;
  episodeTitleZh: string;
  poster?: BeatPosterMdEntry | null;
}): BeatPosterSpec {
  const { scriptId, beat, nextBeat, lang, seriesTitle, episodeTitleEn, episodeTitleZh, poster } = params;
  const episodeTitle = lang === 'zh'
    ? (episodeTitleZh || episodeTitleEn)
    : episodeTitleEn;
  const authoredTitle = lang === 'zh'
    ? (poster?.titleZh?.trim() || poster?.titleEn?.trim() || '')
    : (poster?.titleEn?.trim() || '');
  const title = authoredTitle || (lang === 'zh'
    ? chineseTitle(beat)
    : stripMathFences(beat.title).trim() || `Beat ${beat.index + 1}`);
  const seed = `${scriptId}:${beat.id}:${lang}`;
  const authoredBody = lang === 'zh'
    ? (poster?.bodyZh?.trim() || poster?.bodyEn?.trim() || '')
    : (poster?.bodyEn?.trim() || '');
  const leanSource = poster?.leanCode?.trim() ? poster.leanCode : beat.leanCode;
  const turnSource = poster?.turnCode?.trim() ? poster.turnCode : beat.turnCode;
  const leanFit = fitCodeLines(leanSource.trim(), 20);
  const turnFit = fitCodeLines(turnSource.trim(), 20);
  const leanLines = leanFit.usedLines || 0;
  const turnLines = turnFit.usedLines || 0;
  const hasLean = leanLines > 0;
  const hasTurn = turnLines > 0;
  const totalLines = Math.max(1, leanLines + turnLines);
  const leanFlex = Math.max(0.72, Math.min(1.55, (leanLines / totalLines) * 2));
  const turnFlex = Math.max(0.72, Math.min(1.55, (turnLines / totalLines) * 2));

  // Pick the same Lean/Turn pane for en + zh. English copy is canonical so zh
  // posters stay aligned when card wording differs.
  const editorScoringSource = poster?.bodyEn?.trim() || beat.say.trim();
  const scoringSentences = narrativeSentences(editorScoringSource, 'en');
  const primaryEditor = poster?.primaryEditor
    ?? pickPrimaryEditor({
    sentences: scoringSentences,
    leanCode: leanFit.lines.join('\n'),
    turnCode: turnFit.lines.join('\n'),
    leanLines,
    turnLines,
  });
  const editorMode: 'single' = 'single';
  const shownCodeDraft = primaryEditor === 'lean' ? leanFit.lines.join('\n') : turnFit.lines.join('\n');
  const paragraphs = authoredBody
    ? authoredParagraphs(authoredBody)
    : posterParagraphs(scoringSentences, lang, shownCodeDraft);

  const authoredNext = lang === 'zh'
    ? (poster?.nextZh?.trim() || poster?.nextEn?.trim() || '')
    : (poster?.nextEn?.trim() || '');
  const nextLead = authoredNext || buildNextLeadSentence({
    currentBeat: beat,
    nextBeat,
    lang,
    zhTitle: nextBeat && lang === 'zh' ? chineseTitle(nextBeat) : undefined,
  });

  const requestedCodeLines = primaryEditor === 'lean' ? leanLines : turnLines;
  const cardLayout = fitBeatPosterCardLayout({
    paragraphs,
    codeLines: requestedCodeLines,
    hasCode: requestedCodeLines > 0,
    hasNextLead: Boolean(nextLead.trim()),
    titleUnits: estimateTextUnits(title),
  });

  const leanFitFinal = fitCodeLines(leanSource.trim(), cardLayout.maxCodeLines || 20);
  const turnFitFinal = fitCodeLines(turnSource.trim(), cardLayout.maxCodeLines || 20);
  const shownLeanLines = primaryEditor === 'lean' && leanFitFinal.usedLines ? leanFitFinal.usedLines : 0;
  const shownTurnLines = primaryEditor === 'turn' && turnFitFinal.usedLines ? turnFitFinal.usedLines : 0;

  return {
    scriptId,
    beatIndex: beat.index,
    beatId: beat.id,
    lang,
    width: BEAT_POSTER_WIDTH,
    height: BEAT_POSTER_HEIGHT,
    seriesTitle,
    episodeTitle,
    beatTitle: title,
    paragraphs,
    leanCode: shownLeanLines ? leanFitFinal.lines.join('\n') : '',
    turnCode: shownTurnLines ? turnFitFinal.lines.join('\n') : '',
    narrativeFooter: '',
    turnLangHint: lang === 'zh' ? 'turn-lang.com · 看懂证明' : 'turn-lang.com · formal math, outdoors',
    nextLead,
    decorations: {
      titleTilt: tiltFor(seed, 1),
      cardTilt: tiltFor(seed, 2),
      leanTilt: tiltFor(seed, 3),
      turnTilt: tiltFor(seed, 4),
      sparkle: (seededVariant(seed) % 3) === 1,
    },
    layout: {
      titleFontSize: fitTitleSize(title),
      paragraphFontSize: cardLayout.paragraphFontSize,
      textCardFlex: cardLayout.textCardFlex,
      codeCardFlex: cardLayout.codeCardFlex,
      codeCardAutoHeight: cardLayout.codeCardAutoHeight,
      leanFlex,
      turnFlex,
      leanLines: shownLeanLines,
      turnLines: shownTurnLines,
      editorMode,
      primaryEditor,
      editorFontSize: cardLayout.editorFontSize,
    },
  };
}

export function buildBeatPosterCoverSpec(params: {
  scriptId: string;
  lang: BeatPosterLang;
  seriesTitle: string;
  episodeTitleEn: string;
  episodeTitleZh: string;
  promotionalDescriptionEn?: string;
  promotionalDescriptionZh?: string;
  beatCount: number;
}): BeatPosterCoverSpec {
  const {
    scriptId,
    lang,
    seriesTitle,
    episodeTitleEn,
    episodeTitleZh,
    promotionalDescriptionEn,
    promotionalDescriptionZh,
    beatCount,
  } = params;
  const episodeTitle = lang === 'zh'
    ? (episodeTitleZh || episodeTitleEn)
    : episodeTitleEn;
  const promotionalDescription = lang === 'zh'
    ? (promotionalDescriptionZh || promotionalDescriptionEn)
    : promotionalDescriptionEn;
  const content = buildBeatPosterCoverContent({
    scriptId,
    lang,
    seriesTitle,
    episodeTitle,
    promotionalDescription,
    beatCount,
  });
  const seed = `${scriptId}:cover:${lang}`;

  return {
    scriptId,
    lang,
    width: BEAT_POSTER_WIDTH,
    height: BEAT_POSTER_HEIGHT,
    seriesTitle: content.seriesTitle,
    episodeTitle: content.episodeTitle,
    coverHeadline: content.coverHeadline,
    episodeSubtitle: content.episodeSubtitle,
    titleColor: content.titleColor,
    titleStroke: content.titleStroke,
    tagline: content.tagline,
    beatCountLabel: content.beatCountLabel,
    swipeHint: content.swipeHint,
    vsLabel: content.vsLabel,
    backgroundLeanCode: content.backgroundLeanCode,
    backgroundTurnCode: content.backgroundTurnCode,
    decorations: coverDecorations(seed),
    layout: {
      headlineFontSize: fitCoverHeadlineSize(content.coverHeadline, lang),
      subtitleFontSize: fitCoverSubtitleSize(content.episodeSubtitle, lang),
      taglineFontSize: fitCoverTaglineSize(content.tagline, lang),
    },
  };
}
