import path from "node:path";

import { attachSpokenZhToCaptionSegments } from "./caption_translate.ts";
import { fileExists, readJson, writeJson } from "./fs_util.ts";
import { scriptDirFor } from "./paths.ts";
import {
  sentenceCaptionSegmentsFromTranscript,
  sentencesFromTranscript,
  type GoodInterval,
} from "./sentence-captions.ts";
import {
  extractAudio,
  probeDurationSeconds,
  transcribeLocal,
} from "./subprocess.ts";

const FILLER_WORDS = new Set([
  "so",
  "um",
  "uh",
  "like",
  "well",
  "okay",
  "ok",
  "right",
  "yeah",
  "and",
]);

const PHRASE_ALIASES: string[][] = [
  ["seteq", "set", "equal"],
  ["seteq", "set", "equality"],
  ["rfl", "f", "l"],
  ["rfl", "rafford"],
  ["funext", "fun", "ext"],
  ["nat", "net"],
  ["zero", "0"],
  ["receipt", "recipient"],
  ["receipt", "water"],
];

type Token = {
  raw: string;
  norm: string;
};

type ScriptToken = Token & {
  beatIndex: number;
  scriptIndex: number;
};

type SpokenToken = Token & {
  start: number;
  end: number;
  spokenIndex: number;
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
};

type AnimationBeat = {
  say?: string;
  sayZh?: string;
  durationSeconds?: number;
  visualNotes?: string;
};

type AnimationScene = {
  durationSeconds?: number;
  compare?: { beats?: AnimationBeat[] };
};

type Animation = {
  title?: string;
  scenes?: AnimationScene[];
};

type AlignMatch = {
  scriptIndex: number;
  spokenIndex: number;
  beatIndex: number;
};

type DpStep = {
  prevScript: number;
  prevSpoken: number;
  kind: "skip_spoken" | "match" | "skip_script";
  spokenIndex?: number;
};

type BeatBoundary = {
  beatIndex: number;
  editedStart: number;
  editedEnd: number;
  durationSeconds: number;
  lastSpokenWord: string | null;
};

type CaptionSegment = {
  text: string;
  zh?: string;
  atSeconds: number;
  durationSeconds: number;
};

function usage(): void {
  console.log(`Usage:
deno task align <script-id> --edit-dir <dir>

Aligns spoken word timestamps to animation beat scripts and writes:
  speech-alignment.json
  remotion-visual-plan.json
  animation-outdoor.json
`);
}

function normalizeToken(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function tokenizeSay(text: string): Token[] {
  return String(text)
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((word) => ({
      raw: word,
      norm: normalizeToken(word),
    }))
    .filter((token) => token.norm.length > 0);
}

function levenshtein(left: string, right: string): number {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let row = 0; row < rows; row += 1) {
    matrix[row][0] = row;
  }
  for (let col = 0; col < cols; col += 1) {
    matrix[0][col] = col;
  }
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      );
    }
  }
  return matrix[rows - 1][cols - 1];
}

function wordSimilarity(scriptNorm: string, spokenNorm: string): number {
  if (!scriptNorm || !spokenNorm) {
    return -1;
  }
  if (scriptNorm === spokenNorm) {
    return 1;
  }
  if (scriptNorm.includes(spokenNorm) || spokenNorm.includes(scriptNorm)) {
    return 0.88;
  }
  const maxLen = Math.max(scriptNorm.length, spokenNorm.length);
  const dist = levenshtein(scriptNorm, spokenNorm);
  if (maxLen <= 2 && dist <= 1) {
    return 0.75;
  }
  if (maxLen >= 3 && dist <= 2) {
    return 0.72;
  }
  return -1;
}

