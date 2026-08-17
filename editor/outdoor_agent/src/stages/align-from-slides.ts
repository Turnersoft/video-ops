import path from "node:path";

import { loadAnimationV4 } from "../animation-load.ts";
import type { TakeManifest } from "../../../ios-teleprompter/src/scriptSchema.ts";
import { fileExists, readJson, writeJson } from "../fs_util.ts";
import { outdoorScriptPath, scriptDirFor } from "../paths.ts";
import type { OutdoorJob } from "../schema.ts";
import { stabilizedVideoForJob } from "./stabilize.ts";
import {
  mapSourceTimeToEditedTimeline,
  sentenceCaptionSegmentsFromTranscript,
  type GoodInterval,
  type TranscriptVerbose,
} from "../../../outdoor_post/src/sentence-captions.ts";
import { attachSpokenZhToCaptionSegments } from "../../../outdoor_post/src/caption_translate.ts";

type AnimationBeat = {
  say?: string;
  sayZh?: string;
  visualNotes?: string;
  durationSeconds?: number;
};

type Animation = {
  title: string;
  scenes: Array<{
    durationSeconds?: number;
    burnCaptions?: boolean;
    outdoorEdit?: unknown;
    compare?: { beats?: AnimationBeat[] };
  }>;
};

type VisualPlan = {
  timeline?: Array<{
    slideId: string;
    editedStart?: number;
    editedEnd?: number;
  }>;
};

type OutdoorScript = {
  slides: Array<{ id: string }>;
};

function roundSeconds(value: number): number {
  return Math.round(value * 100) / 100;
}

function editedDurationFromGoodIntervals(goodIntervals: GoodInterval[]): number {
  return goodIntervals.reduce(
    (sum, interval) => sum + Math.max(0, interval.end - interval.start),
    0,
  );
}

function editedDurationFromTimeline(timeline: VisualPlan["timeline"]): number {
  let maxEnd = 0;
  for (const segment of timeline ?? []) {
    maxEnd = Math.max(maxEnd, segment?.editedEnd ?? 0);
  }
  return maxEnd;
}

function beatIndexFromSlideId(slideId: string, beatCount: number): number {
  const match = slideId.match(/beat-(\d+)/i);
  if (match) {
    const oneBased = Number.parseInt(match[1], 10);
    if (Number.isFinite(oneBased) && oneBased >= 1) {
      return Math.min(oneBased - 1, beatCount - 1);
    }
  }
  return 0;
}

/**
 * Beat boundaries from teleprompter Next taps, mapped source → edited via cut keeps.
 * Avoids summing cut chunks by slide label (NG retakes often stay on beat-01).
 */
function beatDurationsFromSlideEvents(
  take: TakeManifest,
  beatCount: number,
  goodIntervals: GoodInterval[],
  totalEditedDuration: number,
): number[] | null {
  const events = take.slideEvents ?? [];
  if (events.length < 2) {
    return null;
  }

  const mappedStarts: number[] = [];
  for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
    const event = events[beatIndex];
    const sourceSeconds =
      (event?.atMs ?? (beatIndex === 0 ? 0 : events[events.length - 1]?.atMs ?? 0)) /
      1000;
    mappedStarts.push(
      roundSeconds(mapSourceTimeToEditedTimeline(sourceSeconds, goodIntervals)),
    );
  }

  for (let index = 1; index < mappedStarts.length; index += 1) {
    mappedStarts[index] = Math.max(
      mappedStarts[index],
      mappedStarts[index - 1] + 0.5,
    );
  }

  const durations: number[] = [];
  for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
    const start = mappedStarts[beatIndex];
    const end =
      beatIndex === beatCount - 1
        ? totalEditedDuration
        : mappedStarts[beatIndex + 1] ?? totalEditedDuration;
    durations.push(roundSeconds(Math.max(0.5, end - start)));
  }
  return durations;
}

