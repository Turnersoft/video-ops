import path from 'node:path';

import { ensureDir, fileExists, readJson, writeJson } from './fs_util.ts';
import {
  extractAudio,
  probeDurationSeconds,
  runCommandOutput,
  runFfmpeg,
  transcribeLocal,
} from './subprocess.ts';

const DEFAULT_BAD_PHRASES = [
  'ng',
  'no good',
  'again',
  'one more time',
  'restart',
  'cut this',
  'wrong',
  'redo',
];

/** Expand removed ranges into silence only — never eat the previous/next spoken word. */
const CUT_PAD_BEFORE_SECONDS = 0.12;
const CUT_PAD_AFTER_SECONDS = 0.28;
/** Extra trim on keep edges — only from trailing/leading silence, never from spoken words. */
const KEEP_EDGE_TRIM_SECONDS = 0.06;
/** Whisper word ends often cut early; keep a little trail into silence at cut edges. */
const KEEP_WORD_TAIL_SECONDS = 0.1;

type AiEditArgs = {
  video?: string;
  script?: string;
  take?: string;
  'out-dir'?: string;
  transcript?: string;
  noRender?: boolean;
  /** Slide-event / marker declip only — no Whisper or OpenAI. */
  noTranscribe?: boolean;
  /** Re-cut from existing analysis.json + optional cut-selection.json in out-dir. */
  applySelection?: boolean;
};

type CutSelectionFile = {
  restoreBad?: Array<{ start: number; end: number }>;
  dropGood?: Array<{ start: number; end: number }>;
};

type TranscriptSegment = {
  start?: number;
  end?: number;
  text?: string;
};

type TranscriptWord = {
  word?: string;
  start?: number;
  end?: number;
};

type Transcript = {
  segments?: TranscriptSegment[];
  words?: TranscriptWord[];
  error?: { message?: string };
};

type NormalizedSegment = {
  start: number;
  end: number;
  text: string;
};

type NormalizedWord = {
  word: string;
  norm: string;
  start: number;
  end: number;
};

type Interval = {
  start: number;
  end: number;
  reason: string;
};

type GoodInterval = {
  start: number;
  end: number;
};

type TakeMarker = {
  kind?: string;
  atMs?: number;
  label?: string;
};

type SlideEvent = {
  slideId?: string;
  index?: number;
  atMs?: number;
};

type TakeManifest = {
  durationMs?: number;
  markers?: TakeMarker[];
  slideEvents?: SlideEvent[];
};

type OutdoorSlide = {
  id: string;
  title: string;
  durationSeconds?: number;
};

type OutdoorScript = {
  id: string;
  title: string;
  slides: OutdoorSlide[];
};

type VisualTimelineEntry = {
  slideId: string;
  slideTitle: string;
  sourceStart: number;
  sourceEnd: number;
  editedStart: number;
  editedEnd: number;
};

function usage(): void {
  console.log(`Usage:
deno task ai-edit \\
  --video take.mp4 \\
  --script outdoor-script.json \\
  --take take-manifest.json \\
  --out-dir export/outdoor-edit

Optional:
  --transcript transcript.json   Use an existing Whisper verbose_json transcript.
  --no-transcribe                Skip Whisper (slideEvents + NG markers only).
  --no-render                    Only write analysis JSON, do not cut video.
  --apply-selection              Re-cut using analysis.json + cut-selection.json in --out-dir
                                (skips transcription). Still needs --script and --take.

Environment for transcription (default on; local Whisper, no LLM):
  OPENAI_API_KEY                 Optional cloud Whisper instead of local faster-whisper.
  OPENAI_TRANSCRIBE_MODEL        Defaults to whisper-1.
  WHISPER_MODEL / WHISPER_MODEL_PATH  Local faster-whisper model (default: base, offline cache).
`);
}

function parseArgs(argv: string[]): AiEditArgs {
  const args: Record<string, string | boolean> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    if (key === 'no-render' || key === 'apply-selection' || key === 'no-transcribe') {
      if (key === 'no-render') {
        args.noRender = true;
      } else if (key === 'apply-selection') {
        args.applySelection = true;
      } else {
        args.noTranscribe = true;
      }
      continue;
    }
    args[key] = argv[index + 1];
    index += 1;
  }
  return args as AiEditArgs;
}

