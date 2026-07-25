/**
 * Cut analysis for browser review: CapCut-style transcript by slide + keep/cut selection.
 */

import path from 'node:path';

import type { TakeManifest } from '../../ios-teleprompter/src/scriptSchema.ts';
import {
  sentencesFromTranscript,
  type SentenceSpan,
} from '../../outdoor_post/src/sentence-captions.ts';
import { loadAnimationV4 } from './animation-load.ts';
import { fileExists, readJson, writeJson } from './fs_util.ts';
import {
  cutAppliesWithStabilizedVideo,
  cutNeedsStabilizedApply,
  cutRunReviewVideoUrl,
  cutRunUsesStabilizedInput,
  isStageStale,
  staleReason,
} from './pipeline-lineage.ts';
import { outdoorScriptPath, takeStageRunDir } from './paths.ts';
import type { OutdoorJob } from './schema.ts';

export type CutInterval = {
  start: number;
  end: number;
  reason?: string;
};

export type CutTranscriptLine = {
  id: string;
  start: number;
  end: number;
  text: string;
  kept: boolean;
  kind: 'keep' | 'silence' | 'ng' | 'other';
  reason: string;
  /** Interval used when toggling keep/cut (bad restore or good drop). */
  toggleStart: number;
  toggleEnd: number;
  toggleMode: 'bad' | 'good';
};

export type CutSlideTranscript = {
  slideId: string;
  slideTitle: string;
  sourceStart: number;
  sourceEnd: number;
  lines: CutTranscriptLine[];
};

export type CutReviewPayload = {
  runId: string;
  analysisPath: string;
  selectionPath: string;
  /** @deprecated Prefer previewVideoUrl — kept for older UI builds. */
  sourceVideoUrl: string;
  /** Footage shown in Cut review (stabilized when available). */
  previewVideoUrl: string;
  previewUsesStabilized: boolean;
  editedVideoUrl: string | null;
  durationSeconds: number;
  slides: CutSlideTranscript[];
  badIntervals: CutInterval[];
  goodIntervals: CutInterval[];
  selection: CutSelection;
  usesStabilizedInput: boolean;
  appliesWithStabilizedVideo: boolean;
  needsStabilizedApply: boolean;
  stale: boolean;
  staleReason: string | null;
};

export type CutSelection = {
  schemaVersion: 1;
  /** Bad intervals the user wants to KEEP (undo a cut). */
  restoreBad: CutInterval[];
  /** Good intervals the user wants to DROP. */
  dropGood: CutInterval[];
  updatedAt: string;
};

export type AnalysisFile = {
  durationSeconds?: number;
  sourceDurationSeconds?: number;
  badIntervals?: CutInterval[];
  goodIntervals?: CutInterval[];
  baselineBadIntervals?: CutInterval[];
  baselineGoodIntervals?: CutInterval[];
  baselineVisualTimeline?: AnalysisFile['visualTimeline'];
  appliedGoodIntervals?: CutInterval[];
  transcriptSegments?: Array<{
    start?: number;
    end?: number;
    text?: string;
  }>;
  visualTimeline?: Array<{
    slideId: string;
    slideTitle?: string;
    sourceStart: number;
    sourceEnd: number;
    editedStart: number;
    editedEnd: number;
  }>;
};

type TranscriptWord = {
  word?: string;
  start?: number;
  end?: number;
};

type TranscriptVerbose = {
  words?: TranscriptWord[];
  segments?: Array<{
    start?: number;
    end?: number;
    text?: string;
  }>;
};

type RawLine = {
  id: string;
  start: number;
  end: number;
  text: string;
};