function expandPhraseAliases(tokens: ScriptToken[]): ScriptToken[] {
  const norms = tokens.map((token) => token.norm);
  const expanded: ScriptToken[] = [];
  for (let index = 0; index < norms.length; index += 1) {
    let consumed = 1;
    let matched = false;
    for (const alias of PHRASE_ALIASES) {
      const slice = norms.slice(index, index + alias.length);
      if (slice.length !== alias.length) {
        continue;
      }
      const ok = alias.every(
        (part, partIndex) => wordSimilarity(part, slice[partIndex]) >= 0.7,
      );
      if (ok) {
        expanded.push({
          raw: alias.join(" "),
          norm: alias.join(""),
          beatIndex: tokens[index].beatIndex,
          scriptIndex: tokens[index].scriptIndex,
        });
        consumed = alias.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      expanded.push(tokens[index]);
    }
    index += consumed - 1;
  }
  return expanded;
}

function flattenScriptBeats(beats: AnimationBeat[]): ScriptToken[] {
  const tokens: ScriptToken[] = [];
  beats.forEach((beat, beatIndex) => {
    for (const token of tokenizeSay(beat.say ?? "")) {
      tokens.push({
        ...token,
        beatIndex,
        scriptIndex: tokens.length,
      });
    }
  });
  return expandPhraseAliases(tokens);
}

function wordsFromTranscript(transcript: Transcript): SpokenToken[] {
  if (Array.isArray(transcript.words) && transcript.words.length) {
    return transcript.words
      .map((entry, index) => ({
        raw: String(entry.word ?? "").trim(),
        norm: normalizeToken(entry.word ?? ""),
        start: Number(entry.start),
        end: Number(entry.end),
        spokenIndex: index,
      }))
      .filter(
        (entry) =>
          entry.norm.length > 0 &&
          Number.isFinite(entry.start) &&
          Number.isFinite(entry.end),
      );
  }

  const words: SpokenToken[] = [];
  for (const segment of transcript.segments ?? []) {
    const parts = tokenizeSay(segment.text ?? "");
    const duration = Math.max(
      0.05,
      Number(segment.end) - Number(segment.start),
    );
    const step = duration / Math.max(1, parts.length);
    parts.forEach((part, index) => {
      const start = Number(segment.start) + step * index;
      const end = start + step;
      words.push({
        raw: part.raw,
        norm: part.norm,
        start,
        end,
        spokenIndex: words.length,
      });
    });
  }
  return words;
}

function alignScriptToSpeech(
  scriptTokens: ScriptToken[],
  spokenTokens: SpokenToken[],
): AlignMatch[] {
  const scriptCount = scriptTokens.length;
  const spokenCount = spokenTokens.length;
  const dp = Array.from({ length: scriptCount + 1 }, () =>
    Array.from({ length: spokenCount + 1 }, () => -Infinity),
  );
  const back: Array<Array<DpStep | null>> = Array.from(
    { length: scriptCount + 1 },
    () => Array.from({ length: spokenCount + 1 }, () => null),
  );
  dp[0][0] = 0;

  for (let scriptIndex = 0; scriptIndex <= scriptCount; scriptIndex += 1) {
    for (let spokenIndex = 0; spokenIndex <= spokenCount; spokenIndex += 1) {
      const base = dp[scriptIndex][spokenIndex];
      if (base === -Infinity) {
        continue;
      }

      if (spokenIndex < spokenCount) {
        const spoken = spokenTokens[spokenIndex];
        const fillerPenalty = FILLER_WORDS.has(spoken.norm) ? 0.05 : 0.25;
        const nextScore = base - fillerPenalty;
        if (nextScore > dp[scriptIndex][spokenIndex + 1]) {
          dp[scriptIndex][spokenIndex + 1] = nextScore;
          back[scriptIndex][spokenIndex + 1] = {
            prevScript: scriptIndex,
            prevSpoken: spokenIndex,
            kind: "skip_spoken",
          };
        }
      }

      if (scriptIndex < scriptCount && spokenIndex < spokenCount) {
        const script = scriptTokens[scriptIndex];
        const spoken = spokenTokens[spokenIndex];
        const sim = wordSimilarity(script.norm, spoken.norm);
        if (sim >= 0.7) {
          const nextScore = base + sim;
          if (nextScore > dp[scriptIndex + 1][spokenIndex + 1]) {
            dp[scriptIndex + 1][spokenIndex + 1] = nextScore;
            back[scriptIndex + 1][spokenIndex + 1] = {
              prevScript: scriptIndex,
              prevSpoken: spokenIndex,
              kind: "match",
              spokenIndex,
            };
          }
        }
      }

      if (scriptIndex < scriptCount) {
        const nextScore = base - 0.8;
        if (nextScore > dp[scriptIndex + 1][spokenIndex]) {
          dp[scriptIndex + 1][spokenIndex] = nextScore;
          back[scriptIndex + 1][spokenIndex] = {
            prevScript: scriptIndex,
            prevSpoken: spokenIndex,
            kind: "skip_script",
          };
        }
      }
    }
  }

  let scriptIndex = scriptCount;
  let spokenIndex = spokenCount;
  const matches: AlignMatch[] = [];
  while (scriptIndex > 0 || spokenIndex > 0) {
    const step = back[scriptIndex][spokenIndex];
    if (!step) {
      break;
    }
    if (step.kind === "match") {
      matches.push({
        scriptIndex: scriptIndex - 1,
        spokenIndex: step.prevSpoken,
        beatIndex: scriptTokens[scriptIndex - 1].beatIndex,
      });
    }
    scriptIndex = step.prevScript;
    spokenIndex = step.prevSpoken;
  }
  matches.reverse();
  return matches;
}

function totalEndCap(_totalDuration: number, value: number): number {
  return value;
}

function beatBoundariesFromMatches(
  scriptTokens: ScriptToken[],
  spokenTokens: SpokenToken[],
  matches: AlignMatch[],
  beatCount: number,
  totalDuration: number,
): BeatBoundary[] {
  const lastSpokenByBeat = Array.from({ length: beatCount }, () => -1);
  for (const match of matches) {
    lastSpokenByBeat[match.beatIndex] = Math.max(
      lastSpokenByBeat[match.beatIndex],
      match.spokenIndex,
    );
  }

  const boundaries: BeatBoundary[] = [];
  let previousEnd = 0;
  for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
    const spokenIndex = lastSpokenByBeat[beatIndex];
    let end =
      spokenIndex >= 0 ? spokenTokens[spokenIndex].end + 0.35 : previousEnd + 4;
    if (beatIndex === beatCount - 1) {
      end = totalDuration;
    } else {
      end = Math.min(totalEndCap(totalDuration, end), totalDuration);
    }
    end = Math.max(end, previousEnd + 2);
    boundaries.push({
      beatIndex,
      editedStart: Math.round(previousEnd * 100) / 100,
      editedEnd: Math.round(end * 100) / 100,
      durationSeconds: Math.round((end - previousEnd) * 100) / 100,
      lastSpokenWord: spokenIndex >= 0 ? spokenTokens[spokenIndex].raw : null,
    });
    previousEnd = end;
  }

  const drift = totalDuration - boundaries[boundaries.length - 1].editedEnd;
  if (Math.abs(drift) > 0.05) {
    boundaries[boundaries.length - 1].editedEnd =
      Math.round(totalDuration * 100) / 100;
    boundaries[boundaries.length - 1].durationSeconds =
      Math.round(
        (boundaries[boundaries.length - 1].editedEnd -
          boundaries[boundaries.length - 1].editedStart) *
          100,
      ) / 100;
  }
  return boundaries;
}

function splitIntoSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }
  const parts = trimmed.match(/[^.!?。！？]+(?:[.!?。！？]+|$)/g);
  if (!parts?.length) {
    return [trimmed];
  }
  return parts.map((part) => part.trim()).filter(Boolean);
}

function subdivideSegmentBySentence(segment: {
  text: string;
  atSeconds: number;
  durationSeconds: number;
}): Array<{ text: string; atSeconds: number; durationSeconds: number }> {
  const sentences = splitIntoSentences(segment.text);
  if (sentences.length <= 1) {
    return [segment];
  }
  const totalChars = Math.max(
    1,
    sentences.reduce((sum, sentence) => sum + sentence.length, 0),
  );
  let cursor = segment.atSeconds;
  const totalDuration = segment.durationSeconds;
  return sentences.map((sentence) => {
    const share = sentence.length / totalChars;
    const durationSeconds = Math.max(
      0.12,
      Math.round(totalDuration * share * 100) / 100,
    );
    const next = {
      text: sentence,
      atSeconds: Math.round(cursor * 100) / 100,
      durationSeconds,
    };
    cursor += durationSeconds;
    return next;
  });
}

function segmentsForBeat(
  beatStart: number,
  beatEnd: number,
  transcript: Transcript,
): Array<{ text: string; atSeconds: number; durationSeconds: number }> {
  const segments: Array<{
    text: string;
    atSeconds: number;
    durationSeconds: number;
  }> = [];
  for (const segment of transcript.segments ?? []) {
    const start = Number(segment.start);
    const end = Number(segment.end);
    if (end <= beatStart || start >= beatEnd) {
      continue;
    }
    const clippedStart = Math.max(beatStart, start);
    const clippedEnd = Math.min(beatEnd, end);
    const base = {
      text: String(segment.text ?? "").trim(),
      atSeconds: Math.round(clippedStart * 100) / 100,
      durationSeconds: Math.round((clippedEnd - clippedStart) * 100) / 100,
    };
    for (const sentenceSegment of subdivideSegmentBySentence(base)) {
      segments.push(sentenceSegment);
    }
  }
  return segments.filter(
    (segment) => segment.text && segment.durationSeconds > 0.05,
  );
}