function beatDurationsFromCutTimeline(
  timeline: NonNullable<VisualPlan["timeline"]>,
  beatCount: number,
  script: OutdoorScript,
): number[] {
  const durationsByBeat = Array.from({ length: beatCount }, () => 0);
  for (const segment of timeline) {
    const slideIndex = script.slides.findIndex(
      (slide) => slide.id === segment.slideId,
    );
    const beatIndex =
      slideIndex >= 0
        ? Math.min(slideIndex, beatCount - 1)
        : beatIndexFromSlideId(segment.slideId, beatCount);
    const duration = (segment.editedEnd ?? 0) - (segment.editedStart ?? 0);
    durationsByBeat[beatIndex] += duration;
  }
  return durationsByBeat;
}

function beatDurationsFromRawSlideEvents(
  take: TakeManifest,
  beatCount: number,
): number[] {
  const events = take.slideEvents ?? [];
  const durationsByBeat = Array.from({ length: beatCount }, () => 0);
  for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
    const event = events[beatIndex];
    const nextEvent = events[beatIndex + 1];
    const startMs = event?.atMs ?? 0;
    const endMs = nextEvent?.atMs ?? take.durationMs;
    durationsByBeat[beatIndex] = Math.max(0.5, (endMs - startMs) / 1000);
  }
  return durationsByBeat;
}

export function slideEventsAreSufficient(
  take: TakeManifest,
  scriptId: string,
): boolean {
  const events = take.slideEvents ?? [];
  if (events.length < 2) {
    return false;
  }
  const animation = loadAnimationV4(scriptId);
  if (!animation) {
    return events.length >= 3;
  }
  const beatCount = animation.scenes?.[0]?.compare?.beats?.length ?? 0;
  if (!beatCount) {
    return events.length >= 3;
  }
  const uniqueSlides = new Set(events.map((event) => event.index));
  return (
    uniqueSlides.size >=
    Math.min(beatCount, Math.max(2, Math.ceil(beatCount * 0.5)))
  );
}

type AlignFromSlideEventsParams = {
  job: OutdoorJob;
  outDir: string;
  editedVideo: string;
  take: TakeManifest;
  visualPlan: VisualPlan;
  transcript?: TranscriptVerbose;
  goodIntervals?: GoodInterval[];
};

/**
 * Build speech-alignment + animation-outdoor from slide marker timeline.
 */