/** Sentence lines from a Whisper verbose transcript (edited or source timeline). */
export function loadTranscriptSentences(
  transcriptPath: string,
  guideText?: string,
): Array<{ id: string; start: number; end: number; text: string }> {
  if (!fileExists(transcriptPath)) {
    return [];
  }
  try {
    const transcript = readJson<TranscriptVerbose>(transcriptPath);
    // Prefer Whisper utterance segments when word punctuation is sparse —
    // words+pause splitting otherwise merges many spoken sentences into one line.
    // Pass teleprompter/say guideText so missing periods still split correctly.
    return sentencesFromTranscript(transcript, { guideText }).map(
      (sentence: SentenceSpan, index: number) => ({
        id: `sent-${index}`,
        start: sentence.start,
        end: sentence.end,
        text: sentence.text,
      }),
    );
  } catch {
    return [];
  }
}

export function loadScriptGuideText(scriptId: string): string | undefined {
  const scriptFile = outdoorScriptPath(scriptId);
  if (!fileExists(scriptFile)) {
    return undefined;
  }
  try {
    const script = readJson<{
      slides?: Array<{ body?: string; say?: string }>;
    }>(scriptFile);
    const text = (script.slides ?? [])
      .map((slide) => (slide.body ?? slide.say ?? '').trim())
      .filter(Boolean)
      .join('\n');
    return text || undefined;
  } catch {
    return undefined;
  }
}

function splitSentenceTexts(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  // Prefer punctuation splits; also split bare newlines (teleprompter script bodies).
  const byPunct = trimmed
    .split(/(?<=[.!?…。！？])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
  if (byPunct.length > 1) {
    return byPunct;
  }
  const byLine = trimmed
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return byLine.length ? byLine : [trimmed];
}

/** When Whisper was skipped: build CapCut-style lines from outdoor-script body + slide windows. */
function sentencesFromScriptBeats(
  scriptId: string,
  slideWindows: Array<{ slideId: string; slideTitle: string; sourceStart: number; sourceEnd: number }>,
): RawLine[] {
  const scriptFile = outdoorScriptPath(scriptId);
  if (!fileExists(scriptFile) || !slideWindows.length) {
    return [];
  }
  try {
    const script = readJson<{
      slides?: Array<{ id?: string; body?: string; title?: string }>;
    }>(scriptFile);
    const byId = new Map(
      (script.slides ?? [])
        .filter((slide) => slide.id)
        .map((slide) => [slide.id!, slide] as const),
    );
    const lines: RawLine[] = [];
    let sentenceIndex = 0;
    for (const window of slideWindows) {
      const slide = byId.get(window.slideId);
      const body = (slide?.body ?? '').trim();
      if (!body) {
        continue;
      }
      for (const part of sentencesFromSegmentText({
        id: `script-${window.slideId}`,
        start: window.sourceStart,
        end: window.sourceEnd,
        text: body,
      })) {
        lines.push({
          ...part,
          id: `sent-${sentenceIndex}`,
        });
        sentenceIndex += 1;
      }
    }
    return lines;
  } catch {
    return [];
  }
}

function wordsInRange(
  words: Array<{ word: string; start: number; end: number }>,
  start: number,
  end: number,
): Array<{ word: string; start: number; end: number }> {
  return words.filter((word) => word.start >= start - 0.08 && word.end <= end + 0.08);
}

/**
 * Prefer segment text (has periods) split into exactly one sentence each,
 * timed by consuming Whisper word timestamps inside that segment.
 */
function sentencesFromSegmentsAndWords(
  segments: Array<{ start: number; end: number; text: string }>,
  words: TranscriptWord[],
): RawLine[] {
  const normalizedWords = words
    .map((word) => ({
      word: (word.word ?? '').trim(),
      start: Number(word.start ?? 0),
      end: Number(word.end ?? 0),
    }))
    .filter((word) => word.word && word.end > word.start);

  const lines: RawLine[] = [];
  let sentenceIndex = 0;

  for (const [segmentIndex, segment] of segments.entries()) {
    const parts = splitSentenceTexts(segment.text);
    if (!parts.length) continue;

    const segWords = wordsInRange(normalizedWords, segment.start, segment.end);
    if (!segWords.length || parts.length === 1) {
      if (parts.length <= 1) {
        lines.push({
          id: `sent-${sentenceIndex}`,
          start: segment.start,
          end: segment.end,
          text: parts[0] ?? segment.text,
        });
        sentenceIndex += 1;
        continue;
      }
      // No words: fall back to proportional timing inside the segment.
      for (const part of sentencesFromSegmentText({
        id: `seg-${segmentIndex}`,
        start: segment.start,
        end: segment.end,
        text: segment.text,
      })) {
        lines.push({ ...part, id: `sent-${sentenceIndex}` });
        sentenceIndex += 1;
      }
      continue;
    }

    let wordIndex = 0;
    for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
      const part = parts[partIndex];
      const tokenCount = part.split(/\s+/).filter(Boolean).length;
      const remainingParts = parts.length - partIndex;
      const remainingWords = segWords.length - wordIndex;
      const take = partIndex === parts.length - 1
        ? remainingWords
        : Math.max(1, Math.min(tokenCount, remainingWords - (remainingParts - 1)));
      const slice = segWords.slice(wordIndex, wordIndex + take);
      wordIndex += take;
      if (!slice.length) {
        // Proportional fallback for this leftover sentence.
        const share = 1 / parts.length;
        const duration = Math.max(0.01, segment.end - segment.start);
        const start = segment.start + duration * partIndex * share;
        const end = partIndex === parts.length - 1
          ? segment.end
          : segment.start + duration * (partIndex + 1) * share;
        lines.push({
          id: `sent-${sentenceIndex}`,
          start,
          end,
          text: part,
        });
      } else {
        lines.push({
          id: `sent-${sentenceIndex}`,
          start: slice[0].start,
          end: slice[slice.length - 1].end,
          text: part,
        });
      }
      sentenceIndex += 1;
    }
  }

  return lines.filter((line) => line.text.length > 0 && line.end > line.start);
}

