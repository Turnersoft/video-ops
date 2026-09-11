import type { LiveBeat } from '../types';
import type { BeatPosterLang, BeatPosterSlideProps } from '../components/BeatPosterSlide/BeatPosterSlide.types';
import { fitBeatPosterCardLayout, estimateTextUnits, PROOF_EDITOR_FONT_SIZE, PROOF_TITLE_FONT_SIZE } from '../../../../src/beatPosterLayout';
import { pickPrimaryEditor, tokenInCode } from '../../../../src/beatPosterEditorPick';
import { buildNextLeadSentence } from '../../../../src/beatPosterNextLead';
import type { BeatPosterMdEntry } from '../../../../src/beatPosterMd';
import { beatPosterPageLabel, formatBeatPosterPageLabel } from '../../../../src/beatPosterCover';
import {
  planBeatPosterProofParts,
  proofPanelLayoutText,
  proofStepHeadline,
  resolveBeatPosterProof,
} from '../../../../src/beatPosterProof';
import { fitCodeLines, highlightCodeLines } from './beatPosterCodeHighlight';

const TURN_LANG_HINTS_EN = [
  'turn-lang.com · formal math, outdoors',
  'turn-lang.com · proof, one card at a time',
  'turn-lang.com · lean + turn-lang side by side',
];

const TURN_LANG_HINTS_ZH = [
  'turn-lang.com · 看懂证明',
  'turn-lang.com · 形式化数学也能开讲',
  'turn-lang.com · Lean / Turn-Lang 对照笔记',
];

const TITLE_FALLBACK_ZH: Record<string, string> = {
  'Textbook rule and how = is wired': '课本公式里，等号是怎么接线的',
  'What = asks us to prove': '写下 = 后，Lean 到底要你证明什么',
  'When Lean can simplify for us': '什么时候 Lean 能顺手化简',
  'When Lean needs a named fact': '什么时候必须点名一条定理',
  'Equality needs matching kinds': '先对同款对象，才谈得上相等',
  'Sets already use the same =': '集合早就沿用了同一个 =',
  'What set equality embeds': '集合相等，真正塞进去了什么',
  'Functions are known by their answers': '函数相等，看的是每个答案',
  'Turn-Lang lists the three checks': 'Turn-Lang 把三件事写清楚',
  'Same job does not mean same data': '干同一件事，不等于同一份数据',
  'One question to take away': '最后带走一个小问题',
};

function stripMathFences(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~([^~]+)~/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}