export async function alignFromSlideEvents({
  job,
  outDir,
  editedVideo,
  take,
  visualPlan,
  transcript,
  goodIntervals = [],
}: AlignFromSlideEventsParams): Promise<void> {
  const scriptDir = scriptDirFor(job.scriptId);
  const animation = loadAnimationV4(job.scriptId);
  if (!animation) {
    throw new Error(`No compiled animation for ${job.scriptId} — run sync from animation.md`);
  }
  const scene = animation.scenes?.[0];
  const beats = scene?.compare?.beats ?? [];
  if (!scene || !beats.length) {
    throw new Error(`No compare beats in animation for ${job.scriptId}`);
  }

  const script = fileExists(outdoorScriptPath(job.scriptId))
    ? readJson<OutdoorScript>(outdoorScriptPath(job.scriptId))
    : { slides: [] };

  const timeline = visualPlan.timeline ?? [];
  const totalEditedDuration =
    goodIntervals.length > 0
      ? editedDurationFromGoodIntervals(goodIntervals)
      : timeline.length > 0
        ? editedDurationFromTimeline(timeline)
        : take.durationMs / 1000;

  let durationsByBeat: number[];
  const fromSlideEvents = beatDurationsFromSlideEvents(
    take,
    beats.length,
    goodIntervals,
    totalEditedDuration,
  );
  if (fromSlideEvents) {
    durationsByBeat = fromSlideEvents;
  } else if (timeline.length > 0) {
    durationsByBeat = beatDurationsFromCutTimeline(timeline, beats.length, script);
  } else {
    durationsByBeat = beatDurationsFromRawSlideEvents(take, beats.length);
  }

  const rawSum = durationsByBeat.reduce((sum, value) => sum + value, 0);
  if (rawSum <= 0) {
    const each = totalEditedDuration / beats.length;
    durationsByBeat = Array.from({ length: beats.length }, () => each);
  }

  const beatDurationsSeconds = durationsByBeat.map((value) =>
    roundSeconds(Math.max(0.5, value)),
  );
  let editedCursor = 0;
  const boundaries = beatDurationsSeconds.map((durationSeconds, beatIndex) => {
    const boundary = {
      beatIndex,
      editedStart: roundSeconds(editedCursor),
      editedEnd: roundSeconds(editedCursor + durationSeconds),
      durationSeconds,
      lastSpokenWord: "",
      source: "slide-events",
    };
    editedCursor += durationSeconds;
    return boundary;
  });
  const editedDurationSeconds = roundSeconds(editedCursor);

  const videoSrc = path
    .relative(scriptDir, editedVideo)
    .split(path.sep)
    .join("/");
  const cutAudioPath = path.join(
    path.dirname(editedVideo),
    "edited-good-intervals-audio.m4a",
  );
  const audioSrc = fileExists(cutAudioPath)
    ? path.relative(scriptDir, cutAudioPath).split(path.sep).join("/")
    : undefined;
  // Studio mask framing: stabilized take when available, else raw source.
  const framingVideoPath =
    stabilizedVideoForJob(job) ??
    (fileExists(path.join(scriptDir, "takes", job.takeId, "source.mp4"))
      ? path.join(scriptDir, "takes", job.takeId, "source.mp4")
      : null);
  const sourceVideoSrc = framingVideoPath
    ? path.relative(scriptDir, framingVideoPath).split(path.sep).join("/")
    : undefined;

  let captionSegments =
    transcript && goodIntervals.length
      ? sentenceCaptionSegmentsFromTranscript({
          transcript,
          goodIntervals,
          boundaries,
          beats,
        })
      : beats.flatMap((beat, beatIndex) => {
          const boundary = boundaries[beatIndex];
          return [
            {
              text: beat.say ?? "",
              atSeconds: boundary.editedStart,
              durationSeconds: boundary.durationSeconds,
            },
          ];
        });

  captionSegments = await attachSpokenZhToCaptionSegments(outDir, captionSegments);

  const alignment = {
    schemaVersion: 1,
    scriptId: job.scriptId,
    generatedAt: new Date().toISOString(),
    sourceVideo: editedVideo,
    source: "slide-events",
    editedDurationSeconds,
    beatDurationsSeconds,
    boundaries,
    slideEventCount: take.slideEvents?.length ?? 0,
  };

  const nextVisualPlan = {
    schemaVersion: 2,
    source: "slide-events",
    sourceScriptId: job.scriptId,
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

  const outdoorAnimation = JSON.parse(JSON.stringify(animation)) as Animation;
  const outdoorScene = outdoorAnimation.scenes[0];
  outdoorScene.durationSeconds = editedDurationSeconds;
  outdoorScene.burnCaptions = true;
  outdoorScene.outdoorEdit = {
    videoSrc,
    ...(audioSrc ? { audioSrc } : {}),
    ...(sourceVideoSrc ? { sourceVideoSrc } : {}),
    burnCaptionsZh: true,
    beatDurationsSeconds,
    captionSegments,
  };
  outdoorScene.compare?.beats?.forEach((beat, index) => {
    beat.durationSeconds = beatDurationsSeconds[index];
  });

  writeJson(path.join(outDir, "speech-alignment.json"), alignment);
  writeJson(path.join(outDir, "remotion-visual-plan.json"), nextVisualPlan);
  writeJson(path.join(outDir, "animation-outdoor.json"), outdoorAnimation);
}