/** Fallback when word timings are missing: split segment text on sentence boundaries. */
function sentencesFromSegmentText(segment: {
  id: string;
  start: number;
  end: number;
  text: string;
}): RawLine[] {
  const parts = splitSentenceTexts(segment.text);
  if (!parts.length) return [];
  if (parts.length === 1) {
    return [{ id: segment.id, start: segment.start, end: segment.end, text: parts[0] }];
  }
  const totalChars = parts.reduce((sum, part) => sum + part.length, 0) || 1;
  const duration = Math.max(0.01, segment.end - segment.start);
  let cursor = segment.start;
  return parts.map((part, index) => {
    const share = part.length / totalChars;
    const start = cursor;
    const end = index === parts.length - 1 ? segment.end : cursor + duration * share;
    cursor = end;
    return {
      id: `${segment.id}-s${index}`,
      start,
      end,
      text: part,
    };
  });
}

function classifyReason(reason: string): CutTranscriptLine['kind'] {
  const lower = reason.toLowerCase();
  if (lower.includes('pause') || lower.includes('silent') || lower.includes('silence')) {
    return 'silence';
  }
  if (
    lower.includes('ng') ||
    lower.includes('repeated') ||
    lower.includes('filler') ||
    lower.includes('manual')
  ) {
    return 'ng';
  }
  return 'other';
}

function overlaps(a: CutInterval, b: CutInterval): boolean {
  return a.start < b.end && b.start < a.end;
}