function intervalKey(interval: { start: number; end: number }): string {
  return `${interval.start.toFixed(3)}-${interval.end.toFixed(3)}`;
}

/** Punch `drops` out of `goods` so sentence-level cuts work (not only whole good intervals). */
function subtractIntervals(
  goods: Array<{ start: number; end: number }>,
  drops: Array<{ start: number; end: number }>,
): Array<{ start: number; end: number }> {
  let result = goods.map((interval) => ({ start: interval.start, end: interval.end }));
  for (const drop of drops) {
    const next: Array<{ start: number; end: number }> = [];
    for (const interval of result) {
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
    result = next;
  }
  return result
    .filter((interval) => interval.end - interval.start > 0.04)
    .sort((a, b) => a.start - b.start);
}

/**
 * If a drop starts/ends mid-word, keep that word (push the drop off it).
 * Fixes stale drops like "welcome back.|The…" where start landed inside "back.".
 */
function snapDropOffPartialWords(
  drop: { start: number; end: number },
  words: Array<{ start: number; end: number }>,
): { start: number; end: number } | null {
  let start = drop.start;
  let end = drop.end;
  const startOverlap = words.find((word) => word.start < start && word.end > start + 0.01);
  if (startOverlap) {
    start = startOverlap.end;
  }
  const endOverlap = words.find((word) => word.start < end - 0.01 && word.end > end);
  if (endOverlap) {
    end = endOverlap.start;
  }
  if (end - start <= 0.04) {
    return null;
  }
  return { start, end };
}

function padDropInterval(
  drop: { start: number; end: number },
  durationSeconds: number,
  words: Array<{ start: number; end: number }> = [],
): { start: number; end: number } | null {
  const sorted = [...words].sort((a, b) => a.start - b.start);
  const snapped = sorted.length ? snapDropOffPartialWords(drop, sorted) : drop;
  if (!snapped) {
    return null;
  }
  // Strictly before/after the drop — do not treat a word that starts AT drop.start as "prev".
  const prevWord = [...sorted]
    .reverse()
    .find((word) => word.end <= snapped.start && word.start < snapped.start);
  const nextWord = sorted.find((word) => word.start >= snapped.end);
  const silenceBefore = prevWord
    ? Math.max(0, snapped.start - prevWord.end)
    : CUT_PAD_BEFORE_SECONDS;
  const silenceAfter = nextWord
    ? Math.max(0, nextWord.start - snapped.end)
    : CUT_PAD_AFTER_SECONDS;
  return {
    start: Math.max(0, snapped.start - Math.min(CUT_PAD_BEFORE_SECONDS, silenceBefore)),
    end: Math.min(
      durationSeconds,
      snapped.end + Math.min(CUT_PAD_AFTER_SECONDS, silenceAfter),
    ),
  };
}

/**
 * Pull keep edges inward only through silence.
 * Never trim past the first/last Whisper word inside the keep (fixes clipped "back.").
 */
function trimKeepEdgesAtCuts(
  goods: Array<{ start: number; end: number }>,
  durationSeconds: number,
  words: Array<{ start: number; end: number }> = [],
): Array<{ start: number; end: number }> {
  if (!goods.length) {
    return [];
  }
  const sorted = [...words].sort((a, b) => a.start - b.start);
  return goods
    .map((interval, index) => {
      let start = interval.start;
      let end = interval.end;
      const inside = sorted.filter(
        (word) => word.end > interval.start + 0.02 && word.start < interval.end - 0.02,
      );
      const firstWord = inside[0];
      const lastWord = inside[inside.length - 1];
      const nextKeepStart =
        index < goods.length - 1 ? goods[index + 1].start : durationSeconds;
      const prevKeepEnd = index > 0 ? goods[index - 1].end : 0;

      if (firstWord) {
        start = Math.min(start, firstWord.start);
      }
      if (lastWord) {
        end = Math.max(end, lastWord.end);
      }

      const abutsPriorCut = index === 0 ? interval.start > 0.05 : true;
      const abutsNextCut =
        index === goods.length - 1 ? interval.end < durationSeconds - 0.05 : true;
      if (abutsPriorCut) {
        const silenceBefore = firstWord ? Math.max(0, firstWord.start - start) : 0;
        start += Math.min(KEEP_EDGE_TRIM_SECONDS, silenceBefore);
      }
      if (abutsNextCut) {
        const silenceAfter = lastWord ? Math.max(0, end - lastWord.end) : 0;
        end -= Math.min(KEEP_EDGE_TRIM_SECONDS, silenceAfter);
      }

      // Never cut inside a spoken word; add a short trail into following silence.
      if (firstWord) {
        start = Math.min(start, firstWord.start);
        if (abutsPriorCut) {
          start = Math.max(
            prevKeepEnd,
            Math.min(start, firstWord.start - KEEP_WORD_TAIL_SECONDS),
          );
        }
      }
      if (lastWord) {
        const nextWord = sorted.find((word) => word.start >= lastWord.end - 0.01);
        const maxEnd = Math.min(
          nextKeepStart,
          nextWord ? nextWord.start : durationSeconds,
        );
        end = Math.max(end, lastWord.end);
        if (abutsNextCut) {
          end = Math.min(maxEnd, Math.max(end, lastWord.end + KEEP_WORD_TAIL_SECONDS));
        }
        end = Math.max(end, lastWord.end);
      }
      return { start, end };
    })
    .filter((interval) => interval.end - interval.start > 0.2);
}

function applyCutSelection(
  badIntervals: Interval[],
  goodIntervals: GoodInterval[],
  selection: CutSelectionFile,
  durationSeconds: number,
  words: Array<{ start: number; end: number }> = [],
): GoodInterval[] {
  const restoreKeys = new Set((selection.restoreBad ?? []).map(intervalKey));
  const paddedDrops = (selection.dropGood ?? [])
    .map((drop) => padDropInterval(drop, durationSeconds, words))
    .filter((drop): drop is { start: number; end: number } => drop != null);
  const keptFromGood = trimKeepEdgesAtCuts(
    subtractIntervals(goodIntervals, paddedDrops),
    durationSeconds,
    words,
  );
  const restored = badIntervals
    .filter((interval) => restoreKeys.has(intervalKey(interval)))
    .map((interval) => ({ start: interval.start, end: interval.end }));
  return [...keptFromGood, ...restored].sort((a, b) => a.start - b.start);
}

function transcribeWithOpenAi(audioPath: string, transcriptPath: string): Transcript {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set. Pass --transcript with an existing verbose_json transcript, or set OPENAI_API_KEY.',
    );
  }

  const model = Deno.env.get('OPENAI_TRANSCRIBE_MODEL') || 'whisper-1';
  const curlArgs = [
    '-sS',
    'https://api.openai.com/v1/audio/transcriptions',
    '-H',
    `Authorization: Bearer ${apiKey}`,
    '-F',
    `file=@${audioPath}`,
    '-F',
    `model=${model}`,
    '-F',
    'response_format=verbose_json',
    '-F',
    'timestamp_granularities[]=segment',
    '-F',
    'timestamp_granularities[]=word',
  ];
  const raw = runCommandOutput('curl', curlArgs);
  const parsed = JSON.parse(raw) as Transcript;
  if (parsed.error) {
    throw new Error(parsed.error.message || 'OpenAI transcription failed.');
  }
  writeJson(transcriptPath, parsed);
  return parsed;
}

