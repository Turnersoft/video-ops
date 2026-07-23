import path from "node:path";

import { loadAnimationV4 } from "../animation-load.ts";
import type { TakeManifest } from "../../../ios-teleprompter/src/scriptSchema.ts";
import { fileExists, readJson, writeJson } from "../fs_util.ts";
import { outdoorScriptPath, scriptDirFor } from "../paths.ts";
import type { OutdoorJob } from "../schema.ts";
import { stabilizedVideoForJob } from "./stabilize.ts";
import {
  sentenceCaptionSegmentsFromTranscript,
  type GoodInterval,
  type TranscriptVerbose,
} from "../../../outdoor_post/src/sentence-captions.ts";

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
export function alignFromSlideEvents({
  job,
  outDir,
  editedVideo,
  take,
  visualPlan,
  transcript,
  goodIntervals = [],
}: AlignFromSlideEventsParams): void {
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
  const durationsByBeat = Array.from({ length: beats.length }, () => 0);

  if (timeline.length > 0) {
    for (const segment of timeline) {
      const slideIndex = script.slides.findIndex(
        (slide) => slide.id === segment.slideId,
      );
      const beatIndex =
        slideIndex >= 0 ? Math.min(slideIndex, beats.length - 1) : 0;
      const duration = (segment.editedEnd ?? 0) - (segment.editedStart ?? 0);
      durationsByBeat[beatIndex] += duration;
    }
  } else {
    const events = take.slideEvents ?? [];
    let editedCursor = 0;
    const boundaries: Array<{
      startMs: number;
      endMs: number;
      duration: number;
    }> = [];
    for (let beatIndex = 0; beatIndex < beats.length; beatIndex += 1) {
      const event = events[beatIndex];
      const nextEvent = events[beatIndex + 1];
      const startMs = event?.atMs ?? editedCursor * 1000;
      const endMs = nextEvent?.atMs ?? take.durationMs;
      const duration = Math.max(0.5, (endMs - startMs) / 1000);
      durationsByBeat[beatIndex] = duration;
      boundaries.push({ startMs, endMs, duration });
    }
    void boundaries;
  }

  const totalFallback = take.durationMs / 1000;
  const rawSum = durationsByBeat.reduce((sum, value) => sum + value, 0);
  if (rawSum <= 0) {
    const each = totalFallback / beats.length;
    for (let index = 0; index < beats.length; index += 1) {
      durationsByBeat[index] = each;
    }
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

  const captionSegments =
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
              zh: beat.sayZh ?? undefined,
              atSeconds: boundary.editedStart,
              durationSeconds: boundary.durationSeconds,
            },
          ];
        });

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