function overlapSeconds(a: CutInterval, b: CutInterval): number {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

function intervalKey(interval: CutInterval): string {
  return `${interval.start.toFixed(3)}-${interval.end.toFixed(3)}`;
}

function defaultSelection(): CutSelection {
  return {
    schemaVersion: 1,
    restoreBad: [],
    dropGood: [],
    updatedAt: new Date().toISOString(),
  };
}

export function cutSelectionPath(job: OutdoorJob, runId: string): string {
  return path.join(takeStageRunDir(job.scriptId, job.takeId, 'cut', runId), 'cut-selection.json');
}

export function loadCutSelection(job: OutdoorJob, runId: string): CutSelection {
  const filePath = cutSelectionPath(job, runId);
  if (!fileExists(filePath)) {
    return defaultSelection();
  }
  try {
    return { ...defaultSelection(), ...readJson<CutSelection>(filePath) };
  } catch {
    return defaultSelection();
  }
}

export function saveCutSelection(job: OutdoorJob, runId: string, selection: CutSelection): CutSelection {
  const next: CutSelection = {
    schemaVersion: 1,
    restoreBad: selection.restoreBad ?? [],
    dropGood: selection.dropGood ?? [],
    updatedAt: new Date().toISOString(),
  };
  writeJson(cutSelectionPath(job, runId), next);
  return next;
}

function slideTitleForId(scriptId: string, slideId: string, beatIndex: number): string {
  const scriptFile = outdoorScriptPath(scriptId);
  if (fileExists(scriptFile)) {
    try {
      const script = readJson<{ slides?: Array<{ id?: string; title?: string }> }>(scriptFile);
      const slide = (script.slides ?? []).find((entry) => entry.id === slideId);
      if (slide?.title?.trim()) {
        return slide.title.trim();
      }
    } catch {
      // fall through
    }
  }
  const animation = loadAnimationV4(scriptId);
  const beat = animation?.scenes?.[0]?.compare?.beats?.[beatIndex];
  const visualNotes = beat?.visualNotes?.split('\n').find((line) => line.trim())?.trim();
  if (visualNotes && !visualNotes.startsWith('<!--')) {
    return visualNotes.slice(0, 120);
  }
  return slideId;
}

/** Teleprompter Next taps — contiguous source windows (unlike cut timeline slide labels). */
function slideRangesFromSlideEvents(
  take: TakeManifest,
  scriptId: string,
  durationSeconds: number,
): Array<{ slideId: string; slideTitle: string; sourceStart: number; sourceEnd: number }> | null {
  const events = take.slideEvents ?? [];
  if (events.length < 2) {
    return null;
  }
  const totalSourceSeconds = Math.max(durationSeconds, take.durationMs / 1000);
  return events.map((event, index) => {
    const next = events[index + 1];
    const slideId = event.slideId?.trim() || `beat-${String(index + 1).padStart(2, '0')}`;
    return {
      slideId,
      slideTitle: slideTitleForId(scriptId, slideId, index),
      sourceStart: Math.max(0, event.atMs / 1000),
      sourceEnd: Math.max(
        event.atMs / 1000 + 0.5,
        (next?.atMs ?? totalSourceSeconds * 1000) / 1000,
      ),
    };
  });
}

function slideRangesFromTimeline(
  timeline: NonNullable<AnalysisFile['visualTimeline']>,
  durationSeconds: number,
): Array<{ slideId: string; slideTitle: string; sourceStart: number; sourceEnd: number }> {
  if (!timeline.length) {
    return [{
      slideId: 'all',
      slideTitle: 'Full take',
      sourceStart: 0,
      sourceEnd: durationSeconds,
    }];
  }

  // Collapse visual timeline rows into contiguous slide windows on source time.
  const bySlide = new Map<string, { slideId: string; slideTitle: string; sourceStart: number; sourceEnd: number }>();
  for (const entry of timeline) {
    const existing = bySlide.get(entry.slideId);
    if (!existing) {
      bySlide.set(entry.slideId, {
        slideId: entry.slideId,
        slideTitle: entry.slideTitle ?? entry.slideId,
        sourceStart: entry.sourceStart,
        sourceEnd: entry.sourceEnd,
      });
      continue;
    }
    existing.sourceStart = Math.min(existing.sourceStart, entry.sourceStart);
    existing.sourceEnd = Math.max(existing.sourceEnd, entry.sourceEnd);
  }
  return [...bySlide.values()].sort((a, b) => a.sourceStart - b.sourceStart);
}

function findSlideForTime(
  slides: Array<{ slideId: string; slideTitle: string; sourceStart: number; sourceEnd: number }>,
  time: number,
): { slideId: string; slideTitle: string; sourceStart: number; sourceEnd: number } {
  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index];
    const isLast = index === slides.length - 1;
    const inWindow =
      time >= slide.sourceStart &&
      (isLast ? time <= slide.sourceEnd + 0.05 : time < slide.sourceEnd);
    if (inWindow) {
      return slide;
    }
  }
  // Nearest by midpoint distance.
  let best = slides[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const slide of slides) {
    const mid = (slide.sourceStart + slide.sourceEnd) / 2;
    const dist = Math.abs(mid - time);
    if (dist < bestDist) {
      best = slide;
      bestDist = dist;
    }
  }
  return best;
}