export async function runAlignSpeechToBeats(argv: string[]): Promise<void> {
  const scriptId = argv[0];
  if (!scriptId) {
    usage();
    Deno.exit(1);
  }

  let editDir = "";
  let retranscribe = false;
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--edit-dir" && argv[index + 1]) {
      editDir = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (token === "--retranscribe") {
      retranscribe = true;
    }
  }

  const scriptDir = scriptDirFor(scriptId);
  if (!editDir) {
    editDir = path.join(scriptDir, "export", "outdoor-edit-take-mrbtjdup");
  }

  const animationPath = path.join(scriptDir, ".cache", "animation-v4.json");
  const videoPath = [
    path.join(editDir, "edited-good-intervals.mp4"),
    path.join(scriptDir, "takes", "take-mrbtjdup.MP4"),
    path.join(scriptDir, "takes", "take-mrbtjdup.mp4"),
  ].find((candidate) => fileExists(candidate));

  if (!videoPath) {
    throw new Error(`No edited outdoor video found under ${editDir}`);
  }
  if (!fileExists(animationPath)) {
    throw new Error(`Missing compiled animation for ${scriptId} — run remotion sync`);
  }

  const animation = readJson<Animation>(animationPath);
  const scene = animation.scenes?.[0];
  const beats = scene?.compare?.beats ?? [];
  if (!beats.length) {
    throw new Error(`animation has no compare beats for ${scriptId}`);
  }

  const transcriptPath = path.join(editDir, "transcript.verbose.json");
  let transcript: Transcript | null = fileExists(transcriptPath)
    ? readJson<Transcript>(transcriptPath)
    : null;
  if (retranscribe || !transcript?.words?.length) {
    const audioPath = path.join(editDir, "audio.wav");
    extractAudio(videoPath, audioPath);
    transcript = transcribeLocal(audioPath, transcriptPath) as Transcript;
    console.log(
      `[align-speech] wrote word-level transcript → ${transcriptPath}`,
    );
  }

  const spokenTokens = wordsFromTranscript(transcript);
  const scriptTokens = flattenScriptBeats(beats);
  const matches = alignScriptToSpeech(scriptTokens, spokenTokens);
  const totalDuration = probeDurationSeconds(videoPath);
  const boundaries = beatBoundariesFromMatches(
    scriptTokens,
    spokenTokens,
    matches,
    beats.length,
    totalDuration,
  );

  const beatDurationsSeconds = boundaries.map(
    (boundary) => boundary.durationSeconds,
  );
  const editedDurationSeconds =
    Math.round(
      beatDurationsSeconds.reduce((sum, value) => sum + value, 0) * 100,
    ) / 100;

  const captionSegments: CaptionSegment[] = [];
  const goodIntervalsPath = path.join(editDir, "cut-good-intervals.json");
  const mappedGoodIntervals: GoodInterval[] = fileExists(goodIntervalsPath)
    ? readJson<GoodInterval[]>(goodIntervalsPath)
    : [{ start: 0, end: totalDuration }];

  const sentenceSegments = mappedGoodIntervals.length > 1 ||
      (mappedGoodIntervals[0] && mappedGoodIntervals[0].end < totalDuration - 0.5)
    ? sentenceCaptionSegmentsFromTranscript({
        transcript,
        goodIntervals: mappedGoodIntervals,
        boundaries,
        beats,
      })
    : sentencesFromTranscript(transcript).map((sentence) => ({
        text: sentence.text,
        atSeconds: Math.round(sentence.start * 100) / 100,
        durationSeconds: Math.max(
          0.12,
          Math.round((sentence.end - sentence.start) * 100) / 100,
        ),
      }));

  for (const segment of sentenceSegments) {
    captionSegments.push({
      text: segment.text,
      atSeconds: segment.atSeconds,
      durationSeconds: segment.durationSeconds,
    });
  }

  const captionSegmentsWithZh = await attachSpokenZhToCaptionSegments(
    editDir,
    captionSegments,
  );

  const videoSrc = path
    .relative(scriptDir, videoPath)
    .split(path.sep)
    .join("/");
  const cutAudioPath = path.join(
    path.dirname(videoPath),
    "edited-good-intervals-audio.m4a",
  );
  const audioSrc = fileExists(cutAudioPath)
    ? path.relative(scriptDir, cutAudioPath).split(path.sep).join("/")
    : undefined;

  // Studio mask framing: stabilized take when available, else raw source.
  const takeMatch = editDir.match(/[\\/]takes[\\/]([^\\/]+)[\\/]/);
  const takeId = takeMatch?.[1] ?? "";
  const takeDir = takeId ? path.join(scriptDir, "takes", takeId) : "";
  let framingVideoPath = "";
  if (takeDir) {
    const statusPath = path.join(takeDir, "pipeline-status.json");
    if (fileExists(statusPath)) {
      const status = readJson<{ selectedRuns?: { stabilize?: string } }>(statusPath);
      const stabilizeRunId = status.selectedRuns?.stabilize;
      if (stabilizeRunId) {
        const stabilized = path.join(
          takeDir,
          "pipeline",
          "stabilize",
          stabilizeRunId,
          "stabilized.mp4",
        );
        if (fileExists(stabilized)) {
          framingVideoPath = stabilized;
        }
      }
    }
    if (!framingVideoPath) {
      const sourceVideoPath = path.join(takeDir, "source.mp4");
      if (fileExists(sourceVideoPath)) {
        framingVideoPath = sourceVideoPath;
      }
    }
  }
  const sourceVideoSrc = framingVideoPath
    ? path.relative(scriptDir, framingVideoPath).split(path.sep).join("/")
    : undefined;

  const alignment = {
    schemaVersion: 1,
    scriptId,
    generatedAt: new Date().toISOString(),
    sourceVideo: videoPath,
    editedDurationSeconds,
    beatDurationsSeconds,
    boundaries,
    matchCount: matches.length,
    scriptWordCount: scriptTokens.length,
    spokenWordCount: spokenTokens.length,
    matches: matches.slice(0, 40),
  };

  const visualPlan = {
    schemaVersion: 2,
    source: "speech-alignment",
    sourceScriptId: scriptId,
    title: animation.title,
    editedDurationSeconds,
    timeline: boundaries.map((boundary, index) => ({
      slideId: `beat-${String(index + 1).padStart(2, "0")}`,
      slideTitle: beats[index]?.visualNotes ?? `Beat ${index + 1}`,
      sourceStart: boundary.editedStart,
      sourceEnd: boundary.editedEnd,
      editedStart: boundary.editedStart,
      editedEnd: boundary.editedEnd,
    })),
  };

  const outdoorAnimation = JSON.parse(
    JSON.stringify(animation),
  ) as Animation & {
    scenes: Array<
      AnimationScene & {
        burnCaptions?: boolean;
        outdoorEdit?: {
          videoSrc: string;
          burnCaptionsZh: boolean;
          beatDurationsSeconds: number[];
          captionSegments: CaptionSegment[];
        };
        compare: { beats: AnimationBeat[] };
      }
    >;
  };
  const outdoorScene = outdoorAnimation.scenes[0];
  outdoorScene.durationSeconds = editedDurationSeconds;
  outdoorScene.burnCaptions = true;
  outdoorScene.outdoorEdit = {
    videoSrc,
    ...(audioSrc ? { audioSrc } : {}),
    ...(sourceVideoSrc ? { sourceVideoSrc } : {}),
    burnCaptionsZh: true,
    beatDurationsSeconds,
    captionSegments: captionSegmentsWithZh,
  };
  outdoorScene.compare.beats.forEach((beat, index) => {
    beat.durationSeconds = beatDurationsSeconds[index];
  });

  const alignmentPath = path.join(editDir, "speech-alignment.json");
  const visualPlanPath = path.join(editDir, "remotion-visual-plan.json");
  const outdoorAnimationPath = path.join(editDir, "animation-outdoor.json");

  writeJson(alignmentPath, alignment);
  writeJson(visualPlanPath, visualPlan);
  writeJson(outdoorAnimationPath, outdoorAnimation);

  console.log(alignmentPath);
  console.log(visualPlanPath);
  console.log(outdoorAnimationPath);
  console.log(
    `[align-speech] beats: ${beatDurationsSeconds.join(", ")}s (total ${editedDurationSeconds}s, ${matches.length}/${scriptTokens.length} script words matched)`,
  );
}
