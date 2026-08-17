/**
 * Sentence-level captions and source→edited timeline mapping from Whisper words.
 */

import { guideSentencesFromText } from './caption_zh.ts';

export { guideSentencesFromText } from './caption_zh.ts';

export type CaptionSegment = {
  text: string;
  zh?: string;
  atSeconds: number;
  durationSeconds: number;
};

export type GoodInterval = {
  start: number;
  end: number;
};

type TranscriptWord = {
  word?: string;
  start?: number;
  end?: number;
};

type TranscriptSegment = {
  start?: number;
  end?: number;
  text?: string;
};

export type TranscriptVerbose = {
  words?: TranscriptWord[];
  segments?: TranscriptSegment[];
};

export type SentenceSpan = {
  text: string;
  start: number;
  end: number;
};

const SENTENCE_END = /[.!?。！？]["')\]]*$/;
const SENTENCE_SPLIT = /(?<=[.!?。！？])\s+/;

/** Spoken clause enders that often precede a new sentence without Whisper punctuation. */
const CLAUSE_END_WORDS = new Set([
  "it",
  "that",
  "this",
  "them",
  "other",
  "well",
  "here",
  "now",
  "equality",
  "definition",
  "proof",
  "lean",
]);

/** Discourse / sentence restarts (plus common Whisper mishears of "today"). */
const SENTENCE_START_WORDS = new Set([
  "so",
  "but",
  "now",
  "today",
  "here",
  "next",
  "first",
  "then",
  "also",
  "still",
  "however",
]);

/** Weaker conjunctions — only split when there is a real pause. */
const WEAK_SENTENCE_START_WORDS = new Set(["and", "when", "if", "because"]);

/**
 * Second-span starters that continue the previous clause — Whisper often
 * emits these as a new segment without a period on the previous one.
 */
const CONTINUATION_START_WORDS = new Set([
  "atomically",
  "automically",
  "which",
  "who",
  "whom",
  "whose",
  "than",
  "or",
  "nor",
  "literally",
  "especially",
  "including",
]);

/** Multi-word spoken aliases for a single script token (norm form). */
const GUIDE_TOKEN_ALIASES: Record<string, string[][]> = {
  today: [
    ["today"],
    ["the", "day"],
    ["to", "day"],
  ],
};

type TimedWord = {
  word: string;
  start: number;
  end: number;
};

export type SentencesFromTranscriptOptions = {
  pauseSplitSeconds?: number;
  /** Beat / teleprompter say text — preferred sentence boundaries when Whisper omits periods. */
  guideText?: string;
};

function normalizeToken(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function wordSimilarity(left: string, right: string): number {
  if (!left || !right) {
    return -1;
  }
  if (left === right) {
    return 1;
  }
  if (left.includes(right) || right.includes(left)) {
    return 0.88;
  }
  const maxLen = Math.max(left.length, right.length);
  if (maxLen <= 2) {
    return left[0] === right[0] ? 0.7 : -1;
  }
  let mismatches = 0;
  const limit = Math.min(left.length, right.length);
  for (let index = 0; index < limit; index += 1) {
    if (left[index] !== right[index]) {
      mismatches += 1;
    }
  }
  mismatches += Math.abs(left.length - right.length);
  if (mismatches <= 1) {
    return 0.8;
  }
  if (mismatches <= 2 && maxLen >= 5) {
    return 0.72;
  }
  return -1;
}

function normalizeWords(transcript: TranscriptVerbose): TimedWord[] {
  const raw = transcript.words ?? [];
  return raw
    .map((entry) => ({
      word: String(entry.word ?? "").trim(),
      start: Number(entry.start),
      end: Number(entry.end),
    }))
    .filter((entry) => entry.word && Number.isFinite(entry.start) && Number.isFinite(entry.end));
}


function tokenizeGuide(text: string): string[] {
  const raw = text
    .split(/\s+/)
    .map((part) => normalizeToken(part))
    .filter(Boolean);
  const tokens: string[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    // Outdoor scripts sometimes write "To day" for "Today".
    if (
      raw[index] === "to" &&
      raw[index + 1] === "day"
    ) {
      tokens.push("today");
      index += 1;
      continue;
    }
    tokens.push(raw[index]);
  }
  return tokens;
}

function matchGuideTokenAt(
  token: string,
  words: TimedWord[],
  fromIndex: number,
  lookahead: number,
): { index: number; consumed: number; score: number } | null {
  const aliases = GUIDE_TOKEN_ALIASES[token] ?? [[token]];
  let best: { index: number; consumed: number; score: number } | null = null;
  const limit = Math.min(words.length, fromIndex + lookahead);
  for (let index = fromIndex; index < limit; index += 1) {
    for (const alias of aliases) {
      if (index + alias.length > words.length) {
        continue;
      }
      let scoreSum = 0;
      let ok = true;
      for (let partIndex = 0; partIndex < alias.length; partIndex += 1) {
        const spoken = normalizeToken(words[index + partIndex].word);
        const score = wordSimilarity(alias[partIndex], spoken);
        if (score < 0.7) {
          ok = false;
          break;
        }
        scoreSum += score;
      }
      if (!ok) {
        continue;
      }
      const score = scoreSum / alias.length - (index - fromIndex) * 0.015;
      if (!best || score > best.score) {
        best = { index, consumed: alias.length, score };
      }
    }
  }
  return best;
}

/**
 * Align teleprompter sentences onto Whisper words so missing periods still split
 * ("formalize it" | "Today we…") even when ASR merges them ("it the day we…").
 */
export function sentencesAlignedToGuide(
  words: TimedWord[],
  guideSentences: string[],
): SentenceSpan[] | null {
  if (!words.length || guideSentences.length < 2) {
    return null;
  }
  const spans: SentenceSpan[] = [];
  let wordIndex = 0;
  let matchedGuides = 0;

  for (const guide of guideSentences) {
    const tokens = tokenizeGuide(guide);
    if (!tokens.length) {
      continue;
    }
    if (wordIndex >= words.length) {
      break;
    }

    // Search farther for the sentence start so a flubbed earlier take does not
    // permanently steal a later clean delivery of the same line.
    const first = matchGuideTokenAt(tokens[0], words, wordIndex, 48);
    if (!first || first.score < 0.72) {
      continue;
    }

    // Score a few candidate starts; pick the one that covers the most guide tokens.
    type Candidate = {
      startIndex: number;
      endIndex: number;
      matchedTokens: number;
      coverage: number;
    };
    const candidates: Candidate[] = [];
    const startLimit = Math.min(words.length, first.index + 36);
    for (let startIndex = first.index; startIndex < startLimit; startIndex += 1) {
      const startMatch = matchGuideTokenAt(tokens[0], words, startIndex, 1);
      if (!startMatch || startMatch.index !== startIndex) {
        continue;
      }
      let cursor = startIndex + startMatch.consumed;
      let endIndex = cursor - 1;
      let matchedTokens = 1;
      for (let tokenIndex = 1; tokenIndex < tokens.length; tokenIndex += 1) {
        const match = matchGuideTokenAt(tokens[tokenIndex], words, cursor, 6);
        if (!match || match.score < 0.7) {
          if (tokens[tokenIndex].length <= 3) {
            continue;
          }
          break;
        }
        matchedTokens += 1;
        endIndex = match.index + match.consumed - 1;
        cursor = endIndex + 1;
      }
      const coverage = matchedTokens / tokens.length;
      if (coverage >= 0.55 && endIndex >= startIndex) {
        candidates.push({ startIndex, endIndex, matchedTokens, coverage });
      }
      // Only probe a handful of sentence-start hits.
      if (candidates.length >= 4) {
        break;
      }
    }

    candidates.sort((left, right) => {
      if (right.coverage !== left.coverage) {
        return right.coverage - left.coverage;
      }
      return left.startIndex - right.startIndex;
    });
    const best = candidates[0];
    if (!best) {
      continue;
    }

    const slice = words.slice(best.startIndex, best.endIndex + 1);
    const spokenText = slice.map((word) => word.word).join(" ").replace(/\s+/g, " ").trim();
    const guideClean = guide.replace(/\s+/g, " ").trim();
    let text = spokenText;
    if (
      /^(today|to\s+day)\b/i.test(guideClean) &&
      /^(the\s+day|to\s+day)\b/i.test(spokenText)
    ) {
      text = spokenText.replace(/^(the\s+day|to\s+day)\b/i, "Today");
    } else if (
      best.coverage >= 0.85 &&
      Math.abs(tokens.length - slice.length) <= 2
    ) {
      text = guideClean.replace(/^to\s+day\b/i, "Today");
    }
    spans.push({
      text,
      start: slice[0].start,
      end: slice[slice.length - 1].end,
    });
    wordIndex = best.endIndex + 1;
    matchedGuides += 1;
  }

  if (matchedGuides < 2 || spans.length < 2) {
    return null;
  }

  // Unmatched spoken gaps (NG takes) stay as their own pause-split lines.
  const filled: SentenceSpan[] = [];
  let cursorTime = words[0]?.start ?? 0;
  const ordered = [...spans].sort((left, right) => left.start - right.start);
  for (const span of ordered) {
    const gapWords = words.filter(
      (word) => word.end > cursorTime + 0.05 && word.start < span.start - 0.05,
    );
    if (gapWords.length >= 3) {
      filled.push(...sentencesFromWords(gapWords, 0.45));
    }
    filled.push(span);
    cursorTime = span.end;
  }
  const tailWords = words.filter((word) => word.start >= cursorTime + 0.05);
  if (tailWords.length >= 3) {
    filled.push(...sentencesFromWords(tailWords, 0.45));
  }

  const deduped: SentenceSpan[] = [];
  for (const span of filled.sort((left, right) => left.start - right.start)) {
    const prev = deduped[deduped.length - 1];
    if (
      prev &&
      Math.abs(prev.start - span.start) < 0.08 &&
      Math.abs(prev.end - span.end) < 0.08
    ) {
      continue;
    }
    if (prev && span.start < prev.end - 0.15) {
      continue;
    }
    deduped.push(span);
  }

  return deduped.filter((sentence) => sentence.text && sentence.end > sentence.start);
}

function repairSentenceDisplayText(span: SentenceSpan): SentenceSpan {
  let text = span.text.replace(/\s+/g, " ").trim();
  text = text.replace(/^(the\s+day|to\s+day)\b/i, "Today");
  if (text !== span.text) {
    return { ...span, text };
  }
  return span;
}

function averageSpanSeconds(spans: SentenceSpan[]): number {
  if (!spans.length) {
    return 0;
  }
  return spans.reduce((sum, span) => sum + (span.end - span.start), 0) / spans.length;
}

function firstWordNorm(text: string): string {
  const match = text.trim().match(/^[A-Za-z0-9']+/);
  return match ? normalizeToken(match[0]) : "";
}

/**
 * Rejoin Whisper segments that are mid-clause continuations
 * ("…not the same" + "Automically because…").
 */
function mergeContinuedSentences(spans: SentenceSpan[]): SentenceSpan[] {
  if (spans.length < 2) {
    return spans;
  }
  const merged: SentenceSpan[] = [];
  for (const span of spans) {
    const prev = merged[merged.length - 1];
    if (!prev) {
      merged.push(span);
      continue;
    }
    const gap = span.start - prev.end;
    const prevEndsSentence = SENTENCE_END.test(prev.text.trim());
    const nextStart = firstWordNorm(span.text);
    // Only merge on clear clause continuations — never on new discourse
    // openers like "And", "This", "Definition", "Today".
    const continues = CONTINUATION_START_WORDS.has(nextStart);
    if (continues && !prevEndsSentence && gap <= 0.35) {
      const left = prev.text.replace(/[.!?。！？]+$/, "").trim();
      const right = span.text.trim();
      merged[merged.length - 1] = {
        text: `${left} ${right}`.replace(/\s+/g, " ").trim(),
        start: prev.start,
        end: span.end,
      };
      continue;
    }
    merged.push(span);
  }
  return merged;
}

/**
 * When Whisper omits periods inside a long segment, split on short pauses or
 * clause-end → discourse-start patterns ("…formalize it" / "today we…").
 */
function splitSpanOnClauseBoundaries(
  span: SentenceSpan,
  words: TimedWord[],
  pauseSplitSeconds = 0.28,
): SentenceSpan[] {
  const segWords = wordsInSpan(words, span);
  if (segWords.length < 8) {
    return [span];
  }

  const cutAfter: number[] = [];
  for (let index = 0; index < segWords.length - 1; index += 1) {
    const current = segWords[index];
    const next = segWords[index + 1];
    const gap = next.start - current.end;
    const currentNorm = normalizeToken(current.word);
    const nextNorm = normalizeToken(next.word);
    const nextNextNorm =
      index + 2 < segWords.length ? normalizeToken(segWords[index + 2].word) : "";
    const restart =
      SENTENCE_START_WORDS.has(nextNorm) ||
      (nextNorm === "the" && nextNextNorm === "day") ||
      (nextNorm === "to" && nextNextNorm === "day");
    const weakRestart = WEAK_SENTENCE_START_WORDS.has(nextNorm);
    const clauseEnd =
      SENTENCE_END.test(current.word) || CLAUSE_END_WORDS.has(currentNorm);
    if (gap >= 0.4 && index >= 3 && index <= segWords.length - 4) {
      cutAfter.push(index);
      continue;
    }
    if (
      clauseEnd &&
      restart &&
      index >= 3 &&
      index <= segWords.length - 4
    ) {
      cutAfter.push(index);
      continue;
    }
    if (
      clauseEnd &&
      weakRestart &&
      gap >= pauseSplitSeconds &&
      index >= 3 &&
      index <= segWords.length - 4
    ) {
      cutAfter.push(index);
    }
  }

  if (!cutAfter.length) {
    return [span];
  }

  const uniqueCuts = [...new Set(cutAfter)].sort((left, right) => left - right);
  const sentences: SentenceSpan[] = [];
  let from = 0;
  for (const cut of uniqueCuts) {
    const slice = segWords.slice(from, cut + 1);
    if (slice.length) {
      let text = slice.map((word) => word.word).join(" ").replace(/\s+/g, " ").trim();
      if (!SENTENCE_END.test(text)) {
        text = `${text}.`;
      }
      sentences.push({
        text,
        start: slice[0].start,
        end: slice[slice.length - 1].end,
      });
    }
    from = cut + 1;
  }
  const tail = segWords.slice(from);
  if (tail.length) {
    sentences.push({
      text: tail.map((word) => word.word).join(" ").replace(/\s+/g, " ").trim(),
      start: tail[0].start,
      end: tail[tail.length - 1].end,
    });
  }
  return sentences.length ? sentences : [span];
}

function normalizeSegments(transcript: TranscriptVerbose): SentenceSpan[] {
  return (transcript.segments ?? [])
    .map((segment) => ({
      text: String(segment.text ?? "").trim().replace(/\s+/g, " "),
      start: Number(segment.start ?? 0),
      end: Number(segment.end ?? 0),
    }))
    .filter((sentence) => sentence.text && sentence.end > sentence.start);
}

function wordsInSpan(
  words: Array<{ word: string; start: number; end: number }>,
  span: SentenceSpan,
): Array<{ word: string; start: number; end: number }> {
  return words.filter(
    (word) => word.start >= span.start - 0.08 && word.end <= span.end + 0.08,
  );
}

/**
 * Split a timed span into one caption per sentence-ending punctuation.
 * Prefer Whisper word timestamps so "welcome back." is not truncated by
 * character-proportional boundaries before the next sentence.
 */
export function splitSpanBySentencePunctuation(
  span: SentenceSpan,
  words: Array<{ word: string; start: number; end: number }> = [],
): SentenceSpan[] {
  const parts = span.text
    .split(SENTENCE_SPLIT)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    return [span];
  }

  const segWords = wordsInSpan(words, span);
  if (segWords.length >= parts.length) {
    const sentences: SentenceSpan[] = [];
    let wordIndex = 0;
    for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
      const part = parts[partIndex];
      const tokenCount = part.split(/\s+/).filter(Boolean).length;
      const remainingParts = parts.length - partIndex;
      const remainingWords = segWords.length - wordIndex;
      const take = partIndex === parts.length - 1
        ? remainingWords
        : Math.max(1, Math.min(tokenCount, remainingWords - (remainingParts - 1)));
      // Prefer ending the slice on a sentence-ending word when available.
      let endIndex = wordIndex + take - 1;
      if (partIndex < parts.length - 1) {
        for (let i = wordIndex; i < segWords.length - (remainingParts - 1); i += 1) {
          if (SENTENCE_END.test(segWords[i].word)) {
            endIndex = i;
            break;
          }
        }
      } else {
        endIndex = segWords.length - 1;
      }
      const slice = segWords.slice(wordIndex, endIndex + 1);
      wordIndex = endIndex + 1;
      if (!slice.length) {
        continue;
      }
      sentences.push({
        text: part,
        start: slice[0].start,
        end: slice[slice.length - 1].end,
      });
    }
    if (sentences.length === parts.length) {
      return sentences;
    }
  }

  const totalChars = parts.reduce((sum, part) => sum + part.length, 0) || 1;
  const duration = Math.max(0.12, span.end - span.start);
  let cursor = span.start;
  return parts.map((part, index) => {
    const portion = part.length / totalChars;
    const start = cursor;
    const end =
      index === parts.length - 1 ? span.end : start + Math.max(0.12, duration * portion);
    cursor = end;
    return { text: part, start, end };
  });
}

/** Map a source-timeline interval onto the edited cut timeline (null if fully removed). */
export function mapSourceIntervalToEdited(
  line: { start: number; end: number },
  goodIntervals: GoodInterval[],
): { start: number; end: number } | null {
  if (!goodIntervals.length) {
    return { start: line.start, end: line.end };
  }
  let editedCursor = 0;
  for (const good of goodIntervals) {
    const overlapStart = Math.max(line.start, good.start);
    const overlapEnd = Math.min(line.end, good.end);
    if (overlapEnd > overlapStart + 0.04) {
      return {
        start: editedCursor + (overlapStart - good.start),
        end: editedCursor + (overlapEnd - good.start),
      };
    }
    editedCursor += Math.max(0, good.end - good.start);
  }
  return null;
}

export function mapSourceSecondsToEdited(
  sourceSeconds: number,
  goodIntervals: GoodInterval[],
): number | null {
  const mapped = mapSourceIntervalToEdited(
    { start: sourceSeconds, end: sourceSeconds + 0.001 },
    goodIntervals,
  );
  return mapped?.start ?? null;
}

/**
 * Map a source-timeline instant onto the edited cut timeline.
 * When the instant falls in a removed gap, snap to the edited position at the
 * end of the last kept interval before it (teleprompter Next taps still apply).
 */
export function mapSourceTimeToEditedTimeline(
  sourceSeconds: number,
  goodIntervals: GoodInterval[],
): number {
  if (!goodIntervals.length) {
    return sourceSeconds;
  }
  let editedCursor = 0;
  for (const good of goodIntervals) {
    if (sourceSeconds < good.start) {
      return editedCursor;
    }
    if (sourceSeconds <= good.end) {
      return editedCursor + (sourceSeconds - good.start);
    }
    editedCursor += Math.max(0, good.end - good.start);
  }
  return editedCursor;
}

/** Split Whisper words into spoken sentences using punctuation and long pauses. */
export function sentencesFromWords(
  words: Array<{ word: string; start: number; end: number }>,
  pauseSplitSeconds = 0.75,
): SentenceSpan[] {
  if (!words.length) {
    return [];
  }
  const sentences: SentenceSpan[] = [];
  let bucket: Array<{ word: string; start: number; end: number }> = [];

  const flush = () => {
    if (!bucket.length) {
      return;
    }
    sentences.push({
      text: bucket.map((entry) => entry.word).join(" ").replace(/\s+/g, " ").trim(),
      start: bucket[0].start,
      end: bucket[bucket.length - 1].end,
    });
    bucket = [];
  };

  for (let index = 0; index < words.length; index += 1) {
    const current = words[index];
    const prev = words[index - 1];
    if (prev && current.start - prev.end >= pauseSplitSeconds) {
      flush();
    }
    bucket.push(current);
    if (SENTENCE_END.test(current.word)) {
      flush();
    }
  }
  flush();
  return sentences
    .filter((sentence) => sentence.text && sentence.end > sentence.start)
    .flatMap((sentence) => splitSpanBySentencePunctuation(sentence, words));
}

/**
 * Prefer Whisper utterance segments when word punctuation is sparse
 * (common for outdoor takes) so captions stay one sentence at a time.
 * Pass `guideText` (beat say / teleprompter body) to recover sentence
 * boundaries Whisper merged without periods.
 */
export function sentencesFromTranscript(
  transcript: TranscriptVerbose,
  pauseSplitSecondsOrOptions: number | SentencesFromTranscriptOptions = 0.75,
): SentenceSpan[] {
  const options: SentencesFromTranscriptOptions =
    typeof pauseSplitSecondsOrOptions === "number"
      ? { pauseSplitSeconds: pauseSplitSecondsOrOptions }
      : pauseSplitSecondsOrOptions ?? {};
  const pauseSplitSeconds = options.pauseSplitSeconds ?? 0.75;
  const words = normalizeWords(transcript);

  const punctCount = words.filter((entry) => SENTENCE_END.test(entry.word)).length;
  const punctSparse =
    words.length === 0 || punctCount < Math.max(3, Math.floor(words.length * 0.02));

  const fromSegments = normalizeSegments(transcript).flatMap((span) =>
    splitSpanBySentencePunctuation(span, words).flatMap((part) =>
      splitSpanOnClauseBoundaries(part, words),
    ),
  );

  let baseline: SentenceSpan[] = fromSegments;
  if (words.length) {
    const fromWords = sentencesFromWords(
      words,
      punctSparse ? Math.min(pauseSplitSeconds, 0.45) : pauseSplitSeconds,
    ).flatMap((span) => splitSpanOnClauseBoundaries(span, words));
    if (
      !(punctSparse && fromSegments.length > 0) &&
      !(fromSegments.length >= Math.max(fromWords.length * 1.25, fromWords.length + 4))
    ) {
      baseline = fromWords;
    } else if (!fromSegments.length) {
      baseline = fromWords;
    }
  }

  const guideSentences = options.guideText
    ? guideSentencesFromText(options.guideText)
    : [];
  if (guideSentences.length >= 2 && words.length) {
    const guided = sentencesAlignedToGuide(words, guideSentences);
    if (
      guided &&
      guided.length >= Math.max(4, Math.floor(baseline.length * 0.75)) &&
      !guided.some((span) => span.end - span.start > 20) &&
      averageSpanSeconds(guided) <= averageSpanSeconds(baseline) * 1.8
    ) {
      return mergeContinuedSentences(guided.map(repairSentenceDisplayText));
    }
  }

  return mergeContinuedSentences(baseline.map(repairSentenceDisplayText));
}

export type BeatBoundary = {
  beatIndex: number;
  editedStart: number;
  editedEnd: number;
};

export function sentenceCaptionSegmentsFromTranscript({
  transcript,
  goodIntervals,
  boundaries,
  beats,
  guideText,
}: {
  transcript: TranscriptVerbose;
  goodIntervals: GoodInterval[];
  boundaries?: BeatBoundary[];
  beats?: Array<{ say?: string; sayZh?: string }>;
  guideText?: string;
}): CaptionSegment[] {
  const resolvedGuide =
    guideText ??
    (beats ?? [])
      .map((beat) => (beat.say ?? "").trim())
      .filter(Boolean)
      .join("\n");
  const sentences = sentencesFromTranscript(transcript, {
    guideText: resolvedGuide || undefined,
  });
  const segments: CaptionSegment[] = [];

  for (const sentence of sentences) {
    const mapped = mapSourceIntervalToEdited(sentence, goodIntervals);
    if (!mapped || mapped.end - mapped.start < 0.08) {
      continue;
    }
    const atSeconds = Math.round(mapped.start * 100) / 100;
    const durationSeconds = Math.max(
      0.12,
      Math.round((mapped.end - mapped.start) * 100) / 100,
    );
    segments.push({
      text: sentence.text,
      atSeconds,
      durationSeconds,
    });
  }

  return segments.sort((a, b) => a.atSeconds - b.atSeconds);
}