function lineStatus(
  line: CutInterval,
  badIntervals: CutInterval[],
  selection: CutSelection,
): {
  kept: boolean;
  kind: CutTranscriptLine['kind'];
  reason: string;
  toggleStart: number;
  toggleEnd: number;
  toggleMode: 'bad' | 'good';
} {
  const restoreKeys = new Set(selection.restoreBad.map(intervalKey));
  const duration = Math.max(0.001, line.end - line.start);

  let bestBad: CutInterval | null = null;
  let bestOverlap = 0;
  for (const bad of badIntervals) {
    const overlap = overlapSeconds(line, bad);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestBad = bad;
    }
  }

  const mostlyCut = bestBad && bestOverlap / duration >= 0.35;
  const containsCut = bestBad && bestOverlap / Math.max(0.001, bestBad.end - bestBad.start) >= 0.5;

  if (bestBad && (mostlyCut || containsCut)) {
    const restored = restoreKeys.has(intervalKey(bestBad));
    const kind = classifyReason(bestBad.reason ?? '');
    return {
      kept: restored,
      kind: kind === 'silence' ? 'silence' : kind === 'ng' ? 'ng' : 'other',
      reason: kind === 'silence' ? 'silent' : bestBad.reason ?? 'cut',
      toggleStart: bestBad.start,
      toggleEnd: bestBad.end,
      toggleMode: 'bad',
    };
  }

  const dropped = (selection.dropGood ?? []).some((drop) => {
    return overlapSeconds(line, drop) / duration >= 0.5;
  });

  return {
    kept: !dropped,
    kind: 'keep',
    reason: dropped ? 'manually dropped' : 'kept',
    toggleStart: line.start,
    toggleEnd: line.end,
    toggleMode: 'good',
  };
}

export function baselineCutAnalysis(analysis: AnalysisFile): {
  badIntervals: CutInterval[];
  goodIntervals: CutInterval[];
  durationSeconds: number;
  visualTimeline: NonNullable<AnalysisFile['visualTimeline']>;
} {
  const badIntervals = analysis.baselineBadIntervals ?? analysis.badIntervals ?? [];
  const goodIntervals = analysis.baselineGoodIntervals ?? analysis.goodIntervals ?? [];
  const durationSeconds = analysis.sourceDurationSeconds ?? analysis.durationSeconds ?? 0;
  const visualTimeline =
    analysis.baselineVisualTimeline ?? analysis.visualTimeline ?? [];
  return { badIntervals, goodIntervals, durationSeconds, visualTimeline };
}