function transcribeAudio(audioPath: string, transcriptPath: string): Transcript {
  if (Deno.env.get('OPENAI_API_KEY')) {
    return transcribeWithOpenAi(audioPath, transcriptPath);
  }
  try {
    return transcribeLocal(audioPath, transcriptPath) as Transcript;
  } catch (error) {
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\n` +
        'Set OPENAI_API_KEY or install local Whisper: pip3 install faster-whisper',
    );
  }
}

function transcriptSegments(transcript: Transcript): NormalizedSegment[] {
  if (Array.isArray(transcript.segments)) {
    return transcript.segments
      .filter(
        (segment) => typeof segment.start === 'number' && typeof segment.end === 'number',
      )
      .map((segment) => ({
        start: segment.start as number,
        end: segment.end as number,
        text: String(segment.text ?? '').trim(),
      }));
  }
  return [];
}

function transcriptWords(transcript: Transcript): NormalizedWord[] {
  if (!Array.isArray(transcript.words)) {
    return [];
  }
  return transcript.words
    .map((word) => ({
      word: String(word.word ?? '').trim(),
      norm: normalizeWord(word.word),
      start: Number(word.start),
      end: Number(word.end),
    }))
    .filter((word) => word.norm && Number.isFinite(word.start) && Number.isFinite(word.end));
}

function normalizeWord(word: string | undefined): string {
  return String(word ?? '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function mergeIntervals(intervals: Interval[], durationSeconds: number): Interval[] {
  const sorted = intervals
    .map((interval) => ({
      start: Math.max(0, interval.start),
      end: Math.min(durationSeconds, interval.end),
      reason: interval.reason,
    }))
    .filter((interval) => interval.end > interval.start)
    .sort((left, right) => left.start - right.start);

  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (!last || interval.start > last.end + 0.05) {
      merged.push({ ...interval });
      continue;
    }
    last.end = Math.max(last.end, interval.end);
    last.reason = `${last.reason}; ${interval.reason}`;
  }
  return merged;
}

function transcriptPolishIntervals(segments: NormalizedSegment[], words: NormalizedWord[]): Interval[] {
  const intervals: Interval[] = [];
  const sortedSegments = [...segments].sort((left, right) => left.start - right.start);

  for (let index = 1; index < sortedSegments.length; index += 1) {
    const prev = sortedSegments[index - 1];
    const next = sortedSegments[index];
    const gap = next.start - prev.end;
    if (gap > 0.8) {
      intervals.push({
        start: prev.end + 0.18,
        end: next.start - 0.16,
        reason: `transcript pause ${gap.toFixed(2)}s`,
      });
    }
  }

  for (let index = 0; index < words.length; index += 1) {
    const current = words[index];
    const next = words[index + 1];
    if (current.norm === 'you' && next?.norm === 'know') {
      intervals.push({
        start: current.start - 0.12,
        end: next.end + 0.18,
        reason: 'filler aside: you know',
      });
    }
  }

  for (let index = 1; index < words.length; index += 1) {
    const prev = words[index - 1];
    const current = words[index];
    const gap = current.start - prev.end;
    if (gap > 0.65) {
      intervals.push({
        start: prev.end + 0.06,
        end: current.start - 0.06,
        reason: `word pause ${gap.toFixed(2)}s`,
      });
    }
  }

  for (let index = 1; index < words.length; index += 1) {
    const prev = words[index - 1];
    const current = words[index];
    if (current.norm.length >= 3 && current.norm === prev.norm) {
      intervals.push({
        start: current.start - 0.12,
        end: current.end + 0.2,
        reason: `repeated word: ${current.word}`,
      });
    }
  }

  for (let index = 2; index < words.length; index += 1) {
    const a = words[index - 2];
    const b = words[index - 1];
    const c = words[index];
    const d = words[index + 1];
    if (!d) {
      continue;
    }
    if (a.norm.length >= 3 && b.norm.length >= 3 && a.norm === c.norm && b.norm === d.norm) {
      intervals.push({
        start: c.start - 0.14,
        end: d.end + 0.22,
        reason: `repeated phrase: ${c.word} ${d.word}`,
      });
    }
  }

  return intervals;
}

/** Drop leading/trailing silence inside each kept span using word timestamps. */
function trimGoodIntervalsToSpeech(
  words: NormalizedWord[],
  goods: GoodInterval[],
): GoodInterval[] {
  if (!words.length || !goods.length) {
    return goods;
  }
  const trimmed: GoodInterval[] = [];
  for (const good of goods) {
    const inRange = words.filter(
      (word) => word.start >= good.start - 0.05 && word.end <= good.end + 0.05,
    );
    if (!inRange.length) {
      trimmed.push(good);
      continue;
    }
    trimmed.push({
      start: Math.max(good.start, inRange[0].start - 0.06),
      end: Math.min(good.end, inRange[inRange.length - 1].end + 0.1),
    });
  }
  return trimmed
    .filter((interval) => interval.end - interval.start > 0.2)
    .sort((a, b) => a.start - b.start);
}

function complementIntervals(badIntervals: Interval[], durationSeconds: number): GoodInterval[] {
  const good: GoodInterval[] = [];
  let cursor = 0;
  for (const interval of badIntervals) {
    if (interval.start - cursor > 0.7) {
      good.push({ start: cursor, end: interval.start });
    }
    cursor = Math.max(cursor, interval.end);
  }
  if (durationSeconds - cursor > 0.7) {
    good.push({ start: cursor, end: durationSeconds });
  }
  return good;
}

function containsBadPhrase(text: string, phrase: string): boolean {
  const lower = text.toLowerCase();
  if (phrase === 'ng') {
    return /\bng\b/.test(lower);
  }
  return lower.includes(phrase);
}

function detectBadIntervals(
  segments: NormalizedSegment[],
  take: TakeManifest,
  durationSeconds: number,
): Interval[] {
  const bad: Interval[] = [];
  for (const marker of take.markers ?? []) {
    if (marker.kind !== 'ng') {
      continue;
    }
    const at = (marker.atMs ?? 0) / 1000;
    bad.push({
      start: at - 1.2,
      end: at + 5,
      reason: `manual NG marker: ${marker.label}`,
    });
  }

  for (const segment of segments) {
    const phrase = DEFAULT_BAD_PHRASES.find((candidate) =>
      containsBadPhrase(segment.text, candidate),
    );
    if (phrase) {
      bad.push({
        start: segment.start - 0.55,
        end: segment.end + 0.95,
        reason: `spoken NG phrase: ${phrase}`,
      });
    }
  }

  return mergeIntervals(bad, durationSeconds);
}

function slideAtTime(slideEvents: SlideEvent[], seconds: number): SlideEvent {
  let current = slideEvents[0];
  for (const event of slideEvents) {
    if ((event.atMs ?? 0) / 1000 <= seconds) {
      current = event;
    }
  }
  return current;
}

function splitVisualPlan(
  script: OutdoorScript,
  take: TakeManifest,
  goodIntervals: GoodInterval[],
): VisualTimelineEntry[] {
  const events = (take.slideEvents ?? []).length
    ? take.slideEvents!
    : script.slides.map((slide, index) => ({
        slideId: slide.id,
        index,
        atMs: script.slides
          .slice(0, index)
          .reduce((sum, item) => sum + (item.durationSeconds ?? 10) * 1000, 0),
      }));

  const timeline: VisualTimelineEntry[] = [];
  let editedCursor = 0;
  for (const interval of goodIntervals) {
    const boundaries = events
      .map((event) => (event.atMs ?? 0) / 1000)
      .filter((time) => time > interval.start && time < interval.end);
    const points = [interval.start, ...boundaries, interval.end];
    for (let index = 0; index < points.length - 1; index += 1) {
      const sourceStart = points[index];
      const sourceEnd = points[index + 1];
      const event = slideAtTime(events, sourceStart);
      const slide = script.slides[event?.index ?? 0] ?? script.slides[0];
      timeline.push({
        slideId: slide.id,
        slideTitle: slide.title,
        sourceStart,
        sourceEnd,
        editedStart: editedCursor,
        editedEnd: editedCursor + (sourceEnd - sourceStart),
      });
      editedCursor += sourceEnd - sourceStart;
    }
  }
  return timeline;
}

function renderCutVideo(videoPath: string, goodIntervals: GoodInterval[], outDir: string): string {
  const chunksDir = path.join(outDir, 'chunks');
  ensureDir(chunksDir);
  const concatPath = path.join(chunksDir, 'concat.txt');
  const chunkPaths: string[] = [];

  goodIntervals.forEach((interval, index) => {
    const duration = Math.max(0.05, interval.end - interval.start);
    const chunkPath = path.join(chunksDir, `chunk-${String(index).padStart(3, '0')}.mp4`);
    // Seek after -i for accurate cuts. Do not use afade here: with unshifted
    // source timestamps, afade-out stays muted through the rest of the chunk.
    runFfmpeg([
      '-y',
      '-i',
      videoPath,
      '-ss',
      interval.start.toFixed(3),
      '-t',
      duration.toFixed(3),
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '18',
      '-c:a',
      'aac',
      '-af',
      'asetpts=PTS-STARTPTS',
      '-avoid_negative_ts',
      'make_zero',
      chunkPath,
    ]);
    chunkPaths.push(chunkPath);
  });

  Deno.writeTextFileSync(
    concatPath,
    chunkPaths.map((chunkPath) => `file '${chunkPath.replaceAll("'", "'\\''")}'`).join('\n'),
  );

  const output = path.join(outDir, 'edited-good-intervals.mp4');
  runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', concatPath, '-c', 'copy', output]);

  // Sidecar audio for Remotion <Audio> (avoids dual-decoding the same mp4 in Studio).
  const audioOut = path.join(outDir, 'edited-good-intervals-audio.m4a');
  runFfmpeg([
    '-y',
    '-i',
    output,
    '-vn',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    audioOut,
  ]);

  return output;
}

export async function runAiEdit(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  if (!args.script || !args.take || !args['out-dir']) {
    usage();
    Deno.exit(1);
  }
  if (!args.applySelection && !args.video) {
    usage();
    Deno.exit(1);
  }

  const scriptPath = path.resolve(args.script);
  const takePath = path.resolve(args.take);
  const outDir = path.resolve(args['out-dir']);
  ensureDir(outDir);

  const script = readJson<OutdoorScript>(scriptPath);
  const take = readJson<TakeManifest>(takePath);

  if (args.applySelection) {
    const analysisPath = path.join(outDir, 'analysis.json');
    const selectionPath = path.join(outDir, 'cut-selection.json');
    if (!fileExists(analysisPath)) {
      throw new Error(`Missing analysis.json in ${outDir}`);
    }
    const analysis = readJson<{
      sourceVideo?: string;
      durationSeconds?: number;
      sourceDurationSeconds?: number;
      badIntervals?: Interval[];
      goodIntervals?: GoodInterval[];
      baselineBadIntervals?: Interval[];
      baselineGoodIntervals?: GoodInterval[];
      baselineVisualTimeline?: VisualTimelineEntry[];
      visualTimeline?: VisualTimelineEntry[];
    }>(analysisPath);
    const videoPath = path.resolve(args.video ?? analysis.sourceVideo ?? '');
    if (!videoPath || !fileExists(videoPath)) {
      throw new Error('Could not resolve source video for --apply-selection');
    }
    const selection = fileExists(selectionPath)
      ? readJson<CutSelectionFile>(selectionPath)
      : { restoreBad: [], dropGood: [] };
    const baselineBad = analysis.baselineBadIntervals ?? analysis.badIntervals ?? [];
    const baselineGood = analysis.baselineGoodIntervals ?? analysis.goodIntervals ?? [];
    const durationSeconds =
      analysis.sourceDurationSeconds ??
      analysis.durationSeconds ??
      probeDurationSeconds(videoPath);
    const transcriptPath = path.join(outDir, 'transcript.verbose.json');
    const words = fileExists(transcriptPath)
      ? transcriptWords(readJson<Transcript>(transcriptPath))
      : [];
    const goodIntervals = applyCutSelection(
      baselineBad,
      baselineGood,
      selection,
      durationSeconds,
      words,
    );
    const visualTimeline = splitVisualPlan(script, take, goodIntervals);
    const nextAnalysis = {
      ...analysis,
      sourceDurationSeconds: analysis.sourceDurationSeconds ?? durationSeconds,
      baselineBadIntervals: analysis.baselineBadIntervals ?? baselineBad,
      baselineGoodIntervals: analysis.baselineGoodIntervals ?? baselineGood,
      baselineVisualTimeline: analysis.baselineVisualTimeline ?? analysis.visualTimeline,
      selectionAppliedAt: new Date().toISOString(),
      lastAppliedInputVideo: videoPath,
      appliedGoodIntervals: goodIntervals,
    };
    writeJson(analysisPath, nextAnalysis);
    writeJson(path.join(outDir, 'remotion-visual-plan.json'), {
      schemaVersion: 1,
      sourceScriptId: script.id,
      title: script.title,
      editedDurationSeconds: goodIntervals.reduce(
        (sum, interval) => sum + interval.end - interval.start,
        0,
      ),
      timeline: visualTimeline,
    });
    if (!args.noRender) {
      const editedVideo = renderCutVideo(videoPath, goodIntervals, outDir);
      console.log(`Edited video (selection applied): ${editedVideo}`);
    }
    console.log(`Analysis updated: ${analysisPath}`);
    return;
  }

  const videoPath = path.resolve(args.video!);
  let durationSeconds = (take.durationMs ?? 0) / 1000;
  if (!durationSeconds) {
    durationSeconds = probeDurationSeconds(videoPath);
  }
  const audioPath = path.join(outDir, 'audio.wav');
  const transcriptPath = args.transcript
    ? path.resolve(args.transcript)
    : path.join(outDir, 'transcript.verbose.json');

  let segments: NormalizedSegment[] = [];
  let words: NormalizedWord[] = [];
  if (args.transcript) {
    const transcript = readJson<Transcript>(transcriptPath);
    segments = transcriptSegments(transcript);
    words = transcriptWords(transcript);
  } else if (args.noTranscribe) {
    writeJson(transcriptPath, {
      skipped: true,
      reason: 'slide-event declip (no transcription)',
      segments: [],
      words: [],
    });
  } else {
    extractAudio(videoPath, audioPath);
    const transcript = transcribeAudio(audioPath, transcriptPath);
    segments = transcriptSegments(transcript);
    words = transcriptWords(transcript);
  }

  const badIntervals = mergeIntervals(
    [
      ...detectBadIntervals(segments, take, durationSeconds),
      ...transcriptPolishIntervals(segments, words),
    ],
    durationSeconds,
  );
  const goodIntervals = trimGoodIntervalsToSpeech(
    words,
    trimKeepEdgesAtCuts(
      complementIntervals(badIntervals, durationSeconds),
      durationSeconds,
    ),
  );
  const visualTimeline = splitVisualPlan(script, take, goodIntervals);

  const analysis = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceVideo: videoPath,
    sourceScript: scriptPath,
    sourceTake: takePath,
    durationSeconds,
    sourceDurationSeconds: durationSeconds,
    transcriptSegments: segments,
    transcriptWordCount: words.length,
    badIntervals,
    goodIntervals,
    baselineBadIntervals: badIntervals,
    baselineGoodIntervals: goodIntervals,
    visualTimeline,
    baselineVisualTimeline: visualTimeline,
  };

  writeJson(path.join(outDir, 'analysis.json'), analysis);
  writeJson(path.join(outDir, 'remotion-visual-plan.json'), {
    schemaVersion: 1,
    sourceScriptId: script.id,
    title: script.title,
    editedDurationSeconds: goodIntervals.reduce(
      (sum, interval) => sum + interval.end - interval.start,
      0,
    ),
    timeline: visualTimeline,
  });

  if (!args.noRender) {
    const editedVideo = renderCutVideo(videoPath, goodIntervals, outDir);
    console.log(`Edited video: ${editedVideo}`);
  }

  console.log(`Analysis: ${path.join(outDir, 'analysis.json')}`);
  console.log(`Remotion visual plan: ${path.join(outDir, 'remotion-visual-plan.json')}`);
}