/** Keep `inline code` markers for rich paragraph rendering. */
function stripParagraphMarkup(text: string): string {
  return text
    .replace(/~([^~]+)~/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}

/** Colloquial rewrites for zh poster copy; keeps `code` fences intact. */
function makeNativeChineseSentence(sentence: string): string {
  let out = sentence.trim();
  if (!out) {
    return out;
  }
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

function fitTitleSize(title: string): number {
  const units = estimateTextUnits(title);
  if (units <= 22) return 46;
  if (units <= 30) return 42;
  if (units <= 38) return 38;
  return 34;
}

function isFillerSentence(sentence: string, lang: BeatPosterLang): boolean {
  const lower = sentence.toLowerCase();
  if (lang === 'zh') {
    return /大家好|欢迎回来|欢迎|今天我们要|今天我们来|接下来我们|大家好啊/.test(sentence);
  }
  return /^(hi|hello|hey|welcome|welcome back|hi friends|hello friends|let'?s look|today we)\b/.test(lower);
}

function narrativeSentences(text: string, lang: BeatPosterLang): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[。！？])|(?<=[.!?])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(stripParagraphMarkup)
    .map((part) => (lang === 'zh' ? makeNativeChineseSentence(part) : part))
    .filter((part) => !isFillerSentence(part, lang));
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

export function liveBeatToPosterSlides(params: {
  beat: LiveBeat;
  nextBeat?: LiveBeat | null;
  lang: BeatPosterLang;
  seriesTitle: string;
  episodeTitleEn: string;
  episodeTitleZh: string;
  poster?: BeatPosterMdEntry | null;
  beatCount: number;
}): BeatPosterSlideProps[] {
  const { beat, nextBeat, lang, seriesTitle, episodeTitleEn, episodeTitleZh, poster, beatCount } = params;
  const episodeTitle = lang === 'zh' ? (episodeTitleZh || episodeTitleEn) : episodeTitleEn;
  const hints = lang === 'zh' ? TURN_LANG_HINTS_ZH : TURN_LANG_HINTS_EN;
  const seed = `${seriesTitle}:${beat.id}:${lang}`;
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
  const proof = resolveBeatPosterProof({
    proofMarkdown: poster?.proofMarkdown,
    leanCode: leanSource,
    turnCode: turnSource,
    primaryEditor,
  });
  const proofMoves = proof.moves;
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
  const authoredTitle = lang === 'zh'
    ? (poster?.titleZh?.trim() || poster?.titleEn?.trim() || '')
    : (poster?.titleEn?.trim() || '');
  const beatTitle = authoredTitle || (lang === 'zh'
    ? chineseTitle(beat)
    : stripMathFences(beat.title).trim() || `Beat ${beat.index + 1}`);

  const parts = planBeatPosterProofParts({
    beatId: beat.id,
    moves: proofMoves,
    paragraphs,
    nextLead,
    title: beatTitle,
    declaration: proof.declaration,
  });

  return parts.map((part) => {
    const shownProof = part.moves;
    const partTitle = shownProof.length > 0
      ? proofStepHeadline({
        lang,
        partIndex: part.partIndex,
        partCount: part.partCount,
      })
      : beatTitle;
    const layoutCodeText = shownProof.length > 0
      ? proofPanelLayoutText({
        moves: shownProof,
        closingLast: part.partIndex === part.partCount - 1,
        declaration: proof.declaration,
      })
      : shownCodeDraft;
    const requestedCodeLines = shownProof.length > 0
      ? layoutCodeText.split('\n').length
      : (primaryEditor === 'lean' ? leanLines : turnLines);
    const cardLayout = fitBeatPosterCardLayout({
      paragraphs: part.paragraphs,
      codeLines: requestedCodeLines,
      hasCode: requestedCodeLines > 0,
      hasNextLead: Boolean(part.nextLead.trim()),
      titleUnits: estimateTextUnits(partTitle),
      codeText: layoutCodeText,
    });

    const leanFitFinal = fitCodeLines(leanSource.trim(), cardLayout.maxCodeLines || 20);
    const turnFitFinal = fitCodeLines(turnSource.trim(), cardLayout.maxCodeLines || 20);
    const shownLeanLines = primaryEditor === 'lean' && leanFitFinal.usedLines ? leanFitFinal.usedLines : 0;
    const shownTurnLines = primaryEditor === 'turn' && turnFitFinal.usedLines ? turnFitFinal.usedLines : 0;

    return {
      lang,
      seriesTitle,
      episodeTitle,
      beatTitle: partTitle,
      paragraphs: part.paragraphs,
      leanCode: shownLeanLines ? leanFitFinal.lines.join('\n') : '',
      turnCode: shownTurnLines ? turnFitFinal.lines.join('\n') : '',
      proofDeclaration: proof.declaration,
      proofSteps: shownProof,
      proofPartIndex: part.partIndex,
      proofPartCount: part.partCount,
      posterId: part.posterId,
      narrativeFooter: '',
      turnLangHint: hints[beat.index % hints.length] ?? hints[0],
      nextLead: part.nextLead,
      pageLabel: beatPosterPageLabel({ kind: 'beat', beatIndex: beat.index, beatCount }),
      decorations: {
        titleTilt: tiltFor(seed, 1),
        cardTilt: tiltFor(seed, 2),
        leanTilt: tiltFor(seed, 3),
        turnTilt: tiltFor(seed, 4),
        sparkle: shownProof.length > 0 ? false : (seededVariant(seed) % 3) === 1,
      },
      layout: {
        titleFontSize: shownProof.length > 0 ? PROOF_TITLE_FONT_SIZE : fitTitleSize(partTitle),
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
        editorFontSize: shownProof.length > 0 ? PROOF_EDITOR_FONT_SIZE : cardLayout.editorFontSize,
      },
    };
  });
}

export function stampPosterSlidePages(slides: BeatPosterSlideProps[]): BeatPosterSlideProps[] {
  const pageCount = slides.length + 1;
  return slides.map((slide, index) => ({
    ...slide,
    pageLabel: formatBeatPosterPageLabel(index + 2, pageCount),
  }));
}

export function liveBeatToPosterSlideProps(params: {
  beat: LiveBeat;
  nextBeat?: LiveBeat | null;
  lang: BeatPosterLang;
  seriesTitle: string;
  episodeTitleEn: string;
  episodeTitleZh: string;
  poster?: BeatPosterMdEntry | null;
  beatCount: number;
}): BeatPosterSlideProps {
  return liveBeatToPosterSlides(params)[0];
}

export { highlightCodeLines };