export function buildCutReview(job: OutdoorJob, runId: string): CutReviewPayload | null {
  const analysisPath = path.join(
    takeStageRunDir(job.scriptId, job.takeId, 'cut', runId),
    'analysis.json',
  );
  if (!fileExists(analysisPath)) {
    return null;
  }
  const analysis = readJson<AnalysisFile>(analysisPath);
  const selection = loadCutSelection(job, runId);
  const baseline = baselineCutAnalysis(analysis);
  const badIntervals = baseline.badIntervals;
  const goodIntervals = baseline.goodIntervals;
  const durationSeconds = baseline.durationSeconds;
  const take = fileExists(job.takeManifestPath)
    ? readJson<TakeManifest>(job.takeManifestPath)
    : null;
  const fromSlideEvents =
    take ? slideRangesFromSlideEvents(take, job.scriptId, durationSeconds) : null;
  const slideWindows =
    fromSlideEvents ?? slideRangesFromTimeline(baseline.visualTimeline, durationSeconds);

  const transcriptPath = path.join(
    takeStageRunDir(job.scriptId, job.takeId, 'cut', runId),
    'transcript.verbose.json',
  );
  const transcriptWords = fileExists(transcriptPath)
    ? (readJson<TranscriptVerbose>(transcriptPath).words ?? [])
    : [];
  const guideText = loadScriptGuideText(job.scriptId);

  const sentenceLines = fileExists(transcriptPath)
    ? loadTranscriptSentences(transcriptPath, guideText)
    : (() => {
      const sourceSegments = (analysis.transcriptSegments ?? [])
        .map((segment) => ({
          start: Number(segment.start ?? 0),
          end: Number(segment.end ?? 0),
          text: (segment.text ?? '').trim(),
        }))
        .filter((segment) => segment.end > segment.start && segment.text);

      return sourceSegments.length
        ? sentencesFromSegmentsAndWords(sourceSegments, transcriptWords)
        : transcriptWords.length
        ? sentencesFromSegmentsAndWords(
          [{
            start: Number(transcriptWords[0]?.start ?? 0),
            end: Number(transcriptWords[transcriptWords.length - 1]?.end ?? 0),
            text: transcriptWords.map((word) => word.word ?? '').join(' '),
          }],
          transcriptWords,
        )
        : sentencesFromScriptBeats(job.scriptId, slideWindows);
    })();

  // Synthetic silence / cut markers that have no overlapping sentence text.
  const synthetic: RawLine[] = [];
  for (const [index, bad] of badIntervals.entries()) {
    const hasText = sentenceLines.some((line) => overlapSeconds(line, bad) > 0.05);
    if (hasText) continue;
    const kind = classifyReason(bad.reason ?? '');
    const label = kind === 'silence' ? '[silent]' : `[cut] ${bad.reason ?? 'removed'}`;
    synthetic.push({
      id: `bad-${index}`,
      start: bad.start,
      end: bad.end,
      text: label,
    });
  }

  const allLines = [...sentenceLines, ...synthetic].sort((a, b) => a.start - b.start);

  const slideBuckets = new Map<string, CutSlideTranscript>();
  for (const window of slideWindows) {
    slideBuckets.set(window.slideId, {
      slideId: window.slideId,
      slideTitle: window.slideTitle,
      sourceStart: window.sourceStart,
      sourceEnd: window.sourceEnd,
      lines: [],
    });
  }

  for (const line of allLines) {
    const mid = (line.start + line.end) / 2;
    const slide = findSlideForTime(slideWindows, mid);
    const bucket = slideBuckets.get(slide.slideId) ?? {
      slideId: slide.slideId,
      slideTitle: slide.slideTitle,
      sourceStart: slide.sourceStart,
      sourceEnd: slide.sourceEnd,
      lines: [],
    };
    const status = lineStatus(line, badIntervals, selection);
    bucket.lines.push({
      id: line.id,
      start: line.start,
      end: line.end,
      text: line.text || '[empty]',
      ...status,
    });
    slideBuckets.set(slide.slideId, bucket);
  }

  // Ensure every bad interval still appears if it somehow missed both text and synthetic.
  for (const [index, bad] of badIntervals.entries()) {
    const alreadyShown = [...slideBuckets.values()].some((slide) =>
      slide.lines.some((line) =>
        overlapSeconds(line, bad) > 0.05 ||
        (Math.abs(line.start - bad.start) < 0.05 && Math.abs(line.end - bad.end) < 0.05)
      )
    );
    if (alreadyShown) continue;
    const mid = (bad.start + bad.end) / 2;
    const slide = findSlideForTime(slideWindows, mid);
    const bucket = slideBuckets.get(slide.slideId);
    if (!bucket) continue;
    const kind = classifyReason(bad.reason ?? '');
    const restored = selection.restoreBad.some((interval) => intervalKey(interval) === intervalKey(bad));
    bucket.lines.push({
      id: `orphan-bad-${index}`,
      start: bad.start,
      end: bad.end,
      text: kind === 'silence' ? '[silent]' : `[cut] ${bad.reason ?? 'removed'}`,
      kept: restored,
      kind: kind === 'silence' ? 'silence' : kind === 'ng' ? 'ng' : 'other',
      reason: kind === 'silence' ? 'silent' : bad.reason ?? 'cut',
      toggleStart: bad.start,
      toggleEnd: bad.end,
      toggleMode: 'bad',
    });
    bucket.lines.sort((a, b) => a.start - b.start);
  }

  const slides = [...slideBuckets.values()]
    .map((slide) => ({
      ...slide,
      lines: slide.lines.sort((a, b) => a.start - b.start),
    }))
    .sort((a, b) => a.sourceStart - b.sourceStart);

  const editedPath = path.join(
    takeStageRunDir(job.scriptId, job.takeId, 'cut', runId),
    'edited-good-intervals.mp4',
  );

  return {
    runId,
    analysisPath,
    selectionPath: cutSelectionPath(job, runId),
    sourceVideoUrl: cutRunReviewVideoUrl(job, runId),
    previewVideoUrl: cutRunReviewVideoUrl(job, runId),
    previewUsesStabilized: cutAppliesWithStabilizedVideo(job),
    editedVideoUrl: fileExists(editedPath)
      ? `/api/scripts/${encodeURIComponent(job.scriptId)}/takes/${encodeURIComponent(job.takeId)}/artifacts/cut/${encodeURIComponent(runId)}/edited-good-intervals.mp4`
      : null,
    durationSeconds,
    slides,
    badIntervals,
    goodIntervals,
    selection,
    usesStabilizedInput: cutRunUsesStabilizedInput(job, runId),
    appliesWithStabilizedVideo: cutAppliesWithStabilizedVideo(job),
    needsStabilizedApply: cutNeedsStabilizedApply(job, runId),
    stale: isStageStale(job, 'cut'),
    staleReason: staleReason(job, 'cut'),
  };
}

/** Apply selection: restored bad intervals become kept; dropped sentence ranges are punched out. */
export function effectiveGoodIntervals(
  analysis: AnalysisFile,
  selection: CutSelection,
  transcriptWords: TranscriptWord[] = [],
): CutInterval[] {
  const baseline = baselineCutAnalysis(analysis);
  const durationSeconds = baseline.durationSeconds;
  const restoreKeys = new Set(selection.restoreBad.map(intervalKey));
  const softPadBefore = 0.12;
  const softPadAfter = 0.28;
  const edgeTrim = 0.06;
  const wordTail = 0.1;
  const words = transcriptWords
    .map((word) => ({
      word: (word.word ?? '').trim(),
      start: Number(word.start ?? 0),
      end: Number(word.end ?? 0),
    }))
    .filter((word) => word.word && word.end > word.start)
    .sort((a, b) => a.start - b.start);

  const paddedDrops = (selection.dropGood ?? [])
    .map((drop) => {
      let dropStart = drop.start;
      let dropEnd = drop.end;
      // Never start/end a drop mid-word — keep the straddling word.
      const startOverlap = words.find(
        (word) => word.start < dropStart && word.end > dropStart + 0.01,
      );
      if (startOverlap) {
        dropStart = startOverlap.end;
      }
      const endOverlap = words.find(
        (word) => word.start < dropEnd - 0.01 && word.end > dropEnd,
      );
      if (endOverlap) {
        dropEnd = endOverlap.start;
      }
      if (dropEnd - dropStart <= 0.04) {
        return null;
      }
      const prevWord = [...words]
        .reverse()
        .find((word) => word.end <= dropStart && word.start < dropStart);
      const nextWord = words.find((word) => word.start >= dropEnd);
      const silenceBefore = prevWord
        ? Math.max(0, dropStart - prevWord.end)
        : softPadBefore;
      const silenceAfter = nextWord
        ? Math.max(0, nextWord.start - dropEnd)
        : softPadAfter;
      return {
        start: Math.max(0, dropStart - Math.min(softPadBefore, silenceBefore)),
        end: Math.min(
          durationSeconds || Number.POSITIVE_INFINITY,
          dropEnd + Math.min(softPadAfter, silenceAfter),
        ),
      };
    })
    .filter((drop): drop is CutInterval => drop != null);
  let keptFromGood = [...baseline.goodIntervals];
  for (const drop of paddedDrops) {
    const next: CutInterval[] = [];
    for (const interval of keptFromGood) {
      if (drop.end <= interval.start || drop.start >= interval.end) {
        next.push(interval);
        continue;
      }
      if (drop.start > interval.start) {
        next.push({ start: interval.start, end: Math.min(drop.start, interval.end) });
      }
      if (drop.end < interval.end) {
        next.push({ start: Math.max(drop.end, interval.start), end: interval.end });
      }
    }
    keptFromGood = next.filter((interval) => interval.end - interval.start > 0.04);
  }
  keptFromGood = keptFromGood
    .map((interval, index) => {
      let start = interval.start;
      let end = interval.end;
      const inside = words.filter(
        (word) => word.end > interval.start + 0.02 && word.start < interval.end - 0.02,
      );
      const firstWord = inside[0];
      const lastWord = inside[inside.length - 1];
      const nextKeepStart =
        index < keptFromGood.length - 1
          ? keptFromGood[index + 1].start
          : durationSeconds || Number.POSITIVE_INFINITY;
      const prevKeepEnd = index > 0 ? keptFromGood[index - 1].end : 0;
      if (firstWord) {
        start = Math.min(start, firstWord.start);
      }
      if (lastWord) {
        end = Math.max(end, lastWord.end);
      }
      const abutsPriorCut = index === 0 ? interval.start > 0.05 : true;
      const abutsNextCut =
        index === keptFromGood.length - 1
          ? durationSeconds > 0 && interval.end < durationSeconds - 0.05
          : true;
      if (abutsPriorCut) {
        const silenceBefore = firstWord ? Math.max(0, firstWord.start - start) : 0;
        start += Math.min(edgeTrim, silenceBefore);
      }
      if (abutsNextCut) {
        const silenceAfter = lastWord ? Math.max(0, end - lastWord.end) : 0;
        end -= Math.min(edgeTrim, silenceAfter);
      }
      if (firstWord) {
        start = Math.min(start, firstWord.start);
        if (abutsPriorCut) {
          start = Math.max(
            prevKeepEnd,
            Math.min(start, firstWord.start - wordTail),
          );
        }
      }
      if (lastWord) {
        const nextWord = words.find((word) => word.start >= lastWord.end - 0.01);
        const maxEnd = Math.min(
          nextKeepStart,
          nextWord ? nextWord.start : durationSeconds || Number.POSITIVE_INFINITY,
        );
        end = Math.max(end, lastWord.end);
        if (abutsNextCut) {
          end = Math.min(maxEnd, Math.max(end, lastWord.end + wordTail));
        }
        end = Math.max(end, lastWord.end);
      }
      return { start, end };
    })
    .filter((interval) => interval.end - interval.start > 0.2);
  const restored = baseline.badIntervals.filter((interval) =>
    restoreKeys.has(intervalKey(interval)),
  );
  return [...keptFromGood, ...restored].sort((a, b) => a.start - b.start);
}
